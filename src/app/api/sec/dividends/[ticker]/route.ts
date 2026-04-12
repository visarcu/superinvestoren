// /api/sec/dividends/[ticker]
// SEC XBRL Dividend Data API

import { NextRequest, NextResponse } from 'next/server'
import { getSecDividends } from '@/lib/sec/secDividendService'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const data = await getSecDividends(ticker)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('Kein CIK-Mapping')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error(`SEC Dividend API error for ${ticker}:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
