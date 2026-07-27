// src/lib/freedom24TradeReportParser.ts — Parser für Freedom24 Handelsbericht XLSX
//
// Quelle: Freedom24 → Berichte → Handelsberichte → Zeitraum wählen → Excel
//
// Unterschied zum Steuerbericht (freedom24TaxXLSXParser.ts):
//   - Steuerbericht: nur "Abrechnungsdatum" (Settlement, T+2)
//   - Handelsbericht: "Transaktionsdatum" (echtes Handelsdatum) ← besser!
//   - Handelsbericht: Gebühren immer in EUR, Dividenden im "Corpactions"-Sheet
//
// Sheet "Trades ...":      Käufe/Verkäufe mit ISIN, Transaktionsdatum, Gebühren
// Sheet "Corpactions ...":  Dividenden, Splits und Spin-Offs mit ISIN
//
// Erkennung: Sheet-Name startet mit "Trades " (nicht "ExecTrades" wie beim Steuerbericht)

import type { FlatexParsedTransaction } from './flatexPDFParser'
import type { StockSplit } from './scalableCSVParser'
import { appendSplitNote } from './splitAdjustment'

// Wie FlatexParsedTransaction, aber zusätzlich mit Transfer- und Cash-Typen.
// Spin-Off-Einbuchungen laufen als transfer_in (der Import-Wizard zieht den
// Schlusskurs nach, falls kein Preis vorliegt); Banküberweisungen aus dem
// Geldtransfer-Tab als cash_deposit/cash_withdrawal.
export type Freedom24Transaction = Omit<FlatexParsedTransaction, 'type'> & {
  type: FlatexParsedTransaction['type'] | 'transfer_in' | 'transfer_out' | 'cash_deposit' | 'cash_withdrawal'
  isFromTransfer?: boolean
  // Spin-off-Metadaten: der Import-Wizard nutzt sie, um die Kostenbasis der
  // Mutterposition anteilig auf die neue Position zu übertragen.
  corpActionType?: 'spinoff'
  fromIsin?: string
  fromTicker?: string
}

export interface Freedom24TradeReportResult {
  transactions: Freedom24Transaction[]
  errors: string[]
  /** Erkannte Aktiensplits — Alt-Transaktionen in der Datei sind bereits angepasst. */
  stockSplits: StockSplit[]
}

/**
 * Erkennt ob ein XLSX-Workbook ein Freedom24 Handelsbericht ist.
 * Unterscheidung vom Steuerbericht: "Trades ..." statt "ExecTrades ..."
 */
export function isFreedom24TradeReport(sheetNames: string[]): boolean {
  const hasTrades = sheetNames.some(n => n.startsWith('Trades '))
  const hasExecTrades = sheetNames.some(n => n.startsWith('ExecTrades'))
  // Handelsbericht hat "Trades ...", Steuerbericht hat "ExecTrades ..."
  return hasTrades && !hasExecTrades
}

/**
 * Parst Trades-Sheet des Handelsberichts.
 */
function parseTrades(
  rows: Record<string, unknown>[],
): { transactions: FlatexParsedTransaction[]; errors: string[] } {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []

  // FX-Raten aus den Währungsumtausch-Zeilen extrahieren
  // Handelsbericht: "EUR/USD" mit Preis 1.1525 → 1 EUR = 1.1525 USD → 1 USD = 1/1.1525 EUR
  // Handelsbericht: "EUR/GBP" mit Preis 0.86 → 1 EUR = 0.86 GBP → 1 GBP = 1/0.86 EUR
  const fxRates: Record<string, number[]> = {}
  for (const row of rows) {
    const ticker = String(row[' Ticker '] ?? row['Ticker'] ?? '').trim()
    if (!ticker.includes('/')) continue

    const price = parseFloat(String(row[' Preis '] ?? row['Preis'] ?? '0'))
    if (price <= 0) continue

    const [base, quote] = ticker.split('/')
    if (base === 'EUR' && quote) {
      // EUR/USD: price = 1.15 → 1 USD = 1/1.15 = 0.8696 EUR
      if (!fxRates[quote]) fxRates[quote] = []
      fxRates[quote].push(1 / price)
    } else if (quote === 'EUR' && base) {
      // USD/EUR: price = 0.87 → 1 USD = 0.87 EUR (direkt)
      if (!fxRates[base]) fxRates[base] = []
      fxRates[base].push(price)
    }
  }
  const avgFxRate: Record<string, number> = {}
  for (const [currency, rates] of Object.entries(fxRates)) {
    avgFxRate[currency] = rates.reduce((a, b) => a + b, 0) / rates.length
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const ticker      = String(row[' Ticker ']       ?? row['Ticker']       ?? '').trim()
    const isin        = String(row[' ISIN ']         ?? row['ISIN']         ?? '').trim()
    const transaktion = String(row[' Transaktion ']  ?? row['Transaktion']  ?? '').trim()
    const anzahlRaw   = row[' Anzahl ']  ?? row['Anzahl']
    const preisRaw    = row[' Preis ']   ?? row['Preis']
    const waehrung    = String(row[' Währung ']      ?? row['Währung']      ?? '').trim()
    const betragRaw   = row[' Betrag ']  ?? row['Betrag']
    const gebuehrRaw  = row[' Gebühren '] ?? row['Gebühren']
    // Transaktionsdatum = echtes Handelsdatum (nicht Settlement!)
    const datumRaw    = row[' Transaktionsdatum ']   ?? row['Transaktionsdatum']

    // Währungsumtausch und Zeilen ohne ISIN überspringen
    if (!isin || isin === '-' || ticker.includes('/')) continue

    const lower = transaktion.toLowerCase().trim()
    if (lower !== 'kauf' && lower !== 'verkauf') continue

    const txType: 'buy' | 'sell' = lower === 'verkauf' ? 'sell' : 'buy'

    // Datum parsen — Format: "2026-03-27 17:29:24" oder Date-Objekt
    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw ?? '').trim()
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
      else { errors.push(`Zeile ${i + 2}: Ungültiges Datum "${dateStr}".`); continue }
    }

    const quantity  = parseFloat(String(anzahlRaw))  || 0
    const priceOrig = parseFloat(String(preisRaw))   || 0
    const betrag    = parseFloat(String(betragRaw))   || 0
    const fees      = parseFloat(String(gebuehrRaw))  || 0

    if (quantity <= 0) {
      errors.push(`Zeile ${i + 2}: Ungültige Anzahl für ${ticker}.`)
      continue
    }

    // Preis in EUR umrechnen
    let priceEUR = priceOrig
    let totalEUR = betrag
    if (waehrung !== 'EUR') {
      const rate = avgFxRate[waehrung]
      if (rate) {
        priceEUR = priceOrig * rate
        totalEUR = betrag * rate
      } else {
        errors.push(`Zeile ${i + 2}: Kein Wechselkurs für ${waehrung} gefunden (${ticker}).`)
        continue
      }
    }

    const endAmount = txType === 'buy' ? totalEUR + fees : totalEUR - fees

    transactions.push({
      type: txType,
      name: ticker,
      isin,
      wkn: '',
      quantity,
      price: priceEUR,
      totalValue: totalEUR,
      fees,
      endAmount,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: 'Freedom24 Handelsbericht',
    })
  }

  return { transactions, errors }
}

/**
 * Parst Corpactions-Sheet: Dividenden, Aktiensplits und Spin-Offs.
 *
 * Freedom24 bucht Corporate Actions als Wertpapier-Zeilen:
 *   Split:    2 Zeilen gleicher ISIN, negative (alte Stücke raus) + positive
 *             (neue Stücke rein). Kommentar: "Stock split HON.US (US...).
 *             Record date 2026-06-26, factor: 2/1."
 *   Spin-Off: 1 Zeile mit NEUER ISIN und positiver Stückzahl. Kommentar:
 *             "Corporate action HON.US (US...) -> HONA.US (US...). Factor 2/1."
 *             → wird als transfer_in der neuen Position importiert.
 */
function parseCorpActions(
  rows: Record<string, unknown>[],
  fxRateUsdEur: number,
): { transactions: Freedom24Transaction[]; errors: string[]; stockSplits: StockSplit[] } {
  const transactions: Freedom24Transaction[] = []
  const errors: string[] = []
  const stockSplits: StockSplit[] = []

  // Split-Zeilen sammeln: Key = ISIN|Datum, Werte = positive/negative Stückzahlen
  const splitRows = new Map<string, { isin: string; date: string; inQty: number; outQty: number; row: number }>()

  const toEUR = (value: number, waehrung: string): number => {
    if (waehrung === 'USD') return value * fxRateUsdEur
    if (waehrung === 'GBP') return value * 1.17 // Approximation
    return value
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const art      = String(row[' Art ']      ?? row['Art']      ?? '').trim().toLowerCase()
    const ticker   = String(row[' Ticker ']   ?? row['Ticker']   ?? '').trim()
    const isin     = String(row[' ISIN ']     ?? row['ISIN']     ?? '').trim()
    const datumRaw = row[' Datum ']           ?? row['Datum']
    const betrag   = parseFloat(String(row[' Betrag '] ?? row['Betrag'] ?? '0')) || 0
    const preis    = parseFloat(String(row[' Preis '] ?? row['Preis'] ?? '0')) || 0
    const waehrung = String(row[' Währung ']  ?? row['Währung']  ?? '').trim()
    const qty      = parseFloat(String(row[' Wertpapiere zum Zeitpunkt der Fixierung '] ?? row['Wertpapiere zum Zeitpunkt der Fixierung'] ?? '0')) || 0

    const isDividend = art.includes('dividend')
    const isSplit    = art.includes('split')
    const isSpinOff  = art.includes('spin')
    if (!isDividend && !isSplit && !isSpinOff) continue
    if (!isin) continue

    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw ?? '').trim()
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
      else { errors.push(`Corpactions Zeile ${i + 2}: Ungültiges Datum.`); continue }
    }

    // Kommentar-Spalte: Name variiert je Report-Version → bekannte Keys
    // probieren, sonst Zeilenwerte nach Corporate-Action-Text durchsuchen.
    const comment = (() => {
      for (const key of [' Kommentar ', 'Kommentar', ' Comment ', 'Comment', ' Anmerkung ', 'Anmerkung']) {
        const v = row[key]
        if (typeof v === 'string' && v.trim()) return v.trim()
      }
      for (const v of Object.values(row)) {
        if (typeof v === 'string' && /stock split|corporate action/i.test(v)) return v.trim()
      }
      return ''
    })()

    if (isDividend) {
      if (betrag <= 0) continue
      transactions.push({
        type: 'dividend',
        name: ticker,
        isin,
        wkn: '',
        quantity: qty,
        price: 0,
        totalValue: toEUR(betrag, waehrung),
        fees: 0,
        endAmount: toEUR(betrag, waehrung),
        date,
        currency: 'EUR',
        exchange: 'Freedom24',
        notes: 'Freedom24 Dividende',
      })
      continue
    }

    if (isSplit) {
      // Betrag = Stückzahl-Delta (negativ = alte Stücke raus, positiv = neue rein)
      if (betrag === 0) continue
      const key = `${isin}|${date}`
      const entry = splitRows.get(key) || { isin, date, inQty: 0, outQty: 0, row: i + 2 }
      if (betrag > 0) entry.inQty += betrag
      else entry.outQty += Math.abs(betrag)
      splitRows.set(key, entry)
      continue
    }

    // === Spin-Off: neue Position einbuchen ===
    if (betrag <= 0) continue // negative Spin-Off-Zeile (Storno) — nicht unterstützt
    // Quell-ISIN aus dem Kommentar: "... HON.US (US4385162056) -> HONA.US (US43849R1059) ..."
    const fromMatch = comment.match(/([A-Z0-9.]+)\s*\(([A-Z]{2}[0-9A-Z]{9,10})\)\s*->/)
    const fromLabel = fromMatch ? `${fromMatch[1]} (${fromMatch[2]})` : 'Mutterposition'
    const priceEUR = preis > 0 ? toEUR(preis, waehrung) : 0

    transactions.push({
      type: 'transfer_in',
      name: ticker,
      isin,
      wkn: '',
      quantity: betrag,
      price: priceEUR,
      totalValue: priceEUR * betrag,
      fees: 0,
      endAmount: priceEUR * betrag,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: `Freedom24 Spin-off aus ${fromLabel}`,
      isFromTransfer: true,
      corpActionType: 'spinoff',
      fromIsin: fromMatch?.[2],
      fromTicker: fromMatch?.[1],
    })
  }

  // Split-Paare auswerten: Ratio = neue Stücke / alte Stücke
  for (const entry of splitRows.values()) {
    if (entry.inQty > 0 && entry.outQty > 0) {
      stockSplits.push({ date: entry.date, isin: entry.isin, ratio: entry.inQty / entry.outQty })
    } else {
      errors.push(
        `Corpactions Zeile ${entry.row}: Aktiensplit für ${entry.isin} unvollständig ` +
        `(nur ${entry.inQty > 0 ? 'Einbuchung' : 'Ausbuchung'} gefunden) — bitte Bestand manuell prüfen.`
      )
    }
  }

  return { transactions, errors, stockSplits }
}

// Externe Cash-Flüsse (echte Ein-/Auszahlungen aufs Verrechnungskonto).
// BEWUSST eng gehalten: Dividenden, Steuern, Broker-/Handelsgebühren, Käufe
// und Verkäufe kommen bereits über die Trades/Corpactions-Sheets bzw. den
// separaten Handelsbericht — hier importiert würden sie das Cash doppelt zählen.
const CASH_FLOW_ART = /^(bank(ü|ue)berweisung|einzahlung|auszahlung|deposit|withdrawal)$/i

// Wert der "Art"-Spalte holen (Spaltennamen können mit Leerzeichen kommen);
// ohne benannte Spalte auf einen Werte-Scan zurückfallen.
function cashArt(row: Record<string, unknown>): string {
  for (const key of [' Art ', 'Art', ' Type ', 'Type']) {
    const v = row[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const scan = Object.values(row).find(v => typeof v === 'string' && CASH_FLOW_ART.test(v.trim()))
  return typeof scan === 'string' ? scan.trim() : ''
}

/**
 * Parst externe Ein-/Auszahlungen ("Banküberweisung" etc.) aus dem
 * Geldtransfer-/Cash-Tab. Der Cash-Export kommt entweder als eigener Reiter im
 * Handelsbericht oder als separate Datei ("Cash In Out …"); beides läuft hier
 * durch. Spalten (" Art ", " Datum ", " Betrag ", " Währung ") können mit
 * Leerzeichen benannt sein — wir lesen die Art gezielt und fallen sonst auf
 * einen Werte-Scan zurück. Positiver Betrag = Einzahlung, negativer = Auszahlung.
 */
function parseCashTransfers(
  sheets: Record<string, Record<string, unknown>[]>,
  fxRateUsdEur: number,
): { transactions: Freedom24Transaction[]; errors: string[] } {
  const transactions: Freedom24Transaction[] = []
  const errors: string[] = []

  for (const [sheetName, rows] of Object.entries(sheets)) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const art = cashArt(row)
      if (!CASH_FLOW_ART.test(art)) continue

      const values = Object.values(row)

      // Datum: bevorzugt aus " Datum "-Spalte, sonst erster Datumswert
      let date = ''
      const datumCell = row[' Datum '] ?? row['Datum'] ?? row[' Date '] ?? row['Date']
      if (datumCell instanceof Date) date = datumCell.toISOString().slice(0, 10)
      else if (typeof datumCell === 'string') {
        const m = datumCell.trim().match(/^(\d{4}-\d{2}-\d{2})/)
        if (m) date = m[1]
      }
      if (!date) {
        for (const v of values) {
          if (v instanceof Date) { date = v.toISOString().slice(0, 10); break }
          if (typeof v === 'string') {
            const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/)
            if (m) { date = m[1]; break }
          }
        }
      }
      if (!date) {
        errors.push(`${sheetName} Zeile ${i + 2}: ${art} ohne erkennbares Datum übersprungen.`)
        continue
      }

      // Betrag: bevorzugt aus " Betrag "-Spalte, sonst erste endliche Zahl ≠ 0
      let amount = NaN
      const betragCell = row[' Betrag '] ?? row['Betrag'] ?? row[' Amount '] ?? row['Amount']
      if (typeof betragCell === 'number' && Number.isFinite(betragCell)) amount = betragCell
      if (!Number.isFinite(amount)) {
        for (const v of values) {
          if (typeof v === 'number' && Number.isFinite(v) && v !== 0) { amount = v; break }
        }
      }
      if (!Number.isFinite(amount) || amount === 0) {
        errors.push(`${sheetName} Zeile ${i + 2}: ${art} ohne Betrag übersprungen.`)
        continue
      }

      const currency = (() => {
        const c = row[' Währung '] ?? row['Währung'] ?? row[' Currency '] ?? row['Currency']
        if (typeof c === 'string' && /^(EUR|USD|GBP)$/.test(c.trim())) return c.trim()
        const scan = values.find((v): v is string => typeof v === 'string' && /^(EUR|USD|GBP)$/.test(v.trim()))
        return scan?.trim() || 'EUR'
      })()

      let amountEUR = Math.abs(amount)
      if (currency === 'USD') amountEUR = amountEUR * fxRateUsdEur
      else if (currency === 'GBP') amountEUR = amountEUR * 1.17 // Approximation
      amountEUR = Math.round(amountEUR * 100) / 100

      transactions.push({
        type: amount > 0 ? 'cash_deposit' : 'cash_withdrawal',
        name: amount > 0 ? 'Einzahlung' : 'Auszahlung',
        isin: '',
        wkn: '',
        quantity: 1,
        price: amountEUR,
        totalValue: amountEUR,
        fees: 0,
        endAmount: amountEUR,
        date,
        currency: 'EUR',
        exchange: 'Freedom24',
        notes: 'Freedom24 Banküberweisung',
      })
    }
  }

  return { transactions, errors }
}

/**
 * Erkennt eine separate Freedom24 Cash-Datei ("Cash In Out …") ohne Trades-Sheet.
 */
export function isFreedom24CashReport(sheetNames: string[]): boolean {
  const hasCash = sheetNames.some(n => /^cash in out/i.test(n.trim()))
  const hasTrades = sheetNames.some(n => n.startsWith('Trades ') || n.startsWith('ExecTrades'))
  return hasCash && !hasTrades
}

/**
 * Parst eine separate Freedom24 Cash-Datei — nur externe Ein-/Auszahlungen.
 * (Dividenden/Steuern/Gebühren im selben Sheet kommen über den Handelsbericht
 * und werden hier bewusst ignoriert, um Doppelzählung zu vermeiden.)
 */
export function parseFreedom24CashReport(
  sheets: Record<string, Record<string, unknown>[]>,
  fileName: string,
): { transactions: Freedom24Transaction[]; errors: string[] } {
  const { transactions, errors } = parseCashTransfers(sheets, 0.87)
  if (transactions.length === 0 && errors.length === 0) {
    errors.push(`Keine Ein-/Auszahlungen in "${fileName}" gefunden.`)
  }
  return { transactions, errors }
}

/**
 * Parst den kompletten Freedom24 Handelsbericht.
 */
export function parseFreedom24TradeReport(
  sheets: Record<string, Record<string, unknown>[]>,
  fileName: string,
): Freedom24TradeReportResult {
  const allTransactions: Freedom24Transaction[] = []
  const allErrors: string[] = []
  const allStockSplits: StockSplit[] = []

  // Trades-Sheet finden
  const tradesSheetName = Object.keys(sheets).find(n => n.startsWith('Trades '))
  if (!tradesSheetName) {
    allErrors.push(`Kein "Trades"-Sheet in "${fileName}" gefunden.`)
  } else {
    const { transactions, errors } = parseTrades(sheets[tradesSheetName])
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  // USD/EUR-Rate aus den Trades extrahieren (für Corpactions + Geldtransfers)
  const tradesRows = tradesSheetName ? sheets[tradesSheetName] : []
  let usdEurRate = 0.87 // Fallback
  for (const row of tradesRows) {
    const ticker = String(row[' Ticker '] ?? row['Ticker'] ?? '').trim()
    if (ticker === 'USD/EUR') {
      const price = parseFloat(String(row[' Preis '] ?? row['Preis'] ?? '0'))
      if (price > 0) { usdEurRate = price; break }
    }
  }

  // Corpactions-Sheet finden (Dividenden, Splits, Spin-Offs)
  const corpSheetName = Object.keys(sheets).find(n => n.startsWith('Corpactions'))
  if (corpSheetName) {
    const { transactions, errors, stockSplits } = parseCorpActions(sheets[corpSheetName], usdEurRate)
    allTransactions.push(...transactions)
    allErrors.push(...errors)
    allStockSplits.push(...stockSplits)
  }

  // Banküberweisungen (Geldtransfer-Tab) — ermöglicht Cash-Ledger und damit
  // die einzahlungsbasierte Kapital-Linie im Chart
  {
    const { transactions, errors } = parseCashTransfers(sheets, usdEurRate)
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  // Splits rückwirkend auf alle Stück-basierten Transaktionen in der Datei
  // anwenden: Stück × Ratio, Preis ÷ Ratio, Gesamtwert bleibt (Kapitaleinsatz
  // unverändert). Die Marker-Note schützt vor Doppel-Verrechnung, wenn der
  // Import-Wizard dieselben Splits später auf DB-Bestand anwendet.
  if (allStockSplits.length > 0) {
    for (const tx of allTransactions) {
      if (tx.type === 'dividend') continue
      const applicable = allStockSplits.filter(s => s.isin === tx.isin && s.date > tx.date)
      if (applicable.length === 0) continue

      for (const split of applicable) {
        tx.quantity = tx.quantity * split.ratio
        if (tx.price > 0) tx.price = tx.price / split.ratio
        tx.notes = appendSplitNote(tx.notes, split.ratio, split.date)
      }
    }
  }

  if (allTransactions.length === 0 && allErrors.length === 0) {
    allErrors.push(`Keine Transaktionen in "${fileName}" gefunden.`)
  }

  return { transactions: allTransactions, errors: allErrors, stockSplits: allStockSplits }
}
