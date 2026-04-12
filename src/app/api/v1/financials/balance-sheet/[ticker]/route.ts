// Finclue Data API v1 – Balance Sheet
// GET /api/v1/financials/balance-sheet/{ticker}

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
      totalAssets: p.totalAssets,
      totalLiabilities: p.totalLiabilities,
      shareholdersEquity: p.shareholdersEquity,
      cash: p.cash,
      longTermDebt: p.longTermDebt,
      shortTermDebt: p.shortTermDebt,
      totalDebt: p.totalDebt,
      inventory: p.inventory,
      accountsReceivable: p.accountsReceivable,
      accountsPayable: p.accountsPayable,
      goodwill: p.goodwill,
      propertyPlantEquipment: p.propertyPlantEquip,
      sharesOutstanding: p.sharesOutstanding,
    }))

    return NextResponse.json({
      ticker: data.ticker,
      entityName: data.entityName,
      cik: data.cik,
      statement: 'balance-sheet',
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
