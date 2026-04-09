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

  // FX-Raten aus den Währungsumtausch-Zeilen extrahieren (EUR pro Fremdwährung)
  // z.B. USD/EUR: Preis=0.865 → 1 USD = 0.865 EUR
  // z.B. GBP/EUR: Preis=1.161 → 1 GBP = 1.161 EUR
  const fxRates: Record<string, number[]> = {}
  for (const row of rows) {
    const ticker = String(row['Ticker'] ?? '').trim()
    if (ticker.includes('/')) {
      const foreignCurrency = ticker.split('/')[0] // z.B. "USD" aus "USD/EUR"
      const rate = parseFloat(String(row['Preis'] ?? '0'))
      if (rate > 0) {
        if (!fxRates[foreignCurrency]) fxRates[foreignCurrency] = []
        fxRates[foreignCurrency].push(rate)
      }
    }
  }
  // Durchschnittskurs pro Währung
  const avgFxRate: Record<string, number> = {}
  for (const [currency, rates] of Object.entries(fxRates)) {
    avgFxRate[currency] = rates.reduce((a, b) => a + b, 0) / rates.length
  }

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

    // Währungsumtausch-Zeilen überspringen (z.B. USD/EUR, GBP/EUR)
    if (ticker.includes('/')) {
      continue
    }

    // Transaktionstyp
    const lower = transaktionRaw.toLowerCase()
    if (lower !== 'kauf' && lower !== 'verkauf') {
      // Dividenden, Gebühren etc. überspringen
      continue
    }

    // Ticker normalisieren für FMP-Kompatibilität
    // .US  → Suffix entfernen:        AMZN.US  → AMZN, BTI.US  → BTI
    // .EU  → durch .DE ersetzen:      DTE.EU   → DTE.DE, MUV2.EU → MUV2.DE
    //         (Freedom24 fasst alle EU-Aktien zusammen, XETRA ist der Hauptmarkt)
    // Klassen-Aktien: Punkt → Bindestrich: BRK.B → BRK-B, BF.B → BF-B
    //         (nur bei einstelligem Buchstaben-Suffix, kein Börsensuffix)
    let normalizedTicker = ticker
    if (ticker.endsWith('.US')) {
      normalizedTicker = ticker.slice(0, -3)
    } else if (ticker.endsWith('.EU')) {
      normalizedTicker = ticker.slice(0, -3) + '.DE'
    }
    // Klassen-Aktien: XYZ.B → XYZ-B (einstelliger Buchstabe nach Punkt, kein bekanntes Börsensuffix)
    const classShareMatch = normalizedTicker.match(/^(.+)\.([A-Z])$/)
    if (classShareMatch) {
      normalizedTicker = classShareMatch[1] + '-' + classShareMatch[2]
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
    let price = parseFloat(String(preisRaw)) || 0
    let totalValue = parseFloat(String(mengeRaw)) || 0
    let fees = parseFloat(String(gebuehrRaw)) || 0

    // USD/GBP-Preise in EUR umrechnen anhand der FX-Raten aus der Datei
    // .US → USD, .GB/.L → GBP (für Freedom24 nicht relevant, aber sicher)
    if (ticker.endsWith('.US') && avgFxRate['USD']) {
      price = price * avgFxRate['USD']
      totalValue = totalValue * avgFxRate['USD']
      fees = fees * avgFxRate['USD']
    } else if ((ticker.endsWith('.GB') || ticker.endsWith('.L')) && avgFxRate['GBP']) {
      price = price * avgFxRate['GBP']
      totalValue = totalValue * avgFxRate['GBP']
      fees = fees * avgFxRate['GBP']
    }

    if (quantity <= 0) {
      errors.push(`Zeile ${i + 2}: Ungültige Anzahl für ${ticker}.`)
      continue
    }

    const endAmount = txType === 'buy' ? totalValue + fees : totalValue - fees

    transactions.push({
      type: txType,
      name: normalizedTicker,
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
