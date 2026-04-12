// Finclue Data API v1 – Operating KPIs
// GET /api/v1/kpis/{ticker}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: kpis, error } = await supabase
      .from('CompanyKPI')
      .select('metric, label, value, unit, period, periodDate, filingUrl')
      .eq('ticker', ticker)
      .order('periodDate', { ascending: true })

    if (error) throw error
    if (!kpis || kpis.length === 0) {
      return NextResponse.json({
        ticker,
        metrics: {},
        source: 'sec-edgar-8k',
        message: `Keine Operating KPIs für ${ticker}. Verfügbar für: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, UBER, ABNB, SHOP, SNAP, PINS, SPOT, MA, V`,
      }, { status: 404 })
    }

    // Gruppiere nach Metrik
    const metrics: Record<string, { label: string; unit: string; data: any[] }> = {}
    for (const kpi of kpis) {
      if (!metrics[kpi.metric]) {
        metrics[kpi.metric] = { label: kpi.label, unit: kpi.unit, data: [] }
      }
      metrics[kpi.metric].data.push({
        period: kpi.period,
        periodDate: kpi.periodDate,
        value: kpi.value,
        filingUrl: kpi.filingUrl,
      })
    }

    return NextResponse.json({
      ticker,
      metrics,
      metricsCount: Object.keys(metrics).length,
      source: 'sec-edgar-8k',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=86400' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
