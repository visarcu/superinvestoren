// src/lib/freedom24PDFParser.ts — Parser für Freedom24 Handelsbericht PDFs
// Format: "Handelsbericht für den Zeitraum" (Berichte → Handelsbericht → PDF)
// Extracts section: "Wertpapiergeschäfte"

import type { FlatexParsedTransaction } from './flatexPDFParser'

export interface Freedom24ParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
  fileName: string
}

/**
 * Parst den extrahierten Text eines Freedom24 Handelsberichts (PDF).
 *
 * Spalten in "Wertpapiergeschäfte":
 *   Ticker | ISIN | Markt | Transaktion | Anzahl | Preis | Betrag | P&L | Gebühren | Transaktionsdatum | ...
 *
 * Beispielzeile:
 *   FWIA.EU IE000716YHJ7 Europe Kauf 1 7.160000 7.16EUR 0.00 1.25EUR 2026-04-07 ...
 *
 * Hinweis: Freedom24 schreibt "Gruppiert" als Datum, wenn der Bericht-Zeitraum zu kurz ist.
 *   → User sollte "Seit Anfang des Jahres" (o.ä.) wählen, um echte Daten zu erhalten.
 *   → Fallback: Enddatum aus dem Berichts-Header.
 */
export function parseFreedom24PDFText(text: string, fileName: string): Freedom24ParseResult {
  const errors: string[] = []
  const transactions: FlatexParsedTransaction[] = []

  try {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // === 1. Broker-Erkennung ===
    const isFreedom24 =
      /freedom\s*24/i.test(normalized) ||
      normalized.includes('Freedom Tower') ||
      normalized.includes('Handelsbericht für den Zeitraum')

    if (!isFreedom24) {
      errors.push(`"${fileName}" wurde nicht als Freedom24-Handelsbericht erkannt.`)
      return { transactions, errors, fileName }
    }

    // === 2. Fallback-Datum aus Berichts-Header ===
    // "Handelsbericht für den Zeitraum\n2026-04-06 23:59:59 - 2026-04-07 23:59:59"
    let fallbackDate = ''
    const headerDateMatch = normalized.match(
      /Handelsbericht für den Zeitraum[\s\S]*?(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}\s+-\s+(\d{4}-\d{2}-\d{2})/
    )
    if (headerDateMatch) {
      fallbackDate = headerDateMatch[2] // Enddatum des Berichtszeitraums
    }

    // === 3. "Wertpapiere"-Sektion: Ticker → Name-Mapping ===
    // FWIA.EU IE000716YHJ7 Handel ETFs 0 1 7.154 EUR 7.15
    const tickerNameMap: Record<string, string> = {}
    const wertpapiereSection = normalized.match(/Wertpapiere\n([\s\S]*?)(?:\n\n|\nEinzahlungen|\nWertpapiergeschäfte)/)
    if (wertpapiereSection) {
      const wpLines = wertpapiereSection[1].split('\n')
      for (const line of wpLines) {
        // Ticker ISIN Konto Anlagenart ...
        const wpMatch = line.match(/^([A-Z0-9.]+)\s+([A-Z]{2}[A-Z0-9]{10})\s+/)
        if (wpMatch) {
          // Ticker als Fallback-Name, ISIN als Key
          tickerNameMap[wpMatch[2]] = wpMatch[1]
        }
      }
    }

    // === 4. "Wertpapiergeschäfte"-Sektion parsen ===
    // WICHTIG: "Gewinn- und Verlustrechnung" steht bereits in der Tabellenüberschrift,
    // deshalb nur "Gesamter Cashflow" als Sektionsende verwenden.
    const sectionMatch = normalized.match(/Wertpapiergeschäfte([\s\S]*?)Gesamter Cashflow/)
    if (!sectionMatch) {
      errors.push(`Abschnitt "Wertpapiergeschäfte" in "${fileName}" nicht gefunden. Ist dies ein Handelsbericht?`)
      return { transactions, errors, fileName }
    }

    const section = sectionMatch[1]

    // Jede Transaktion steht auf einer Zeile:
    // TICKER  ISIN  MARKT  (Kauf|Verkauf)  ANZAHL  PREIS  BETRAGEUR  P&L  GEBUEHRENEUR  DATUM  ...
    //
    // Varianten:
    //   - Datum: "2026-04-07" oder "Gruppiert"
    //   - Betrag/Gebühren: "7.16EUR" oder "7.16 EUR"
    //   - Markt: "Europe", "US", "XETRA", etc.
    const txRegex =
      /([A-Z0-9.\-]+)\s+([A-Z]{2}[A-Z0-9]{10})\s+(\S+)\s+(Kauf|Verkauf)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(EUR|USD|GBP|CHF|PLN)\s+([\d.-]+)\s+([\d.]+)\s*(EUR|USD|GBP|CHF|PLN)\s+(\S+)/gi

    let match: RegExpExecArray | null
    while ((match = txRegex.exec(section)) !== null) {
      const [
        ,
        ticker,
        isin,
        market,
        transaktionRaw,
        anzahlRaw,
        preisRaw,
        betragRaw,
        waehrung,
        , // P&L — ignorieren
        gebuehrenRaw,
        gebuehrenWaehrung,
        datumRaw,
      ] = match

      const txType: 'buy' | 'sell' = transaktionRaw.toLowerCase() === 'verkauf' ? 'sell' : 'buy'
      const quantity = parseFloat(anzahlRaw)
      const price = parseFloat(preisRaw)
      const totalValue = parseFloat(betragRaw)
      const fees = parseFloat(gebuehrenRaw)
      const endAmount = txType === 'buy'
        ? totalValue + fees
        : totalValue - fees

      // Datum: echtes Datum oder Fallback
      let date = ''
      if (datumRaw && datumRaw !== 'Gruppiert') {
        // Freedom24 liefert ISO-Datum: "2026-04-07"
        if (/^\d{4}-\d{2}-\d{2}$/.test(datumRaw)) {
          date = datumRaw
        } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(datumRaw)) {
          // Deutsches Format: "07.04.2026" → "2026-04-07"
          const parts = datumRaw.split('.')
          date = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
      }

      if (!date) {
        if (fallbackDate) {
          date = fallbackDate
          // Kein Fehler — nur eine Note, wird im notes-Feld vermerkt
        } else {
          errors.push(`Kein Datum für Transaktion ${ticker} (${isin}) in "${fileName}" gefunden. Bitte längeren Zeitraum im Export wählen.`)
          continue
        }
      }

      if (!quantity || quantity <= 0) {
        errors.push(`Ungültige Stückzahl für ${ticker} in "${fileName}".`)
        continue
      }

      const isGroupedDate = datumRaw === 'Gruppiert'
      const name = tickerNameMap[isin] || ticker

      transactions.push({
        type: txType,
        name,
        isin,
        wkn: '',
        quantity,
        price,
        totalValue,
        fees,
        endAmount,
        date,
        currency: waehrung || gebuehrenWaehrung || 'EUR',
        exchange: market,
        notes: `Freedom24 Import${isGroupedDate ? ' — Datum geschätzt (Bericht gruppiert)' : ''}`,
      })
    }

    if (transactions.length === 0) {
      errors.push(
        `Keine Transaktionen in "${fileName}" gefunden. ` +
        `Bitte "Handelsbericht" (nicht Depotbericht) mit Zeitraum "Seit Anfang des Jahres" exportieren.`
      )
    }
  } catch (err) {
    errors.push(`Fehler beim Parsen von "${fileName}": ${err instanceof Error ? err.message : String(err)}`)
  }

  return { transactions, errors, fileName }
}
