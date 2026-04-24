// Finclue Data API v1 – Analyst Estimates
// GET /api/v1/analyst-estimates/{ticker}
//
// Source: FMP (temporär). Wird später auf eigene Datenquelle umgestellt.
// Shape ist bewusst stabil und FMP-unabhängig, damit die UI beim Swap nicht bricht.
// Nicht in api-docs listen, solange `source: 'fmp'` — erst bei eigener Quelle publizieren.

import { NextRequest, NextResponse } from 'next/server'

interface NormalizedEstimate {
  /** Fiscal period end (YYYY-MM-DD) */
  date: string
  /** Kalenderjahr des Period-Ends */
  year: number
  revenue: {
    low: number | null
    avg: number | null
    high: number | null
    analystCount: number | null
  }
  eps: {
    low: number | null
    avg: number | null
    high: number | null
    analystCount: number | null
  }
  ebitda: {
    low: number | null
    avg: number | null
    high: number | null
  }
  netIncome: {
    low: number | null
    avg: number | null
    high: number | null
  }
}

interface EstimatesResponse {
  ticker: string
  estimates: NormalizedEstimate[]
  source: 'fmp'
}

function num(v: any): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) && n !== 0 ? n : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      throw new Error(`FMP analyst-estimates responded with status ${response.status}`)
    }

    const raw = await response.json()
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { ticker, estimates: [], source: 'fmp' } satisfies EstimatesResponse,
      )
    }

    const estimates: NormalizedEstimate[] = raw
      .map((e: any): NormalizedEstimate | null => {
        const date = typeof e?.date === 'string' ? e.date : null
        if (!date) return null
        const yr = parseInt(date.slice(0, 4), 10)
        if (!Number.isFinite(yr)) return null
        return {
          date,
          year: yr,
          revenue: {
            low: num(e.estimatedRevenueLow),
            avg: num(e.estimatedRevenueAvg),
            high: num(e.estimatedRevenueHigh),
            analystCount: num(e.numberAnalystEstimatedRevenue),
          },
          eps: {
            low: num(e.estimatedEpsLow),
            avg: num(e.estimatedEpsAvg),
            high: num(e.estimatedEpsHigh),
            analystCount: num(e.numberAnalystsEstimatedEps),
          },
          ebitda: {
            low: num(e.estimatedEbitdaLow),
            avg: num(e.estimatedEbitdaAvg),
            high: num(e.estimatedEbitdaHigh),
          },
          netIncome: {
            low: num(e.estimatedNetIncomeLow),
            avg: num(e.estimatedNetIncomeAvg),
            high: num(e.estimatedNetIncomeHigh),
          },
        }
      })
      .filter((x): x is NormalizedEstimate => x !== null)
      .sort((a, b) => a.date.localeCompare(b.date))

    const body: EstimatesResponse = { ticker, estimates, source: 'fmp' }
    return NextResponse.json(body)
  } catch (error) {
    console.error(`[v1/analyst-estimates] ${ticker}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch analyst estimates' },
      { status: 500 },
    )
  }
}
