// Finclue Data API v1 – Historical Price Candles
// GET /api/v1/quotes/candles/{ticker}?timeframe=1Y
// Source: Finnhub (kostenlos) – Note: Candle endpoint may require premium
// Fallback: /api/historical/{ticker} (FMP + Yahoo)

import { NextRequest, NextResponse } from 'next/server'
import { getFinnhubCandles } from '@/lib/finnhubService'

const VALID_TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'] as const
type Timeframe = typeof VALID_TIMEFRAMES[number]

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const { searchParams } = new URL(request.url)
  const timeframe = (searchParams.get('timeframe') || '1Y').toUpperCase() as Timeframe

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json({
      error: `Invalid timeframe. Valid: ${VALID_TIMEFRAMES.join(', ')}`,
    }, { status: 400 })
  }

  try {
    const candles = await getFinnhubCandles(ticker, timeframe)

    if (candles.length === 0) {
      return NextResponse.json({
        symbol: ticker,
        timeframe,
        candles: [],
        count: 0,
        message: `Keine Kursdaten für ${ticker} (${timeframe})`,
      }, { status: 404 })
    }

    const chartData = candles.map(c => ({
      date: c.date,
      price: c.close,
      open: c.open,
      high: c.high,
      low: c.low,
      volume: c.volume,
    }))

    const maxAge = ['1D', '1W'].includes(timeframe) ? 60 : ['1M', '3M'].includes(timeframe) ? 300 : 1800

    return NextResponse.json({
      symbol: ticker,
      timeframe,
      candles: chartData,
      count: chartData.length,
      source: 'finnhub',
    }, {
      headers: { 'Cache-Control': `s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
