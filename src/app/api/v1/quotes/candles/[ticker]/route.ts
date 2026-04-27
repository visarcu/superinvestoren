// Finclue Data API v1 – Historical Price Candles
// GET /api/v1/quotes/candles/{ticker}?timeframe=1Y
// Primary: Finnhub (US-Aktien, kostenlos)
// Fallback: EODHD (EU-Aktien, alle Exchanges)

import { NextRequest, NextResponse } from 'next/server'
import { getFinnhubCandles } from '@/lib/finnhubService'
import { getEodhdHistorical } from '@/lib/eodhdService'
import { resolveEUTicker } from '@/lib/tickerResolver'

const VALID_TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'] as const
type Timeframe = typeof VALID_TIMEFRAMES[number]

// Timeframe → Tage für EODHD (das arbeitet auf Datum-Basis)
const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1D': 5,
  '1W': 14,
  '1M': 45,
  '3M': 120,
  '6M': 220,
  '1Y': 400,
  '5Y': 1825,
  'ALL': 1825,
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const rawTicker = params.ticker.toUpperCase()
  const { searchParams } = new URL(request.url)
  const timeframe = (searchParams.get('timeframe') || '1Y').toUpperCase() as Timeframe

  if (!/^[A-Z0-9.-]{1,10}$/.test(rawTicker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json({
      error: `Invalid timeframe. Valid: ${VALID_TIMEFRAMES.join(', ')}`,
    }, { status: 400 })
  }

  const euMapping = resolveEUTicker(rawTicker)
  const lookupSymbol = euMapping?.fmp || rawTicker

  try {
    // Primary: Finnhub (funktioniert hauptsächlich für US)
    // Für EU-Firmen hat Finnhub Free oft keine Candles → direkt auf EODHD gehen
    let candles: any[] = []
    let source = 'finnhub'

    if (!euMapping) {
      candles = await getFinnhubCandles(rawTicker, timeframe)
    }

    // Fallback: EODHD (alle Exchanges, auch EU)
    if (candles.length === 0) {
      const days = TIMEFRAME_DAYS[timeframe]
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const fromDate = startDate.toISOString().slice(0, 10)
      const toDate = endDate.toISOString().slice(0, 10)

      const points = await getEodhdHistorical(lookupSymbol, fromDate, toDate)
      candles = points.map(p => ({
        date: p.date,
        timestamp: Math.floor(new Date(p.date).getTime() / 1000),
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        adjustedClose: p.adjusted_close,
        volume: p.volume,
      }))
      source = 'eodhd'
    }

    if (candles.length === 0) {
      return NextResponse.json({
        symbol: rawTicker,
        timeframe,
        candles: [],
        count: 0,
        message: `Keine Kursdaten für ${rawTicker} (${timeframe})`,
      }, { status: 404 })
    }

    // price = split-adjustierter Close (EODHD liefert adjusted_close nativ).
    // Fallback auf raw close wenn adjustedClose fehlt (z.B. Finnhub-Pfad).
    const chartData = candles
      .map((c: any) => ({
        date: c.date,
        price: c.adjustedClose ?? c.close,
        open: c.open,
        high: c.high,
        low: c.low,
        volume: c.volume,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const maxAge = ['1D', '1W'].includes(timeframe) ? 60 : ['1M', '3M'].includes(timeframe) ? 300 : 1800

    return NextResponse.json({
      symbol: rawTicker,
      timeframe,
      candles: chartData,
      count: chartData.length,
      source,
    }, {
      headers: { 'Cache-Control': `s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
