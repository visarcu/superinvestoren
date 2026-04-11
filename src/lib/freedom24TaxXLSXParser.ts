// src/lib/freedom24TaxXLSXParser.ts — Parser für Freedom24 Steuerbericht XLSX
// Quelle: Freedom24 → Berichte → Steuerberichte → Zeitraum wählen → Excel exportieren
//
// Sheet "ExecTrades": Käufe/Verkäufe mit ISIN und exaktem Wechselkurs
// Sheet "SecIncome":  Dividenden mit ISIN
//
// Vorteile gegenüber Trades XLSX:
// - ISIN in jeder Zeile → exakte Ticker-Auflösung
// - Wechselkurs pro Transaktion → korrekter historischer EUR-Preis
// - Dividenden im SecIncome-Sheet

import type { FlatexParsedTransaction } from './flatexPDFParser'

export interface Freedom24TaxParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
}

/**
 * Gebühren-String parsen: "3.61EUR" → 3.61, "0.00EUR" → 0
 */
function parseGebuehr(raw: unknown): number {
  if (!raw) return 0
  const str = String(raw).replace(/[^0-9.]/g, '')
  return parseFloat(str) || 0
}

/**
 * Parst ExecTrades-Sheet des Freedom24 Steuerberichts.
 */
function parseExecTrades(
  rows: Record<string, unknown>[],
): { transactions: FlatexParsedTransaction[]; errors: string[] } {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Spaltennamen haben führende/nachfolgende Leerzeichen
    const ticker     = String(row[' Ticker ']               ?? row['Ticker']               ?? '').trim()
    const isin       = String(row[' ISIN ']                 ?? row['ISIN']                 ?? '').trim()
    const transaktion = String(row[' Transaktion ']         ?? row['Transaktion']           ?? '').trim()
    const artRaw     = String(row[' Art des Instruments / Trades '] ?? row['Art des Instruments / Trades'] ?? '').trim()
    const anzahlRaw  = row[' Anzahl ']   ?? row['Anzahl']
    const preisRaw   = row[' Preis ']    ?? row['Preis']
    const waehrung   = String(row[' Währung '] ?? row['Währung'] ?? '').trim()
    const betraRaw   = row[' Betrag ']   ?? row['Betrag']
    const kursRaw    = row[' Wechselkurs '] ?? row['Wechselkurs']
    const gebuehrRaw = row[' Gebühren '] ?? row['Gebühren']
    const datumRaw   = row[' Abrechnungsdatum '] ?? row['Abrechnungsdatum']

    // Währungsumtausch-Zeilen überspringen (kein ISIN, Art = "Währung")
    if (!isin || isin === 'NaN' || artRaw === 'Währung') continue

    // Nur Käufe und Verkäufe
    const lower = transaktion.toLowerCase()
    if (lower !== 'kauf' && lower !== 'verkauf') continue

    const txType: 'buy' | 'sell' = lower === 'verkauf' ? 'sell' : 'buy'

    // Datum parsen
    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw ?? '').trim()
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
      else { errors.push(`Zeile ${i + 2}: Ungültiges Datum "${dateStr}".`); continue }
    }

    const quantity    = parseFloat(String(anzahlRaw)) || 0
    const priceOrig   = parseFloat(String(preisRaw))  || 0
    const betraOrig   = parseFloat(String(betraRaw))  || 0
    const wechselkurs = parseFloat(String(kursRaw))   || 1
    const fees        = parseGebuehr(gebuehrRaw)

    if (quantity <= 0) {
      errors.push(`Zeile ${i + 2}: Ungültige Anzahl für ${ticker}.`)
      continue
    }

    // Preis und Betrag in EUR umrechnen anhand des historischen Wechselkurses
    // Wechselkurs in der Datei = Fremdwährung → EUR (z.B. 0.868 für USD, 1.154 für GBP)
    const priceEUR      = waehrung === 'EUR' ? priceOrig  : priceOrig  * wechselkurs
    const totalValueEUR = waehrung === 'EUR' ? betraOrig  : betraOrig  * wechselkurs
    const endAmount     = txType === 'buy' ? totalValueEUR + fees : totalValueEUR - fees

    transactions.push({
      type: txType,
      name: ticker,   // Ticker als Anzeigename (ISIN wird für Auflösung genutzt)
      isin,
      wkn: '',
      quantity,
      price: priceEUR,
      totalValue: totalValueEUR,
      fees,
      endAmount,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: `Freedom24 Steuerbericht`,
    })
  }

  return { transactions, errors }
}

/**
 * Parst SecIncome-Sheet (Dividenden).
 */
function parseSecIncome(
  rows: Record<string, unknown>[],
): { transactions: FlatexParsedTransaction[]; errors: string[] } {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const ticker   = String(row[' Ticker ']  ?? row['Ticker']  ?? '').trim()
    const isin     = String(row[' ISIN ']    ?? row['ISIN']    ?? '').trim()
    const art      = String(row[' Art des Einkommens '] ?? row['Art des Einkommens'] ?? '').trim().toLowerCase()
    const datumRaw = row[' Datum '] ?? row['Datum']
    const betragEurRaw = row[' Betrag in EUR '] ?? row['Betrag in EUR']

    // Nur Dividenden
    if (!art.includes('dividend')) continue
    if (!isin || isin === 'NaN') continue

    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw ?? '').trim()
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
      else { errors.push(`Dividende Zeile ${i + 2}: Ungültiges Datum.`); continue }
    }

    const totalValueEUR = parseFloat(String(betragEurRaw)) || 0
    if (totalValueEUR <= 0) continue

    transactions.push({
      type: 'dividend',
      name: ticker,
      isin,
      wkn: '',
      quantity: 0,         // Dividenden haben keine Stückzahl
      price: 0,
      totalValue: totalValueEUR,
      fees: 0,
      endAmount: totalValueEUR,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: `Freedom24 Dividende`,
    })
  }

  return { transactions, errors }
}

/**
 * Hauptfunktion: Parst den kompletten Freedom24 Steuerbericht.
 * sheets: { [sheetName]: rows[] }
 */
export function parseFreedom24TaxXLSX(
  sheets: Record<string, Record<string, unknown>[]>,
  fileName: string,
): Freedom24TaxParseResult {
  const allTransactions: FlatexParsedTransaction[] = []
  const allErrors: string[] = []

  // ExecTrades-Sheet finden (Name enthält Datumsbereich)
  const execSheetName = Object.keys(sheets).find(n => n.startsWith('ExecTrades'))
  if (!execSheetName) {
    allErrors.push(`Kein "ExecTrades"-Sheet in "${fileName}" gefunden. Bitte den Freedom24 Steuerbericht (nicht die Auftragshistorie) hochladen.`)
  } else {
    const { transactions, errors } = parseExecTrades(sheets[execSheetName])
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  // SecIncome-Sheet finden (Dividenden)
  const incomeSheetName = Object.keys(sheets).find(n => n.startsWith('SecIncome'))
  if (incomeSheetName) {
    const { transactions, errors } = parseSecIncome(sheets[incomeSheetName])
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  if (allTransactions.length === 0 && allErrors.length === 0) {
    allErrors.push(`Keine Transaktionen in "${fileName}" gefunden.`)
  }

  return { transactions: allTransactions, errors: allErrors }
}
