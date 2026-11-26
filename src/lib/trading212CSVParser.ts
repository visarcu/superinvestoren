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
// Ältere Exporte (bis etwa 2023) nennen die Beträge "Total" statt "Gross Total",
// haben kein "Net Total" und tragen die Währung im Spaltennamen
// ("Total (EUR)", "Result (EUR)", "Currency conversion fee (EUR)").
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
 * Trading 212 schreibt bei EU-Aktien den Ticker ohne Börsen-Suffix (z.B.
 * "P911" für Porsche, "ZAL" für Zalando). Unser /api/quotes erwartet aber
 * das FMP-Format mit Suffix (P911.DE). Bei deutschen und österreichischen
 * ISINs hängen wir '.DE' an (Xetra). Irische, luxemburgische,
 * niederländische oder französische ISINs (ETFs, ASML, LVMH …) bekamen das
 * Suffix bisher ebenfalls und landeten als "VUAA.DE" oder "ASML.DE" im
 * Depot, obwohl das Kürzel ohnehin über die ISIN-Auflösung bestimmt wird.
 * Dort bleibt der Ticker von Trading 212 stehen; das Symbol liefert die
 * Auflösung der ISIN.
 *
 * US-Ticker (MSFT, BKNG, SPGI, INTU) bleiben unverändert — die kennt FMP
 * direkt ohne Suffix.
 */
function normalizeTicker(ticker: string, isin: string): string {
  if (!ticker) return ticker
  if (ticker.includes('.')) return ticker
  const country = isin.substring(0, 2).toUpperCase()
  if (country === 'DE' || country === 'AT') return `${ticker}.DE`
  return ticker
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Kurswert aus Stückzahl × Kurs, umgerechnet in Kontowährung. Trading 212
 * notiert den Kurs bei Trades als USD je EUR (1,18), bei Dividenden als EUR
 * je USD (0,86) — wir nehmen die Richtung, die zum Gross Total passt.
 */
function computedTradeValue(shares: number, price: number, fxRate: number, gross: number): number | null {
  if (!(shares > 0) || !(price > 0) || !(fxRate > 0)) return null
  const raw = shares * price
  const divided = raw / fxRate
  const multiplied = raw * fxRate
  return Math.abs(divided - gross) <= Math.abs(multiplied - gross) ? divided : multiplied
}

/**
 * Kurswert eines Trades ohne FX-Gebühr.
 *
 * "Gross Total" ist bei Trading 212 die Kontobewegung: Käufe inklusive
 * FX-Gebühr (BKNG 17.02.2026: 0,0856 × 4138 USD / 1,1821 = 299,55 € Kurswert,
 * Gross Total 300,00 €, Gebühr 0,45 €). Unser Cash-Modell zieht Kurswert UND
 * Gebühr ab — mit Gross Total als Kurswert zählte die Gebühr doppelt, im Cash
 * wie in der Kostenbasis. Für Fremdwährungs-Verkäufe liegt noch kein Export
 * vor; wir prüfen daher gegen den errechneten Kurswert, ob die Gebühr im Gross
 * Total steckt, und fallen sonst auf die Kauf-Konvention zurück (Verkauf:
 * Gutschrift nach Abzug der Gebühr).
 */
function tradeValueExFee(
  isBuy: boolean,
  gross: number,
  fxFee: number,
  shares: number,
  price: number,
  fxRate: number
): number {
  if (fxFee <= 0) return gross
  const feeIncluded = isBuy ? gross - fxFee : gross + fxFee
  const computed = computedTradeValue(shares, price, fxRate, gross)
  if (computed === null) return round2(feeIncluded)
  return Math.abs(feeIncluded - computed) <= Math.abs(gross - computed)
    ? round2(feeIncluded)
    : gross
}

/**
 * Parst ein Trading-212 CSV und liefert ParsedTransaction[].
 *
 * Action-Mapping:
 *   Deposit          → cash_deposit (inkl. Free Shares Promotion / Bonus)
 *   Withdrawal       → cash_withdrawal
 *   Card debit       → cash_withdrawal (Kartenzahlung vom Invest-Konto)
 *   Card …  (positiv)→ cash_deposit (z.B. Erstattung)
 *   Spending cashback→ cash_deposit
 *   Market buy       → buy  (totalValue = Kurswert ohne FX-Gebühr, fee = FX-Gebühr)
 *   Market sell      → sell (fee = FX-Gebühr + einbehaltene Steuern)
 *   Limit buy/sell   → buy/sell (behandelt wie Market)
 *   Stop buy/sell    → buy/sell
 *   Dividend*        → dividend
 *   Interest / Interest on cash → cash_deposit (als Zinszahlung)
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
  // Toleranter Spalten-Match: exakt oder mit Klammer-Suffix. Trading 212
  // benennt die Zeitspalte je nach Export "Time" ODER "Time (UTC)" — ohne
  // diesen Fallback bleibt idx.time = -1, das Datum jeder Zeile ist leer und
  // der Parser überspringt still ALLE Zeilen ("Keine Transaktionen erkannt").
  const colLoose = (name: string) => {
    const exact = col(name)
    if (exact >= 0) return exact
    return header.findIndex(h => h.trim() === name || h.trim().startsWith(`${name} (`))
  }
  // Älteres Format: "Total" (bzw. "Total (EUR)") statt "Gross Total", kein
  // "Net Total". Ohne diesen Rückfall blieben alle Beträge 0, Käufe und
  // Dividenden fielen still weg und Einzahlungen fehlten.
  const grossTotalIdx = col('Gross Total') >= 0 ? col('Gross Total') : colLoose('Total')
  const idx = {
    action: col('Action'),
    time: colLoose('Time'),
    isin: col('ISIN'),
    ticker: col('Ticker'),
    name: col('Name'),
    notes: col('Notes'),
    id: col('ID'),
    shares: col('No. of shares'),
    pricePerShare: col('Price / share'),
    priceCurrency: col('Currency (Price / share)'),
    fxRate: col('Exchange rate'),
    result: colLoose('Result'),
    grossTotal: grossTotalIdx,
    grossCurrency: col('Currency (Gross Total)'),
    wht: colLoose('Withholding tax'),
    fxFee: colLoose('Currency conversion fee'),
    merchantName: col('Merchant name'),
    taxes: colLoose('Taxes'),
    netTotal: col('Net Total') >= 0 ? col('Net Total') : grossTotalIdx,
  }

  // Index-Dataset pro Split-Datum, damit wir zusammengehörige close/open-Zeilen
  // auch ohne identisches Time-Feld matchen können (auch wenn sie in der CSV sehr
  // wahrscheinlich identische Time-Stamps haben).
  // Nachgelagerte reconstructHoldings erkennt Split anhand von transfer_in + _out
  // am gleichen Tag mit gleicher ISIN.

  // Jede Zeile bekommt eine Kennung, an der der automatische Abgleich sie beim
  // nächsten Mal wiedererkennt. Dividenden haben bei Trading 212 keine ID.
  let rowId = ''
  const seenKeys = new Map<string, number>()
  const add = (tx: ParsedTransaction) => transactions.push({ ...tx, externalId: rowId })

  for (let lineNo = 1; lineNo < lines.length; lineNo++) {
    const fields = parseCSVLine(lines[lineNo])
    if (fields.length < 5) continue

    const action = (fields[idx.action] || '').trim()
    const time = fields[idx.time] || ''
    const date = parseIsoDate(time)
    const timeOnly = parseTime(time)
    if (!action || !date) continue

    const isin = (fields[idx.isin] || '').trim()
    const rawTicker = (fields[idx.ticker] || '').trim()
    const ticker = normalizeTicker(rawTicker, isin)
    const name = (fields[idx.name] || '').trim() || ticker
    const notesIn = (fields[idx.notes] || '').trim()
    const shares = parseNum(fields[idx.shares])
    const grossTotal = parseNum(fields[idx.grossTotal])
    const netTotal = parseNum(fields[idx.netTotal])
    const brokerId = (fields[idx.id] || '').trim()
    const rowKey = `${action}|${time}|${isin}|${shares}|${netTotal || grossTotal}`
    const repeat = (seenKeys.get(rowKey) || 0) + 1
    seenKeys.set(rowKey, repeat)
    rowId = brokerId || (repeat > 1 ? `${rowKey}#${repeat}` : rowKey)
    const fxFee = parseNum(fields[idx.fxFee])
    const taxes = Math.abs(parseNum(fields[idx.taxes]))
    const priceCurrency = (fields[idx.priceCurrency] || 'EUR').trim()
    const fxRate = parseNum(fields[idx.fxRate])

    // Cash-Operationen. Zinsen heißen je nach Export "Interest" oder
    // "Interest on cash"; der Name "Zinsen" lässt sie in der Rendite als Zins
    // zählen statt als frisches Geld (lib/portfolio/cashFlows).
    const isInterest = /^Interest\b/i.test(action)
    if (action === 'Deposit' || isInterest) {
      if (grossTotal <= 0) continue
      add({
        date,
        type: 'cash_deposit',
        isin: '',
        symbol: 'CASH',
        name: isInterest ? 'Zinsen' : notesIn || 'Einzahlung',
        quantity: 1,
        price: grossTotal,
        totalValue: grossTotal,
        fee: 0,
        tax: 0,
        notes: isInterest ? `Trading 212 · Zinsen${notesIn ? ` · ${notesIn}` : ''}` : `Trading 212 · ${notesIn || action}`,
        originalType: action,
      })
      byType.cash_deposit = (byType.cash_deposit || 0) + 1
      continue
    }
    if (action === 'Withdrawal') {
      const amt = Math.abs(grossTotal)
      if (amt <= 0) continue
      add({
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

    // Trading-212-Karte: Zahlungen gehen direkt vom Cash des Invest-Kontos ab,
    // Cashback wird dort gutgeschrieben. Ohne diese Buchungen stimmt der
    // Cash-Saldo nicht (Depot mit 504 € Kartenumsatz: 516 € statt 29 €) und
    // die cash-inklusive TWR rechnet mit Geld, das längst ausgegeben ist.
    if (/^Card\b/i.test(action) || /cashback/i.test(action)) {
      const amount = netTotal !== 0 ? netTotal : grossTotal
      const amt = round2(Math.abs(amount))
      if (amt <= 0) continue
      const merchant = (fields[idx.merchantName] || '').trim()
      const isCashback = /cashback/i.test(action)
      const outgoing = amount < 0
      const label = isCashback
        ? 'Cashback'
        : outgoing
          ? `Kartenzahlung${merchant ? ` · ${merchant}` : ''}`
          : `Kartengutschrift${merchant ? ` · ${merchant}` : ''}`
      const type = outgoing ? 'cash_withdrawal' : 'cash_deposit'
      add({
        date,
        type,
        isin: '',
        symbol: 'CASH',
        name: isCashback ? 'Cashback' : merchant || (outgoing ? 'Kartenzahlung' : 'Kartengutschrift'),
        quantity: 1,
        price: amt,
        totalValue: amt,
        fee: 0,
        tax: 0,
        notes: `Trading 212 · ${label}`,
        originalType: action,
      })
      byType[type] = (byType[type] || 0) + 1
      continue
    }

    // Käufe / Verkäufe (alle Order-Arten)
    const isBuy = /^(Market|Limit|Stop)\s+buy$/i.test(action)
    const isSell = /^(Market|Limit|Stop)\s+sell$/i.test(action)
    if ((isBuy || isSell) && isin && shares > 0 && grossTotal > 0) {
      uniqueISINs.add(isin)
      const pricePerShare = parseNum(fields[idx.pricePerShare])
      const tradeValue = tradeValueExFee(isBuy, grossTotal, fxFee, shares, pricePerShare, fxRate)
      // Einbehaltene Steuern (z.B. KESt beim Verkauf: Gross 21,95, Taxes
      // −0,29, Net 21,66) laufen über das fee-Feld — eine Steuer-Spalte gibt
      // es in portfolio_transactions nicht. So stimmen Cash und realisierter
      // Gewinn, und der gespeicherte Kurs bleibt der Ausführungskurs, an dem
      // die Duplikat-Erkennung frühere Importe wiedererkennt.
      const fee = round2(fxFee + taxes)
      add({
        date,
        type: isBuy ? 'buy' : 'sell',
        isin,
        symbol: ticker,
        name,
        quantity: shares,
        // Wir speichern den EUR-Preis (Kurswert/Qty), nicht den USD-Originalpreis —
        // konsistent mit unseren anderen Parsern und dem Cashflow-Modell.
        price: parseFloat((tradeValue / shares).toFixed(6)),
        totalValue: tradeValue,
        fee,
        tax: 0, // steckt bereits in fee
        notes: `Trading 212 · ${isBuy ? 'Kauf' : 'Verkauf'}${
          priceCurrency !== 'EUR'
            ? ` · ${priceCurrency} ${pricePerShare.toFixed(2)} @ FX ${fxRate.toFixed(4)}`
            : ''
        }${fxFee > 0 ? ` · FX-Gebühr ${fxFee.toFixed(2)}€` : ''}${
          taxes > 0 ? ` · Steuern ${taxes.toFixed(2)}€` : ''
        }`,
        originalType: action,
      })
      byType[isBuy ? 'buy' : 'sell'] = (byType[isBuy ? 'buy' : 'sell'] || 0) + 1
      continue
    }

    // Dividenden (alle Sub-Typen: "Dividend (Dividend)", "Dividend (Tax exempted)", etc.)
    if (/^Dividend/i.test(action)) {
      if (!isin || netTotal <= 0) continue
      uniqueISINs.add(isin)
      add({
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
      add({
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
      add({
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

    // Spin-off: neue Position wird eingebucht (Trading 212 liefert keinen
    // Verweis auf die Mutterposition und keinen Kurs → price 0). Als
    // transfer_in mit Spin-off-Markierung einbuchen, damit die Position
    // überhaupt entsteht; die Kostenbasis lässt sich mangels Mutter-Verweis
    // nicht automatisch übertragen und ist daher zunächst 0 (manuell prüfbar).
    if (/^Spin off/i.test(action) && isin && shares > 0) {
      uniqueISINs.add(isin)
      add({
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
        notes: 'Trading 212 · Spin-off · Einstandskurs nicht in CSV enthalten — bitte manuell prüfen',
        originalType: action,
        isFromTransfer: true,
        isFromCorpAction: true,
        corpActionType: 'spinoff',
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
