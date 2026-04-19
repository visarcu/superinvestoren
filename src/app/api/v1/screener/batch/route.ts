// Finclue Data API v1 – Batch Screener
// GET /api/v1/screener/batch?symbols=AAPL,MSFT,GOOGL
//
// Liefert pro Symbol "stabile" Stamm-/Fundamentaldaten, die in der Watchlist und
// im Screener gebraucht werden – kombiniert eigene SEC-Income-Statements
// (für Revenue Growth) mit dem Finnhub-Profile-Wrapper (Company-Name, Sitz, Market Cap).
//
// Live-Kurs- und Tagesdaten kommen aus /api/v1/quotes/batch.

import { NextRequest, NextResponse } from 'next/server'
import { getFinnhubProfile } from '@/lib/finnhubService'
import { getFinancialData } from '@/lib/sec/secDataStore'

interface ScreenerEntry {
  symbol: string
  companyName: string | null
  exchange: string | null
  industry: string | null
  marketCap: number | null
  currency: string | null
  // Aus eigenen SEC-Daten berechnet
  revenueGrowthYoY: number | null
  revenueLatest: number | null
  revenueLatestYear: number | null
  source: {
    profile: 'finnhub' | null
    fundamentals: 'sec' | null
  }
  error?: string
}

async function loadEntry(symbol: string): Promise<ScreenerEntry> {
  const sym = symbol.toUpperCase()

  const [profile, financials] = await Promise.all([
    getFinnhubProfile(sym).catch(() => null),
    // years: 10, weil getFinancialData ggf. die ältesten N zurückgibt –
    // wir nehmen unten selbst die letzten beiden Jahre.
    getFinancialData(sym, { years: 10, period: 'annual' }).catch(() => null),
  ])

  // Revenue Growth YoY aus letzten beiden Annual-Periods
  let revenueGrowthYoY: number | null = null
  let revenueLatest: number | null = null
  let revenueLatestYear: number | null = null

  const periods = financials?.periods ?? []
  if (periods.length >= 2) {
    const latest = periods[periods.length - 1]
    const prior = periods[periods.length - 2]
    revenueLatest = latest?.revenue ?? null
    revenueLatestYear = latest?.fiscalYear ?? null
    if (latest?.revenue && prior?.revenue && Math.abs(prior.revenue) > 0) {
      revenueGrowthYoY = ((latest.revenue - prior.revenue) / Math.abs(prior.revenue)) * 100
    }
  } else if (periods.length === 1) {
    revenueLatest = periods[0]?.revenue ?? null
    revenueLatestYear = periods[0]?.fiscalYear ?? null
  }

  return {
    symbol: sym,
    companyName: profile?.name ?? null,
    exchange: profile?.exchange ?? null,
    industry: profile?.industry ?? null,
    marketCap: profile?.marketCap ?? null,
    currency: profile?.currency ?? null,
    revenueGrowthYoY,
    revenueLatest,
    revenueLatestYear,
    source: {
      profile: profile ? 'finnhub' : null,
      fundamentals: revenueLatest !== null ? 'sec' : null,
    },
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols') || ''

  if (!symbolsParam) {
    return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.-]{1,10}$/.test(s))
    .slice(0, 30) // Max 30 pro Request

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No valid symbols' }, { status: 400 })
  }

  try {
    const entries = await Promise.all(symbols.map(s => loadEntry(s).catch(err => ({
      symbol: s,
      companyName: null,
      exchange: null,
      industry: null,
      marketCap: null,
      currency: null,
      revenueGrowthYoY: null,
      revenueLatest: null,
      revenueLatestYear: null,
      source: { profile: null, fundamentals: null },
      error: err instanceof Error ? err.message : 'unknown error',
    } as ScreenerEntry))))

    return NextResponse.json(
      {
        data: entries,
        count: entries.length,
        requested: symbols.length,
        fetchedAt: new Date().toISOString(),
      },
      {
        // Profil-Daten ändern sich selten, Fundamentaldaten nur quartalsweise
        headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=3600' },
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
