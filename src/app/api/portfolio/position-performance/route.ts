// Batch-Performance für offene Portfolio-Positionen.
// POST { positions: [{ symbol, quantity, currentPriceEUR }], timeframes?: [...] }
// Response: { data: { AAPL: { "1W": { change, changePercent, ... } } } }

import { NextResponse } from 'next/server'
import { getEodhdHistorical, getEodhdFxHistory } from '@/lib/eodhdService'

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
}

function normalizeSymbol(symbol: unknown): string {
  return typeof symbol === 'string' ? symbol.trim().toUpperCase() : ''
}

function isEURTicker(symbol: string): boolean {
  return /\.(DE|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU)$/i.test(symbol)
}

function isGBXTicker(symbol: string): boolean {
  return /\.L$/i.test(symbol)
}

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
  points: Array<{ date: string; close: number; adjusted_close?: number }>,
  targetDate: string,
) {
  const sorted = [...points]
    .filter(p => p.date && ((p.adjusted_close ?? p.close) > 0))
    .sort((a, b) => a.date.localeCompare(b.date))

  let best: typeof sorted[number] | null = null
  for (const point of sorted) {
    if (point.date > targetDate) break
    best = point
  }

  return best || sorted[0] || null
}

function toEURPrice(
  symbol: string,
  rawPrice: number,
  date: string,
  usdEurMap: Map<string, number>,
  gbpEurMap: Map<string, number>,
): number {
  if (isEURTicker(symbol)) return rawPrice
  if (isGBXTicker(symbol)) return (rawPrice / 100) * getRateForDate(gbpEurMap, date, 1.16)
  return rawPrice * getRateForDate(usdEurMap, date, 0.92)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
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
    const needsUSD = symbols.some(symbol => !isEURTicker(symbol) && !isGBXTicker(symbol))
    const needsGBP = symbols.some(isGBXTicker)

    const [usdEurMap, gbpEurMap, histories] = await Promise.all([
      needsUSD ? getEodhdFxHistory('USDEUR', fromDate, toDate) : Promise.resolve(new Map<string, number>()),
      needsGBP ? getEodhdFxHistory('GBPEUR', fromDate, toDate) : Promise.resolve(new Map<string, number>()),
      Promise.all(symbols.map(symbol => getEodhdHistorical(symbol, fromDate, toDate))),
    ])

    const data: Record<string, Partial<Record<Timeframe, PerformancePoint>>> = {}

    symbols.forEach((symbol, index) => {
      const meta = uniquePositions.get(symbol)
      if (!meta) return

      const history = histories[index] || []
      const byTimeframe: Partial<Record<Timeframe, PerformancePoint>> = {}

      for (const timeframe of requestedTimeframes) {
        const target = new Date()
        target.setDate(target.getDate() - TIMEFRAME_DAYS[timeframe])
        const targetDate = target.toISOString().slice(0, 10)
        const startPoint = findPriceOnOrBefore(history, targetDate)
        if (!startPoint) continue

        const rawStartPrice = startPoint.adjusted_close ?? startPoint.close
        const startPriceEUR = toEURPrice(symbol, rawStartPrice, startPoint.date, usdEurMap, gbpEurMap)
        if (!startPriceEUR || startPriceEUR <= 0) continue

        const changePerShare = meta.currentPriceEUR - startPriceEUR
        byTimeframe[timeframe] = {
          startDate: startPoint.date,
          startPriceEUR: Math.round(startPriceEUR * 10000) / 10000,
          currentPriceEUR: Math.round(meta.currentPriceEUR * 10000) / 10000,
          change: Math.round(changePerShare * meta.quantity * 100) / 100,
          changePercent: Math.round(((meta.currentPriceEUR / startPriceEUR) - 1) * 10000) / 100,
        }
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
