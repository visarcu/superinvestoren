// src/lib/tradeRepublicCSVParser.ts — Parser für den seit April 2026 verfügbaren
// Trade-Republic-CSV-Export (Transaktionsexport).
//
// Format (Komma-getrennt, quoted, ISO-Dates, englisches Zahlenformat):
//   "datetime","date","account_type","category","type","asset_class","name",
//   "symbol","shares","price","amount","fee","tax","currency",
//   "original_amount","original_currency","fx_rate","description",
//   "transaction_id","counterparty_name","counterparty_iban",
//   "payment_reference","mcc_code"
//
// WICHTIG:
//  • `symbol` enthält die ISIN, nicht den Ticker — die Auflösung erfolgt später
//    über das ISIN-Mapping im ImportWizard.
//  • `shares` ist signed (negativ bei Verkauf/Ausbuchung).
//  • `amount` ist aus Cash-Konto-Sicht signed (negativ bei Buy, positiv bei Sell/
//    Dividend/Inbound). Immer in EUR (Account-Währung).
//  • `fee` und `tax` sind negative Werte in der CSV (abs() verwenden).
//  • `original_amount` + `original_currency` + `fx_rate` enthalten FX-Infos
//    (z.B. für Dividenden von HK-Aktien), sind aber für den EUR-Account
//    meist irrelevant weil `amount` bereits umgerechnet ist.

import type {
  ParsedTransaction,
  CSVParseResult,
  MappedTransactionType,
  StockSplit,
  TickerRename,
} from './scalableCSVParser'

interface TRRow {
  datetime: string
  date: string
  accountType: string
  category: string // TRADING | CASH | CORPORATE_ACTION
  type: string
  assetClass: string
  name: string
  symbol: string // = ISIN
  shares: number
  price: number
  amount: number // signed aus Cash-Sicht
  fee: number // negativ in CSV
  tax: number // negativ in CSV
  currency: string
  originalAmount: number
  originalCurrency: string
  fxRate: number
  description: string
  transactionId: string
}

/**
 * CSV-Zeile parsen (Komma-getrennt, Anführungszeichen beachten)
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
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function toNumber(value: string): number {
  if (!value || value.trim() === '') return 0
  const n = parseFloat(value.trim())
  return isNaN(n) ? 0 : n
}

/**
 * Erkennung, ob der übergebene CSV-Inhalt der neue Trade-Republic-Export ist.
 * Prüft gegen die charakteristische Header-Zeile.
 */
export function isTradeRepublicCSV(csvContent: string): boolean {
  const firstLine = csvContent.split('\n')[0]?.toLowerCase() ?? ''
  // Charakteristische Kombination von Spalten, die nur TR so liefert
  return (
    firstLine.includes('datetime') &&
    firstLine.includes('account_type') &&
    firstLine.includes('asset_class') &&
    firstLine.includes('fx_rate') &&
    firstLine.includes('transaction_id')
  )
}

/**
 * TR-(category, type)-Kombination auf unseren Transaktionstyp mappen.
 */
function mapTransactionType(row: TRRow): MappedTransactionType | null {
  const { category, type, shares, amount } = row
  const cashSign = amount >= 0 ? 'cash_deposit' : 'cash_withdrawal'

  if (category === 'TRADING') {
    switch (type) {
      case 'BUY':
      case 'SAVINGS_PLAN':
      case 'SAVINGSPLAN':
        return 'buy'
      case 'SELL':
        return 'sell'
      default:
        return null
    }
  }

  if (category === 'CASH') {
    switch (type) {
      case 'DIVIDEND':
        // Positiv = Dividende, negativ = Storno (sehr selten) → cash_withdrawal
        return amount >= 0 ? 'dividend' : 'cash_withdrawal'

      // Ein-/Auszahlungen
      case 'CUSTOMER_INPAYMENT':
      case 'CUSTOMER_INBOUND':
        return cashSign
      case 'CUSTOMER_OUTPAYMENT':
      case 'CUSTOMER_OUTBOUND':
        return cashSign

      // Auszahlungen: TR bucht diese in der CSV als _REQUEST-Variante, ohne
      // zusätzlichen _OUTBOUND-Folge-Event. In den getesteten Exporten sind
      // _REQUESTs die eigentliche Auszahlung (kein matching OUTBOUND folgt).
      // Darum buchen wir sie als cash_withdrawal. Falls TR irgendwann doch
      // sowohl REQUEST als auch OUTBOUND liefert, fängt unser Dedup-Check
      // (date|type|symbol|qty|price) das nicht — dann müsste ein späterer
      // Import manuell geprüft werden. Für den aktuellen TR-Export ist das
      // der einzige Weg, die Cash-Position korrekt abzubilden.
      case 'CUSTOMER_OUTBOUND_REQUEST':
      case 'CUSTOMER_OUTPAYMENT_REQUEST':
        return cashSign

      // Promos/Aktionen (Werbeprämien, Empfehlungen, Stockperks)
      case 'REFERRAL':
      case 'PROMO':
      case 'BONUS':
      case 'STOCKPERK':
        return cashSign

      // Zinsen auf Kontoguthaben
      case 'INTEREST':
      case 'INTEREST_PAYOUT':
      case 'INTEREST_PAYMENT':
        return cashSign

      // EXCHANGE = Barausgleich aus Corp-Action (z.B. Zwangsumtausch-Spitzenausgleich)
      case 'EXCHANGE':
        return amount === 0 ? null : cashSign

      // DISTRIBUTION = Ausschüttung (Anleihen-ETFs, manche Dividenden-Varianten)
      case 'DISTRIBUTION':
      case 'COUPON':
        return amount >= 0 ? 'dividend' : 'cash_withdrawal'

      // TR-interne Geldtransfers (Konto-zu-Konto)
      case 'TRANSFER_OUTBOUND':
      case 'TRANSFER_INBOUND':
        return cashSign

      // Sonstige Cash-Bewegungen (Geschenke, Gutschriften)
      case 'GIFT':
      case 'SAVEBACK':
        return cashSign

      // Steuer-Verrechnungskonto (häufig amount=0, wird nur gebucht wenn echt)
      case 'SEC_ACCOUNT':
      case 'TAX_CORRECTION':
      case 'TAX_REFUND':
      case 'TAX_OPTIMIZATION':
        return amount === 0 ? null : cashSign

      // Karten-/Pay-Zahlungen
      case 'CARD_PAYMENT':
      case 'CARD_ORDER':
      case 'CARD_REFUND':
        return cashSign

      // Gebühren
      case 'FEE':
      case 'COMMISSION':
      case 'MONTHLY_FEE':
        return cashSign

      default:
        // Fallback: unbekannter CASH-Typ ohne Shares → als Ein-/Auszahlung buchen
        // wenn ein echter Betrag vorliegt. Sonst skippen.
        if (amount !== 0 && shares === 0) return cashSign
        return null
    }
  }

  if (category === 'DELIVERY') {
    // Kostenlose Aktienlieferung (z.B. Promo-Aktie)
    if (type === 'FREE_DELIVERY') {
      if (shares > 0) return 'transfer_in'
      if (shares < 0) return 'transfer_out'
      return null
    }
    return null
  }

  if (category === 'CORPORATE_ACTION') {
    // Stornierte Corp-Actions: TR bucht bei einer Stornierung die Ursprungs-Zeile
    // erneut als "_CANCELLED"-Variante mit umgekehrtem shares-Vorzeichen. Beispiel:
    //   +0.1 STOCK_DIVIDEND  (gebucht)
    //   -0.1 STOCK_DIVIDEND_CANCELLED  (storno, hebt die Buchung auf)
    // Um das netto korrekt zu verrechnen, erzeugen wir für *_CANCELLED ein
    // transfer_out mit dem abs-Wert — das zieht die Shares wieder ab.
    if (type.endsWith('_CANCELLED')) {
      if (shares < 0) return 'transfer_out'
      if (shares > 0) return 'transfer_in'
      return null
    }

    switch (type) {
      case 'SPLIT':
      case 'STOCK_DIVIDEND':
      case 'UNBUNDLING':
      case 'SPINOFF':
      case 'MERGER':
      case 'REDEMPTION':
      case 'OPTIONAL_DIVIDEND':
        // Shares-Vorzeichen bestimmt Richtung
        if (shares > 0) return 'transfer_in'
        if (shares < 0) return 'transfer_out'
        // Bei OPTIONAL_DIVIDEND mit Cash-Wahl: amount > 0 → dividend
        if (type === 'OPTIONAL_DIVIDEND' && amount > 0) return 'dividend'
        return null
      case 'WRITE_OFF':
      case 'DELISTING':
        // Write-off ist typischerweise negative shares (ausgebucht)
        if (shares < 0) return 'transfer_out'
        if (shares > 0) return 'transfer_in'
        return null
      default:
        return null
    }
  }

  return null
}

/**
 * Notiz-Text generieren
 */
function generateNotes(row: TRRow, mappedType: MappedTransactionType): string {
  const parts: string[] = []

  // Original-Typ vermerken, wenn relevant
  const typeLabels: Record<string, string> = {
    REFERRAL: 'Werbeprämie',
    STOCKPERK: 'Stockperk (Gratisaktie)',
    PROMO: 'Aktionsprämie',
    BONUS: 'Bonus',
    INTEREST: 'Zinsgutschrift',
    INTEREST_PAYOUT: 'Zinsgutschrift',
    SEC_ACCOUNT: 'Steuerverrechnungskonto',
    TAX_CORRECTION: 'Steuerkorrektur',
    TAX_REFUND: 'Steuerrückerstattung',
    TAX_OPTIMIZATION: 'Steueroptimierung',
    FEE: 'Gebühr',
    COMMISSION: 'Ordergebühr',
    MONTHLY_FEE: 'Monatliche Gebühr',
    SPLIT: 'Aktiensplit',
    STOCK_DIVIDEND: 'Aktiendividende',
    UNBUNDLING: 'Abspaltung / Unbundling',
    SPINOFF: 'Spin-off',
    MERGER: 'Fusion',
    REDEMPTION: 'Rückzahlung',
    WRITE_OFF: 'Ausbuchung (Write-off)',
    DELISTING: 'Delisting',
    SAVINGS_PLAN: 'Sparplan',
    SAVINGSPLAN: 'Sparplan',
    CARD_PAYMENT: 'Kartenzahlung',
  }
  if (typeLabels[row.type]) parts.push(typeLabels[row.type])

  // FX-Info bei Fremdwährung
  if (row.originalCurrency && row.originalCurrency !== 'EUR' && row.originalAmount) {
    parts.push(
      `${row.originalCurrency} ${Math.abs(row.originalAmount).toFixed(2)} @ FX ${row.fxRate.toFixed(4)}`
    )
  }

  // Gebühren / Steuern vermerken
  if (Math.abs(row.fee) > 0) parts.push(`Gebühr ${Math.abs(row.fee).toFixed(2)}€`)
  if (Math.abs(row.tax) > 0) parts.push(`Steuer ${Math.abs(row.tax).toFixed(2)}€`)

  // Description kürzen wenn informativ
  const cleanDesc = row.description
    .replace(/^(SPLIT|WRITE_OFF|UNBUNDLING|STOCK_DIVIDEND)\s+\S+\s*/i, '')
    .replace(/Customer [0-9a-f-]{36}\s*/i, '')
    .replace(/Counterpart=[0-9a-f-]{36}\s*/i, '')
    .trim()
  if (cleanDesc && cleanDesc.length > 0 && cleanDesc.length < 60 && !/^No\s/i.test(cleanDesc)) {
    parts.push(cleanDesc)
  }

  parts.push('CSV-Import (Trade Republic)')

  return parts.join(' · ')
}

/**
 * Trade-Republic-CSV parsen
 */
export function parseTradeRepublicCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0)
  const transactions: ParsedTransaction[] = []
  const skipped: CSVParseResult['skipped'] = []
  const isinSet = new Set<string>()
  const typeCounts: Record<string, number> = {}

  if (lines.length < 2) {
    return {
      transactions: [],
      uniqueISINs: [],
      skipped: [],
      summary: { total: 0, imported: 0, skipped: 0, byType: {} },
    }
  }

  // Header ermitteln → Index-Lookup statt fester Position
  const header = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const iDate = idx('date')
  const iDatetime = idx('datetime')
  const iCategory = idx('category')
  const iType = idx('type')
  const iAssetClass = idx('asset_class')
  const iName = idx('name')
  const iSymbol = idx('symbol')
  const iShares = idx('shares')
  const iPrice = idx('price')
  const iAmount = idx('amount')
  const iFee = idx('fee')
  const iTax = idx('tax')
  const iCurrency = idx('currency')
  const iOriginalAmount = idx('original_amount')
  const iOriginalCurrency = idx('original_currency')
  const iFxRate = idx('fx_rate')
  const iDescription = idx('description')
  const iTxId = idx('transaction_id')

  if (iDate < 0 || iCategory < 0 || iType < 0 || iShares < 0 || iAmount < 0) {
    return {
      transactions: [],
      uniqueISINs: [],
      skipped: [
        {
          row: 1,
          reason: 'CSV-Header entspricht nicht dem Trade-Republic-Format',
          data: lines[0].substring(0, 80),
        },
      ],
      summary: { total: 0, imported: 0, skipped: 1, byType: {} },
    }
  }

  const get = (fields: string[], i: number) =>
    i >= 0 && i < fields.length ? fields[i].replace(/^"|"$/g, '') : ''

  for (let i = 1; i < lines.length; i++) {
    const rawFields = parseCSVLine(lines[i])

    if (rawFields.length < Math.max(iAmount, iShares) + 1) {
      skipped.push({ row: i + 1, reason: 'Unvollständige Zeile', data: lines[i].substring(0, 80) })
      continue
    }

    const row: TRRow = {
      datetime: get(rawFields, iDatetime),
      date: get(rawFields, iDate),
      accountType: 'DEFAULT',
      category: get(rawFields, iCategory),
      type: get(rawFields, iType),
      assetClass: get(rawFields, iAssetClass),
      name: get(rawFields, iName),
      symbol: get(rawFields, iSymbol),
      shares: toNumber(get(rawFields, iShares)),
      price: toNumber(get(rawFields, iPrice)),
      amount: toNumber(get(rawFields, iAmount)),
      fee: toNumber(get(rawFields, iFee)),
      tax: toNumber(get(rawFields, iTax)),
      currency: get(rawFields, iCurrency) || 'EUR',
      originalAmount: toNumber(get(rawFields, iOriginalAmount)),
      originalCurrency: get(rawFields, iOriginalCurrency),
      fxRate: toNumber(get(rawFields, iFxRate)),
      description: get(rawFields, iDescription),
      transactionId: get(rawFields, iTxId),
    }

    const mapped = mapTransactionType(row)
    if (!mapped) {
      skipped.push({
        row: i + 1,
        reason: `Nicht unterstützter Typ: ${row.category}·${row.type}`,
        data: `${row.name || row.symbol} ${row.amount}${row.currency}`,
      })
      continue
    }

    // ISIN tracken (nur wenn vorhanden)
    if (row.symbol && row.symbol.length > 0) {
      isinSet.add(row.symbol)
    }

    // Preis pro Stück in EUR berechnen:
    //  • Bei Buy/Sell: abs(amount) / abs(shares) inkl. Gebühren-effekt — nein, amount
    //    enthält Gebühren schon nicht, fee ist separat. Also: bevorzuge explizites price
    //    wenn vorhanden, sonst amount/shares.
    let pricePerShare = Math.abs(row.price)
    const absShares = Math.abs(row.shares)
    if (pricePerShare === 0 && absShares > 0) {
      pricePerShare = Math.abs(row.amount) / absShares
    }

    const totalValue =
      Math.abs(row.amount) > 0 ? Math.abs(row.amount) : pricePerShare * absShares

    const parsed: ParsedTransaction = {
      date: row.date,
      time: row.datetime ? row.datetime.slice(11, 19) : undefined,
      type: mapped,
      isin: row.symbol || '',
      name: row.name || row.description || '',
      quantity: absShares,
      price: pricePerShare,
      totalValue,
      fee: Math.abs(row.fee),
      tax: Math.abs(row.tax),
      notes: generateNotes(row, mapped),
      originalType: `${row.category}·${row.type}`,
      isFromCorpAction: row.category === 'CORPORATE_ACTION',
    }

    // Dividende: quantity=1, price=totalValue netto nach Quellensteuer.
    // TR-CSV hat amount = brutto-Ausschüttung, tax = zusätzlich abgezogene
    // Quellensteuer (negativer Wert). Netto-Cashflow = amount - |tax|.
    // Das ist auch die Zahl, die Parqet anzeigt und das Deutsche Tax-Reporting
    // erwartet (was tatsächlich auf dem Konto ankam).
    if (mapped === 'dividend') {
      const netValue = Math.max(0, Math.abs(row.amount) - Math.abs(row.tax))
      parsed.quantity = 1
      parsed.price = netValue
      parsed.totalValue = netValue
      parsed.isin = row.symbol || ''
    }

    // Cash-Transaktionen (kein Wertpapier-Kontext)
    if (mapped === 'cash_deposit' || mapped === 'cash_withdrawal') {
      parsed.isin = ''
      parsed.symbol = 'CASH'
      parsed.quantity = 1
      parsed.price = totalValue
    }

    // Corporate Actions ohne Preis: totalValue=0, price=0 — der Import-Wizard
    // wird später historische Schlusskurse für transfer_in zum Kaufzeitpunkt laden.
    if (parsed.isFromCorpAction && (!row.price || row.price === 0)) {
      parsed.price = 0
      parsed.totalValue = 0
    }

    transactions.push(parsed)
    typeCounts[mapped] = (typeCounts[mapped] || 0) + 1
  }

  // Corporate-Actions normalisieren (erkennt Splits und Ticker-Renames aus
  // gepaarten CA-Zeilen gleichen Datums). TR liefert Splits oft nur als IN
  // ohne OUT — dort bleibt's bei transfer_in + Note "Aktiensplit".
  const { adjusted, splits, renames } = normalizeCorporateActions(transactions)

  const finalTypeCounts: Record<string, number> = {}
  adjusted.forEach(t => {
    finalTypeCounts[t.type] = (finalTypeCounts[t.type] || 0) + 1
  })

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
 * Erkennt Stock-Splits (OUT + IN mit gleicher ISIN) und Ticker-Renames
 * (OUT + IN mit unterschiedlicher ISIN). Gleicher Ansatz wie im Scalable-Parser.
 */
function normalizeCorporateActions(transactions: ParsedTransaction[]): {
  adjusted: ParsedTransaction[]
  splits: StockSplit[]
  renames: TickerRename[]
} {
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
    if (group.length < 2) continue

    const outs = group.filter(t => t.type === 'transfer_out')
    const ins = group.filter(t => t.type === 'transfer_in')

    // Split: gleiche ISIN, OUT + IN
    for (const out of outs) {
      const sameIsinIn = ins.find(i => i.isin === out.isin && !toRemove.has(i))
      if (sameIsinIn && out.quantity > 0 && sameIsinIn.quantity > 0) {
        const ratio = sameIsinIn.quantity / out.quantity
        splits.push({ date, isin: out.isin, ratio })
        toRemove.add(out)
        toRemove.add(sameIsinIn)
      }
    }

    // Rename: genau 1 OUT + 1 IN, unterschiedliche ISIN
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
            notes: `${inTx.notes} · Ticker-Umstellung von ${out.isin} · Ratio ${ratio.toFixed(4)}`,
          },
        })
        toMark.push({
          tx: out,
          meta: {
            notes: `${out.notes} · Ticker-Umstellung zu ${inTx.isin}`,
          },
        })
      }
    }
  }

  // Splits auf alle vorherigen Transaktionen dieser ISIN anwenden
  const adjusted: ParsedTransaction[] = []
  for (const tx of transactions) {
    if (toRemove.has(tx)) continue
    const mark = toMark.find(m => m.tx === tx)
    if (mark) {
      adjusted.push({ ...tx, ...mark.meta })
    } else {
      adjusted.push({ ...tx })
    }
  }

  // Split-Ratio rückwirkend anwenden: quantity *= ratio, price /= ratio
  // (totalValue bleibt, weil das investierte Kapital unverändert ist)
  for (const split of splits) {
    for (const tx of adjusted) {
      if (tx.isin !== split.isin) continue
      if (new Date(tx.date).getTime() >= new Date(split.date).getTime()) continue
      if (tx.type !== 'buy' && tx.type !== 'sell' && tx.type !== 'transfer_in' && tx.type !== 'transfer_out') continue
      tx.quantity = tx.quantity * split.ratio
      if (tx.price > 0) tx.price = tx.price / split.ratio
    }
  }

  return { adjusted, splits, renames }
}
