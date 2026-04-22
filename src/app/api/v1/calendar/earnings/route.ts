// Finclue Data API v1 – Earnings Calendar
//
// GET /api/v1/calendar/earnings
//
// Query-Params:
//   from=YYYY-MM-DD          Default: heute
//   to=YYYY-MM-DD            Default: heute + 30d
//   ticker=AAPL              Optional: Einzel-Ticker-Filter
//   tickers=AAPL,MSFT,GOOGL  Optional: Multi-Ticker-Filter (z.B. Portfolio-View)
//   upcoming=true            Nur anstehende (is_upcoming=true), ignoriert from/to
//   days=N                   Mit upcoming=true: nur die nächsten N Tage
//   minMarketCap=N           Optional: Mindest-Market-Cap in USD (z.B. 10000000000 = $10B)
//   limit=N                  Max Events (Cap 5000, default 500)
//
// Datenquellen (alle in Supabase-Tabelle "SecEarningsCalendar" konsolidiert):
//   • sec-8k-item-2.02     Past Earnings aus SEC EDGAR 8-K Filings
//   • nasdaq-public        Upcoming Earnings aus NASDAQ Public Calendar
//
// Keine FMP/EODHD-Dependency — 100% Primary-Sources.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface CalendarRow {
  ticker: string
  company_name: string | null
  date: string
  fiscal_quarter: string | null
  fiscal_year: number | null
  eps_actual: number | null
  eps_estimate: number | null
  revenue_actual: number | null
  revenue_estimate: number | null
  call_time: string | null
  market_cap: number | null
  is_upcoming: boolean
  source: string | null
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  const upcomingOnly = sp.get('upcoming') === 'true'
  const days = Math.max(1, Math.min(90, parseInt(sp.get('days') || '30')))

  // Datums-Range berechnen
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = fmtIsoDate(today)
  const futureIso = fmtIsoDate(new Date(today.getTime() + days * 24 * 3600 * 1000))

  const from = upcomingOnly ? todayIso : (sp.get('from') || todayIso)
  const to = upcomingOnly ? futureIso : (sp.get('to') || futureIso)
  const ticker = sp.get('ticker')?.toUpperCase()
  // Multi-Ticker (z.B. ?tickers=AAPL,MSFT,GOOGL für Portfolio-Views).
  // Whitelist: A-Z0-9.- damit kein SQL-Injection-Surface entsteht.
  const tickers = (sp.get('tickers') || '')
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(t => /^[A-Z0-9.\-]{1,15}$/.test(t))
    .slice(0, 100)
  // Default 500, Cap 5000. Vorher 500/500 — hat zur Cutoff bei viel-Earnings-
  // Monaten geführt (z.B. Mai 2026 hat 2600+ Events, alles nach den ersten 500
  // chronologisch fiel ab).
  const limit = Math.min(parseInt(sp.get('limit') || '500'), 5000)
  // Mindest-Market-Cap (USD). Z.B. 10_000_000_000 = $10B = nur Mid+Large Caps.
  const minMarketCapRaw = sp.get('minMarketCap')
  const minMarketCap = minMarketCapRaw ? parseInt(minMarketCapRaw) : null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    let q = supabase
      .from('SecEarningsCalendar')
      .select(
        'ticker, company_name, date, fiscal_quarter, fiscal_year, ' +
        'eps_actual, eps_estimate, revenue_actual, revenue_estimate, ' +
        'call_time, market_cap, is_upcoming, source'
      )
      .gte('date', from)
      .lte('date', to)
      // Nach Datum aufsteigend, dann Market Cap absteigend (Größte zuerst pro Tag,
      // damit auch bei niedrigem Limit die "wichtigen" Firmen drin sind).
      .order('date', { ascending: true })
      .order('market_cap', { ascending: false, nullsFirst: false })
      .order('ticker', { ascending: true })
      .limit(limit)

    if (ticker) q = q.eq('ticker', ticker)
    if (tickers.length > 0) q = q.in('ticker', tickers)
    if (upcomingOnly) q = q.eq('is_upcoming', true)
    if (minMarketCap !== null) q = q.gte('market_cap', minMarketCap)

    const { data, error } = await q
    if (error) throw error

    const events = ((data as unknown) as CalendarRow[] | null) ?? []

    // Gruppiere nach Datum
    const byDate = new Map<string, ReturnType<typeof toApiEvent>[]>()
    for (const row of events) {
      const dateKey = row.date
      if (!byDate.has(dateKey)) byDate.set(dateKey, [])
      byDate.get(dateKey)!.push(toApiEvent(row))
    }

    return NextResponse.json(
      {
        from,
        to,
        upcoming: upcomingOnly,
        totalEvents: events.length,
        dates: Array.from(byDate.entries()).map(([date, evs]) => ({ date, events: evs })),
        sources: uniqueSources(events),
      },
      {
        headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toApiEvent(row: CalendarRow) {
  // Beat/Miss nur wenn actual + estimate beide vorhanden
  const beat =
    row.eps_actual !== null && row.eps_estimate !== null
      ? row.eps_actual > row.eps_estimate
        ? 'beat'
        : row.eps_actual < row.eps_estimate
          ? 'miss'
          : 'meet'
      : null

  return {
    ticker: row.ticker,
    company: row.company_name,
    time: row.call_time, // 'bmo' | 'amc' | null
    fiscalQuarter: row.fiscal_quarter ? parseInt(row.fiscal_quarter.replace('Q', '')) : null,
    fiscalYear: row.fiscal_year,
    epsEstimate: row.eps_estimate,
    epsActual: row.eps_actual,
    revenueEstimate: row.revenue_estimate,
    revenueActual: row.revenue_actual,
    marketCap: row.market_cap,
    isUpcoming: row.is_upcoming,
    result: beat,
    source: row.source,
  }
}

function uniqueSources(rows: CalendarRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) if (r.source) set.add(r.source)
  return Array.from(set)
}
