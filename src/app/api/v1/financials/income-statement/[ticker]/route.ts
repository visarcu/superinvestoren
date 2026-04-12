// Finclue Data API v1 – Income Statement
// GET /api/v1/financials/income-statement/{ticker}

import { NextRequest, NextResponse } from 'next/server'
import { getFinancialData } from '@/lib/sec/secDataStore'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const searchParams = request.nextUrl.searchParams
  const years = Math.min(Math.max(parseInt(searchParams.get('years') || '10'), 1), 30)
  const period = (searchParams.get('period') || 'annual') as 'annual' | 'quarterly'

  try {
    const data = await getFinancialData(ticker, { years, period })

    const statements = data.periods.map(p => ({
      period: p.period,
      fiscalYear: p.fiscalYear,
      fiscalPeriod: p.fiscalPeriod,
      filed: p.filed,
      revenue: p.revenue,
      costOfRevenue: p.costOfRevenue,
      grossProfit: p.grossProfit,
      operatingIncome: p.operatingIncome,
      netIncome: p.netIncome,
      eps: p.eps,
      epsBasic: p.epsBasic,
      researchAndDevelopment: p.rd,
      sellingGeneralAdmin: p.sga,
      depreciation: p.depreciation,
      incomeTax: p.incomeTax,
      interestExpense: p.interestExpense,
    }))

    return NextResponse.json({
      ticker: data.ticker,
      entityName: data.entityName,
      cik: data.cik,
      statement: 'income-statement',
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
