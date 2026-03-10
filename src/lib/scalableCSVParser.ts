// src/lib/scalableCSVParser.ts — Parser für Scalable Capital CSV-Export
// Format: Semikolon-getrennt, deutsche Zahlenformatierung (Komma als Dezimalzeichen)

export interface ScalableCSVRow {
  date: string          // YYYY-MM-DD
  time: string
  status: string        // Executed, Cancelled, Rejected
  reference: string
  description: string
  assetType: string     // Security, Cash
  type: string          // Buy, Sell, Savings plan, Distribution, Deposit, Withdrawal, Fee, Interest, Security transfer, Corporate action, Reinvestment_Distribution, Taxes
  isin: string
  shares: number
  price: number
  amount: number
  fee: number
  tax: number
  currency: string
}

export type MappedTransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'cash_deposit'
  | 'cash_withdrawal'
  | 'transfer_in'
  | 'transfer_out'

export interface ParsedTransaction {
  date: string          // YYYY-MM-DD
  type: MappedTransactionType
  isin: string          // Wird später zu Ticker aufgelöst
  symbol?: string       // Aufgelöst nach ISIN-Mapping
  name: string          // Beschreibung aus CSV
  quantity: number
  price: number         // Preis pro Einheit in EUR
  totalValue: number    // Gesamtwert (immer positiv)
  fee: number
  tax: number
  notes: string
  originalType: string  // Originaltyp aus CSV für Referenz
}

export interface CSVParseResult {
  transactions: ParsedTransaction[]
  uniqueISINs: string[]
  skipped: { row: number; reason: string; data: string }[]
  summary: {
    total: number
    imported: number
    skipped: number
    byType: Record<string, number>
  }
}

/**
 * Deutsche Zahlformatierung parsen: "1.234,56" → 1234.56
 */
function parseGermanNumber(value: string): number {
  if (!value || value.trim() === '') return 0
  // Tausenderpunkte entfernen, Komma durch Punkt ersetzen
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * CSV-Zeile parsen (Semikolon-getrennt, Anführungszeichen beachten)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++ // Escaped Quote überspringen
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Scalable Capital CSV-Typ auf unseren Transaktionstyp mappen
 */
function mapTransactionType(
  csvType: string,
  shares: number,
  amount: number
): MappedTransactionType | null {
  switch (csvType) {
    case 'Buy':
    case 'Savings plan':
    case 'Reinvestment_Distribution':
      return 'buy'

    case 'Sell':
      return 'sell'

    case 'Distribution':
      return 'dividend'

    case 'Deposit':
      return 'cash_deposit'

    case 'Withdrawal':
      return 'cash_withdrawal'

    case 'Fee':
      return 'cash_withdrawal' // Gebühren reduzieren Cash

    case 'Interest':
      return 'cash_deposit' // Zinsen erhöhen Cash

    case 'Taxes':
      return amount >= 0 ? 'cash_deposit' : 'cash_withdrawal'

    case 'Security transfer':
      return shares >= 0 ? 'transfer_in' : 'transfer_out'

    case 'Corporate action':
      // Corporate Actions (Splits, Mergers) — als Transfer behandeln
      if (shares < 0) return 'transfer_out'
      if (shares > 0) return 'transfer_in'
      return null // Shares = 0 → überspringen

    default:
      return null
  }
}

/**
 * Notiz-Text basierend auf Transaktionstyp generieren
 */
function generateNotes(row: ScalableCSVRow, mappedType: MappedTransactionType): string {
  const parts: string[] = []

  // Originaltyp vermerken wenn abweichend
  if (row.type === 'Savings plan') parts.push('Sparplan')
  if (row.type === 'Reinvestment_Distribution') parts.push('Wiederanlage Ausschüttung')
  if (row.type === 'Fee') parts.push(`Gebühr: ${row.description}`)
  if (row.type === 'Interest') parts.push('Zinsen')
  if (row.type === 'Taxes') parts.push('Steuerausgleich')
  if (row.type === 'Corporate action') parts.push(`Corporate Action: ${row.description}`)

  if (row.type === 'Security transfer') {
    parts.push(mappedType === 'transfer_in' ? 'Depotübertrag (Einbuchung)' : 'Depotübertrag (Ausbuchung)')
  }

  // Gebühren und Steuern vermerken
  if (row.fee > 0) parts.push(`Gebühren: ${row.fee.toFixed(2)}€`)
  if (row.tax > 0) parts.push(`Steuern: ${row.tax.toFixed(2)}€`)

  // CSV-Import Kennzeichnung
  parts.push('CSV-Import (Scalable Capital)')

  return parts.join(' · ')
}

/**
 * Scalable Capital CSV-Export parsen
 */
export function parseScalableCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.split('\n').filter(l => l.trim())
  const transactions: ParsedTransaction[] = []
  const skipped: CSVParseResult['skipped'] = []
  const isinSet = new Set<string>()
  const typeCounts: Record<string, number> = {}

  // Header-Zeile überspringen
  if (lines.length < 2) {
    return {
      transactions: [],
      uniqueISINs: [],
      skipped: [],
      summary: { total: 0, imported: 0, skipped: 0, byType: {} }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])

    if (fields.length < 14) {
      skipped.push({ row: i + 1, reason: 'Unvollständige Zeile', data: lines[i].substring(0, 80) })
      continue
    }

    const [date, time, status, reference, description, assetType, type, isin, sharesStr, priceStr, amountStr, feeStr, taxStr, currency] = fields

    // Cancelled/Rejected überspringen
    if (status === 'Cancelled' || status === 'Rejected') {
      skipped.push({ row: i + 1, reason: `Status: ${status}`, data: `${description} (${type})` })
      continue
    }

    const shares = parseGermanNumber(sharesStr)
    const price = parseGermanNumber(priceStr)
    const amount = parseGermanNumber(amountStr)
    const fee = parseGermanNumber(feeStr)
    const tax = parseGermanNumber(taxStr)

    const mappedType = mapTransactionType(type, shares, amount)

    if (!mappedType) {
      skipped.push({ row: i + 1, reason: `Unbekannter Typ: ${type}`, data: `${description}` })
      continue
    }

    // ISIN tracken (nur für Wertpapier-Transaktionen)
    if (isin && isin.length > 0) {
      isinSet.add(isin)
    }

    // Transaktion erstellen
    const parsed: ParsedTransaction = {
      date: date, // Ist bereits YYYY-MM-DD
      type: mappedType,
      isin: isin || '',
      name: description.replace(/^"|"$/g, ''), // Anführungszeichen entfernen
      quantity: Math.abs(shares),
      price: Math.abs(price),
      totalValue: Math.abs(amount),
      fee: Math.abs(fee),
      tax: Math.abs(tax),
      notes: generateNotes({ date, time, status, reference, description, assetType, type, isin, shares, price, amount, fee, tax, currency }, mappedType),
      originalType: type,
    }

    // Für Cash-Transaktionen ohne ISIN: Symbol auf CASH setzen
    if (!isin && (mappedType === 'cash_deposit' || mappedType === 'cash_withdrawal')) {
      parsed.isin = ''
      parsed.symbol = 'CASH'
      parsed.quantity = 1
      parsed.price = parsed.totalValue
    }

    // Für Dividenden: Quantity=0 (kein Aktienhandel), Price=Dividendenbetrag
    if (mappedType === 'dividend') {
      parsed.quantity = 1
      parsed.price = parsed.totalValue
    }

    transactions.push(parsed)

    // Typ-Zähler
    typeCounts[mappedType] = (typeCounts[mappedType] || 0) + 1
  }

  return {
    transactions,
    uniqueISINs: Array.from(isinSet),
    skipped,
    summary: {
      total: lines.length - 1,
      imported: transactions.length,
      skipped: skipped.length,
      byType: typeCounts,
    }
  }
}

/**
 * Aus importierten Transaktionen die aktuellen Holdings rekonstruieren.
 * Verwendet die Durchschnittskostenmethode.
 */
export function reconstructHoldings(
  transactions: ParsedTransaction[]
): Array<{
  symbol: string
  name: string
  quantity: number
  avgPrice: number
  earliestDate: string
}> {
  // Transaktionen chronologisch sortieren
  const sorted = [...transactions]
    .filter(t => t.symbol && t.symbol !== 'CASH')
    .sort((a, b) => a.date.localeCompare(b.date))

  const positions: Record<string, {
    symbol: string
    name: string
    totalShares: number
    totalCost: number
    earliestDate: string
  }> = {}

  // Gespeicherte Kostenbasis bei Depotüberträgen (Transfer-Out → Transfer-In)
  // Damit wird der originale EK bei Depot-Umzügen beibehalten
  const transferCostBasis: Record<string, number> = {} // symbol → avgPrice vor Transfer

  for (const tx of sorted) {
    const sym = tx.symbol!
    if (!positions[sym]) {
      positions[sym] = {
        symbol: sym,
        name: tx.name,
        totalShares: 0,
        totalCost: 0,
        earliestDate: tx.date,
      }
    }

    const pos = positions[sym]

    switch (tx.type) {
      case 'buy': {
        pos.totalCost += tx.quantity * tx.price
        pos.totalShares += tx.quantity
        if (tx.date < pos.earliestDate) pos.earliestDate = tx.date
        break
      }
      case 'transfer_in': {
        // Bei Depot-Umzügen: originale Kostenbasis beibehalten
        // Wenn vorher ein transfer_out für das gleiche Symbol war,
        // verwende den gespeicherten Durchschnittspreis statt dem Marktpreis
        const costBasisPrice = transferCostBasis[sym] || tx.price
        pos.totalCost += tx.quantity * costBasisPrice
        pos.totalShares += tx.quantity
        if (tx.date < pos.earliestDate) pos.earliestDate = tx.date
        break
      }
      case 'sell': {
        if (pos.totalShares > 0) {
          const avgCost = pos.totalCost / pos.totalShares
          const sellQty = Math.min(tx.quantity, pos.totalShares)
          pos.totalCost -= sellQty * avgCost
          pos.totalShares -= sellQty
        }
        break
      }
      case 'transfer_out': {
        if (pos.totalShares > 0) {
          // Durchschnittspreis VOR dem Transfer speichern
          const avgCost = pos.totalCost / pos.totalShares
          transferCostBasis[sym] = avgCost
          const sellQty = Math.min(tx.quantity, pos.totalShares)
          pos.totalCost -= sellQty * avgCost
          pos.totalShares -= sellQty
        }
        break
      }
      // dividend, cash: keine Auswirkung auf Holding-Bestand
    }
  }

  // Nur Positionen mit positivem Bestand zurückgeben
  return Object.values(positions)
    .filter(p => p.totalShares > 0.0001) // Kleine Rundungsdifferenzen ignorieren
    .map(p => ({
      symbol: p.symbol,
      name: p.name,
      quantity: p.totalShares,
      avgPrice: p.totalCost / p.totalShares,
      earliestDate: p.earliestDate,
    }))
}
