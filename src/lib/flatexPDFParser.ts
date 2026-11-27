// src/lib/flatexPDFParser.ts — Parser für Flatex/DEGIRO PDF-Abrechnungen
// Unterstützt: Sammelabrechnung (Kauf/Verkauf, auch mehrere Ausführungen in
// einem Dokument), Fonds/Zertifikate, Dividenden

export interface FlatexParsedTransaction {
  type: 'buy' | 'sell' | 'dividend'
  name: string
  isin: string
  wkn: string
  quantity: number
  price: number       // Kurs pro Stück
  totalValue: number  // Kurswert (ohne Gebühren)
  fees: number        // Gesamtkosten der Order (Gebühren, beim Verkauf auch einbehaltene Steuern)
  endAmount: number   // Endbetrag (Kauf: Kurswert + Kosten, Verkauf: Kurswert − Kosten)
  date: string        // ISO format: YYYY-MM-DD
  currency: string
  exchange: string    // Handelsplatz
  notes: string       // z.B. "Flatex Import — Sammelabrechnung Nr.301390903/1 · Gebühren 6.61€"
}

export interface FlatexParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
  fileName: string
}

/** Kopfzeile einer Ausführung: "Nr.301390903/1    Kauf    BITFARMS LTD. (CA09173B1076/A2PMY9)" */
interface OrderHeader {
  index: number
  txNumber: string
  type: 'buy' | 'sell'
  name: string
  isin: string
  wkn: string
}

const FEE_LABELS = [/Provision/, /\*?Fremde Spesen/, /Handelsplatz(?:gebühr|entgelt)/, /Transaktionsentgelt/, /(?:Makler)?courtage/]
const TAX_LABELS = [/Kapitalertrag(?:s)?steuer/, /Solidarit[äa]tszuschlag/, /Kirchensteuer/]

/** Betrag hinter einem Label, z.B. "Kurswert : 1.006,40 EUR" oder "Endbetrag : -163,61 EUR" */
function labeledAmount(text: string, label: RegExp): number {
  const match = text.match(new RegExp(`${label.source}\\s*:\\s*-?([\\d.,]+)\\s*EUR`, 'i'))
  return match ? parseGermanNumber(match[1]) : 0
}

/**
 * Gebühren und Steuern einer Ausführung. Beim Kauf gilt Endbetrag = Kurswert +
 * Gebühren, beim Verkauf Endbetrag = Kurswert − Gebühren − Steuern. Bisher
 * zählten nur Provision und Fremde Spesen; die beim Verkauf einbehaltene
 * Kapitalertragsteuer (mit Soli und Kirchensteuer) fehlte, und der Erlös stand
 * um die Steuer zu hoch. Die einzelnen Zeilen teilen den Betrag in Gebühr und
 * Steuer; fehlen Kurswert oder Endbetrag, zählen die Zeilen allein.
 */
function orderCosts(block: string, isSell: boolean, totalValue: number, endAmount: number): { fee: number; tax: number; total: number } {
  const round = (value: number) => Math.round(value * 100) / 100
  const difference = endAmount > 0 && totalValue > 0
    ? Math.max(0, round(isSell ? totalValue - endAmount : endAmount - totalValue))
    : 0
  const feeLines = round(FEE_LABELS.reduce((sum, label) => sum + labeledAmount(block, label), 0))
  const taxLines = round(TAX_LABELS.reduce((sum, label) => sum + labeledAmount(block, label), 0))
  const total = difference > 0 ? difference : round(feeLines + taxLines)
  const tax = Math.min(taxLines, total)
  return { fee: round(total - tax), tax, total }
}

/** "Ausgeführt : 4,953299 St.", "davon ausgef. : 40,00 St." oder "Ordervolumen : 40,00 St." */
function parseQuantity(text: string): number {
  const patterns = [
    /(?:davon\s+ausgef\.|Ausgeführt)\s*:\s*([\d.,]+)\s*St\./i,
    /Ordervolumen\s*:\s*([\d.,]+)\s*St\./i,
  ]
  for (const pat of patterns) {
    const match = text.match(pat)
    if (match) return parseGermanNumber(match[1])
  }
  return 0
}

/** "Schlusstag : 10.10.2025", "Handelstag 15.10.2025" oder das Dokumentdatum "Graz, den 11.10.2025" */
function parseDate(text: string): string {
  const patterns = [
    /Schlusstag\s*:\s*(\d{2}\.\d{2}\.\d{4})/i,
    /Handelstag\s+(\d{2}\.\d{2}\.\d{4})/i,
    /Auftragsdatum\s+(\d{2}\.\d{2}\.\d{4})/i,
    /Graz,?\s*(?:den)?\s*(\d{2}\.\d{2}\.\d{4})/i,
  ]
  for (const pat of patterns) {
    const match = text.match(pat)
    if (match) return parseGermanDate(match[1])
  }
  return ''
}

function parseExchange(text: string): string {
  const match = text.match(/(?:Handelsplatz|Ausf\.platz)\s*[:/\-]\s*(.+?)(?:\n|$)/i)
  return match ? match[1].trim() : ''
}

/**
 * Parst den extrahierten Text einer Flatex PDF-Abrechnung.
 * Unterstützt verschiedene Flatex-Dokumenttypen:
 * - "Sammelabrechnung (Wertpapierkauf/-verkauf)", auch mit mehreren Ausführungen
 * - "Wertpapierabrechnung Kauf Fonds/Zertifikate"
 * - Dividendenabrechnungen
 */
export function parseFlatexPDFText(text: string, fileName: string): FlatexParseResult {
  const errors: string[] = []
  const transactions: FlatexParsedTransaction[] = []

  try {
    // Normalisiere Text (Zeilenumbrüche)
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Bestimme Dokumenttyp
    const isSammelabrechnung = normalized.includes('Sammelabrechnung')
    const isFondsKauf = normalized.includes('Kauf Fonds/Zertifikate')
    const isDividende = normalized.includes('Dividendengutschrift') ||
      normalized.includes('Ertragsgutschrift') ||
      normalized.includes('Ausschüttung')
    const kind = isSammelabrechnung ? 'Sammelabrechnung' : isFondsKauf ? 'Fonds/Zertifikate' : 'Abrechnung'

    // Jede Ausführung beginnt mit ihrer Nummer:
    // Format 1: "Nr.301390903/1    Kauf    BITFARMS LTD. (CA09173B1076/A2PMY9)"
    // Format 2: "Nr.301600417/1    Kauf    XTRACKERS MSCI WLD INFORM (IE00BM67HT60/A113FM)"
    // Eine Sammelabrechnung kann mehrere enthalten (Nr.…/1, Nr.…/2 oder
    // verschiedene Orders). Bisher wurde nur die erste gelesen, die übrigen
    // Ausführungen desselben Dokuments fehlten im Depot.
    const orderPattern = /Nr\.(\d+\/\d+)\s+(Kauf|Verkauf)\s+(.+?)\s+\(([A-Z0-9]{12})\/([A-Z0-9]+)\)/gi
    const orders: OrderHeader[] = []
    for (const match of normalized.matchAll(orderPattern)) {
      orders.push({
        index: match.index ?? 0,
        txNumber: match[1],
        type: match[2].toLowerCase() === 'verkauf' ? 'sell' : 'buy',
        name: match[3].trim(),
        isin: match[4],
        wkn: match[5],
      })
    }

    // Die Umsatzliste (Depotumsätze oder Kontoumsätze als PDF) ist keine Abrechnung.
    // Ein Nutzer lud sie hoch und bekam nur "Flatex-Format erwartet".
    if (orders.length === 0 && /depotums[äa]tze|kontoums[äa]tze/i.test(normalized)) {
      errors.push(
        `"${fileName}" ist die Umsatzliste als PDF. Daraus lassen sich die Buchungen nicht zuverlässig lesen. ` +
        `Exportiere die Depotumsätze stattdessen als XLSX (Konto/Depot → Depotumsätze → XLSX-Export) ` +
        `oder lade einzelne Wertpapierabrechnungen aus dem Dokumentenarchiv hoch.`
      )
      return { transactions, errors, fileName }
    }

    if (orders.length === 0 && !isDividende) {
      // Alternatives Format ohne Nr.
      const alt = normalized.match(/(Kauf|Verkauf)\s+(.+?)\s+\(([A-Z0-9]{12})\/([A-Z0-9]+)\)/i)
      if (!alt) {
        errors.push(
          `Konnte keine Transaktion in "${fileName}" erkennen. Unterstützt werden einzelne Flatex-Abrechnungen ` +
          `aus dem Dokumentenarchiv (Sammelabrechnung, Kauf/Verkauf Fonds, Dividenden) und der XLSX-Export der Depotumsätze.`
        )
        return { transactions, errors, fileName }
      }
      orders.push({
        index: alt.index ?? 0,
        txNumber: '',
        type: alt[1].toLowerCase() === 'verkauf' ? 'sell' : 'buy',
        name: alt[2].trim(),
        isin: alt[3],
        wkn: alt[4],
      })
    }

    const documentDate = parseDate(normalized)
    const documentExchange = parseExchange(normalized)

    // === Kauf / Verkauf: ein Block je Ausführung, von ihrer Kopfzeile bis zur nächsten ===
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i]
      const block = normalized.slice(order.index, orders[i + 1]?.index ?? normalized.length)
      const label = order.txNumber ? `Nr.${order.txNumber}` : order.isin

      const quantity = parseQuantity(block)
      // "Kurs : 3,9250 EUR"; die Wortgrenze hält "Devisenkurs" heraus
      const price = labeledAmount(block, /\bKurs/)
      let totalValue = labeledAmount(block, /Kurswert/)
      const endAmount = labeledAmount(block, /Endbetrag/)
      const date = parseDate(block) || documentDate
      const exchange = parseExchange(block) || documentExchange

      if (quantity <= 0) {
        errors.push(`Keine gültige Stückzahl für ${label} in "${fileName}" gefunden.`)
        continue
      }
      if (!date) {
        errors.push(`Kein Datum für ${label} in "${fileName}" gefunden.`)
        continue
      }
      // Fallback: Wenn Kurswert fehlt, berechne aus Kurs * Stückzahl
      if (totalValue === 0 && price > 0) {
        totalValue = Math.round(price * quantity * 100) / 100
      }

      // Gebühr und Steuer landen zusammen in fees; die Notiz nennt beide, daran
      // trennt lib/portfolio/cashFlows sie wieder ("Steuern 12.34€")
      const costs = orderCosts(block, order.type === 'sell', totalValue, endAmount)
      transactions.push({
        type: order.type,
        name: cleanName(order.name),
        isin: order.isin,
        wkn: order.wkn,
        quantity,
        price,
        totalValue,
        fees: costs.total,
        endAmount: endAmount || (order.type === 'sell' ? totalValue - costs.total : totalValue + costs.total),
        date,
        currency: 'EUR',
        exchange,
        notes: `Flatex Import — ${kind}${order.txNumber ? ` Nr.${order.txNumber}` : ''}${
          costs.fee > 0 ? ` · Gebühren ${costs.fee.toFixed(2)}€` : ''
        }${costs.tax > 0 ? ` · Steuern ${costs.tax.toFixed(2)}€` : ''}`,
      })
    }

    // === Dividende ===
    if (orders.length === 0 && isDividende) {
      let name = ''
      let isin = ''
      let wkn = ''
      // Dividenden-Pattern: Wertpapier-Name (ISIN/WKN)
      const divMatch = normalized.match(/(?:für|von|per)\s+(.+?)\s+\(([A-Z0-9]{12})\/([A-Z0-9]+)\)/i)
      if (divMatch) {
        name = divMatch[1].trim()
        isin = divMatch[2]
        wkn = divMatch[3]
      } else {
        // Fallback: Versuche ISIN allein zu finden
        const isinOnly = normalized.match(/\(([A-Z]{2}[A-Z0-9]{10})\/([A-Z0-9]+)\)/)
        if (!isinOnly) {
          errors.push(`Konnte ISIN in "${fileName}" nicht finden.`)
          return { transactions, errors, fileName }
        }
        isin = isinOnly[1]
        wkn = isinOnly[2]
        name = 'Unbekannt'
      }
      if (!documentDate) {
        errors.push(`Kein Datum in "${fileName}" gefunden.`)
        return { transactions, errors, fileName }
      }

      // Betrag aus Endbetrag oder Kurswert; Preis = Gesamtbetrag, Quantity = 1
      let quantity = parseQuantity(normalized)
      let price = labeledAmount(normalized, /\bKurs/)
      let totalValue = labeledAmount(normalized, /Kurswert/)
      const endAmount = labeledAmount(normalized, /Endbetrag/)
      if (endAmount > 0) totalValue = endAmount
      if (quantity === 0) quantity = 1
      if (price === 0) price = totalValue
      if (totalValue === 0 && price > 0 && quantity > 0) totalValue = price * quantity

      transactions.push({
        type: 'dividend',
        name: cleanName(name),
        isin,
        wkn,
        quantity,
        price,
        totalValue,
        fees: 0,
        endAmount: endAmount || totalValue,
        date: documentDate,
        currency: 'EUR',
        exchange: documentExchange,
        notes: `Flatex Import — ${kind}`,
      })
    }
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
