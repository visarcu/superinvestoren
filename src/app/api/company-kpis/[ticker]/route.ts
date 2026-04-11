// src/app/api/company-kpis/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const kpis = await prisma.companyKPI.findMany({
      where: { ticker },
      orderBy: [{ metric: 'asc' }, { periodDate: 'asc' }],
      select: {
        metric: true,
        label: true,
        value: true,
        unit: true,
        period: true,
        periodDate: true,
        filingUrl: true,
      },
    })

    if (kpis.length === 0) {
      return NextResponse.json({ ticker, metrics: [] })
    }

    // Group by metric for easy charting
    const grouped: Record<string, {
      label: string
      unit: string
      data: { period: string; periodDate: string; value: number; filingUrl: string | null }[]
    }> = {}

    for (const kpi of kpis) {
      if (!grouped[kpi.metric]) {
        grouped[kpi.metric] = { label: kpi.label, unit: kpi.unit, data: [] }
      }
      grouped[kpi.metric].data.push({
        period: kpi.period,
        periodDate: kpi.periodDate.toISOString(),
        value: kpi.value,
        filingUrl: kpi.filingUrl,
      })
    }

    return NextResponse.json(
      { ticker, metrics: grouped },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`Error fetching company KPIs for ${ticker}:`, errMsg)
    return NextResponse.json({ error: 'Failed to fetch KPIs', detail: errMsg }, { status: 500 })
  }
}
