// Finclue Data API v1 – Earnings Calendar
// GET /api/v1/calendar/earnings?from=2026-04-01&to=2026-04-30

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const from = searchParams.get('from') || new Date().toISOString().slice(0, 10)
  const to = searchParams.get('to') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const ticker = searchParams.get('ticker')?.toUpperCase()
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Primary: Eigene SecEarningsCalendar (SEC 8-K Filing Dates)
    let q1 = supabase
      .from('SecEarningsCalendar')
      .select('ticker, company_name, date, fiscal_quarter, fiscal_year, eps_actual, revenue_actual, source')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .limit(limit)
    if (ticker) q1 = q1.eq('ticker', ticker)

    const { data: secEvents } = await q1

    // Fallback: FMP EarningsCalendar (wenn eigene Daten leer)
    let finalEvents: any[] = []
    let dataSource = 'sec-8k'

    if (secEvents && secEvents.length > 0) {
      finalEvents = secEvents.map(e => ({
        symbol: e.ticker,
        companyName: e.company_name,
        date: e.date,
        time: null,
        fiscalQuarter: e.fiscal_quarter ? parseInt(e.fiscal_quarter.replace('Q', '')) : null,
        fiscalYear: e.fiscal_year,
        epsEstimate: null,
        epsActual: e.eps_actual,
        revenueEstimate: null,
        revenueActual: e.revenue_actual,
      }))
    } else {
      // Fallback auf FMP-Daten
      const fromTS = `${from} 00:00:00`
      const toTS = `${to} 23:59:59`
      let q2 = supabase
        .from('EarningsCalendar')
        .select('symbol, companyName, date, time, fiscalQuarter, fiscalYear, epsEstimate, epsActual, revenueEstimate, revenueActual')
        .gte('date', fromTS)
        .lte('date', toTS)
        .order('date', { ascending: true })
        .limit(limit)
      if (ticker) q2 = q2.eq('symbol', ticker)

      const { data, error } = await q2
      if (error) {
        console.error('[Earnings API]', error)
        throw new Error(error.message || JSON.stringify(error))
      }
      finalEvents = data || []
      dataSource = 'fmp-legacy'
    }

    // Gruppiere nach Datum
    const byDate: Record<string, any[]> = {}
    for (const event of finalEvents || []) {
      const dateKey = new Date(event.date).toISOString().slice(0, 10)
      if (!byDate[dateKey]) byDate[dateKey] = []

      const beat = event.epsActual !== null && event.epsEstimate !== null
        ? event.epsActual > event.epsEstimate ? 'beat' : event.epsActual < event.epsEstimate ? 'miss' : 'meet'
        : null

      byDate[dateKey].push({
        ticker: event.symbol,
        company: event.companyName,
        time: event.time || 'unknown',
        fiscalQuarter: event.fiscalQuarter,
        fiscalYear: event.fiscalYear,
        epsEstimate: event.epsEstimate,
        epsActual: event.epsActual,
        revenueEstimate: event.revenueEstimate,
        revenueActual: event.revenueActual,
        result: beat,
      })
    }

    return NextResponse.json({
      from,
      to,
      totalEvents: finalEvents?.length || 0,
      dates: Object.entries(byDate).map(([date, events]) => ({
        date,
        events,
      })),
      source: dataSource,
    }, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
