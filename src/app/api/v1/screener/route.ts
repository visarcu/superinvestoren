// Finclue Data API v1 – Stock Screener (FMP-Proxy)
// GET /api/v1/screener
//
// Akzeptierte Query-Parameter (alle optional):
//   marketCapMoreThan, marketCapLowerThan  (USD)
//   priceMoreThan, priceLowerThan
//   betaMoreThan, betaLowerThan
//   volumeMoreThan
//   dividendMoreThan
//   sector       — z.B. Technology, Healthcare, Financial Services
//   industry     — z.B. Software, Banks
//   country      — z.B. US, DE, GB
//   exchange     — comma-separated, default NASDAQ,NYSE
//   limit        — default 100, max 500
//
// Liefert immer nur isActivelyTrading=true und schließt ETFs/Funds aus,
// damit das Ergebnis ein echter Aktien-Screener ist.

import { NextRequest, NextResponse } from 'next/server'

interface FmpScreenerEntry {
  symbol: string
  companyName: string
  marketCap: number | null
  sector: string | null
  industry: string | null
  beta: number | null
  price: number | null
  lastAnnualDividend: number | null
  volume: number | null
  exchange: string | null
  exchangeShortName: string | null
  country: string | null
  isEtf: boolean
  isFund: boolean
  isActivelyTrading: boolean
}

const PASS_THROUGH_KEYS = [
  'marketCapMoreThan',
  'marketCapLowerThan',
  'priceMoreThan',
  'priceLowerThan',
  'betaMoreThan',
  'betaLowerThan',
  'volumeMoreThan',
  'dividendMoreThan',
  'sector',
  'industry',
  'country',
] as const

export async function GET(request: NextRequest) {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 })
  }

  const params = new URLSearchParams()
  const url = new URL(request.url)

  for (const key of PASS_THROUGH_KEYS) {
    const value = url.searchParams.get(key)
    if (value && value.trim() !== '') params.set(key, value)
  }

  // Exchange: default NASDAQ,NYSE (US-Fokus). Override via Query.
  const exchange = url.searchParams.get('exchange') ?? 'NASDAQ,NYSE'
  if (exchange) params.set('exchange', exchange)

  // Limit: 100 default, 500 max
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10), 1), 500)
  params.set('limit', String(limit))

  params.set('isEtf', 'false')
  params.set('isFund', 'false')
  params.set('isActivelyTrading', 'true')
  params.set('apikey', apiKey)

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/stock-screener?${params.toString()}`,
      { next: { revalidate: 300 } } // 5 min cache
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: `FMP returned ${res.status}` },
        { status: 502 }
      )
    }
    const data = await res.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Unexpected FMP response' }, { status: 502 })
    }

    const results = (data as FmpScreenerEntry[]).map(r => ({
      symbol: r.symbol,
      name: r.companyName,
      marketCap: r.marketCap,
      sector: r.sector,
      industry: r.industry,
      beta: r.beta,
      price: r.price,
      dividendYield:
        r.price && r.price > 0 && r.lastAnnualDividend
          ? +(r.lastAnnualDividend / r.price * 100).toFixed(2)
          : null,
      volume: r.volume,
      exchange: r.exchangeShortName,
      country: r.country,
    }))

    return NextResponse.json(
      {
        count: results.length,
        results,
        source: 'fmp',
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
