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

    // Query Earnings – Supabase filter mit Timestamp-String
    const fromTS = `${from} 00:00:00`
    const toTS = `${to} 23:59:59`

    let q = supabase
      .from('EarningsCalendar')
      .select('symbol, companyName, date, time, fiscalQuarter, fiscalYear, epsEstimate, epsActual, revenueEstimate, revenueActual')
      .gte('date', fromTS)
      .lte('date', toTS)
      .order('date', { ascending: true })
      .limit(limit)

    if (ticker) q = q.eq('symbol', ticker)

    const { data: finalEvents, error } = await q
    if (error) {
      console.error('[Earnings API]', error)
      throw new Error(error.message || JSON.stringify(error))
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
      source: 'finclue-earnings',
    }, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
