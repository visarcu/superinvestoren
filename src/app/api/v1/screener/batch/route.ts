// Finclue Data API v1 – Batch Screener
// GET /api/v1/screener/batch?symbols=AAPL,MSFT,GOOGL
//
// Liefert pro Symbol Stamm-/Fundamentaldaten für Watchlist, Screener etc.
// Kombiniert eigene SEC-Income-Statements (Revenue Growth) mit dem aktiven
// Quote-Provider (EODHD oder Finnhub – siehe src/lib/quoteProvider.ts).
// EODHD liefert zusätzlich 52W-High/Low + P/E direkt im Profile-Call.
//
// Live-Kurs- und Tagesdaten kommen aus /api/v1/quotes/batch.

import { NextRequest, NextResponse } from 'next/server'
import { getProfile, getActiveProvider } from '@/lib/quoteProvider'
import { getFinancialData } from '@/lib/sec/secDataStore'

interface ScreenerEntry {
  symbol: string
  companyName: string | null
  exchange: string | null
  industry: string | null
  sector: string | null
  marketCap: number | null
  currency: string | null
  week52High: number | null
  week52Low: number | null
  peRatio: number | null
  // Aus eigenen SEC-Daten berechnet
  revenueGrowthYoY: number | null
  revenueLatest: number | null
  revenueLatestYear: number | null
  source: {
    profile: 'finnhub' | 'eodhd' | null
    fundamentals: 'sec' | null
  }
  error?: string
}

async function loadEntry(symbol: string): Promise<ScreenerEntry> {
  const sym = symbol.toUpperCase()

  const [profile, financials] = await Promise.all([
    getProfile(sym).catch(() => null),
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
    sector: profile?.sector ?? null,
    marketCap: profile?.marketCap ?? null,
    currency: profile?.currency ?? null,
    week52High: profile?.week52High ?? null,
    week52Low: profile?.week52Low ?? null,
    peRatio: profile?.peRatio ?? null,
    revenueGrowthYoY,
    revenueLatest,
    revenueLatestYear,
    source: {
      profile: profile?.source ?? null,
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
      sector: null,
      marketCap: null,
      currency: null,
      week52High: null,
      week52Low: null,
      peRatio: null,
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
        provider: getActiveProvider(),
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
