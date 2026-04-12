// Finclue Data API v1 – Dividends
// GET /api/v1/dividends/{ticker}

import { NextRequest, NextResponse } from 'next/server'
import { getSecDividends } from '@/lib/sec/secDividendService'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const data = await getSecDividends(ticker)

    return NextResponse.json({
      ticker: data.ticker,
      entityName: data.entityName,
      currentAnnualDividend: data.currentAnnualDividend,
      consecutiveYearsGrowth: data.consecutiveYearsGrowth,
      annualDividends: data.annualDividends.map(a => ({
        year: a.year,
        totalDividend: a.totalDividend,
        growthPercent: a.growthPercent,
        quartersReported: a.quarters.length,
      })),
      quarterlyDividends: data.quarterlyDividends,
      cagr: data.cagr,
      payoutHistory: data.payoutHistory,
      source: 'sec-xbrl',
      fetchedAt: data.fetchedAt,
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Kein CIK') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
