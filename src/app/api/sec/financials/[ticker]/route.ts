// /api/sec/financials/[ticker]
// SEC XBRL Financial Data API
// Liefert standardisierte Finanzdaten direkt von der SEC.
// Komplett unabhängig von FMP.

import { NextRequest, NextResponse } from 'next/server'
import { getSecFinancials } from '@/lib/sec/secFinancialService'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const searchParams = request.nextUrl.searchParams
  const years = Math.min(Math.max(parseInt(searchParams.get('years') || '10'), 1), 30)
  const period = (searchParams.get('period') || 'annual') as 'annual' | 'quarterly'

  try {
    const data = await getSecFinancials(ticker, { years, period })

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('Kein CIK-Mapping')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error(`SEC API error for ${ticker}:`, message)
    return NextResponse.json(
      { error: `SEC XBRL data fetch failed: ${message}` },
      { status: 500 }
    )
  }
}
