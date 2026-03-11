// src/lib/smartbrokerPDFParser.ts — Parser für Smartbroker+ (Baader Bank) PDF-Abrechnungen
// Unterstützt: Wertpapierabrechnung Kauf/Verkauf, Sparpläne, Dividenden
// Format: "Baader Bank AG" / "SMARTBROKER+" / "smartbrokerplus.de"

export interface SmartbrokerParsedTransaction {
  type: 'buy' | 'sell' | 'dividend'
  name: string
  isin: string
  wkn: string
  quantity: number
  price: number       // Kurs pro Stück
  totalValue: number  // Kurswert (ohne Gebühren)
  fees: number        // Gesamtgebühren (Provision Smartbroker + sonstige)
  endAmount: number   // Endbetrag (inkl. Gebühren)
  date: string        // ISO format: YYYY-MM-DD
  currency: string
  exchange: string    // Ausführungsplatz
  notes: string
}

export interface SmartbrokerParseResult {
  transactions: SmartbrokerParsedTransaction[]
  errors: string[]
  fileName: string
}

/**
 * Parst den extrahierten Text einer Smartbroker+ PDF-Abrechnung.
 * Erkennt: Wertpapierabrechnung (Kauf/Verkauf), Dividendenabrechnungen
 */
export function parseSmartbrokerPDFText(text: string, fileName: string): SmartbrokerParseResult {
  const errors: string[] = []
  const transactions: SmartbrokerParsedTransaction[] = []

  try {
    // Normalisiere Text
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Bestimme Transaktions-Typ
    const isKauf = /Wertpapierabrechnung:\s*Kauf/i.test(normalized)
    const isVerkauf = /Wertpapierabrechnung:\s*Verkauf/i.test(normalized)
    const isDividende = /Dividendengutschrift|Ertragsgutschrift|Aussch[üu]ttung/i.test(normalized)

    let txType: 'buy' | 'sell' | 'dividend'
    if (isKauf) txType = 'buy'
    else if (isVerkauf) txType = 'sell'
    else if (isDividende) txType = 'dividend'
    else {
      errors.push(`Konnte Transaktionstyp in "${fileName}" nicht erkennen (erwartet: Kauf/Verkauf/Dividende).`)
      return { transactions, errors, fileName }
    }

    // Extrahiere ISIN und WKN
    // Format: "ISIN: IE00BFMXXD54 WKN: A2PFN2" oder "ISIN: IE00BFMXXD54  WKN: A2PFN2"
    let isin = ''
    let wkn = ''
    const isinMatch = normalized.match(/ISIN:\s*([A-Z]{2}[A-Z0-9]{10})/i)
    if (isinMatch) {
      isin = isinMatch[1].toUpperCase()
    }
    const wknMatch = normalized.match(/WKN:\s*([A-Z0-9]+)/i)
    if (wknMatch) {
      wkn = wknMatch[1].toUpperCase()
    }

    if (!isin) {
      errors.push(`Keine ISIN in "${fileName}" gefunden.`)
      return { transactions, errors, fileName }
    }

    // Extrahiere Name
    // Format: "STK 10 Vanguard S&P 500 UCITS ETF\nReg. Shs USD Acc. oN"
    // Oder: "STK 0,407 Xtr.MSCI Europe Small Cap\nInhaber-Anteile 1C o.N."
    let name = ''
    const nameMatch = normalized.match(/STK\s+[\d.,]+\s+([\s\S]+?)(?:\nDepotinhaber)/)
    if (nameMatch) {
      // Nimm erste Zeile des Namens (vor Zusatzzeilen wie "Reg. Shs..." oder "Inhaber-Anteile...")
      const rawName = nameMatch[1].trim()
      const lines = rawName.split('\n').map(l => l.trim()).filter(Boolean)
      // Erste Zeile ist der Hauptname
      name = lines[0] || rawName
      // Optionale zweite Zeile als Zusatzinfo (nur wenn kurz genug)
      if (lines.length > 1 && lines[1].length < 40 && !lines[1].includes('Depotinhaber')) {
        name = `${name} ${lines[1]}`
      }
    }

    // Extrahiere Stückzahl
    // Format: "STK 10" oder "STK 0,407" — kommt nach "Nominale"
    let quantity = 0
    const qtyMatch = normalized.match(/STK\s+([\d.,]+)/i)
    if (qtyMatch) {
      quantity = parseGermanNumber(qtyMatch[1])
    }

    // Extrahiere Kurs
    // Im Smartbroker-PDF ist "Kurs" ein Tabellen-Header, EUR und Preis stehen getrennt
    // Am zuverlässigsten: "Details zur Ausführung:" Sektion: "STK 10 EUR 86,4619"
    // Oder "STK 0,407 EUR 61,38" in der Details-Sektion
    let price = 0
    const pricePatterns = [
      // Details-Sektion: "STK 10 EUR 86,4619" oder "STK 0,407 EUR 61,38"
      /Details zur Ausf[\s\S]*?STK\s+[\d.,]+\s+EUR\s+([\d.,]+)/i,
      // Inline: "Kurs EUR 86,4619"
      /Kurs\s+EUR\s+([\d.,]+)/i,
      // Mehrzeilig: "Kurs" ... "EUR" ... "Zahl" — Preis direkt nach dem Ausführungsplatz
      /Ausf[üu]hrungsplatz:.*?\n([\d.,]+)\n/i,
    ]
    for (const pat of pricePatterns) {
      const match = normalized.match(pat)
      if (match) {
        price = parseGermanNumber(match[1])
        break
      }
    }

    // Extrahiere Kurswert
    // Format: "Kurswert EUR 864,62" oder "Kurswert\nEUR\n864,62"
    let totalValue = 0
    const kurswertPatterns = [
      /Kurswert\s+EUR\s+([\d.,]+)/i,
      /Kurswert\s*\n?\s*EUR\s*\n?\s*([\d.,]+)/i,
    ]
    for (const pat of kurswertPatterns) {
      const match = normalized.match(pat)
      if (match) {
        totalValue = parseGermanNumber(match[1])
        break
      }
    }

    // Extrahiere Gebühren
    // Format: "Provision Smartbroker EUR 4,00" oder andere Gebührenzeilen
    let fees = 0
    const feePatterns = [
      /Provision\s+(?:Smartbroker\s+)?EUR\s+([\d.,]+)/gi,
      /Transaktionsentgelt\s+EUR\s+([\d.,]+)/gi,
      /Handelsentgelt\s+EUR\s+([\d.,]+)/gi,
      /Fremde\s+Spesen\s+EUR\s+([\d.,]+)/gi,
      /B[öo]rsenentgelt\s+EUR\s+([\d.,]+)/gi,
    ]
    for (const pat of feePatterns) {
      let match
      while ((match = pat.exec(normalized)) !== null) {
        fees += parseGermanNumber(match[1])
      }
    }

    // Extrahiere Endbetrag (Gesamtbetrag inkl. Gebühren)
    // Format: "Zu Lasten Konto 3369684000 Valuta: 24.04.2025 EUR 868,62" (Kauf)
    // Oder: "Zu Gunsten Konto ... EUR 1.234,56" (Verkauf)
    let endAmount = 0
    const endPatterns = [
      /Zu\s+(?:Lasten|Gunsten)\s+Konto\s+\d+\s+(?:Valuta:\s*[\d.]+\s+)?EUR\s+([\d.,]+)/i,
      /Zu\s+(?:Lasten|Gunsten)\s+Konto.*?EUR\s+([\d.,]+)/i,
    ]
    for (const pat of endPatterns) {
      const match = normalized.match(pat)
      if (match) {
        endAmount = parseGermanNumber(match[1])
        break
      }
    }

    // Extrahiere Datum
    // Smartbroker-Format: "Auftragszeit:\n22.04.2025\n09:42:51:00"
    // Oder in Details: "22.04.2025 09:42:51:840"
    // "Auftragsdatum:" hat leider das Datum NICHT direkt daneben (dort steht "EUR")
    let date = ''
    const datePatterns = [
      // "Auftragszeit:" gefolgt vom Datum
      /Auftragszeit:\s*\n?\s*(\d{2}\.\d{2}\.\d{4})/i,
      // Details zur Ausführung: Datum in der Zeile
      /Details zur Ausf[\s\S]*?(\d{2}\.\d{2}\.\d{4})/i,
      // Handelsdatum Spalte
      /Handelsdatum[\s\S]*?(\d{2}\.\d{2}\.\d{4})/i,
      // Auftragsdatum (wenn direkt gefolgt)
      /Auftragsdatum:\s*(\d{2}\.\d{2}\.\d{4})/i,
      // Valuta als Fallback
      /Valuta:\s*(\d{2}\.\d{2}\.\d{4})/i,
    ]
    for (const pat of datePatterns) {
      const match = normalized.match(pat)
      if (match) {
        date = parseGermanDate(match[1])
        break
      }
    }

    // Extrahiere Ausführungsplatz
    // Format: "Ausführungsplatz: Berlin Tradegate" oder "Ausführungsplatz: GETTEX - MM Munich"
    let exchange = ''
    const exchangeMatch = normalized.match(/Ausf[üu]hrungsplatz:\s*(.+?)(?:\n|$)/i)
    if (exchangeMatch) {
      exchange = exchangeMatch[1].trim()
    }

    // Extrahiere Referenz-Nr für Notes
    let refNr = ''
    const refMatch = normalized.match(/Referenz-Nr\.?:\s*(\d+)/i)
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
      if (endAmount > 0) {
        totalValue = endAmount
      }
      if (quantity === 0) quantity = 1
      if (price === 0) price = totalValue
    }

    // Fallback: Wenn Kurswert fehlt, berechne aus Kurs × Stückzahl
    if (totalValue === 0 && price > 0 && quantity > 0) {
      totalValue = Math.round(price * quantity * 100) / 100
    }

    // Fallback: Wenn Endbetrag fehlt, berechne aus Kurswert + Gebühren
    if (endAmount === 0) {
      endAmount = totalValue + fees
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
      endAmount,
      date,
      currency: 'EUR',
      exchange,
      notes: `Smartbroker+ Import${refNr ? ` — Ref. ${refNr}` : ''}`,
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
    .replace(/\s+/g, ' ')      // Mehrfach-Leerzeichen
    .replace(/\.$/, '')          // Trailing dot
    .replace(/\boN$/, '')        // "oN" am Ende entfernen
    .replace(/\bo\.N\.$/, '')    // "o.N." am Ende entfernen
    .trim()
}
