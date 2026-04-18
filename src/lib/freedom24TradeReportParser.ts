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
// Sheet "Corpactions ...":  Dividenden mit ISIN und Steuerinfo
//
// Erkennung: Sheet-Name startet mit "Trades " (nicht "ExecTrades" wie beim Steuerbericht)

import type { FlatexParsedTransaction } from './flatexPDFParser'

export interface Freedom24TradeReportResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
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
 * Parst Corpactions-Sheet (Dividenden).
 */
function parseDividends(
  rows: Record<string, unknown>[],
  fxRateUsdEur: number,
): { transactions: FlatexParsedTransaction[]; errors: string[] } {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const art      = String(row[' Art ']      ?? row['Art']      ?? '').trim().toLowerCase()
    const ticker   = String(row[' Ticker ']   ?? row['Ticker']   ?? '').trim()
    const isin     = String(row[' ISIN ']     ?? row['ISIN']     ?? '').trim()
    const datumRaw = row[' Datum ']           ?? row['Datum']
    const betrag   = parseFloat(String(row[' Betrag '] ?? row['Betrag'] ?? '0')) || 0
    const waehrung = String(row[' Währung ']  ?? row['Währung']  ?? '').trim()
    const qty      = parseFloat(String(row[' Wertpapiere zum Zeitpunkt der Fixierung '] ?? row['Wertpapiere zum Zeitpunkt der Fixierung'] ?? '0')) || 0

    if (!art.includes('dividend')) continue
    if (!isin) continue
    if (betrag <= 0) continue

    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw ?? '').trim()
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
      else { errors.push(`Dividende Zeile ${i + 2}: Ungültiges Datum.`); continue }
    }

    // In EUR umrechnen
    let totalEUR = betrag
    if (waehrung === 'USD') {
      totalEUR = betrag * fxRateUsdEur
    } else if (waehrung === 'GBP') {
      totalEUR = betrag * 1.17 // Approximation
    }

    transactions.push({
      type: 'dividend',
      name: ticker,
      isin,
      wkn: '',
      quantity: qty,
      price: 0,
      totalValue: totalEUR,
      fees: 0,
      endAmount: totalEUR,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: 'Freedom24 Dividende',
    })
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
  const allTransactions: FlatexParsedTransaction[] = []
  const allErrors: string[] = []

  // Trades-Sheet finden
  const tradesSheetName = Object.keys(sheets).find(n => n.startsWith('Trades '))
  if (!tradesSheetName) {
    allErrors.push(`Kein "Trades"-Sheet in "${fileName}" gefunden.`)
  } else {
    const { transactions, errors } = parseTrades(sheets[tradesSheetName])
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  // Corpactions-Sheet finden (Dividenden)
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

    const { transactions, errors } = parseDividends(sheets[corpSheetName], usdEurRate)
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  if (allTransactions.length === 0 && allErrors.length === 0) {
    allErrors.push(`Keine Transaktionen in "${fileName}" gefunden.`)
  }

  return { transactions: allTransactions, errors: allErrors }
}
