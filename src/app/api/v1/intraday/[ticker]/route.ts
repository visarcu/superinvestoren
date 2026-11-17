// Finclue Data API v1 – Intraday-Kurse für schöne 1D / 1W Charts
// GET /api/v1/intraday/AAPL?interval=5m&range=1d
//
// Quelle: Yahoo Chart-API (1m/5m/15m/30m/1h Bars mit UTC-Timestamps).

import { NextRequest, NextResponse } from 'next/server'

export interface IntradayPoint {
  timestamp: number // Unix seconds
  date: string      // ISO Date
  time: string      // HH:MM
  close: number
  open?: number
  high?: number
  low?: number
  volume?: number
}

const VALID_INTERVALS = ['1m', '5m', '15m', '30m', '1h'] as const
const VALID_RANGES = ['1d', '5d', '1mo', '3mo'] as const
type Interval = (typeof VALID_INTERVALS)[number]
type Range = (typeof VALID_RANGES)[number]

// Yahoo-Symbol-Normalisierung. Akzeptiert unsere Schreibweise (FMP: BTCUSD)
// und die frühere EODHD-Notation älterer Clients (GSPC.INDX, BMW.XETRA).
function toYahooSymbol(raw: string): string {
  const upper = raw.toUpperCase()
  if (/^(BTC|ETH)USD$/.test(upper)) return `${upper.slice(0, 3)}-USD`
  const indexMap: Record<string, string> = {
    'GSPC.INDX': '^GSPC',
    'NDX.INDX': '^NDX',
    'DJI.INDX': '^DJI',
    'GDAXI.INDX': '^GDAXI',
    'STOXX.INDX': '^STOXX',
  }
  if (indexMap[upper]) return indexMap[upper]
  if (upper.endsWith('.CC')) return upper.replace('.CC', '')
  if (upper.endsWith('.US')) return upper.replace('.US', '')
  if (upper.endsWith('.XETRA')) return upper.replace('.XETRA', '.DE')
  if (upper.endsWith('.LSE')) return upper.replace('.LSE', '.L')
  return upper
}

async function fetchYahoo(
  ticker: string,
  interval: Interval,
  range: Range
): Promise<{ points: IntradayPoint[]; source: 'yahoo' } | null> {
  try {
    const yahooSymbol = toYahooSymbol(ticker)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result?.timestamp) return null

    const timestamps: number[] = result.timestamp
    const q = result.indicators?.quote?.[0] ?? {}
    const closes: (number | null)[] = q.close ?? []
    const opens: (number | null)[] = q.open ?? []
    const highs: (number | null)[] = q.high ?? []
    const lows: (number | null)[] = q.low ?? []
    const volumes: (number | null)[] = q.volume ?? []

    const points: IntradayPoint[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i]
      if (close === null || close === undefined || close <= 0) continue
      const ts = timestamps[i]
      const d = new Date(ts * 1000)
      points.push({
        timestamp: ts,
        date: d.toISOString().slice(0, 10),
        time: d.toISOString().slice(11, 16),
        close,
        open: opens[i] ?? undefined,
        high: highs[i] ?? undefined,
        low: lows[i] ?? undefined,
        volume: volumes[i] ?? undefined,
      })
    }
    if (points.length === 0) return null
    return { points, source: 'yahoo' }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  const ticker = params.ticker
  if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const interval = (searchParams.get('interval') || '5m') as Interval
  const range = (searchParams.get('range') || '1d') as Range

  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 })
  }

  const yahoo = await fetchYahoo(ticker, interval, range)
  if (yahoo) {
    return NextResponse.json(
      {
        symbol: ticker,
        interval,
        range,
        points: yahoo.points,
        count: yahoo.points.length,
        source: 'yahoo',
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    )
  }

  return NextResponse.json({ symbol: ticker, points: [], count: 0, source: null }, { status: 200 })
}
