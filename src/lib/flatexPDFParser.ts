// src/lib/flatexPDFParser.ts — Parser für Flatex/DEGIRO PDF-Abrechnungen
// Unterstützt: Sammelabrechnung (Kauf/Verkauf), Fonds/Zertifikate, Dividenden

export interface FlatexParsedTransaction {
  type: 'buy' | 'sell' | 'dividend'
  name: string
  isin: string
  wkn: string
  quantity: number
  price: number       // Kurs pro Stück
  totalValue: number  // Kurswert (ohne Gebühren)
  fees: number        // Gesamtgebühren (Provision + Fremde Spesen)
  endAmount: number   // Endbetrag (inkl. Gebühren)
  date: string        // ISO format: YYYY-MM-DD
  currency: string
  exchange: string    // Handelsplatz
  notes: string       // z.B. "Flatex Import — Sammelabrechnung Nr.301390903/1"
}

export interface FlatexParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
  fileName: string
}

/**
 * Parst den extrahierten Text einer Flatex PDF-Abrechnung.
 * Unterstützt verschiedene Flatex-Dokumenttypen:
 * - "Sammelabrechnung (Wertpapierkauf/-verkauf)"
 * - "Wertpapierabrechnung Kauf Fonds/Zertifikate"
 * - Dividendenabrechnungen
 */
export function parseFlatexPDFText(text: string, fileName: string): FlatexParseResult {
  const errors: string[] = []
  const transactions: FlatexParsedTransaction[] = []

  try {
    // Normalisiere Text (mehrfache Leerzeichen, Zeilenumbrüche)
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Bestimme Dokumenttyp
    const isSammelabrechnung = normalized.includes('Sammelabrechnung')
    const isFondsKauf = normalized.includes('Kauf Fonds/Zertifikate')
    const isDividende = normalized.includes('Dividendengutschrift') ||
      normalized.includes('Ertragsgutschrift') ||
      normalized.includes('Ausschüttung')

    // Extrahiere Transaktions-Typ und Wertpapier-Info
    // Format 1: "Nr.301390903/1    Kauf    BITFARMS LTD. (CA09173B1076/A2PMY9)"
    // Format 2: "Nr.301600417/1    Kauf    XTRACKERS MSCI WLD INFORM (IE00BM67HT60/A113FM)"
    const txPattern = /Nr\.(\d+\/\d+)\s+(Kauf|Verkauf)\s+(.+?)\s+\(([A-Z0-9]{12})\/([A-Z0-9]+)\)/i
    const txMatch = normalized.match(txPattern)

    if (!txMatch && !isDividende) {
      // Versuche alternatives Pattern ohne Nr.
      const altPattern = /(Kauf|Verkauf)\s+(.+?)\s+\(([A-Z0-9]{12})\/([A-Z0-9]+)\)/i
      const altMatch = normalized.match(altPattern)

      if (!altMatch) {
        errors.push(`Konnte keine Transaktion in "${fileName}" erkennen. Flatex-Format erwartet.`)
        return { transactions, errors, fileName }
      }
    }

    // Extrahiere ISIN und WKN aus dem Match
    let txType: 'buy' | 'sell' | 'dividend' = 'buy'
    let name = ''
    let isin = ''
    let wkn = ''
    let txNumber = ''

    if (txMatch) {
      txNumber = txMatch[1]
      txType = txMatch[2].toLowerCase() === 'verkauf' ? 'sell' : 'buy'
      name = txMatch[3].trim()
      isin = txMatch[4]
      wkn = txMatch[5]
    } else if (isDividende) {
      txType = 'dividend'
      // Dividenden-Pattern: Wertpapier-Name (ISIN/WKN)
      const divPattern = /(?:für|von|per)\s+(.+?)\s+\(([A-Z0-9]{12})\/([A-Z0-9]+)\)/i
      const divMatch = normalized.match(divPattern)
      if (divMatch) {
        name = divMatch[1].trim()
        isin = divMatch[2]
        wkn = divMatch[3]
      } else {
        // Fallback: Versuche ISIN allein zu finden
        const isinOnly = normalized.match(/\(([A-Z]{2}[A-Z0-9]{10})\/([A-Z0-9]+)\)/)
        if (isinOnly) {
          isin = isinOnly[1]
          wkn = isinOnly[2]
          name = 'Unbekannt'
        } else {
          errors.push(`Konnte ISIN in "${fileName}" nicht finden.`)
          return { transactions, errors, fileName }
        }
      }
    }

    // Extrahiere Stückzahl
    // "Ordervolumen : 40,00 St." oder "Ausgeführt : 4,953299 St." oder "davon ausgef. : 40,00 St."
    let quantity = 0
    const qtyPatterns = [
      /(?:davon\s+ausgef\.|Ausgeführt)\s*:\s*([\d.,]+)\s*St\./i,
      /Ordervolumen\s*:\s*([\d.,]+)\s*St\./i,
    ]
    for (const pat of qtyPatterns) {
      const match = normalized.match(pat)
      if (match) {
        quantity = parseGermanNumber(match[1])
        break
      }
    }

    // Extrahiere Kurs
    // "Kurs : 3,9250 EUR" oder "Kurs : 100,640000 EUR"
    let price = 0
    const priceMatch = normalized.match(/Kurs\s*:\s*([\d.,]+)\s*EUR/i)
    if (priceMatch) {
      price = parseGermanNumber(priceMatch[1])
    }

    // Extrahiere Kurswert
    let totalValue = 0
    const kurswertMatch = normalized.match(/Kurswert\s*:\s*([\d.,]+)\s*EUR/i)
    if (kurswertMatch) {
      totalValue = parseGermanNumber(kurswertMatch[1])
    }

    // Extrahiere Provision/Gebühren
    let fees = 0
    const provisionMatch = normalized.match(/Provision\s*:\s*([\d.,]+)\s*EUR/i)
    if (provisionMatch) {
      fees += parseGermanNumber(provisionMatch[1])
    }
    const fremdeSpecMatch = normalized.match(/\*?Fremde Spesen\s*:\s*([\d.,]+)\s*EUR/i)
    if (fremdeSpecMatch) {
      fees += parseGermanNumber(fremdeSpecMatch[1])
    }

    // Extrahiere Endbetrag
    let endAmount = 0
    const endMatch = normalized.match(/Endbetrag\s*:\s*-?([\d.,]+)\s*EUR/i)
    if (endMatch) {
      endAmount = parseGermanNumber(endMatch[1])
    }

    // Extrahiere Datum
    // "Schlusstag : 10.10.2025" oder "Handelstag 15.10.2025" oder Dokumentdatum "Graz, den 11.10.2025"
    let date = ''
    const datePatterns = [
      /Schlusstag\s*:\s*(\d{2}\.\d{2}\.\d{4})/i,
      /Handelstag\s+(\d{2}\.\d{2}\.\d{4})/i,
      /Auftragsdatum\s+(\d{2}\.\d{2}\.\d{4})/i,
      /Graz,?\s*(?:den)?\s*(\d{2}\.\d{2}\.\d{4})/i,
    ]
    for (const pat of datePatterns) {
      const match = normalized.match(pat)
      if (match) {
        date = parseGermanDate(match[1])
        break
      }
    }

    // Extrahiere Handelsplatz
    let exchange = ''
    const exchangeMatch = normalized.match(/(?:Handelsplatz|Ausf\.platz)\s*[:/\-]\s*(.+?)(?:\n|$)/i)
    if (exchangeMatch) {
      exchange = exchangeMatch[1].trim()
    }

    // Validierung
    if (!isin) {
      errors.push(`Keine ISIN in "${fileName}" gefunden.`)
      return { transactions, errors, fileName }
    }
    if (quantity <= 0 && txType !== 'dividend') {
      errors.push(`Keine gültige Stückzahl in "${fileName}" gefunden.`)
      return { transactions, errors, fileName }
    }
    if (!date) {
      errors.push(`Kein Datum in "${fileName}" gefunden.`)
      return { transactions, errors, fileName }
    }

    // Für Dividenden: Betrag aus Endbetrag oder Kurswert nehmen
    if (txType === 'dividend') {
      if (endAmount > 0) {
        totalValue = endAmount
      }
      // Bei Dividenden ist Preis = Gesamtbetrag, Quantity = 1
      if (quantity === 0) quantity = 1
      if (price === 0) price = totalValue
    }

    // Fallback: Wenn Kurswert fehlt, berechne aus Kurs * Stückzahl
    if (totalValue === 0 && price > 0 && quantity > 0) {
      totalValue = price * quantity
    }

    transactions.push({
      type: txType,
      name: cleanName(name),
      isin,
      wkn,
      quantity,
      price,
      totalValue,
      fees,
      endAmount: endAmount || (totalValue + fees),
      date,
      currency: 'EUR',
      exchange,
      notes: `Flatex Import — ${isSammelabrechnung ? 'Sammelabrechnung' : isFondsKauf ? 'Fonds/Zertifikate' : 'Abrechnung'}${txNumber ? ` Nr.${txNumber}` : ''}`,
    })
  } catch (err) {
    errors.push(`Fehler beim Parsen von "${fileName}": ${err instanceof Error ? err.message : String(err)}`)
  }

  return { transactions, errors, fileName }
}

// === Hilfsfunktionen ===

/** Parst deutsche Zahlen: "1.234,56" → 1234.56, "4,953299" → 4.953299 */
function parseGermanNumber(str: string): number {
  if (!str) return 0
  // Entferne Tausendertrennpunkte, ersetze Dezimalkomma
  const cleaned = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/** Parst deutsches Datum: "10.10.2025" → "2025-10-10" */
function parseGermanDate(str: string): string {
  const parts = str.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (!parts) return ''
  return `${parts[3]}-${parts[2]}-${parts[1]}`
}

/** Bereinigt den Wertpapier-Namen */
function cleanName(name: string): string {
  return name
    .replace(/\s+/g, ' ')      // Mehrfach-Leerzeichen
    .replace(/\.$/, '')          // Trailing dot
    .trim()
}
