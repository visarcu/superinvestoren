// Batch-Performance für offene Portfolio-Positionen.
// POST { positions: [{ symbol, quantity, currentPriceEUR }], timeframes?: [...] }
// Response: { data: { AAPL: { "1W": { change, changePercent, ... } } } }

import { NextResponse } from 'next/server'
import { getRequestUser, unauthorizedResponse } from '@/lib/apiAuth'
import { getDailyHistory, getFxHistory } from '@/lib/marketData/history'
import { EXCHANGE_FALLBACKS } from '@/data/tickerFallbacks'

const VALID_TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'] as const
type Timeframe = typeof VALID_TIMEFRAMES[number]

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
}

interface PositionInput {
  symbol: string
  quantity?: number
  currentPriceEUR?: number
  currentPrice?: number
}

interface PerformancePoint {
  startDate: string
  startPriceEUR: number
  currentPriceEUR: number
  change: number
  changePercent: number
  sparkline?: SparklinePoint[]
}

interface SparklinePoint {
  date: string
  value: number
}

function normalizeSymbol(symbol: unknown): string {
  return typeof symbol === 'string' ? symbol.trim().toUpperCase() : ''
}

function getHistorySymbol(symbol: string): string {
  return EXCHANGE_FALLBACKS[symbol]?.symbol || symbol
}

// Notierungswährung je Börsen-Suffix: FMP und Yahoo liefern Kurse in der
// Heimatwährung des Listings. Frankfurt (.F), Stuttgart, Düsseldorf, München,
// Hamburg und Berlin notieren in Euro, Kopenhagen in DKK, Prag in CZK. Vorher
// lief alles außer EUR und London mit dem USD-Kurs durch die Umrechnung
// (Nestlé in CHF: +24 % bei flachem Kurs, Tokio in JPY: −99 %).
function isEURTicker(symbol: string): boolean {
  return /\.(DE|F|SG|DU|MU|HM|BE|PA|AS|MI|MC|BR|LI|VI|AT|HE|ZU|IR|LS)$/i.test(symbol)
}

function isGBXTicker(symbol: string): boolean {
  return /\.L$/i.test(symbol)
}

const SUFFIX_CURRENCY: Record<string, string> = {
  SW: 'CHF', T: 'JPY', TO: 'CAD', V: 'CAD', AX: 'AUD', HK: 'HKD', ST: 'SEK', OL: 'NOK',
  CO: 'DKK', CP: 'DKK', PR: 'CZK', WA: 'PLN', KS: 'KRW', KQ: 'KRW', TW: 'TWD', TWO: 'TWD',
  SS: 'CNY', SZ: 'CNY', SA: 'BRL', NS: 'INR', BO: 'INR', SI: 'SGD', NZ: 'NZD', MX: 'MXN',
}

/** Währung des Kurses: 'EUR', 'GBX' (Pence) oder ISO-Code; ohne Suffix USD */
function quoteCurrency(symbol: string): string {
  if (isEURTicker(symbol)) return 'EUR'
  if (isGBXTicker(symbol)) return 'GBX'
  const dot = symbol.lastIndexOf('.')
  if (dot < 0) return 'USD'
  return SUFFIX_CURRENCY[symbol.slice(dot + 1).toUpperCase()] || 'USD'
}

/** Wechselkurs-Reihen je Währung (EUR je Einheit), Schlüssel ISO-Code */
type FxMaps = Map<string, Map<string, number>>

function getRateForDate(rateMap: Map<string, number>, date: string, fallback: number): number {
  const direct = rateMap.get(date)
  if (direct && direct > 0) return direct

  const dates = Array.from(rateMap.keys()).sort()
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= date) {
      const rate = rateMap.get(dates[i])
      if (rate && rate > 0) return rate
    }
  }

  return fallback
}

function findPriceOnOrBefore(
  points: Array<{ date: string; close: number; adjClose?: number }>,
  targetDate: string,
) {
  const sorted = [...points]
    .filter(p => p.date && ((p.adjClose ?? p.close) > 0))
    .sort((a, b) => a.date.localeCompare(b.date))

  let best: typeof sorted[number] | null = null
  for (const point of sorted) {
    if (point.date > targetDate) break
    best = point
  }

  return best || sorted[0] || null
}

/**
 * Kurs in EUR zum Stichtag. Ohne Wechselkursreihe der Währung null: lieber
 * keine Periodenrendite als eine mit dem falschen Kurs oder einer Schätzung.
 */
function toEURPrice(symbol: string, rawPrice: number, date: string, fxMaps: FxMaps): number | null {
  const currency = quoteCurrency(symbol)
  if (currency === 'EUR') return rawPrice
  const rates = fxMaps.get(currency === 'GBX' ? 'GBP' : currency)
  const rate = rates && rates.size > 0 ? getRateForDate(rates, date, 0) : 0
  if (!rate || rate <= 0) return null
  return currency === 'GBX' ? (rawPrice / 100) * rate : rawPrice * rate
}

function samplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points

  const result: T[] = []
  const lastIndex = points.length - 1
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round((i / (maxPoints - 1)) * lastIndex)
    result.push(points[index])
  }
  return result
}

function buildSparkline(
  symbol: string,
  history: Array<{ date: string; close: number; adjClose?: number }>,
  startDate: string,
  currentPriceEUR: number,
  fxMaps: FxMaps,
): SparklinePoint[] {
  const points = history
    .filter(p => p.date >= startDate && ((p.adjClose ?? p.close) > 0))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(point => {
      const rawPrice = point.adjClose ?? point.close
      const value = toEURPrice(symbol, rawPrice, point.date, fxMaps) ?? 0
      return {
        date: point.date,
        value: Math.round(value * 10000) / 10000,
      }
    })
    .filter(point => point.value > 0)

  const today = new Date().toISOString().slice(0, 10)
  const latest = points[points.length - 1]
  if (currentPriceEUR > 0 && (!latest || latest.date < today)) {
    points.push({
      date: today,
      value: Math.round(currentPriceEUR * 10000) / 10000,
    })
  }

  return samplePoints(points, 28)
}

/** Je Aufruf höchstens so viele Papiere, jedes kostet eine Kursreihe bei FMP */
const MAX_POSITIONS = 150

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const includeSparkline = body?.includeSparkline === true
    const requestedTimeframes: Timeframe[] = Array.isArray(body?.timeframes)
      ? body.timeframes.map((t: unknown) => String(t).toUpperCase()).filter((t: string): t is Timeframe => VALID_TIMEFRAMES.includes(t as Timeframe))
      : VALID_TIMEFRAMES

    const positions: PositionInput[] = Array.isArray(body?.positions) ? body.positions : []
    const uniquePositions = new Map<string, { quantity: number; currentPriceEUR: number }>()

    for (const position of positions) {
      const symbol = normalizeSymbol(position.symbol)
      if (!symbol || !/^[A-Z0-9.-]{1,16}$/.test(symbol)) continue

      const quantity = Math.max(0, Number(position.quantity) || 0)
      const currentPriceEUR = Number(position.currentPriceEUR ?? position.currentPrice)
      if (!currentPriceEUR || currentPriceEUR <= 0) continue

      const existing = uniquePositions.get(symbol)
      if (!existing && uniquePositions.size >= MAX_POSITIONS) continue
      uniquePositions.set(symbol, {
        quantity: (existing?.quantity || 0) + quantity,
        currentPriceEUR,
      })
    }

    if (uniquePositions.size === 0 || requestedTimeframes.length === 0) {
      return NextResponse.json({ success: true, data: {} })
    }

    const maxDays = Math.max(...requestedTimeframes.map(t => TIMEFRAME_DAYS[t]))
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Math.max(maxDays + 10, 20))
    const fromDate = startDate.toISOString().slice(0, 10)
    const toDate = endDate.toISOString().slice(0, 10)

    const symbols = Array.from(uniquePositions.keys())
    const historySymbols = symbols.map(getHistorySymbol)
    // Wechselkursreihen je vorkommender Währung (Pence über GBP)
    const fxCurrencies = [...new Set(historySymbols.map(quoteCurrency))]
      .filter(currency => currency !== 'EUR')
      .map(currency => (currency === 'GBX' ? 'GBP' : currency))

    const [fxEntries, histories] = await Promise.all([
      Promise.all(fxCurrencies.map(async currency => [currency, await getFxHistory(`${currency}EUR`, fromDate, toDate)] as const)),
      Promise.all(historySymbols.map(symbol => getDailyHistory(symbol, fromDate, toDate))),
    ])
    const fxMaps: FxMaps = new Map(fxEntries)

    const data: Record<string, Partial<Record<Timeframe, PerformancePoint>>> = {}

    symbols.forEach((symbol, index) => {
      const meta = uniquePositions.get(symbol)
      if (!meta) return

      const historySymbol = historySymbols[index] || symbol
      const history = histories[index] || []
      const byTimeframe: Partial<Record<Timeframe, PerformancePoint>> = {}

      for (const timeframe of requestedTimeframes) {
        const target = new Date()
        target.setDate(target.getDate() - TIMEFRAME_DAYS[timeframe])
        const targetDate = target.toISOString().slice(0, 10)
        const startPoint = findPriceOnOrBefore(history, targetDate)
        if (!startPoint) continue

        const rawStartPrice = startPoint.adjClose ?? startPoint.close
        const startPriceEUR = toEURPrice(historySymbol, rawStartPrice, startPoint.date, fxMaps)
        if (!startPriceEUR || startPriceEUR <= 0) continue

        const changePerShare = meta.currentPriceEUR - startPriceEUR
        const point: PerformancePoint = {
          startDate: startPoint.date,
          startPriceEUR: Math.round(startPriceEUR * 10000) / 10000,
          currentPriceEUR: Math.round(meta.currentPriceEUR * 10000) / 10000,
          change: Math.round(changePerShare * meta.quantity * 100) / 100,
          changePercent: Math.round(((meta.currentPriceEUR / startPriceEUR) - 1) * 10000) / 100,
        }

        if (includeSparkline) {
          point.sparkline = buildSparkline(
            historySymbol,
            history,
            startPoint.date,
            meta.currentPriceEUR,
            fxMaps,
          )
        }

        byTimeframe[timeframe] = point
      }

      data[symbol] = byTimeframe
    })

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=900' } },
    )
  } catch (error) {
    console.error('[portfolio/position-performance] error:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Abrufen der Positions-Performance' },
      { status: 500 },
    )
  }
}
