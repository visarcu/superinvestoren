// src/lib/tradeRepublicPDFParser.ts — Parser für Trade Republic PDF-Abrechnungen
// Unterstützt: Wertpapierabrechnung (Kauf/Verkauf), Sparpläne, Dividenden
// Format: "Trade Republic Bank GmbH" / "traderepublic.com"

export interface TradeRepublicParsedTransaction {
  type: 'buy' | 'sell' | 'dividend'
  name: string
  isin: string
  quantity: number
  price: number       // Durchschnittskurs pro Stück
  totalValue: number  // Gesamtbetrag (Kurswert)
  fees: number        // Gebühren
  endAmount: number   // Buchungsbetrag
  date: string        // ISO format: YYYY-MM-DD
  currency: string
  exchange: string    // Handelsplatz
  notes: string
}

export interface TradeRepublicParseResult {
  transactions: TradeRepublicParsedTransaction[]
  errors: string[]
  fileName: string
}

/**
 * Parst den extrahierten Text einer Trade Republic PDF-Abrechnung.
 *
 * Trade Republic Format-Beispiel (Sparplan):
 * ──────────────────────────
 * WERTPAPIERABRECHNUNG SPARPLAN
 * ÜBERSICHT
 * Sparplanausführung am 02.03.2026 an der Lang und Schwarz Exchange.
 *
 * POSITION  ANZAHL  DURCHSCHNITTSKURS  BETRAG
 * MSCI USA Daily (2x) Leveraged EUR (Acc)
 * ISIN: FR0010755611
 * 1,033912 Stk.  24,18 EUR  25,00 EUR
 * GESAMT  25,00 EUR
 *
 * BUCHUNG
 * VERRECHNUNGSKONTO  WERTSTELLUNG  BETRAG
 * DE50...  2026-03-04  -25,00 EUR
 * ──────────────────────────
 *
 * Trade Republic Format-Beispiel (Kauf):
 * ──────────────────────────
 * WERTPAPIERABRECHNUNG
 * ÜBERSICHT
 * Kauf am 15.01.2026 an der Lang und Schwarz Exchange.
 *
 * POSITION  ANZAHL  KURS  BETRAG
 * Apple Inc.
 * ISIN: US0378331005
 * 10 Stk.  180,50 EUR  1.805,00 EUR
 * GESAMT  1.806,00 EUR
 * ──────────────────────────
 */
export function parseTradeRepublicPDFText(text: string, fileName: string): TradeRepublicParseResult {
  const errors: string[] = []
  const transactions: TradeRepublicParsedTransaction[] = []

  try {
    // Normalisiere Text
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // === Transaktionstyp erkennen ===
    const isSparplan = /WERTPAPIERABRECHNUNG\s+SPARPLAN/i.test(normalized)
    const isKauf = /(?:^|\n)\s*Kauf\s+am\s+/im.test(normalized) || isSparplan
    const isVerkauf = /(?:^|\n)\s*Verkauf\s+am\s+/im.test(normalized)
    const isDividende = /DIVIDENDE|AUSSCH[ÜU]TTUNG|Ertragsgutschrift/i.test(normalized)

    let txType: 'buy' | 'sell' | 'dividend'
    if (isDividende) txType = 'dividend'
    else if (isVerkauf) txType = 'sell'
    else if (isKauf) txType = 'buy'
    else {
      errors.push(`Konnte Transaktionstyp in "${fileName}" nicht erkennen.`)
      return { transactions, errors, fileName }
    }

    // === ISIN extrahieren ===
    let isin = ''
    const isinMatch = normalized.match(/ISIN:\s*([A-Z]{2}[A-Z0-9]{10})/i)
    if (isinMatch) {
      isin = isinMatch[1].toUpperCase()
    }
    if (!isin) {
      errors.push(`Keine ISIN in "${fileName}" gefunden.`)
      return { transactions, errors, fileName }
    }

    // === Name extrahieren ===
    // TR-Format: Name steht in der Zeile vor "ISIN: ..."
    let name = ''
    const nameMatch = normalized.match(/(?:POSITION[\s\S]*?\n)([\s\S]*?)(?=\nISIN:)/i)
    if (nameMatch) {
      // Letzte nicht-leere Zeile vor ISIN ist der Name
      const lines = nameMatch[1].split('\n').map(l => l.trim()).filter(Boolean)
      name = lines[lines.length - 1] || ''
    }
    // Fallback: Zeile direkt vor "ISIN:"
    if (!name) {
      const fallbackMatch = normalized.match(/([^\n]+)\nISIN:\s*[A-Z]{2}/i)
      if (fallbackMatch) {
        name = fallbackMatch[1].trim()
      }
    }

    // === Stückzahl und Kurs extrahieren ===
    // TR-Format Sparplan: "1,033912 Stk.24,18 EUR25,00 EUR" (Text ohne Leerzeichen nach pdf-parse)
    // Oder mit Leerzeichen: "1,033912 Stk. 24,18 EUR 25,00 EUR"
    // TR-Format Kauf: "10 Stk. 180,50 EUR 1.805,00 EUR"
    let quantity = 0
    let price = 0
    let totalValue = 0

    // Pattern 1: "ANZAHL Stk. KURS EUR BETRAG EUR" — alles in einer Zeile
    // pdf-parse kann Leerzeichen verschlucken: "1,033912 Stk.24,18 EUR25,00 EUR"
    const positionPattern = /([\d.,]+)\s*Stk\.?\s*([\d.,]+)\s*EUR\s*([\d.,]+)\s*EUR/i
    const posMatch = normalized.match(positionPattern)
    if (posMatch) {
      quantity = parseGermanNumber(posMatch[1])
      price = parseGermanNumber(posMatch[2])
      totalValue = parseGermanNumber(posMatch[3])
    }

    // Pattern 2: Mehrzeilig — Stk auf einer Zeile, Kurs auf anderer
    if (quantity === 0) {
      const qtyMatch = normalized.match(/([\d.,]+)\s*Stk\.?/i)
      if (qtyMatch) {
        quantity = parseGermanNumber(qtyMatch[1])
      }
      // Durchschnittskurs oder Kurs suchen
      const priceMatch = normalized.match(/(?:Durchschnittskurs|Kurs)\s*[:\s]?\s*([\d.,]+)\s*EUR/i)
      if (priceMatch) {
        price = parseGermanNumber(priceMatch[1])
      }
    }

    // === Gebühren extrahieren ===
    // TR hat oft keine separaten Gebühren (1€ flat fee oder kostenlose Sparpläne)
    let fees = 0
    const feePatterns = [
      /Fremdkostenzuschlag\s*:?\s*([\d.,]+)\s*EUR/i,
      /Geb[üu]hr(?:en)?\s*:?\s*([\d.,]+)\s*EUR/i,
      /Provision\s*:?\s*([\d.,]+)\s*EUR/i,
    ]
    for (const pat of feePatterns) {
      const match = normalized.match(pat)
      if (match) {
        fees += parseGermanNumber(match[1])
      }
    }

    // === GESAMT extrahieren (Gesamtbetrag) ===
    const gesamtMatch = normalized.match(/GESAMT\s*([\d.,]+)\s*EUR/i)
    if (gesamtMatch) {
      const gesamt = parseGermanNumber(gesamtMatch[1])
      if (gesamt > 0) {
        totalValue = gesamt
      }
    }

    // === Buchungsbetrag (Endbetrag) ===
    // Format: "WERTSTELLUNG BETRAG\n...\n-25,00 EUR" oder "2026-03-04 -25,00 EUR"
    let endAmount = 0
    const buchungPatterns = [
      // Buchungszeile: "DE50... 2026-03-04 -25,00 EUR"
      /\d{4}-\d{2}-\d{2}\s*-?([\d.,]+)\s*EUR/i,
      // Einfacher: Nach BUCHUNG den Betrag finden
      /BUCHUNG[\s\S]*?-?([\d.,]+)\s*EUR\s*$/im,
    ]
    for (const pat of buchungPatterns) {
      const match = normalized.match(pat)
      if (match) {
        endAmount = parseGermanNumber(match[1])
        break
      }
    }

    // === Datum extrahieren ===
    // TR-Formate:
    // "Sparplanausführung am 02.03.2026"
    // "Kauf am 15.01.2026"
    // "Verkauf am 10.02.2026"
    // Wertstellung: "2026-03-04" (ISO format)
    let date = ''
    const datePatterns = [
      // "Sparplanausführung am DD.MM.YYYY" oder "Kauf am DD.MM.YYYY"
      /(?:Sparplanausf[üu]hrung|Kauf|Verkauf|Dividende|Aussch[üu]ttung)\s+am\s+(\d{2}\.\d{2}\.\d{4})/i,
      // Datumsfeld "DATUM\nDD.MM.YYYY"
      /\bDATUM\s*\n?\s*(\d{2}\.\d{2}\.\d{4})/i,
      // ISO-Format Wertstellung: "2026-03-04"
      /(\d{4}-\d{2}-\d{2})/,
      // Beliebiges deutsches Datum im Text
      /(\d{2}\.\d{2}\.\d{4})/,
    ]
    for (const pat of datePatterns) {
      const match = normalized.match(pat)
      if (match) {
        const raw = match[1]
        // Prüfe ob ISO-Format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          date = raw
        } else {
          date = parseGermanDate(raw)
        }
        if (date) break
      }
    }

    // === Handelsplatz extrahieren ===
    let exchange = ''
    const exchangeMatch = normalized.match(/an\s+der\s+(.+?)(?:\.|$)/im)
    if (exchangeMatch) {
      exchange = exchangeMatch[1].trim()
    }

    // === Referenz-Nr ===
    let refNr = ''
    const refMatch = normalized.match(/AUSF[ÜU]HRUNG\s*\n?\s*([a-f0-9-]+)/i)
    if (refMatch) {
      refNr = refMatch[1]
    }

    // === Validierung ===
    if (quantity <= 0 && txType !== 'dividend') {
      errors.push(`Keine gültige Stückzahl in "${fileName}" gefunden.`)
      return { transactions, errors, fileName }
    }
    if (!date) {
      errors.push(`Kein Datum in "${fileName}" gefunden.`)
      return { transactions, errors, fileName }
    }

    // Für Dividenden: Betrag aus Endbetrag nehmen
    if (txType === 'dividend') {
      if (endAmount > 0) totalValue = endAmount
      if (quantity === 0) quantity = 1
      if (price === 0) price = totalValue
    }

    // Fallbacks
    if (totalValue === 0 && price > 0 && quantity > 0) {
      totalValue = Math.round(price * quantity * 100) / 100
    }
    if (price === 0 && totalValue > 0 && quantity > 0) {
      price = Math.round((totalValue / quantity) * 10000) / 10000
    }
    if (endAmount === 0) {
      endAmount = totalValue + fees
    }

    transactions.push({
      type: txType,
      name: cleanName(name),
      isin,
      quantity,
      price,
      totalValue,
      fees,
      endAmount,
      date,
      currency: 'EUR',
      exchange,
      notes: `Trade Republic Import${refNr ? ` — ${refNr}` : ''}`,
    })
  } catch (err) {
    errors.push(`Fehler beim Parsen von "${fileName}": ${err instanceof Error ? err.message : String(err)}`)
  }

  return { transactions, errors, fileName }
}

// === Hilfsfunktionen ===

/** Parst deutsche Zahlen: "1.234,56" → 1234.56, "0,407" → 0.407 */
function parseGermanNumber(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/** Parst deutsches Datum: "22.04.2025" → "2025-04-22" */
function parseGermanDate(str: string): string {
  const parts = str.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (!parts) return ''
  return `${parts[3]}-${parts[2]}-${parts[1]}`
}

/** Bereinigt den Wertpapier-Namen */
function cleanName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim()
}
