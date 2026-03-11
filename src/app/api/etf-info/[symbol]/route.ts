// src/app/api/etf-info/[symbol]/route.ts
// ETF-Info von FMP v4 mit 24h Server-Cache
import { NextResponse } from 'next/server'

// Server-seitiger Cache (24h TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  // Cache check
  const cached = cache.get(symbol.toUpperCase())
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  }

  const url = `https://financialmodelingprep.com/api/v4/etf-info?symbol=${encodeURIComponent(symbol)}&apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)

    if (!res.ok) {
      console.error(`FMP ETF Info API responded with ${res.status}`)
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()

    // Cache speichern
    cache.set(symbol.toUpperCase(), { data, timestamp: Date.now() })

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })

  } catch (err) {
    console.error('ETF Info API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETF info' }, { status: 502 })
  }
}