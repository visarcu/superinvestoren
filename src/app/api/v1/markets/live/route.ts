// Finclue Data API v1 – Live Market Indices + Commodities
// GET /api/v1/markets/live
//
// Liefert Live-Quotes für die Home-Page Markets-Sektion.
// Reihenfolge: FMP primär (Indizes, Crypto, Commodity-Futures) → Yahoo.
// Yahoo ist Sicherheitsnetz, wenn der FMP-Call scheitert.

import { NextResponse } from 'next/server'

interface MarketPoint {
  price: number
  change: number
  changePct: number
  previousClose: number
  high?: number
  low?: number
  /** Unix-Timestamp (Sekunden) des letzten Preises — für "vor X min"-Anzeige */
  timestamp: number
  source: 'fmp' | 'yahoo'
}

// Home-Symbol → FMP/Yahoo-Symbole
interface SymbolMapping {
  fmp: string | null
  yahoo: string
}
const SYMBOL_MAP: Record<string, SymbolMapping> = {
  spx:    { fmp: '^GSPC',   yahoo: '^GSPC' },
  ixic:   { fmp: '^NDX',    yahoo: '^NDX' },
  dji:    { fmp: '^DJI',    yahoo: '^DJI' },
  dax:    { fmp: '^GDAXI',  yahoo: '^GDAXI' },
  stoxx:  { fmp: '^STOXX',  yahoo: '^STOXX' },
  btc:    { fmp: 'BTCUSD',  yahoo: 'BTC-USD' },
  gold:   { fmp: 'GCUSD',   yahoo: 'GC=F' },
  silver: { fmp: 'SIUSD',   yahoo: 'SI=F' },
  oil:    { fmp: 'BZUSD',   yahoo: 'BZ=F' },
}

async function fetchFmp(symbol: string): Promise<MarketPoint | null> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return null
  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${apiKey}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 20 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const q = Array.isArray(data) ? data[0] : null
    if (!q?.price || q.price <= 0) return null
    const prev = q.previousClose ?? 0
    return {
      price: q.price,
      change: q.change ?? 0,
      changePct: q.changesPercentage ?? 0,
      previousClose: prev,
      high: q.dayHigh ?? undefined,
      low: q.dayLow ?? undefined,
      timestamp: typeof q.timestamp === 'number' ? q.timestamp : Math.floor(Date.now() / 1000),
      source: 'fmp',
    }
  } catch {
    return null
  }
}

async function fetchYahoo(symbol: string): Promise<MarketPoint | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    const price = meta.regularMarketPrice
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? 0
    const change = prev > 0 ? price - prev : 0
    const changePct = prev > 0 ? (change / prev) * 100 : 0
    return {
      price,
      change,
      changePct,
      previousClose: prev,
      high: meta.regularMarketDayHigh ?? undefined,
      low: meta.regularMarketDayLow ?? undefined,
      timestamp: typeof meta.regularMarketTime === 'number'
        ? meta.regularMarketTime
        : Math.floor(Date.now() / 1000),
      source: 'yahoo',
    }
  } catch {
    return null
  }
}

// Siehe /api/v1/markets: sonst wird die Route beim Build vorgerendert und holt
// dabei Live-Kurse. Das Caching laeuft ueber den Cache-Control-Header unten.
export const dynamic = 'force-dynamic'

export async function GET() {
  const entries = await Promise.all(
    Object.entries(SYMBOL_MAP).map(async ([key, mapping]) => {
      // 1. FMP zuerst — der bezahlte Plan deckt Indizes, Crypto und Commodity-Futures ab
      if (mapping.fmp) {
        const fmp = await fetchFmp(mapping.fmp)
        if (fmp) return [key, fmp] as const
      }

      // 2. Yahoo als Sicherheitsnetz (bei Commodities die Futures, wie bei FMP)
      const yahoo = await fetchYahoo(mapping.yahoo)
      return [key, yahoo] as const
    })
  )

  const markets: Record<string, MarketPoint | null> = {}
  for (const [key, data] of entries) markets[key] = data

  // Stats: wie viele kamen aus welcher Quelle (für Debug/Monitoring)
  const stats = {
    fmp: Object.values(markets).filter(m => m?.source === 'fmp').length,
    yahoo: Object.values(markets).filter(m => m?.source === 'yahoo').length,
    unavailable: Object.values(markets).filter(m => !m).length,
  }

  return NextResponse.json(
    {
      markets,
      stats,
      fetchedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 's-maxage=20, stale-while-revalidate=60' } }
  )
}
