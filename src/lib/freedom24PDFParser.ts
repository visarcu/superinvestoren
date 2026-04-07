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

    // pdf-parse entfernt alle Leerzeichen zwischen PDF-Spalten → alles ist zusammengeklebt:
    // "FWIA.EUIE000716YHJ7EuropeKauf17.1600007.16EUR0.001.25EURGruppiertGruppiertGruppiert"
    //
    // Strategie:
    //  1. ISIN als Anker (immer 12 alphanumerische Zeichen: 2 Buchstaben + 10 Zeichen)
    //  2. Danach: Markt (nur Buchstaben) + Kauf|Verkauf
    //  3. Danach: alles bis zur ersten Währung = Anzahl+Preis+Betrag (zusammengeklebt)
    //  4. Danach: PNL+Gebühren + zweite Währung
    //  5. Danach: Datum (ISO oder "Gruppiert")
    //
    // Regex zerlegt: ISIN | Markt | Typ | [Zahlenblock1] | Währung | [Zahlenblock2] | Währung | Datum
    const txRegex =
      /([A-Z]{2}[A-Z0-9]{10})([A-Za-z]+)(Kauf|Verkauf)([\d.]+)(EUR|USD|GBP|CHF|PLN)([\d.-]+)(EUR|USD|GBP|CHF|PLN)(Gruppiert|\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})/g

    let match: RegExpExecArray | null
    while ((match = txRegex.exec(section)) !== null) {
      const [
        ,
        isin,
        market,
        transaktionRaw,
        zahlenblock1,   // z.B. "17.1600007.16" = Anzahl+Preis+Betrag zusammengeklebt
        waehrung,
        zahlenblock2,   // z.B. "0.001.25" = PNL+Gebühren zusammengeklebt
        ,               // Gebührenwährung — gleiche Währung, ignorieren
        datumRaw,
      ] = match

      const txType: 'buy' | 'sell' = transaktionRaw.toLowerCase() === 'verkauf' ? 'sell' : 'buy'

      // Zahlenblock1 zerlegen: Anzahl + Preis + Betrag ohne Trennzeichen zusammengeklebt.
      // Struktur (genau 2 Punkte):
      //   {Anzahl_int}{Preis_int}.{Preis_6dec}{Betrag_int}.{Betrag_2dec}
      // Beispiel: "17.1600007.16"
      //   dotParts = ["17", "1600007", "16"]
      //   Preis_6dec = "160000", Betrag_int = "7", Betrag_2dec = "16"
      //   → totalValue = 7.16, partA = "17"
      //   → Preis_int = "7" (letzte 1 Stelle von "17"), Anzahl = 1
      //   → Preis = 7.160000 ✓, Qty = 1 ✓
      const dotParts = zahlenblock1.split('.')
      let price = 0
      let quantity = 0
      let totalValue = 0

      if (dotParts.length === 3) {
        const partA = dotParts[0]  // {Anzahl_int}{Preis_int}
        const partB = dotParts[1]  // {Preis_6dec}{Betrag_int}
        const partC = dotParts[2]  // {Betrag_2dec}

        const preis6dec = partB.slice(0, 6)       // erste 6 Stellen = Preis-Nachkomma
        const betragInt = partB.slice(6) || '0'   // Rest = Betrag-Vorkomma
        totalValue = parseFloat(betragInt + '.' + partC)

        // Anzahl/Preis-Split in partA suchen: Preis-Vorkomma von hinten abschneiden
        for (let preisLen = 1; preisLen <= partA.length; preisLen++) {
          const preisInt = partA.slice(-preisLen)
          const anzahlStr = partA.slice(0, partA.length - preisLen)
          const candidatePrice = parseFloat(preisInt + '.' + preis6dec)
          const candidateQty = anzahlStr ? parseInt(anzahlStr, 10) : 0
          if (candidateQty > 0 && Math.abs(candidateQty * candidatePrice - totalValue) < 0.02) {
            price = candidatePrice
            quantity = candidateQty
            break
          }
        }
      }

      // Fallback falls Parsing fehlschlug
      if (price <= 0 || quantity <= 0) {
        totalValue = totalValue || parseFloat(zahlenblock1) || 0
        price = parseFloat(zahlenblock1) || 0
        quantity = price > 0 ? Math.round((totalValue / price) * 10000) / 10000 : 0
      }

      // Zahlenblock2 zerlegen: PNL + Gebühren (jeweils 2 Nachkommastellen)
      const block2Numbers = [...zahlenblock2.matchAll(/(-?\d+\.\d{2})/g)].map(m => parseFloat(m[1]))
      const fees = block2Numbers.length >= 2
        ? block2Numbers[block2Numbers.length - 1]  // Gebühren = letzter Wert
        : block2Numbers[0] ?? 0

      const endAmount = txType === 'buy' ? totalValue + fees : totalValue - fees

      // Datum parsen
      let date = ''
      let isGroupedDate = false
      if (datumRaw === 'Gruppiert') {
        isGroupedDate = true
        date = fallbackDate
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(datumRaw)) {
        date = datumRaw
      } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(datumRaw)) {
        const p = datumRaw.split('.')
        date = `${p[2]}-${p[1]}-${p[0]}`
      }

      if (!date) {
        errors.push(`Kein Datum für ${isin} in "${fileName}" gefunden. Bitte längeren Zeitraum im Export wählen.`)
        continue
      }

      if (!quantity || quantity <= 0) {
        errors.push(`Ungültige Stückzahl für ${isin} in "${fileName}".`)
        continue
      }

      const name = tickerNameMap[isin] || isin

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
        currency: waehrung || 'EUR',
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
