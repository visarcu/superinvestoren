// Finclue Data API v1 – Cash Flow Statement
// GET /api/v1/financials/cash-flow/{ticker}

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

    const statements = data.periods.map(p => ({
      period: p.period,
      fiscalYear: p.fiscalYear,
      fiscalPeriod: p.fiscalPeriod,
      filed: p.filed,
      operatingCashFlow: p.operatingCashFlow,
      capitalExpenditure: p.capex,
      freeCashFlow: p.freeCashFlow,
      dividendsPaid: p.dividendsPaid,
      dividendPerShare: p.dividendPerShare,
      shareRepurchase: p.shareRepurchase,
      depreciation: p.depreciation,
    }))

    return NextResponse.json({
      ticker: data.ticker,
      entityName: data.entityName,
      cik: data.cik,
      statement: 'cash-flow',
      period,
      data: statements,
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
