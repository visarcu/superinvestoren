// src/app/api/company-kpis/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: kpis, error } = await supabase
      .from('CompanyKPI')
      .select('metric, label, value, unit, period, periodDate, filingUrl')
      .eq('ticker', ticker)
      .order('metric', { ascending: true })
      .order('periodDate', { ascending: true })

    if (error) {
      console.error(`Error fetching company KPIs for ${ticker}:`, error.message)
      return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 })
    }

    if (!kpis || kpis.length === 0) {
      return NextResponse.json({ ticker, metrics: {} })
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
        periodDate: kpi.periodDate,
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
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 })
  }
}
