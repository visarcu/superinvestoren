// src/lib/historicalEurCloses.ts
// Historische Schlusskurse in EUR für {symbol, date}-Paare. Genutzt von
// /api/portfolio/historical-prices (Import im Browser) und vom
// Trading-212-Abgleich auf dem Server.

import { resolvePriceSource } from '@/lib/etfMasterLookup'
import { EXCHANGE_FALLBACKS } from '@/data/tickerFallbacks'
import { detectTickerCurrency } from '@/lib/fmp'

const FMP_API_KEY = process.env.FMP_API_KEY

interface HistoricalEntry {
  date: string
  close: number
}

export interface CloseRequest {
  symbol: string
  date: string // ISO YYYY-MM-DD
}

/** Börsenwährung eines Kurses; GBX = Pence (London). */
type QuoteCurrency = string

export interface PriceDetail {
  /** Schlusskurs in Börsenwährung, wie FMP ihn liefert */
  close: number
  currency: QuoteCurrency
  /** EUR je Einheit der Börsenwährung (bei GBX je Pfund) */
  eurRate: number
  /** Handelstag des Schlusskurses (≤ angefragtes Datum) */
  priceDate: string
}

const shiftDays = (date: string, days: number) =>
  new Date(new Date(date + 'T00:00:00Z').getTime() + days * 86400_000).toISOString().slice(0, 10)

async function fetchHistory(fmpSymbol: string, from: string, to: string): Promise<HistoricalEntry[]> {
  if (!FMP_API_KEY) return []
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(fmpSymbol)}?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
  try {
    const r = await fetch(url)
    if (!r.ok) return []
    const data = await r.json()
    const historical: HistoricalEntry[] | undefined = data?.historical
    return Array.isArray(historical) ? historical : []
  } catch {
    return []
  }
}

/**
 * Schlusskurs am Datum oder am nächst-früheren Handelstag. FMP liefert
 * absteigend sortiert (neueste zuerst) → der erste Treffer ≤ date ist der
 * gesuchte. Liegt kein Tag davor im Fenster, der früheste danach.
 */
function closeOnOrBefore(historical: HistoricalEntry[], date: string): HistoricalEntry | null {
  let best: HistoricalEntry | null = null
  for (const e of historical) {
    if (e.date <= date) {
      best = e
      break
    }
  }
  if (!best) best = historical[historical.length - 1] || null
  return best && typeof best.close === 'number' && best.close > 0 ? best : null
}

/**
 * EUR-Kurse je Tag für eine Börsenwährung (EUR pro Einheit). FMP führt die
 * Majors als EURxxx (EURUSD, EURGBP, EURCHF …), manche nur als xxxEUR —
 * beide Richtungen versuchen.
 */
async function fetchEurRates(currency: string, from: string, to: string): Promise<Map<string, number>> {
  const rates = new Map<string, number>()
  const inverse = await fetchHistory(`EUR${currency}`, from, to)
  if (inverse.length > 0) {
    for (const day of inverse) if (day.close > 0) rates.set(day.date, 1 / day.close)
    return rates
  }
  const direct = await fetchHistory(`${currency}EUR`, from, to)
  for (const day of direct) if (day.close > 0) rates.set(day.date, day.close)
  return rates
}

function rateOnOrBefore(rates: Map<string, number>, date: string): number | null {
  let bestDate = ''
  rates.forEach((_, d) => {
    if (d <= date && d > bestDate) bestDate = d
  })
  return bestDate ? rates.get(bestDate)! : null
}

/**
 * Welches FMP-Symbol liefert den Kurs, und in welcher Währung? etfMaster hat
 * Vorrang, dann EXCHANGE_FALLBACKS (Xetra-ETFs, die FMP nur in London führt),
 * sonst das Symbol selbst mit der Suffix-Zuordnung der Depot-Bewertung
 * (portfolioValuation) — dort steht 'GBP' für London-Kurse in Pence.
 */
function priceSourceFor(symbol: string): { fetchSymbol: string; currency: QuoteCurrency } {
  const fromExchange = (exchange: 'GBp' | 'GBP' | 'EUR'): QuoteCurrency =>
    exchange === 'GBp' ? 'GBX' : exchange

  const masterSource = resolvePriceSource(symbol)
  if (masterSource?.type === 'fmp_alt') {
    return { fetchSymbol: masterSource.ticker, currency: fromExchange(masterSource.exchange) }
  }
  if (!masterSource) {
    const fallback = EXCHANGE_FALLBACKS[symbol]
    if (fallback) return { fetchSymbol: fallback.symbol, currency: fromExchange(fallback.exchange) }
  }
  // fmp_direct + yahoo: FMP mit dem Symbol selbst
  const detected = detectTickerCurrency(symbol)
  return { fetchSymbol: symbol, currency: detected === 'GBP' ? 'GBX' : detected }
}

/** Nicht gefundene Paare fehlen im Ergebnis, auch wenn nur der Wechselkurs fehlt. */
export async function loadEurCloses(items: CloseRequest[]): Promise<{ results: Record<string, number>; details: Record<string, PriceDetail> }> {
  // Deduplizieren: ein FMP-Call pro Symbol, gibt historische Range zurück,
  // wir ziehen daraus mehrere Datums-Werte auf einmal. Das spart Calls bei
  // Usern mit vielen Transfers desselben ETFs an unterschiedlichen Tagen.
  const bySymbol = new Map<string, Set<string>>()
  for (const item of items) {
    if (typeof item?.symbol !== 'string' || !item.symbol || item.symbol.length > 20) continue
    if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue
    if (!bySymbol.has(item.symbol)) bySymbol.set(item.symbol, new Set())
    bySymbol.get(item.symbol)!.add(item.date)
  }

  // 1) Schlusskurse in Börsenwährung
  const found: Array<{ key: string; entry: HistoricalEntry; currency: QuoteCurrency }> = []
  for (const [symbol, dates] of bySymbol) {
    const sortedDates = [...dates].sort()
    const from = shiftDays(sortedDates[0], -14)
    const to = shiftDays(sortedDates[sortedDates.length - 1], 14)
    const { fetchSymbol, currency } = priceSourceFor(symbol)

    const historical = await fetchHistory(fetchSymbol, from, to)
    for (const d of dates) {
      // Liefert die Range nichts (sehr lange Spannen, kleine Werte), pro
      // Datum eng nachfragen: date ± 14 Tage.
      const entry = historical.length > 0
        ? closeOnOrBefore(historical, d)
        : closeOnOrBefore(await fetchHistory(fetchSymbol, shiftDays(d, -14), shiftDays(d, 14)), d)
      if (entry) found.push({ key: `${symbol}|${d}`, entry, currency })
    }
  }

  // 2) Wechselkurse des Kurstags, eine Historie je Währung
  const ratesByCurrency = new Map<QuoteCurrency, Map<string, number>>()
  const fxCurrencies = [...new Set(found.map(f => f.currency))].filter(c => c !== 'EUR')
  await Promise.all(fxCurrencies.map(async currency => {
    const priceDates = found.filter(f => f.currency === currency).map(f => f.entry.date).sort()
    // Vorlauf für Wochenenden/Feiertage ohne FX-Notierung
    const from = shiftDays(priceDates[0], -7)
    const to = priceDates[priceDates.length - 1]
    ratesByCurrency.set(currency, await fetchEurRates(currency === 'GBX' ? 'GBP' : currency, from, to))
  }))

  // 3) In EUR umrechnen
  const results: Record<string, number> = {}
  const details: Record<string, PriceDetail> = {}
  for (const { key, entry, currency } of found) {
    const eurRate = currency === 'EUR' ? 1 : rateOnOrBefore(ratesByCurrency.get(currency) || new Map(), entry.date)
    if (!eurRate) continue
    const majorUnit = currency === 'GBX' ? entry.close / 100 : entry.close
    results[key] = majorUnit * eurRate
    details[key] = { close: entry.close, currency, eurRate, priceDate: entry.date }
  }
  return { results, details }
}
