// Finclue Data API v1 – Live Market Indices + Commodities
// GET /api/v1/markets/live
//
// Liefert Live-Quotes für die Home-Page Markets-Sektion.
// Reihenfolge (Indizes + Crypto): FMP primär → EODHD → Yahoo Fallback
// Reihenfolge (Commodities): FMP primär (Futures) → Yahoo → EODHD (ETF)
// Yahoo/EODHD sind Sicherheitsnetz wenn FMP-Call scheitert.

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
  source: 'fmp' | 'eodhd' | 'yahoo'
}

// Home-Symbol → FMP/EODHD/Yahoo-Symbole
// preferYahoo = Yahoo als Fallback-Vorzug (Futures statt ETF) wenn FMP fehlt
interface SymbolMapping {
  fmp: string | null
  eodhd: string
  yahoo: string
  preferYahoo?: boolean
}
const SYMBOL_MAP: Record<string, SymbolMapping> = {
  spx:    { fmp: '^GSPC',   eodhd: 'GSPC.INDX',   yahoo: '^GSPC' },
  ixic:   { fmp: '^NDX',    eodhd: 'NDX.INDX',    yahoo: '^NDX' },
  dji:    { fmp: '^DJI',    eodhd: 'DJI.INDX',    yahoo: '^DJI' },
  dax:    { fmp: '^GDAXI',  eodhd: 'GDAXI.INDX',  yahoo: '^GDAXI' },
  stoxx:  { fmp: '^STOXX',  eodhd: 'STOXX.INDX',  yahoo: '^STOXX' },
  btc:    { fmp: 'BTCUSD',  eodhd: 'BTC-USD.CC',  yahoo: 'BTC-USD' },
  gold:   { fmp: 'GCUSD',   eodhd: 'GLD.US',      yahoo: 'GC=F', preferYahoo: true },
  silver: { fmp: 'SIUSD',   eodhd: 'SLV.US',      yahoo: 'SI=F', preferYahoo: true },
  oil:    { fmp: 'BZUSD',   eodhd: 'BNO.US',      yahoo: 'BZ=F', preferYahoo: true },
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
      timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Math.floor(Date.now() / 1000),
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
      timestamp: typeof meta.regularMarketTime === 'number'
        ? meta.regularMarketTime
        : Math.floor(Date.now() / 1000),
      source: 'yahoo',
    }
  } catch {
    return null
  }
}

export async function GET() {
  const entries = await Promise.all(
    Object.entries(SYMBOL_MAP).map(async ([key, mapping]) => {
      // 1. FMP zuerst — der bezahlte Plan deckt Indizes, Crypto und Commodity-Futures ab
      if (mapping.fmp) {
        const fmp = await fetchFmp(mapping.fmp)
        if (fmp) return [key, fmp] as const
      }

      // 2. Fallback-Reihenfolge je nach Asset-Typ
      if (mapping.preferYahoo) {
        // Commodities: Yahoo (Futures), dann EODHD-ETF als letztes
        const yahoo = await fetchYahoo(mapping.yahoo)
        if (yahoo) return [key, yahoo] as const
        const eodhd = await fetchEodhd(mapping.eodhd)
        return [key, eodhd] as const
      }

      // Indizes + Crypto: EODHD, dann Yahoo
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
    fmp: Object.values(markets).filter(m => m?.source === 'fmp').length,
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
