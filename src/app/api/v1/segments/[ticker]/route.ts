// Finclue Data API v1 – Segments & Guidance
// GET /api/v1/segments/{ticker}
// Liefert Revenue per Segment, Geographic Revenue und Guidance/Outlook

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
        segments: {},
        geographic: {},
        guidance: {},
        source: 'sec-edgar-8k',
      })
    }

    // Kategorisiere KPIs
    const segments: Record<string, any> = {}
    const geographic: Record<string, any> = {}
    const guidance: Record<string, any> = {}
    const other: Record<string, any> = {}

    for (const kpi of kpis) {
      const target = kpi.metric.startsWith('revenue_') && !kpi.metric.includes('guidance')
        ? (kpi.metric.includes('us') || kpi.metric.includes('emea') || kpi.metric.includes('apac') || kpi.metric.includes('americas') || kpi.metric.includes('europe') || kpi.metric.includes('china') || kpi.metric.includes('arpu_')
          ? geographic : segments)
        : kpi.metric.startsWith('guidance_')
          ? guidance
          : other

      if (!target[kpi.metric]) {
        target[kpi.metric] = { label: kpi.label, unit: kpi.unit, data: [] }
      }
      target[kpi.metric].data.push({
        period: kpi.period,
        value: kpi.value,
        filingUrl: kpi.filingUrl,
      })
    }

    return NextResponse.json({
      ticker,
      segments: { ...segments, ...other },
      geographic,
      guidance,
      segmentCount: Object.keys(segments).length + Object.keys(other).length,
      geographicCount: Object.keys(geographic).length,
      guidanceCount: Object.keys(guidance).length,
      source: 'sec-edgar-8k',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
