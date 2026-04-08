// src/lib/freedom24XLSXParser.ts — Parser für Freedom24 Trades XLSX
// Quelle: Freedom24 → Auftragshistorie/Transaktionen → Export als XLSX
//
// Spalten: Nummer | Datum | Abrechnungen | Ticker | Transaktion | Anzahl | Preis | Menge | Gewinn | Gebühr

import type { FlatexParsedTransaction } from './flatexPDFParser'

export interface Freedom24XLSXParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
}

/**
 * Parst den Inhalt einer Freedom24 Trades XLSX-Datei.
 * rows: Array von Objekten aus der XLSX (jede Zeile = ein Objekt mit Spaltennamen als Keys)
 */
export function parseFreedom24XLSXRows(
  rows: Record<string, unknown>[],
  fileName: string
): Freedom24XLSXParseResult {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const ticker = String(row['Ticker'] ?? '').trim()
    const transaktionRaw = String(row['Transaktion'] ?? '').trim()
    const datumRaw = row['Datum']
    const anzahlRaw = row['Anzahl']
    const preisRaw = row['Preis']
    const mengeRaw = row['Menge']   // = Betrag (totalValue)
    const gebuehrRaw = row['Gebühr'] ?? row['Gebühr'] ?? 0

    // Pflichtfelder prüfen
    if (!ticker || !transaktionRaw || !datumRaw) {
      errors.push(`Zeile ${i + 2}: Fehlende Pflichtfelder (Ticker, Transaktion oder Datum).`)
      continue
    }

    // Transaktionstyp
    const lower = transaktionRaw.toLowerCase()
    if (lower !== 'kauf' && lower !== 'verkauf') {
      // Dividenden, Gebühren etc. überspringen
      continue
    }
    const txType: 'buy' | 'sell' = lower === 'verkauf' ? 'sell' : 'buy'

    // Datum parsen (Excel liefert Date-Objekt oder String)
    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw).trim()
      // ISO-Format: "2026-04-07 07:40:48" oder "2026-04-07"
      const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (isoMatch) {
        date = isoMatch[1]
      } else {
        errors.push(`Zeile ${i + 2}: Ungültiges Datum "${dateStr}".`)
        continue
      }
    }

    const quantity = parseFloat(String(anzahlRaw)) || 0
    const price = parseFloat(String(preisRaw)) || 0
    const totalValue = parseFloat(String(mengeRaw)) || 0
    const fees = parseFloat(String(gebuehrRaw)) || 0

    if (quantity <= 0) {
      errors.push(`Zeile ${i + 2}: Ungültige Anzahl für ${ticker}.`)
      continue
    }

    const endAmount = txType === 'buy' ? totalValue + fees : totalValue - fees

    transactions.push({
      type: txType,
      name: ticker,
      isin: '',       // Wird über ISIN-Resolver per Ticker nachgeschlagen
      wkn: '',
      quantity,
      price,
      totalValue,
      fees,
      endAmount,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: `Freedom24 XLSX Import`,
    })
  }

  if (transactions.length === 0 && errors.length === 0) {
    errors.push(
      `Keine Transaktionen in "${fileName}" gefunden. ` +
      `Bitte die Datei aus Auftragshistorie/Transaktionen → XLSX exportieren.`
    )
  }

  return { transactions, errors }
}
