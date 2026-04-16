// src/lib/trading212CSVParser.ts
// Parser für Trading-212 CSV-Exporte (Menu → Chronik → Export → Alle Daten).
//
// CSV-Header:
//   Action,Time,ISIN,Ticker,Name,Notes,ID,No. of shares,Price / share,
//   Currency (Price / share),Exchange rate,Result,Currency (Result),
//   Gross Total,Currency (Gross Total),Withholding tax,Currency (Withholding tax),
//   Currency conversion fee,Currency (Currency conversion fee),Taxes,Currency (Taxes),
//   Net Total,Currency (Net Total)
//
// Wir konvertieren zu ParsedTransaction (gleicher Typ wie scalableCSVParser),
// damit reconstructHoldings + Import-Flow ohne Änderungen funktionieren.

import type { ParsedTransaction } from './scalableCSVParser'

export interface Trading212CSVParseResult {
  transactions: ParsedTransaction[]
  uniqueISINs: string[]
  skipped: string[]
  summary: {
    total: number
    imported: number
    skipped: number
    byType: Record<string, number>
  }
}

/**
 * Erkennt ein Trading-212 CSV am Header (erste Zeile).
 */
export function isTrading212CSV(text: string): boolean {
  const firstLine = text.split(/\r?\n/)[0] || ''
  return (
    firstLine.includes('Action') &&
    firstLine.includes('Ticker') &&
    firstLine.includes('No. of shares') &&
    firstLine.includes('Exchange rate')
  )
}

/**
 * Einfacher CSV-Parser mit Unterstützung für Anführungszeichen (Felder mit Komma).
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      // Escaped quote: ""
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += c
    }
  }
  fields.push(current)
  return fields
}

function parseNum(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.trim().replace(/[€$,]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseIsoDate(t: string): string {
  // Trading 212: "2026-01-20 08:53:57" (UTC)
  const match = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : t
}

function parseTime(t: string): string {
  const match = t.match(/(\d{2}:\d{2}:\d{2})/)
  return match ? match[1] : ''
}

/**
 * Parst ein Trading-212 CSV und liefert ParsedTransaction[].
 *
 * Action-Mapping:
 *   Deposit          → cash_deposit (inkl. Free Shares Promotion / Bonus)
 *   Withdrawal       → cash_withdrawal
 *   Market buy       → buy
 *   Market sell      → sell
 *   Limit buy/sell   → buy/sell (behandelt wie Market)
 *   Stop buy/sell    → buy/sell
 *   Dividend*        → dividend
 *   Interest         → cash_deposit (als Zinszahlung)
 *   Stock split close→ transfer_out (wird mit Stock split open als Split erkannt)
 *   Stock split open → transfer_in
 *   Currency conversion → ignoriert (interne FX-Bewegung, kein Portfolio-Event)
 */
export function parseTrading212CSV(csvText: string): Trading212CSVParseResult {
  const transactions: ParsedTransaction[] = []
  const skipped: string[] = []
  const uniqueISINs = new Set<string>()
  const byType: Record<string, number> = {}

  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) {
    return {
      transactions: [],
      uniqueISINs: [],
      skipped: ['CSV enthält keine Datenzeilen'],
      summary: { total: 0, imported: 0, skipped: 0, byType: {} },
    }
  }

  const header = parseCSVLine(lines[0])
  const col = (name: string) => header.findIndex(h => h.trim() === name)
  const idx = {
    action: col('Action'),
    time: col('Time'),
    isin: col('ISIN'),
    ticker: col('Ticker'),
    name: col('Name'),
    notes: col('Notes'),
    id: col('ID'),
    shares: col('No. of shares'),
    pricePerShare: col('Price / share'),
    priceCurrency: col('Currency (Price / share)'),
    fxRate: col('Exchange rate'),
    result: col('Result'),
    grossTotal: col('Gross Total'),
    grossCurrency: col('Currency (Gross Total)'),
    wht: col('Withholding tax'),
    fxFee: col('Currency conversion fee'),
    taxes: col('Taxes'),
    netTotal: col('Net Total'),
  }

  // Index-Dataset pro Split-Datum, damit wir zusammengehörige close/open-Zeilen
  // auch ohne identisches Time-Feld matchen können (auch wenn sie in der CSV sehr
  // wahrscheinlich identische Time-Stamps haben).
  // Nachgelagerte reconstructHoldings erkennt Split anhand von transfer_in + _out
  // am gleichen Tag mit gleicher ISIN.

  for (let lineNo = 1; lineNo < lines.length; lineNo++) {
    const fields = parseCSVLine(lines[lineNo])
    if (fields.length < 5) continue

    const action = (fields[idx.action] || '').trim()
    const time = fields[idx.time] || ''
    const date = parseIsoDate(time)
    const timeOnly = parseTime(time)
    if (!action || !date) continue

    const isin = (fields[idx.isin] || '').trim()
    const ticker = (fields[idx.ticker] || '').trim()
    const name = (fields[idx.name] || '').trim() || ticker
    const notesIn = (fields[idx.notes] || '').trim()
    const shares = parseNum(fields[idx.shares])
    const grossTotal = parseNum(fields[idx.grossTotal])
    const netTotal = parseNum(fields[idx.netTotal])
    const fxFee = parseNum(fields[idx.fxFee])
    const taxes = Math.abs(parseNum(fields[idx.taxes]))
    const priceCurrency = (fields[idx.priceCurrency] || 'EUR').trim()
    const fxRate = parseNum(fields[idx.fxRate])

    // Cash-Operationen
    if (action === 'Deposit' || action === 'Interest') {
      if (grossTotal <= 0) continue
      transactions.push({
        date,
        type: 'cash_deposit',
        isin: '',
        symbol: 'CASH',
        name: notesIn || (action === 'Interest' ? 'Zinsen' : 'Einzahlung'),
        quantity: 1,
        price: grossTotal,
        totalValue: grossTotal,
        fee: 0,
        tax: 0,
        notes: `Trading 212 · ${notesIn || action}`,
        originalType: action,
      })
      byType.cash_deposit = (byType.cash_deposit || 0) + 1
      continue
    }
    if (action === 'Withdrawal') {
      const amt = Math.abs(grossTotal)
      if (amt <= 0) continue
      transactions.push({
        date,
        type: 'cash_withdrawal',
        isin: '',
        symbol: 'CASH',
        name: notesIn || 'Auszahlung',
        quantity: 1,
        price: amt,
        totalValue: amt,
        fee: 0,
        tax: 0,
        notes: `Trading 212 · ${notesIn || 'Auszahlung'}`,
        originalType: action,
      })
      byType.cash_withdrawal = (byType.cash_withdrawal || 0) + 1
      continue
    }

    // Käufe / Verkäufe (alle Order-Arten)
    const isBuy = /^(Market|Limit|Stop)\s+buy$/i.test(action)
    const isSell = /^(Market|Limit|Stop)\s+sell$/i.test(action)
    if ((isBuy || isSell) && isin && shares > 0 && grossTotal > 0) {
      uniqueISINs.add(isin)
      transactions.push({
        date,
        type: isBuy ? 'buy' : 'sell',
        isin,
        symbol: ticker,
        name,
        quantity: shares,
        // Wir speichern den EUR-Preis (Gross/Qty), nicht den USD-Originalpreis —
        // konsistent mit unseren anderen Parsern und dem Cashflow-Modell.
        price: parseFloat((grossTotal / shares).toFixed(6)),
        totalValue: grossTotal,
        fee: fxFee,
        tax: 0,
        notes: `Trading 212 · ${isBuy ? 'Kauf' : 'Verkauf'}${
          priceCurrency !== 'EUR'
            ? ` · ${priceCurrency} ${parseNum(fields[idx.pricePerShare]).toFixed(2)} @ FX ${fxRate.toFixed(4)}`
            : ''
        }${fxFee > 0 ? ` · FX-Gebühr ${fxFee.toFixed(2)}€` : ''}`,
        originalType: action,
      })
      byType[isBuy ? 'buy' : 'sell'] = (byType[isBuy ? 'buy' : 'sell'] || 0) + 1
      continue
    }

    // Dividenden (alle Sub-Typen: "Dividend (Dividend)", "Dividend (Tax exempted)", etc.)
    if (/^Dividend/i.test(action)) {
      if (!isin || netTotal <= 0) continue
      uniqueISINs.add(isin)
      transactions.push({
        date,
        type: 'dividend',
        isin,
        symbol: ticker,
        name,
        quantity: shares > 0 ? shares : 1,
        price: shares > 0 ? netTotal / shares : netTotal,
        totalValue: netTotal,
        fee: 0,
        tax: taxes,
        notes: `Trading 212 · Dividende${
          priceCurrency !== 'EUR'
            ? ` · ${priceCurrency} ${parseNum(fields[idx.pricePerShare]).toFixed(4)}/Stk @ FX ${fxRate.toFixed(4)}`
            : ''
        }${taxes > 0 ? ` · Steuern ${taxes.toFixed(2)}€` : ''}${
          parseNum(fields[idx.wht]) > 0 ? ` · WHT ${parseNum(fields[idx.wht]).toFixed(2)}` : ''
        }`,
        originalType: action,
      })
      byType.dividend = (byType.dividend || 0) + 1
      continue
    }

    // Stock Splits: close = transfer_out alte Menge, open = transfer_in neue Menge.
    // reconstructHoldings erkennt das Paar (gleiches Datum, gleiche ISIN,
    // transfer_out+transfer_in) als Split und skaliert die vorherigen
    // Transaktionen retroaktiv (quantity × ratio, price / ratio).
    if (action === 'Stock split close' && isin && shares > 0) {
      uniqueISINs.add(isin)
      transactions.push({
        date,
        type: 'transfer_out',
        isin,
        symbol: ticker,
        name,
        quantity: shares,
        price: 0,
        totalValue: 0,
        fee: 0,
        tax: 0,
        notes: `Trading 212 · Stock Split (Close)`,
        originalType: action,
        isFromCorpAction: true,
        corpActionType: 'split',
      })
      byType.transfer_out = (byType.transfer_out || 0) + 1
      continue
    }
    if (action === 'Stock split open' && isin && shares > 0) {
      uniqueISINs.add(isin)
      transactions.push({
        date,
        type: 'transfer_in',
        isin,
        symbol: ticker,
        name,
        quantity: shares,
        price: 0,
        totalValue: 0,
        fee: 0,
        tax: 0,
        notes: `Trading 212 · Stock Split (Open)`,
        originalType: action,
        isFromCorpAction: true,
        corpActionType: 'split',
      })
      byType.transfer_in = (byType.transfer_in || 0) + 1
      continue
    }

    // Currency conversion ignorieren — interne FX, kein Portfolio-Effekt
    if (/Currency conversion/i.test(action)) {
      skipped.push(`Zeile ${lineNo + 1}: Currency conversion (intern, übersprungen)`)
      continue
    }

    // Unbekannte Action-Typen loggen
    skipped.push(`Zeile ${lineNo + 1}: Unbekannter Action-Typ "${action}" — übersprungen`)
  }

  return {
    transactions,
    uniqueISINs: Array.from(uniqueISINs),
    skipped,
    summary: {
      total: lines.length - 1,
      imported: transactions.length,
      skipped: skipped.length,
      byType,
    },
  }
}
