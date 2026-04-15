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
  time?: string         // HH:MM:SS (aus CSV) — für stabile Sortierung bei Intraday-Trades
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
  // Corporate-Action-Metadaten (optional)
  isFromTransfer?: boolean    // stammt aus Security transfer (Depotübertrag)
  isFromCorpAction?: boolean  // stammt aus Corporate Action (Split/Spinoff/Rename)
  corpActionType?: 'split' | 'rename' | 'spinoff'
  fromIsin?: string           // bei Rename/Spinoff: ISIN der Vorgänger-Position
  splitRatio?: number         // bei Rename: neue_shares / alte_shares (Kostenbasis-Anpassung)
}

export interface StockSplit {
  date: string
  isin: string
  ratio: number  // neue shares / alte shares (z.B. 25 = 25-zu-1 Split)
}

export interface TickerRename {
  date: string
  fromIsin: string
  toIsin: string
  ratio: number  // neue shares / alte shares
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
  stockSplits?: StockSplit[]     // erkannte Aktiensplits (für UI-Info)
  tickerRenames?: TickerRename[] // erkannte Ticker-Umstellungen
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
 * Scalable Capital CSV-Typ auf unseren Transaktionstyp mappen.
 *
 * WICHTIG — Vorzeichen-Konvention der Scalable-CSV:
 *   "amount" ist immer aus Sicht des Cash-Kontos signed:
 *     • Geld kommt rein:  amount > 0  (Deposit, Sell, Distribution, positive Interest)
 *     • Geld geht raus:   amount < 0  (Buy, Savings plan, Withdrawal, Fee, negative Interest)
 *
 *   Es gibt aber Stornierungen, die das normale Vorzeichen umkehren:
 *     • Deposit mit amount < 0          → Storno einer Einzahlung → effektiv Auszahlung
 *     • Distribution mit amount < 0     → Storno einer Dividende  → effektiv Auszahlung
 *     • Interest mit amount < 0         → Negativzins / KKT-Belastung → Auszahlung
 *     • Withdrawal mit amount > 0       → Storno einer Auszahlung → effektiv Einzahlung
 *
 *   Daher MUSS das Mapping vorzeichen-aware sein, sonst kommt die Cash-Berechnung
 *   zu hoch raus (was Bug Issue mit Cash -4k vs. -13k war).
 */
function mapTransactionType(
  csvType: string,
  shares: number,
  amount: number
): MappedTransactionType | null {
  // Helper: Cash-Vorzeichen aus dem amount ableiten
  const cashIn = amount >= 0 ? 'cash_deposit' : 'cash_withdrawal'

  switch (csvType) {
    case 'Buy':
    case 'Savings plan':
    case 'Reinvestment_Distribution':
      // Buy mit positivem amount = Storno eines Kaufs → eigentlich sell-artig
      // Aber für die Aktien-Position bleibt es ein Buy/Sell. Wir behandeln das
      // konservativ: amount > 0 wäre ein Storno → wir behandeln als sell
      return amount >= 0 ? 'sell' : 'buy'

    case 'Sell':
      // Sell mit negativem amount = Storno → behandeln als buy
      return amount >= 0 ? 'sell' : 'buy'

    case 'Distribution':
      // Positive Dividende → dividend (zählt zu totalDividends)
      // Negative Distribution = Dividenden-Storno → cash_withdrawal
      return amount >= 0 ? 'dividend' : 'cash_withdrawal'

    case 'Deposit':
      // Normal: amount > 0 → Einzahlung. Storno: amount < 0 → effektiv Auszahlung
      return cashIn

    case 'Withdrawal':
      // Normal: amount < 0 → Auszahlung. Storno: amount > 0 → Einzahlung
      return cashIn

    case 'Fee':
      // Gebühren reduzieren Cash (immer negativ in der Praxis, sonst Storno)
      return cashIn

    case 'Interest':
      // Positive Zinsen = Gutschrift, negative = Negativzins/KKT-Belastung
      return cashIn

    case 'Taxes':
      // Steuer: positiv = Erstattung, negativ = Belastung
      return cashIn

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
      time: time || undefined,
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
      isFromTransfer: type === 'Security transfer',
      isFromCorpAction: type === 'Corporate action',
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

  // ===========================================================
  // POST-PROCESSING: Corporate Actions (Stock Splits / Renames)
  // ===========================================================
  const { adjusted, splits, renames } = normalizeCorporateActions(transactions)

  // Typ-Zähler neu berechnen (einige transfers wurden ggf. entfernt)
  const finalTypeCounts: Record<string, number> = {}
  adjusted.forEach(t => { finalTypeCounts[t.type] = (finalTypeCounts[t.type] || 0) + 1 })

  return {
    transactions: adjusted,
    uniqueISINs: Array.from(isinSet),
    skipped,
    summary: {
      total: lines.length - 1,
      imported: adjusted.length,
      skipped: skipped.length,
      byType: finalTypeCounts,
    },
    stockSplits: splits,
    tickerRenames: renames,
  }
}

/**
 * Post-Processing: Erkennt Aktiensplits und Ticker-Umstellungen aus
 * gepaarten Corporate-Action-Zeilen (gleiches Datum, price=0).
 *
 * Regeln:
 *  • 2 Zeilen, gleiches Datum, gleiche ISIN, eine IN + eine OUT → Stock Split
 *    → Ratio = IN.quantity / OUT.quantity
 *    → alle vorherigen Transaktionen mit dieser ISIN werden mit dem Ratio skaliert
 *      (quantity *= ratio, price /= ratio, totalValue bleibt)
 *    → die beiden Split-Zeilen selbst werden entfernt
 *
 *  • 2 Zeilen, gleiches Datum, UNTERSCHIEDLICHE ISINs, eine IN + eine OUT → Rename
 *    → die IN-Zeile wird markiert (corpActionType='rename') und bekommt notes mit from-ISIN
 *    → die OUT-Zeile bleibt als transfer_out erhalten, damit reconstructHoldings
 *      die alte Position korrekt schließt und den Durchschnittspreis als Kostenbasis überträgt
 *
 *  • 3+ Zeilen am gleichen Datum → Spin-off-Szenario (z.B. Unilever + Magnum)
 *    → die Zeilen werden markiert aber nicht automatisch umgerechnet
 *      (Kostenbasis-Verteilung ist nicht eindeutig rekonstruierbar)
 */
function normalizeCorporateActions(transactions: ParsedTransaction[]): {
  adjusted: ParsedTransaction[]
  splits: StockSplit[]
  renames: TickerRename[]
} {
  // Alle Corporate-Action-Zeilen sammeln und nach Datum gruppieren
  const byDate = new Map<string, ParsedTransaction[]>()
  for (const tx of transactions) {
    if (!tx.isFromCorpAction) continue
    const list = byDate.get(tx.date) || []
    list.push(tx)
    byDate.set(tx.date, list)
  }

  const splits: StockSplit[] = []
  const renames: TickerRename[] = []
  const toRemove = new Set<ParsedTransaction>()
  const toMark: { tx: ParsedTransaction; meta: Partial<ParsedTransaction> }[] = []

  for (const [date, group] of byDate) {
    if (group.length < 2) continue // einzelne Corp-Actions kann man nicht paaren

    const outs = group.filter(t => t.type === 'transfer_out')
    const ins = group.filter(t => t.type === 'transfer_in')

    // Fall 1: gleicher ISIN → Stock Split
    for (const out of outs) {
      const sameIsinIn = ins.find(i => i.isin === out.isin && !toRemove.has(i))
      if (sameIsinIn && out.quantity > 0 && sameIsinIn.quantity > 0) {
        const ratio = sameIsinIn.quantity / out.quantity
        splits.push({ date, isin: out.isin, ratio })
        toRemove.add(out)
        toRemove.add(sameIsinIn)
        continue
      }
    }

    // Fall 2: genau 1 OUT + 1 IN mit unterschiedlicher ISIN → Pure Rename
    const remainingOuts = outs.filter(o => !toRemove.has(o))
    const remainingIns = ins.filter(i => !toRemove.has(i))
    if (remainingOuts.length === 1 && remainingIns.length === 1) {
      const out = remainingOuts[0]
      const inTx = remainingIns[0]
      if (out.isin !== inTx.isin && out.quantity > 0 && inTx.quantity > 0) {
        const ratio = inTx.quantity / out.quantity
        renames.push({ date, fromIsin: out.isin, toIsin: inTx.isin, ratio })
        toMark.push({
          tx: inTx,
          meta: {
            corpActionType: 'rename',
            fromIsin: out.isin,
            splitRatio: ratio,
            notes: `Ticker-Umstellung · von ${out.isin} · Ratio ${ratio.toFixed(4)} · Einstandskurs übernommen`,
          },
        })
        toMark.push({
          tx: out,
          meta: {
            notes: `Ticker-Umstellung · zu ${inTx.isin} · Kostenbasis übertragen`,
          },
        })
      }
    }

    // Fall 3: 1 OUT + N IN (N>=2) mit unterschiedlichen ISINs → Hauptposition + Spin-offs
    // Beispiel Unilever: 21 alt → 18.67 neu (Hauptposition) + 4.2 Magnum (Spin-off)
    // Strategie: Größte IN-Quantity bekommt die Kostenbasis (= rename), kleinere als Spin-off
    if (remainingOuts.length === 1 && remainingIns.length >= 2) {
      const out = remainingOuts[0]
      const sortedIns = [...remainingIns].sort((a, b) => b.quantity - a.quantity)
      const mainIn = sortedIns[0]
      const spinoffIns = sortedIns.slice(1)

      if (out.isin !== mainIn.isin && out.quantity > 0 && mainIn.quantity > 0) {
        const mainRatio = mainIn.quantity / out.quantity
        renames.push({ date, fromIsin: out.isin, toIsin: mainIn.isin, ratio: mainRatio })
        toMark.push({
          tx: mainIn,
          meta: {
            corpActionType: 'rename',
            fromIsin: out.isin,
            splitRatio: mainRatio,
            notes: `Hauptposition nach Corp Action · von ${out.isin} · Ratio ${mainRatio.toFixed(4)} · Einstandskurs übernommen`,
          },
        })
        toMark.push({
          tx: out,
          meta: { notes: `Aufgegliedert in ${mainIn.isin} (Haupt) + ${spinoffIns.length} Spin-off(s)` },
        })
      }

      for (const spinoff of spinoffIns) {
        toMark.push({
          tx: spinoff,
          meta: {
            corpActionType: 'spinoff',
            fromIsin: out.isin,
            notes: `Spin-off aus ${out.isin} · Einstandskurs nicht eindeutig — bitte manuell prüfen`,
          },
        })
      }
    }

    // Fall 4: nur IN-Zeilen ohne korrespondierendes OUT → reiner Spin-off
    if (remainingOuts.length === 0 && remainingIns.length >= 1) {
      remainingIns.forEach(inTx => {
        toMark.push({
          tx: inTx,
          meta: {
            corpActionType: 'spinoff',
            notes: `Spin-off · Einstandskurs nicht aus CSV ableitbar — bitte manuell prüfen`,
          },
        })
      })
    }
  }

  // Markierungen anwenden
  for (const { tx, meta } of toMark) {
    Object.assign(tx, meta)
  }

  // Splits rückwirkend auf alle vorherigen Transaktionen dieser ISIN anwenden
  const adjusted = transactions
    .filter(tx => !toRemove.has(tx))
    .map(tx => {
      if (!tx.isin) return tx

      // Alle Splits, die NACH dieser Transaktion kommen und diese ISIN betreffen
      const applicableSplits = splits.filter(s => s.isin === tx.isin && s.date > tx.date)
      if (applicableSplits.length === 0) return tx

      // Kumulierter Ratio
      const cumRatio = applicableSplits.reduce((r, s) => r * s.ratio, 1)
      if (cumRatio === 1) return tx

      // Dividenden bleiben absolut, nur Stück-basierte Transaktionen werden skaliert
      if (tx.type === 'dividend' || tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal') {
        return tx
      }

      // Stück hoch, Preis runter, Gesamtwert bleibt
      return {
        ...tx,
        quantity: tx.quantity * cumRatio,
        price: tx.price / cumRatio,
      }
    })

  return { adjusted, splits, renames }
}

/**
 * Aus importierten Transaktionen die aktuellen Holdings rekonstruieren.
 * Verwendet die Durchschnittskostenmethode.
 *
 * Corporate-Action-Handling:
 *  • Stock Splits wurden bereits im Parser rückwirkend angewendet (quantity/price
 *    aller vor-Split-Transaktionen sind bereits normalisiert)
 *  • Ticker-Renames: Bei corpActionType='rename' wird die Kostenbasis aus der
 *    alten Position (per vorherigem transfer_out) übernommen, NICHT der Marktpreis
 *  • Security transfers (Depotübertrag): Der Transferkurs wird als Einstandskurs
 *    übernommen (es gibt keine bessere Info in der CSV), Holding wird aber markiert
 */
export function reconstructHoldings(
  transactions: ParsedTransaction[]
): Array<{
  symbol: string
  name: string
  isin: string
  quantity: number
  avgPrice: number
  earliestDate: string
  fromTransfer?: boolean   // wurde via Security transfer eingebucht → Einstandskurs = Transferkurs, nicht Original
  fromCorpAction?: boolean // wurde via Corporate Action eingebucht (Spin-off / Rename)
}> {
  // Transaktionen chronologisch sortieren — WICHTIG: auch Zeit berücksichtigen
  // Bei gleichem Datum+Zeit: zuerst transfer_in/buy, dann transfer_out/sell
  // (verhindert, dass Intraday-Sells vor den zugehörigen Buys verarbeitet werden)
  const typePriority: Record<string, number> = {
    transfer_in: 0,
    buy: 1,
    dividend: 2,
    sell: 3,
    transfer_out: 4,
    cash_deposit: 5,
    cash_withdrawal: 6,
  }
  const sorted = [...transactions]
    .filter(t => t.symbol && t.symbol !== 'CASH')
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date)
      if (dateCmp !== 0) return dateCmp
      // Gleicher Tag: Zeit-basiert sortieren, wenn vorhanden
      const timeA = a.time || ''
      const timeB = b.time || ''
      if (timeA && timeB) {
        const timeCmp = timeA.localeCompare(timeB)
        if (timeCmp !== 0) return timeCmp
      }
      // Fallback: Buy/Transfer_in vor Sell/Transfer_out
      return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99)
    })

  const positions: Record<string, {
    symbol: string
    name: string
    isin: string
    totalShares: number
    totalCost: number
    earliestDate: string
    fromTransfer: boolean
    fromCorpAction: boolean
  }> = {}

  // Gespeicherte Kostenbasis bei Transfers/Renames — per ISIN UND per Symbol indexieren
  const transferCostBasisBySymbol: Record<string, number> = {}
  const transferCostBasisByIsin: Record<string, number> = {}

  for (const tx of sorted) {
    const sym = tx.symbol!
    if (!positions[sym]) {
      positions[sym] = {
        symbol: sym,
        name: tx.name,
        isin: tx.isin || '',
        totalShares: 0,
        totalCost: 0,
        earliestDate: tx.date,
        fromTransfer: false,
        fromCorpAction: false,
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
        let costBasisPrice = tx.price

        if (tx.corpActionType === 'rename' && tx.fromIsin && transferCostBasisByIsin[tx.fromIsin]) {
          // Rename: Übertrage Kostenbasis von alter ISIN, passe per Ratio an
          // Beispiel Reckitt: 10 alt zu 55.20€ → 9.6 neu, ratio=0.96
          // Neuer avgPrice = alter avgPrice / ratio = 55.20 / 0.96 = 57.50€
          // → 9.6 * 57.50 = 552€ Total Cost (gleich wie vorher)
          const oldAvgPrice = transferCostBasisByIsin[tx.fromIsin]
          const ratio = tx.splitRatio || 1
          costBasisPrice = oldAvgPrice / ratio
          pos.fromCorpAction = true
        } else if (tx.corpActionType === 'spinoff') {
          // Spin-off: Kostenbasis nicht eindeutig → 0, Markierung für UI
          costBasisPrice = 0
          pos.fromCorpAction = true
        } else if (transferCostBasisBySymbol[sym]) {
          costBasisPrice = transferCostBasisBySymbol[sym]
        } else if (tx.isin && transferCostBasisByIsin[tx.isin]) {
          costBasisPrice = transferCostBasisByIsin[tx.isin]
        } else if (tx.isFromTransfer) {
          // Security Transfer ohne vorherige Out-Buchung → Transferkurs verwenden
          // (Original-Einstandskurs liegt nicht in CSV vor)
          pos.fromTransfer = true
        } else if (tx.isFromCorpAction) {
          pos.fromCorpAction = true
        }

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
          // Durchschnittspreis VOR dem Transfer speichern (für späteren transfer_in)
          const avgCost = pos.totalCost / pos.totalShares
          transferCostBasisBySymbol[sym] = avgCost
          if (tx.isin) transferCostBasisByIsin[tx.isin] = avgCost
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
      isin: p.isin,
      quantity: p.totalShares,
      avgPrice: p.totalShares > 0 ? p.totalCost / p.totalShares : 0,
      earliestDate: p.earliestDate,
      fromTransfer: p.fromTransfer || undefined,
      fromCorpAction: p.fromCorpAction || undefined,
    }))
}
