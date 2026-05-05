// Finclue Data API v1 – IPO Calendar
// GET /api/v1/ipos?from=YYYY-MM-DD&to=YYYY-MM-DD&status=priced|pending&limit=100
//
// Source: SEC EDGAR (Form 424B4 + S-1 + S-1/A), gespeichert in IpoCalendar-Tabelle.
// Wird täglich/wöchentlich vom Cron /api/cron/sync-ipos befüllt.
//
// Verwendet Supabase HTTP-API (statt Prisma/Postgres direkt), weil Vercel-Lambdas
// keinen direkten Postgres-Port (5432) zu Supabase erreichen können.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface IpoResponseItem {
  cik: string
  ticker: string | null
  companyName: string
  filingType: string
  filingDate: string // YYYY-MM-DD
  accessionNo: string
  filingUrl: string
  status: string
  sicCode: string | null
  bizState: string | null
  bizLocation: string | null
  source: string
}

const STATUS_VALUES = new Set(['priced', 'pending', 'effective'])

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const sp = request.nextUrl.searchParams
    const fromParam = sp.get('from')
    const toParam = sp.get('to')
    const statusParam = sp.get('status')
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '100', 10), 1), 500)

    // Default-Range: letzte 30 Tage bis +30 Tage
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const defaultFrom = new Date(today)
    defaultFrom.setDate(defaultFrom.getDate() - 30)
    const defaultTo = new Date(today)
    defaultTo.setDate(defaultTo.getDate() + 30)

    const fromDate = fromParam ? new Date(fromParam + 'T00:00:00.000Z') : defaultFrom
    const toDate = toParam ? new Date(toParam + 'T23:59:59.999Z') : defaultTo

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
    }

    const fromIso = fromDate.toISOString().split('T')[0]
    const toIso = toDate.toISOString().split('T')[0]

    const supabase = createClient(supabaseUrl, supabaseKey)
    let query = supabase
      .from('IpoCalendar')
      .select('cik, ticker, companyName, filingType, filingDate, accessionNo, filingUrl, status, sicCode, bizState, bizLocation, source')
      .gte('filingDate', fromIso)
      .lte('filingDate', toIso)
      .order('filingDate', { ascending: false })
      .limit(limit)

    if (statusParam && STATUS_VALUES.has(statusParam)) {
      query = query.eq('status', statusParam)
    }

    const { data: rows, error } = await query
    if (error) throw error

    const data: IpoResponseItem[] = (rows || []).map(r => ({
      cik: r.cik,
      ticker: r.ticker,
      companyName: r.companyName,
      filingType: r.filingType,
      filingDate: typeof r.filingDate === 'string' ? r.filingDate.split('T')[0] : r.filingDate,
      accessionNo: r.accessionNo,
      filingUrl: r.filingUrl,
      status: r.status,
      sicCode: r.sicCode,
      bizState: r.bizState,
      bizLocation: r.bizLocation,
      source: r.source,
    }))

    const counts = {
      total: data.length,
      priced: data.filter(d => d.status === 'priced').length,
      pending: data.filter(d => d.status === 'pending').length,
    }

    return NextResponse.json(
      {
        range: { from: fromIso, to: toIso },
        counts,
        data,
        source: 'sec-edgar',
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('IPO Calendar API error:', msg)
    return NextResponse.json({ error: 'Failed to fetch IPO calendar' }, { status: 500 })
  }
}
