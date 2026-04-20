// Finclue Data API v1 – Live Market Indices + Commodities
// GET /api/v1/markets/live
//
// Liefert Live-Quotes für die Home-Page Markets-Sektion.
// Reihenfolge: EODHD Real-Time → Yahoo Fallback.
// Yahoo-Fallback ist nur die Sicherheitsnetz wenn EODHD-Call scheitert (Rate-Limit,
// Plan-Grenze für bestimmte Symbole, temporäre Störung).

import { NextResponse } from 'next/server'

interface MarketPoint {
  price: number
  change: number
  changePct: number
  previousClose: number
  high?: number
  low?: number
  source: 'eodhd' | 'yahoo'
}

// Home-Symbol → EODHD-Symbol + Yahoo-Symbol
// Commodities haben `preferYahoo` weil EODHD dafür ETF-Preise (GLD, SLV, BNO) statt
// Futures-Preise liefert — User erwartet den Spot-/Futures-Preis (Gold ~$4800, nicht
// GLD-ETF ~$442). Indizes + Crypto → EODHD primär.
interface SymbolMapping {
  eodhd: string
  yahoo: string
  preferYahoo?: boolean
}
const SYMBOL_MAP: Record<string, SymbolMapping> = {
  spx:    { eodhd: 'GSPC.INDX',   yahoo: '^GSPC' },
  ixic:   { eodhd: 'NDX.INDX',    yahoo: '^NDX' },
  dji:    { eodhd: 'DJI.INDX',    yahoo: '^DJI' },
  dax:    { eodhd: 'GDAXI.INDX',  yahoo: '^GDAXI' },
  stoxx:  { eodhd: 'STOXX.INDX',  yahoo: '^STOXX' },
  btc:    { eodhd: 'BTC-USD.CC',  yahoo: 'BTC-USD' },
  gold:   { eodhd: 'GLD.US',      yahoo: 'GC=F', preferYahoo: true },
  silver: { eodhd: 'SLV.US',      yahoo: 'SI=F', preferYahoo: true },
  oil:    { eodhd: 'BNO.US',      yahoo: 'BZ=F', preferYahoo: true },
}

async function fetchEodhd(symbol: string): Promise<MarketPoint | null> {
  const apiKey = process.env.EODHD_API_KEY
  if (!apiKey) return null
  try {
    const url = `https://eodhd.com/api/real-time/${encodeURIComponent(symbol)}?api_token=${apiKey}&fmt=json`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 20 },
    })
    if (!res.ok) return null
    const raw = await res.json()
    if (!raw?.close || raw.close <= 0) return null
    return {
      price: raw.close,
      change: raw.change ?? 0,
      changePct: raw.change_p ?? 0,
      previousClose: raw.previousClose ?? 0,
      high: raw.high ?? undefined,
      low: raw.low ?? undefined,
      source: 'eodhd',
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
      source: 'yahoo',
    }
  } catch {
    return null
  }
}

export async function GET() {
  const entries = await Promise.all(
    Object.entries(SYMBOL_MAP).map(async ([key, mapping]) => {
      if (mapping.preferYahoo) {
        // Commodities: Yahoo primär (Futures-Preise), EODHD als Fallback
        const yahoo = await fetchYahoo(mapping.yahoo)
        if (yahoo) return [key, yahoo] as const
        const eodhd = await fetchEodhd(mapping.eodhd)
        return [key, eodhd] as const
      }
      // Indizes + Crypto: EODHD primär, Yahoo Fallback
      const eodhd = await fetchEodhd(mapping.eodhd)
      if (eodhd) return [key, eodhd] as const
      const yahoo = await fetchYahoo(mapping.yahoo)
      return [key, yahoo] as const
    })
  )

  const markets: Record<string, MarketPoint | null> = {}
  for (const [key, data] of entries) markets[key] = data

  // Stats: wie viele kamen aus welcher Quelle (für Debug/Monitoring)
  const stats = {
    eodhd: Object.values(markets).filter(m => m?.source === 'eodhd').length,
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
