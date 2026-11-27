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
  // z.B. EUR/USD: Preis=1.1535 → 1 EUR = 1.1535 USD → 1 USD = 1/1.1535 EUR
  // Freedom24 schreibt den Umtausch je nach Richtung so oder so; vorher blieb
  // ein Export mit nur EUR/USD-Zeilen ohne Kurs, und die USD-Trades standen
  // unbemerkt als Euro im Depot.
  const fxRates: Record<string, number[]> = {}
  for (const row of rows) {
    const ticker = String(row['Ticker'] ?? '').trim()
    if (!ticker.includes('/')) continue
    const rate = parseFloat(String(row['Preis'] ?? '0'))
    if (!(rate > 0)) continue
    const [base, quote] = ticker.split('/').map(part => part.trim())
    if (quote === 'EUR' && base) {
      if (!fxRates[base]) fxRates[base] = []
      fxRates[base].push(rate)
    } else if (base === 'EUR' && quote) {
      if (!fxRates[quote]) fxRates[quote] = []
      fxRates[quote].push(1 / rate)
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

    // Ticker normalisieren
    // .US  → Suffix entfernen:        AMZN.US  → AMZN, BTI.US  → BTI
    // .EU  → bleibt stehen. Freedom24 meint damit "irgendeine europäische
    //        Börse", nicht zwingend Xetra. Das frühere pauschale Umschreiben
    //        auf '.DE' erfand Ticker, die es nicht gibt: aus CSKR.EU wurde
    //        CSKR.DE, und die anschließende Namens-/ISIN-Suche landete beim
    //        Xetra-Papier CEBJ.DE — anderes Produkt, 141 € statt 431 USD, also
    //        eine Position, die dauerhaft ~60 % Verlust anzeigte.
    //        Die Börse löst jetzt der Instrumenten-Stammsatz auf.
    // Klassen-Aktien: Punkt → Bindestrich: BRK.B → BRK-B, BF.B → BF-B
    //         (nur bei einstelligem Buchstaben-Suffix, kein Börsensuffix)
    let normalizedTicker = ticker
    if (ticker.endsWith('.US')) {
      normalizedTicker = ticker.slice(0, -3)
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
    // .US → USD, .GB/.L → GBP (für Freedom24 nicht relevant, aber sicher).
    // Ohne Kurs in der Datei wird die Zeile nicht übernommen: Ein USD-Kauf als
    // Euro gebucht verfälscht Einstand und Bargeld um den Wechselkurs.
    const currency = ticker.endsWith('.US') ? 'USD' : ticker.endsWith('.GB') || ticker.endsWith('.L') ? 'GBP' : 'EUR'
    if (currency !== 'EUR') {
      const rate = avgFxRate[currency]
      if (!rate) {
        errors.push(
          `Zeile ${i + 2}: ${ticker} ist in ${currency} notiert, die Datei enthält aber keinen ${currency}/EUR-Umtausch. ` +
          `Zeile nicht übernommen. Exportiere die Auftragshistorie mit den Währungsumtausch-Zeilen oder nutze den Handelsbericht.`
        )
        continue
      }
      price = price * rate
      totalValue = totalValue * rate
      fees = fees * rate
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
