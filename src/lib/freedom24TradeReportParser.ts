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

// Wie FlatexParsedTransaction, aber zusätzlich mit Transfer-Typen für
// Spin-Off-Einbuchungen (der Import-Wizard behandelt transfer_in inkl.
// Kursnachzug über die Historical-Price-API, falls kein Preis vorliegt).
export type Freedom24Transaction = Omit<FlatexParsedTransaction, 'type'> & {
  type: FlatexParsedTransaction['type'] | 'transfer_in' | 'transfer_out'
  isFromTransfer?: boolean
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

  // Corpactions-Sheet finden (Dividenden, Splits, Spin-Offs)
  const corpSheetName = Object.keys(sheets).find(n => n.startsWith('Corpactions'))
  if (corpSheetName) {
    // USD/EUR-Rate aus den Trades extrahieren
    const tradesRows = tradesSheetName ? sheets[tradesSheetName] : []
    let usdEurRate = 0.87 // Fallback
    for (const row of tradesRows) {
      const ticker = String(row[' Ticker '] ?? row['Ticker'] ?? '').trim()
      if (ticker === 'USD/EUR') {
        const price = parseFloat(String(row[' Preis '] ?? row['Preis'] ?? '0'))
        if (price > 0) { usdEurRate = price; break }
      }
    }

    const { transactions, errors, stockSplits } = parseCorpActions(sheets[corpSheetName], usdEurRate)
    allTransactions.push(...transactions)
    allErrors.push(...errors)
    allStockSplits.push(...stockSplits)
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
