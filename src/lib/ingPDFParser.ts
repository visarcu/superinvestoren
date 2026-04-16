// src/lib/ingPDFParser.ts — Parser für ING-Depot PDF-Dokumente (Direkt-Depot).
// Unterstützt:
//  • Wertpapierabrechnung Kauf / Kauf aus Sparplan / Verkauf
//  • Ertragsgutschrift (Dividende / Ausschüttung)
//  • Übertrag Ausgang / Eingang (Depotübertrag)
//
// Das Ergebnis nutzt FlatexParsedTransaction, damit das bestehende
// Broker-PDF-Handling (Batch-Import, Duplikaterkennung, Holdings-Rekonstruktion)
// ohne Änderungen funktioniert.

// ING-Transaktionen haben zusätzliche Typen (transfer_in/transfer_out für
// Depotüberträge), die in FlatexParsedTransaction nicht vorgesehen sind.
// Wir duplizieren das Interface mit erweitertem Type-Union.
export interface IngParsedTransaction {
  type: 'buy' | 'sell' | 'dividend' | 'transfer_in' | 'transfer_out'
  name: string
  isin: string
  wkn: string
  quantity: number
  price: number
  totalValue: number
  fees: number
  endAmount: number
  date: string
  currency: string
  exchange: string
  notes: string
}

export interface IngParseResult {
  transactions: IngParsedTransaction[]
  errors: string[]
  fileName: string
}

// === Helpers ===

function parseGermanNumber(value: string): number {
  if (!value) return 0
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseGermanDate(d: string): string | null {
  const m = d.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

/**
 * Erkennt, ob ein PDF-Text von ING-DiBa stammt.
 */
export function isIngPDF(text: string): boolean {
  return (
    text.includes('ING-DiBa AG') ||
    text.includes('Direkt-Depot Nr.') ||
    text.includes('ing.de/wertpapierwissen')
  )
}

/**
 * Entfernt Kopfzeilen (Adressblock, Depot-Metadaten), damit Regex nicht
 * versehentlich Datum aus dem "Datum:"-Feld nimmt statt dem Ausführungstag.
 */
function stripHeader(text: string): string {
  return text
    .replace(/Depotinhaber:[^\n]*\n/g, '')
    .replace(/Direkt-Depot\s*Nr\.?:[^\n]*\n/g, '')
    .replace(/Datum:[^\n]*\n/g, '')
    .replace(/Seite:[^\n]*\n/g, '')
}

// === Parser für einen einzelnen ING-PDF ===

export function parseIngPDFText(text: string, fileName: string): IngParseResult {
  const errors: string[] = []
  const transactions: IngParsedTransaction[] = []

  try {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const body = stripHeader(normalized)

    // Dokumenttyp erkennen
    const isKauf = /Wertpapierabrechnung[\s\S]*?Kauf/i.test(normalized)
    const isVerkauf = /Wertpapierabrechnung[\s\S]*?Verkauf/i.test(normalized)
    const isDividende = /Ertragsgutschrift|Dividendengutschrift/i.test(normalized)
    const isTransferOut = /Übertrag\s+Ausgang/i.test(normalized) || /Wertpapiere\s+haben\s+wir\s+Ihrem\s+Depot\s+entnommen/i.test(normalized)
    const isTransferIn = /Übertrag\s+Eingang/i.test(normalized) || /Wertpapiere\s+haben\s+wir\s+Ihrem\s+Depot\s+gutgeschrieben/i.test(normalized)

    // Informationsdokumente — werden NUR anhand des Dokumententitels erkannt
    // (die ersten ~1200 Zeichen, um auch Titelzeilen nach längeren Adressblöcken zu erfassen).
    // Footer-Erwähnungen wie "Jahressteuerbescheinigung folgt" in echten Dividenden-PDFs
    // werden durch die Transaktions-Flag-Checks ausgeschlossen.
    const titleArea = normalized.slice(0, 1200)
    const isPrimary = (pattern: RegExp) => pattern.test(titleArea) && !isKauf && !isVerkauf && !isDividende && !isTransferIn && !isTransferOut

    if (isPrimary(/Vorabpauschale/i)) {
      errors.push(`${fileName}: Vorabpauschale-Mitteilung (kein Cashflow) — übersprungen`)
      return { transactions, errors, fileName }
    }
    if (isPrimary(/Depotauszug/i)) {
      errors.push(`${fileName}: Depotauszug (Bestandsübersicht) — übersprungen`)
      return { transactions, errors, fileName }
    }
    if (isPrimary(/Kostenaufstellung/i)) {
      errors.push(`${fileName}: Kostenaufstellung (jährliche Ex-post-Information) — übersprungen`)
      return { transactions, errors, fileName }
    }
    // Jahressteuerbescheinigung: ING nutzt den kürzeren Begriff "Steuerbescheinigung" im Text.
    if (isPrimary(/(?:Jahres)?Steuerbescheinigung/i)) {
      errors.push(`${fileName}: Jahressteuerbescheinigung — übersprungen`)
      return { transactions, errors, fileName }
    }
    if (isPrimary(/Kontoauszug/i)) {
      errors.push(`${fileName}: Konto-/Depotauszug — übersprungen`)
      return { transactions, errors, fileName }
    }
    if (isPrimary(/Erträgnisaufstellung|Ertraegnisaufstellung/i)) {
      errors.push(`${fileName}: Erträgnisaufstellung (Jahresübersicht) — übersprungen`)
      return { transactions, errors, fileName }
    }

    // ISIN + WKN extrahieren: "ISIN (WKN)IE00B8GKDB10 (A1T8FV)" (pdf-parse klebt Label+Wert zusammen)
    const isinMatch = body.match(/ISIN\s*\(WKN\)[:\s]*([A-Z]{2}[A-Z0-9]{10})\s*\(([A-Z0-9]+)\)/i)
    const isin = isinMatch?.[1] || ''
    const wkn = isinMatch?.[2] || ''

    // Wertpapierbezeichnung (mehrzeilig möglich)
    // pdf-parse-Format: "WertpapierbezeichnungVang.FTSE A.-Wo.Hi.Di.Yi.U.ETF\nRegistered Shares USD Dis.oN\n"
    let name = ''
    const nameMatch = body.match(/Wertpapierbezeichnung\s*([^\n]+?)(?:\n\s*([^\n]+))?/)
    if (nameMatch) {
      name = nameMatch[1].trim()
      if (nameMatch[2] && !/^(?:ISIN|Nominale|Kurs|Handelsplatz|Ausführung|Endbetrag|Depot|Ertrag|Ex-Tag|Zahltag)/.test(nameMatch[2])) {
        name = `${name} ${nameMatch[2].trim()}`
      }
    }

    // === Kauf / Verkauf ===
    if ((isKauf || isVerkauf) && !isDividende) {
      // Nominale: "NominaleStück0,78052" (kein Space!)
      const qtyMatch = body.match(/Nominale\s*(?:Stück\s*)?([\d.]+,\d+|[\d.]+)/)
      // Kurs: "KursEUR64,06" oder "Kurs (Festpreisgeschäft)EUR128,16"
      const priceMatch = body.match(/Kurs\s*(?:\([^)]*\))?\s*EUR\s*([\d.]+,\d+|[\d.]+)/)
      // Datum: "Ausführungstag/ -zeit16.06.2025um 09:04:14 Uhr"
      const dateMatch = body.match(/Ausführungstag[\s\S]*?(\d{2}\.\d{2}\.\d{4})/)
      // Kurswert: "KurswertEUR50,00"
      const totalMatch = body.match(/Kurswert\s*EUR\s*([\d.]+,\d+|[\d.]+)/)
      // Endbetrag: "Endbetrag zu Ihren LastenEUR50,00"
      const endAmountMatch = body.match(/Endbetrag\s+zu\s+Ihren\s+(?:Lasten|Gunsten)\s*EUR\s*([\d.]+,\d+|[\d.]+)/)
      // Handelsplatz: "HandelsplatzXetra" oder "HandelsplatzDirektgeschäft Inl."
      const exchangeMatch = body.match(/Handelsplatz\s*([A-Za-zÄÖÜ][^\n]*)/)

      const quantity = parseGermanNumber(qtyMatch?.[1] || '')
      const price = parseGermanNumber(priceMatch?.[1] || '')
      const totalValue = parseGermanNumber(totalMatch?.[1] || '')
      const endAmount = parseGermanNumber(endAmountMatch?.[1] || '')
      const date = parseGermanDate(dateMatch?.[1] || '')

      if (!isin || !date || quantity <= 0 || price <= 0) {
        errors.push(`${fileName}: Kauf/Verkauf — unvollständig (ISIN=${isin}, date=${date}, qty=${quantity}, price=${price})`)
      } else {
        const fees = Math.max(0, endAmount - totalValue) // Gebühren = Endbetrag − Kurswert
        const isSparplan = /Kauf aus Sparplan/i.test(normalized)
        transactions.push({
          type: isVerkauf ? 'sell' : 'buy',
          name: name || isin,
          isin,
          wkn,
          quantity,
          price,
          totalValue,
          fees,
          endAmount,
          date,
          currency: 'EUR',
          exchange: exchangeMatch?.[1]?.trim() || 'XETRA',
          notes: `ING-Import · ${isVerkauf ? 'Verkauf' : isSparplan ? 'Sparplan-Kauf' : 'Kauf'}${fees > 0 ? ` · Gebühren ${fees.toFixed(2)}€` : ''}`,
        })
      }
    }

    // === Dividende / Ertragsgutschrift ===
    if (isDividende) {
      // Nominale: "Nominale88,40227 Stück"
      const qtyMatch = body.match(/Nominale\s*([\d.]+,\d+|[\d.]+)\s*Stück/)
      // Ex-Tag oder Zahltag — wir nutzen Zahltag als "Datum" (Buchungstag)
      const dateMatch = body.match(/Zahltag\s*(\d{2}\.\d{2}\.\d{4})/) || body.match(/Ex-Tag\s*(\d{2}\.\d{2}\.\d{4})/)
      // Gesamtbetrag in EUR (bei USD-Dividenden ist das der umgerechnete Wert)
      const totalEurMatch = body.match(/Gesamtbetrag\s+zu\s+Ihren\s+Gunsten\s*EUR\s*([\d.]+,\d+|[\d.]+)/)
      // Fallback: manchmal nur "Brutto EUR ..."
      const bruttoEurMatch = !totalEurMatch ? body.match(/Brutto\s*EUR\s*([\d.]+,\d+|[\d.]+)/) : null

      const quantity = parseGermanNumber(qtyMatch?.[1] || '')
      const totalEur = parseGermanNumber(totalEurMatch?.[1] || bruttoEurMatch?.[1] || '')
      const date = parseGermanDate(dateMatch?.[1] || '')

      if (!isin || !date || totalEur <= 0) {
        errors.push(`${fileName}: Dividende — unvollständig (ISIN=${isin}, date=${date}, total=${totalEur})`)
      } else {
        transactions.push({
          type: 'dividend',
          name: name || isin,
          isin,
          wkn,
          quantity: quantity > 0 ? quantity : 1,
          price: quantity > 0 ? totalEur / quantity : totalEur,
          totalValue: totalEur,
          fees: 0,
          endAmount: totalEur,
          date,
          currency: 'EUR',
          exchange: '',
          notes: `ING-Import · Dividende${quantity > 0 ? ` · ${quantity.toLocaleString('de-DE')} Stk.` : ''}`,
        })
      }
    }

    // === Depotübertrag (Eingang / Ausgang) ===
    // Ein PDF kann MEHRERE Positionen enthalten (z.B. 147 Stk. A + 86 Stk. B).
    // Format pro Position:
    //   "147,00Stück17.10.20240023886680VanguardFTSEAll-WorldU.ETF
    //    Registered Shares USD Dis.oN
    //    ISIN (WKN):IE00B3RBWM25 (A1JX52)
    //    WertpapierrechnungGroßbritannien"
    if (isTransferIn || isTransferOut) {
      // Alle Positionen auf einmal erfassen: Menge → Datum → ISIN + WKN
      // Regex: erfasst "X,00Stück<Datum>...ISIN (WKN):<ISIN> (<WKN>)"
      const positionRegex = /([\d.]+,\d+|\d+)\s*Stück[\s\S]{0,50}?(\d{2}\.\d{2}\.\d{4})[\s\S]{0,400}?ISIN\s*\(WKN\)[:\s]*([A-Z]{2}[A-Z0-9]{10})\s*\(([A-Z0-9]+)\)/gi
      const positions: Array<{ qty: number; date: string; isin: string; wkn: string }> = []
      let pm: RegExpExecArray | null
      while ((pm = positionRegex.exec(body)) !== null) {
        const qty = parseGermanNumber(pm[1])
        const d = parseGermanDate(pm[2])
        if (qty > 0 && d && pm[3]) {
          positions.push({ qty, date: d, isin: pm[3], wkn: pm[4] || '' })
        }
      }

      if (positions.length === 0) {
        errors.push(`${fileName}: Depotübertrag — keine Positionen erkannt`)
      } else {
        for (const pos of positions) {
          transactions.push({
            type: isTransferIn ? 'transfer_in' : 'transfer_out',
            name: name || pos.isin,
            isin: pos.isin,
            wkn: pos.wkn,
            quantity: pos.qty,
            price: 0, // ING-Depotüberträge enthalten keinen Kurs
            totalValue: 0,
            fees: 0,
            endAmount: 0,
            date: pos.date,
            currency: 'EUR',
            exchange: '',
            notes: `ING-Import · ${isTransferIn ? 'Depotübertrag (Eingang)' : 'Depotübertrag (Ausgang)'} · Anschaffungsdaten werden separat übermittelt`,
          })
        }
      }
    }

    // Wenn wir nichts erkannt haben: nicht unterstützter Dokumenttyp
    if (transactions.length === 0 && errors.length === 0) {
      errors.push(`${fileName}: Kein unterstützter ING-Dokumenttyp erkannt (ggf. Depotauszug, Kontoauszug oder Kostenaufstellung — nicht importierbar)`)
    }
  } catch (err) {
    errors.push(`${fileName}: Parser-Fehler — ${err instanceof Error ? err.message : String(err)}`)
  }

  return { transactions, errors, fileName }
}
