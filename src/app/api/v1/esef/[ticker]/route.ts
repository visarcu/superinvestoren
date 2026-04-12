// Finclue Data API v1 – ESEF European Company Financials
// GET /api/v1/esef/{ticker}

import { NextRequest, NextResponse } from 'next/server'
import { getEsefFinancials, DAX_COMPANIES } from '@/lib/sec/esefParser'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const result = await getEsefFinancials(ticker)

    if (!result) {
      const available = DAX_COMPANIES.map(c => ({
        ticker: c.ticker,
        tickerUS: c.tickerUS || null,
        name: c.name,
        years: Object.keys(c.esefUrls),
      }))

      return NextResponse.json({
        error: `Kein ESEF-Daten für Ticker: ${ticker}`,
        availableCompanies: available,
      }, { status: 404 })
    }

    return NextResponse.json({
      ticker: result.company.ticker,
      tickerUS: result.company.tickerUS || null,
      name: result.company.name,
      lei: result.company.lei,
      currency: result.company.currency,
      periods: result.periods,
      availableYears: Object.keys(result.company.esefUrls),
      source: 'esef-xbrl',
      standard: 'IFRS',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
