// src/lib/trading212PDFParser.ts — Parser für Trading 212 Monats-Kontoauszüge (PDF).
//
// Unterstützt:
//  • Kauf / Verkauf (Invest-Konto)
//  • Dividenden
//  • Einzahlungen / Auszahlungen (Cash)
//
// Hinweis: Trading 212 liefert alle EUR-Beträge umgerechnet (inkl. FX-Gebühr).
// Der Parser nutzt den EUR-Wert als totalValue, damit die Finclue-Cash-Logik
// identisch zu den anderen Brokern funktioniert. Instrument-Currency (USD etc.)
// wird in den Notes vermerkt.
//
// CSV-Export ist bei Trading 212 vollständiger (Menu → History → Export) und
// sollte langfristig bevorzugt werden. PDF-Support existiert, weil User die
// CSV-Option nicht immer kennen oder Monats-PDFs archiviert haben.

export interface Trading212ParsedTransaction {
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal'
  name: string
  isin: string
  symbol: string         // z.B. 'MSFT', 'P911'
  quantity: number
  price: number          // EUR pro Aktie (umgerechnet aus Instrument-Währung)
  totalValue: number     // EUR Gesamtbetrag (= Kurswert ohne Gebühren)
  fees: number           // EUR FX-Gebühr + Steuern
  endAmount: number      // EUR tatsächlich abgebuchter/gutgeschriebener Betrag
  date: string           // YYYY-MM-DD
  currency: string       // immer 'EUR' (Trading212 Haupt-Währung)
  exchange: string       // Instrument-Währung + Platz (z.B. 'USD / OTC')
  notes: string
}

export interface Trading212ParseResult {
  transactions: Trading212ParsedTransaction[]
  errors: string[]
  fileName: string
}

function parseNum(value: string | undefined | null): number {
  if (!value) return 0
  // Trading 212 nutzt englisches Format (Punkt als Dezimaltrennzeichen).
  const cleaned = value.replace(/[€$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Erkennt, ob ein PDF-Text von Trading 212 stammt.
 * Trading 212 wird sowohl von "Trading 212 EU GmbH" als auch (für ältere
 * Kontoauszüge) von "FXFlat Bank GmbH" erstellt — beides sind gültige Parser.
 */
export function isTrading212PDF(text: string): boolean {
  return (
    text.includes('Trading 212') ||
    text.includes('trading212.com') ||
    /Invest-Konto\s*-\s*ausgeführte/i.test(text)
  )
}

/**
 * pdf-parse klebt alle Zahlen ohne Separator zusammen (z.B. "0.59085685399.49236.0414"),
 * was bedeutet: wir kennen die Grenzen zwischen qty/price/value nicht syntaktisch.
 *
 * Strategie: alle möglichen Splits probieren und den nehmen, bei dem qty × price ≈ value
 * mit ≤1 % Toleranz passt. Für die echten Daten ist der Split immer eindeutig, weil
 * typische qty (0,x) × typischer price (XX.XX) einen ganz spezifischen value ergibt.
 */
function splitQtyPriceValue(combined: string): { qty: number; price: number; value: number } | null {
  // qty hat immer einen '.', value hat immer einen '.'. price kann aber ganzzahlig
  // sein (z.B. BKNG @ 4138 USD bei pdf-parse-Rundung) → optional .
  if (combined.length < 7) return null

  let best: { qty: number; price: number; value: number; error: number } | null = null

  for (let i = 3; i <= combined.length - 4; i++) {
    for (let j = i + 1; j <= combined.length - 3; j++) {
      const sQty = combined.slice(0, i)
      const sPrice = combined.slice(i, j)
      const sValue = combined.slice(j)
      // qty muss genau einen Punkt haben
      if ((sQty.match(/\./g) || []).length !== 1) continue
      // price: 0 oder 1 Punkt
      if ((sPrice.match(/\./g) || []).length > 1) continue
      // value muss einen Punkt haben
      if ((sValue.match(/\./g) || []).length !== 1) continue
      const qty = parseFloat(sQty)
      const price = parseFloat(sPrice)
      const value = parseFloat(sValue)
      if (!isFinite(qty) || !isFinite(price) || !isFinite(value)) continue
      if (qty <= 0 || price <= 0 || value <= 0) continue
      const expected = qty * price
      const error = Math.abs(expected - value) / value
      if (error > 0.015) continue
      if (!best || error < best.error) best = { qty, price, value, error }
    }
  }

  return best ? { qty: best.qty, price: best.price, value: best.value } : null
}

/**
 * Parst ausgeführte Aufträge (Kauf/Verkauf) aus dem "Invest-Konto"-Block.
 *
 * Beispiel-Zeile:
 *   "2026-02-17 14:30:00MSFTUS5949181045USD46753375953Kaufen0.59085685399.49236.0414MarketOTCReguläre Zeiten
 *    1.18197998
 *    EUR0.3--200"
 */
function parseTrades(sectionText: string): Trading212ParsedTransaction[] {
  const trades: Trading212ParsedTransaction[] = []

  // Alle Trade-Starts finden (Datum + Ticker + ISIN + Instrument-Currency + Order-ID + Kaufen/Verkaufen)
  // und dann der Rest bis zum nächsten Trade oder Section-Ende.
  const tradeStartRegex = /(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}([A-Z0-9.]+?)([A-Z]{2}[A-Z0-9]{10})([A-Z]{3})\d+(Kaufen|Verkaufen)/g

  const starts: Array<{ date: string; symbol: string; isin: string; currency: string; action: string; indexAfter: number }> = []
  let startMatch: RegExpExecArray | null
  while ((startMatch = tradeStartRegex.exec(sectionText)) !== null) {
    starts.push({
      date: startMatch[1],
      symbol: startMatch[2],
      isin: startMatch[3],
      currency: startMatch[4],
      action: startMatch[5],
      indexAfter: startMatch.index + startMatch[0].length,
    })
  }

  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i]
    const nextStart = i + 1 < starts.length ? starts[i + 1].date : null
    const segmentEnd = i + 1 < starts.length
      ? sectionText.indexOf(`${nextStart} `, cur.indexAfter)
      : sectionText.length
    const body = sectionText.slice(cur.indexAfter, segmentEnd > 0 ? segmentEnd : undefined)

    // 1) qty + price + value (vor "Market")
    const numericBeforeMarket = body.match(/^([\d.]+)Market/)
    if (!numericBeforeMarket) continue
    const split = splitQtyPriceValue(numericBeforeMarket[1])
    if (!split) continue

    // 2) FX-Rate + Fee + EUR-Wert extrahieren. Format nach "Reguläre Zeiten":
    //    "<FXRATE>EUR<FXFEE>--<EURVALUE>" (Kauf) oder
    //    "<FXRATE>EUR---<EURVALUE>" (EUR-Instrument, keine FX-Gebühr)
    //    "<FXRATE>EUR<FXFEE>-<RENDITE>-<EURVALUE>" (Verkauf mit Rendite)
    let fxRate = 1, fxFee = 0, eurValue = split.value
    const afterSession = body.match(/(?:Reguläre\s*Zeiten|Übernacht|Vor-?\s?und\s*Nachbörse|Pre-?market|After-?hours|Erweiterte\s*Zeiten|Hauptzeiten)([\s\S]*)$/)
    if (afterSession) {
      const tail = afterSession[1]
      // FX-Rate = erste Zahl nach Session, Account-Currency = EUR/USD/GBP danach
      const rateMatch = tail.match(/\s*([\d.]+)\s*(EUR|USD|GBP)/)
      if (rateMatch) {
        fxRate = parseNum(rateMatch[1])
        // Alles nach "EUR" enthält: fxFee, dashes, eurValue
        const afterCurrency = tail.slice(tail.indexOf(rateMatch[2]) + 3)
        // Split nach einem oder mehreren Dashes — liefert Zahlen-Segmente
        const parts = afterCurrency.split(/-+/).map(p => p.trim()).filter(Boolean)
        if (parts.length >= 2) {
          fxFee = parseNum(parts[0])
          eurValue = parseNum(parts[parts.length - 1])
        } else if (parts.length === 1) {
          // Nur ein Wert → das ist der EUR-Wert (keine Fee angegeben)
          eurValue = parseNum(parts[0])
        }
      }
    }

    if (eurValue <= 0 || split.qty <= 0) continue
    const eurPrice = split.qty > 0 ? eurValue / split.qty : 0
    trades.push({
      type: cur.action === 'Kaufen' ? 'buy' : 'sell',
      name: cur.symbol,
      isin: cur.isin,
      symbol: cur.symbol,
      quantity: split.qty,
      price: parseFloat(eurPrice.toFixed(6)),
      totalValue: eurValue,
      fees: fxFee,
      endAmount: cur.action === 'Kaufen' ? eurValue + fxFee : eurValue - fxFee,
      date: cur.date,
      currency: 'EUR',
      exchange: `${cur.currency} · Trading 212`,
      notes: `Trading 212 · ${cur.action === 'Kaufen' ? 'Kauf' : 'Verkauf'}${
        cur.currency !== 'EUR' ? ` · ${cur.currency} ${split.price.toFixed(2)} @ FX ${fxRate.toFixed(4)}` : ''
      }${fxFee > 0 ? ` · FX-Gebühr ${fxFee.toFixed(2)}€` : ''} · Ursprungswert ${split.value.toFixed(2)} ${cur.currency}`,
    })
  }

  return trades
}

/**
 * Parst Dividenden aus dem "Dividenden"-Block.
 *
 * Beispiel-Zeile:
 *   "SPGIUS78409V1044USDVereinigte Staaten0.847527611.03.2026 15:220.970.822115%0.123320.85966EUR-0.07€0.53"
 * Felder:
 *   SYMBOL ISIN CURRENCY LAND QUANTITY DATUM ZEIT BETRAG_PRO_AKTIE GESAMT QST_RATE WHT_BETRAG DEVISENKURS ACCOUNT_CURRENCY STEUERN NETTOBETRAG
 */
function parseDividends(sectionText: string): Trading212ParsedTransaction[] {
  const divs: Trading212ParsedTransaction[] = []

  // Dividenden-Zeilen — sehr spezifisches Format mit Land, QST-Rate, etc.
  const divRegex = /([A-Z0-9.]+?)([A-Z]{2}[A-Z0-9]{10})([A-Z]{3})(?:Vereinigte\s*Staaten|Deutschland|Irland|Luxemburg|Niederlande|Frankreich|Schweiz|Großbritannien|Kanada)([\d.]+)(\d{2}\.\d{2}\.\d{4})\s*\d{2}:\d{2}([\d.]+)([\d.]+)(\d+%)([\d.]+)([\d.]+)([A-Z]{3})(-?[\d.]+)€([\d.]+)/g

  let match: RegExpExecArray | null
  while ((match = divRegex.exec(sectionText)) !== null) {
    const symbol = match[1]
    const isin = match[2]
    const instrumentCurrency = match[3]
    const quantity = parseNum(match[4])
    const germanDate = match[5]
    const perShare = parseNum(match[6])
    const gross = parseNum(match[7])
    const whtRate = match[8]
    const whtAmount = parseNum(match[9])
    const fxRate = parseNum(match[10])
    const taxes = Math.abs(parseNum(match[12]))
    const net = parseNum(match[13])

    const dateMatch = germanDate.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (!dateMatch) continue
    const isoDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`

    if (!isin || net <= 0) continue

    divs.push({
      type: 'dividend',
      name: symbol,
      isin,
      symbol,
      quantity,
      price: quantity > 0 ? net / quantity : 0,
      totalValue: net,
      fees: taxes + whtAmount,
      endAmount: net,
      date: isoDate,
      currency: 'EUR',
      exchange: `${instrumentCurrency} · Trading 212`,
      notes: `Trading 212 · Dividende · ${quantity.toFixed(6)} × ${perShare.toFixed(4)} ${instrumentCurrency} = ${gross.toFixed(2)} ${instrumentCurrency} brutto · QST ${whtRate} (${whtAmount.toFixed(2)}) · FX ${fxRate.toFixed(4)} · Steuern ${taxes.toFixed(2)}€`,
    })
  }

  return divs
}

/**
 * Parst Einzahlungen/Auszahlungen aus dem "Transaktionen"-Block.
 *
 * Beispiel:
 *   "2026-03-27 09:00:06JP Morgan BankeinzahlungEUR500€500.00"
 *   "2026-01-20 08:53:57JP MorganAuszahlungEUR-100€-100.00"
 */
function parseCashMovements(sectionText: string): Trading212ParsedTransaction[] {
  const items: Trading212ParsedTransaction[] = []

  // Bankeinzahlung / Auszahlung / Bonus / Guthaben — alle mit Datum, Art, Betrag
  const cashRegex = /(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}([A-Za-zÄÖÜäöüß ]+?)(EUR|USD|GBP)(-?[\d.,]+)€(-?[\d.,]+)/g

  let match: RegExpExecArray | null
  while ((match = cashRegex.exec(sectionText)) !== null) {
    const date = match[1]
    const description = match[2].trim()
    const amountEur = parseNum(match[5])

    if (amountEur === 0) continue

    const lower = description.toLowerCase()
    let type: 'cash_deposit' | 'cash_withdrawal'
    if (lower.includes('einzahl') || lower.includes('bonus') || lower.includes('gutschrift') || amountEur > 0) {
      type = 'cash_deposit'
    } else {
      type = 'cash_withdrawal'
    }

    items.push({
      type,
      name: description,
      isin: '',
      symbol: 'CASH',
      quantity: 1,
      price: Math.abs(amountEur),
      totalValue: Math.abs(amountEur),
      fees: 0,
      endAmount: Math.abs(amountEur),
      date,
      currency: 'EUR',
      exchange: '',
      notes: `Trading 212 · ${description}${amountEur < 0 ? ` · ${amountEur.toFixed(2)}€` : ` · +${amountEur.toFixed(2)}€`}`,
    })
  }

  return items
}

/**
 * Sektionen abgrenzen — pdf-parse entfernt mehrfache Umbrüche, wir arbeiten
 * mit dem gesamten Text und nutzen Header-Strings als Anker.
 */
function sliceSection(text: string, startMarker: RegExp, endMarker: RegExp): string {
  const startMatch = text.match(startMarker)
  if (!startMatch || startMatch.index === undefined) return ''
  const startPos = startMatch.index + startMatch[0].length
  const rest = text.slice(startPos)
  const endMatch = rest.match(endMarker)
  const endPos = endMatch?.index ?? rest.length
  return rest.slice(0, endPos)
}

export function parseTrading212PDFText(text: string, fileName: string): Trading212ParseResult {
  const errors: string[] = []
  const transactions: Trading212ParsedTransaction[] = []

  try {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Section-Anker
    const tradesSection = sliceSection(
      normalized,
      /Invest-Konto\s*-\s*ausgeführte\s*Aufträge[\s\S]*?RENDITE(?:WERT)?/i,
      /Die\s+(Trading\s*212|FXFlat)[\s\S]*?empfängt/i,
    )
    const divSection = sliceSection(
      normalized,
      /Dividenden\s*WERTPAPIER/i,
      /Glossar|Offenlegungen|(?:\d+\s*\/\s*\d+)/i,
    )
    const cashSection = sliceSection(
      normalized,
      /Transaktionen\s*(?:und\s*Dividenden\s*)?Transaktionen\s*ZEITART/i,
      /Dividenden\s*WERTPAPIER|Glossar|(?:\d+\s*\/\s*\d+)/i,
    )

    transactions.push(...parseTrades(tradesSection || normalized))
    transactions.push(...parseDividends(divSection || normalized))
    transactions.push(...parseCashMovements(cashSection || normalized))

    if (transactions.length === 0) {
      errors.push(`${fileName}: Keine Trading-212-Transaktionen erkannt (ggf. leerer Monatsauszug oder unbekanntes Format)`)
    }
  } catch (err) {
    errors.push(`${fileName}: Parser-Fehler — ${err instanceof Error ? err.message : String(err)}`)
  }

  return { transactions, errors, fileName }
}
