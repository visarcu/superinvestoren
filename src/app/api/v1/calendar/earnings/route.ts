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
//   superinvestors=1         Je Termin: welche Superinvestoren die Aktie halten (13F)
//   superinvestorsOnly=1     Nur Aktien, die mindestens ein Superinvestor hält
//
// Datenquellen (alle in Supabase-Tabelle "SecEarningsCalendar" konsolidiert):
//   • sec-8k-item-2.02     Past Earnings aus SEC EDGAR 8-K Filings
//   • nasdaq-public        Upcoming Earnings aus NASDAQ Public Calendar
//   • fmp-history          Termine 2024 bis April 2026 aus FMP (scripts/backfillEarningsHistory.ts)
//
// Ist-Zahlen (cron/sync-earnings-results) und Kursreaktion
// (cron/sync-earnings-reactions) kommen aus FMP dazu.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isBetterEarningsRow } from '@/lib/earningsCalendarRows'
import { earningsOutcome } from '@/lib/earningsData'
import type { SuperinvestorSummary } from '@/lib/stockSuperinvestors'

const DB_PAGE_SIZE = 1000

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
  updated_at?: string | null
  reaction_pct?: number | null
  typical_move_pct?: number | null
  typical_move_count?: number | null
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
  // Optional FMP-Augment: für Ticker, die SEC/NASDAQ nicht liefert (z.B.
  // .DE-Werte wie VNA.DE, ALV.DE, MUV2.DE) wird FMP /v3/earning_calendar
  // als Ergänzung gezogen. Nur sinnvoll mit ?tickers=… (Portfolio-Views).
  const fmpFallback = sp.get('fallback') === 'fmp' && tickers.length > 0
  // Superinvestoren aus den 13F-Daten anhängen bzw. nur deren Aktien zeigen
  const superinvestorsOnly = sp.get('superinvestorsOnly') === '1'
  const withSuperinvestors = superinvestorsOnly || sp.get('superinvestors') === '1'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const buildQuery = () => {
      let q = supabase
        .from('SecEarningsCalendar')
        .select(
          'ticker, company_name, date, fiscal_quarter, fiscal_year, ' +
          'eps_actual, eps_estimate, revenue_actual, revenue_estimate, ' +
          'call_time, market_cap, is_upcoming, source, updated_at, ' +
          'reaction_pct, typical_move_pct, typical_move_count'
        )
        .gte('date', from)
        .lte('date', to)
        // Überholte Termine (von NASDAQ verschoben) ausblenden
        .eq('confirmed', true)
        // Nach Datum aufsteigend, dann Market Cap absteigend (Größte zuerst pro Tag,
        // damit auch bei niedrigem Limit die "wichtigen" Firmen drin sind).
        // ticker+date ist eindeutig, die Reihenfolge damit stabil fürs Blättern.
        .order('date', { ascending: true })
        .order('market_cap', { ascending: false, nullsFirst: false })
        .order('ticker', { ascending: true })

      if (ticker) q = q.eq('ticker', ticker)
      if (tickers.length > 0) q = q.in('ticker', tickers)
      if (upcomingOnly) q = q.eq('is_upcoming', true)
      if (minMarketCap !== null) q = q.gte('market_cap', minMarketCap)
      return q
    }

    // Supabase liefert pro Abfrage höchstens 1000 Zeilen, deshalb seitenweise
    // bis zum Limit laden (vorher endete "Alle" im November schon am 5.).
    const rawEvents: CalendarRow[] = []
    for (let offset = 0; offset < limit; offset += DB_PAGE_SIZE) {
      const end = Math.min(offset + DB_PAGE_SIZE, limit) - 1
      const { data, error } = await buildQuery().range(offset, end)
      if (error) throw error
      const page = ((data as unknown) as CalendarRow[] | null) ?? []
      rawEvents.push(...page)
      if (page.length < end - offset + 1) break
    }

    // ── Dedup-Pass 1: gleicher ticker + fiscal_quarter + fiscal_year ──
    // z.B. Tesla 2026-04-02 (SEC 8-K Item 2.02 für Production Numbers) und
    // 2026-04-22 (NASDAQ offizielle Q1 Earnings), oder ein von NASDAQ
    // verschobener Termin, falls noch nicht per confirmed=false aussortiert.
    // Auswahl siehe isBetterEarningsRow().
    const tickerDedup = new Map<string, CalendarRow>()
    for (const row of rawEvents) {
      const key = row.fiscal_quarter && row.fiscal_year
        ? `${row.ticker}|${row.fiscal_quarter}|${row.fiscal_year}`
        : `${row.ticker}|${row.date}`
      const existing = tickerDedup.get(key)
      if (!existing || isBetterEarningsRow(row, existing)) {
        tickerDedup.set(key, row)
      }
    }

    // ── Dedup-Pass 2: gleicher company_name + date (Class-Pairs) ──
    // z.B. GOOG/GOOGL (Alphabet Class C/A), BRK.A/BRK.B (Berkshire),
    // FOX/FOXA, NWS/NWSA — beides dieselbe Firma mit identischen Earnings.
    // Wir behalten alphabetisch den ersten Ticker. Bei Multi-Ticker-Filter
    // (?tickers=…) kommt der Konflikt nur wenn der User beide Klassen hat.
    const companyDedup = new Map<string, CalendarRow>()
    for (const row of tickerDedup.values()) {
      if (!row.company_name) {
        // Ohne Name nicht deduplizieren — einzigartig per ticker+date
        companyDedup.set(`${row.ticker}|${row.date}`, row)
        continue
      }
      const normName = row.company_name.toLowerCase().trim()
      const key = `${normName}|${row.date}`
      const existing = companyDedup.get(key)
      if (!existing) {
        companyDedup.set(key, row)
        continue
      }
      // Bei Klassen-Konflikt: alphabetisch ersten Ticker behalten
      // (BRK.A vor BRK.B, FOX vor FOXA, GOOG vor GOOGL).
      if (row.ticker < existing.ticker) {
        companyDedup.set(key, row)
      }
    }

    const events = Array.from(companyDedup.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      const ma = a.market_cap || 0
      const mb = b.market_cap || 0
      if (ma !== mb) return mb - ma
      return a.ticker < b.ticker ? -1 : 1
    })

    // ── FMP-Augment: fehlende Ticker per FMP /v3/earning_calendar ergänzen ──
    // SEC EDGAR + NASDAQ Public Calendar deckt nur US-Listings ab. Für
    // EU-Werte (z.B. VNA.DE, MUV2.DE, ALV.DE) gibt's keine SEC-Filings —
    // FMP hat eine breitere geographische Coverage, daher hier als
    // Opt-in-Augment für Portfolio-Consumer (?fallback=fmp). Wir laden
    // FMP nur, wenn nach SEC/NASDAQ Ticker fehlen, und mappen ins gleiche
    // CalendarRow-Shape. Source bleibt 'fmp' für Telemetrie.
    if (fmpFallback) {
      const foundTickers = new Set(events.map(e => e.ticker.toUpperCase()))
      const missing = tickers.filter(t => !foundTickers.has(t))
      const fmpKey = process.env.FMP_API_KEY
      if (missing.length > 0 && fmpKey) {
        try {
          const fmpRes = await fetch(
            `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${fmpKey}`,
            { next: { revalidate: 3600 } }
          )
          if (fmpRes.ok) {
            const fmpData = await fmpRes.json()
            if (Array.isArray(fmpData)) {
              const missingSet = new Set(missing)
              for (const item of fmpData as Array<{
                symbol?: string
                date?: string
                time?: string
                epsEstimated?: number | string | null
                epsActual?: number | string | null
                revenueEstimated?: number | string | null
                revenueActual?: number | string | null
              }>) {
                if (!item.symbol || !item.date) continue
                const sym = String(item.symbol).toUpperCase()
                if (!missingSet.has(sym)) continue
                const eventDate = new Date(item.date)
                const month = eventDate.getMonth() + 1
                const fmpQuarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4
                events.push({
                  ticker: sym,
                  company_name: null,
                  date: item.date,
                  fiscal_quarter: `Q${fmpQuarter}`,
                  fiscal_year: eventDate.getFullYear(),
                  eps_actual: item.epsActual != null ? parseFloat(String(item.epsActual)) : null,
                  eps_estimate: item.epsEstimated != null ? parseFloat(String(item.epsEstimated)) : null,
                  revenue_actual: item.revenueActual != null ? parseFloat(String(item.revenueActual)) : null,
                  revenue_estimate: item.revenueEstimated != null ? parseFloat(String(item.revenueEstimated)) : null,
                  call_time: item.time || null,
                  market_cap: null,
                  is_upcoming: eventDate >= today,
                  source: 'fmp',
                })
              }
              // Per-Ticker Dedup (FMP kann Duplikate liefern), erstes Event je Ticker behalten
              const fmpSeen = new Set<string>()
              for (let i = events.length - 1; i >= 0; i--) {
                if (events[i].source !== 'fmp') continue
                const k = `${events[i].ticker}|${events[i].date}`
                if (fmpSeen.has(k)) events.splice(i, 1)
                else fmpSeen.add(k)
              }
              // Re-sort nachdem FMP-Events angehängt wurden
              events.sort((a, b) => {
                if (a.date !== b.date) return a.date < b.date ? -1 : 1
                const ma = a.market_cap || 0
                const mb = b.market_cap || 0
                if (ma !== mb) return mb - ma
                return a.ticker < b.ticker ? -1 : 1
              })
            }
          }
        } catch (err) {
          console.warn('FMP augment failed:', err)
        }
      }
    }

    // Superinvestoren je Ticker (aus den 13F-Daten). Erst bei Bedarf laden,
    // damit Abrufe ohne den Parameter die Holdings-Daten nicht parsen müssen.
    const siCache = new Map<string, SuperinvestorSummary | null>()
    let siLookup: ((ticker: string) => SuperinvestorSummary | null) | null = null
    if (withSuperinvestors) {
      const { getSuperinvestorSummary } = await import('@/lib/stockSuperinvestors')
      siLookup = t => {
        if (!siCache.has(t)) siCache.set(t, getSuperinvestorSummary(t))
        return siCache.get(t)!
      }
    }
    const visible = superinvestorsOnly && siLookup
      ? events.filter(row => (siLookup!(row.ticker)?.holders ?? 0) > 0)
      : events

    // Gruppiere nach Datum
    const byDate = new Map<string, Array<ReturnType<typeof toApiEvent> & { superinvestors?: SuperinvestorSummary | null }>>()
    for (const row of visible) {
      const dateKey = row.date
      if (!byDate.has(dateKey)) byDate.set(dateKey, [])
      const event = toApiEvent(row)
      byDate.get(dateKey)!.push(siLookup ? { ...event, superinvestors: siLookup(row.ticker) } : event)
    }

    return NextResponse.json(
      {
        from,
        to,
        upcoming: upcomingOnly,
        totalEvents: visible.length,
        dates: Array.from(byDate.entries()).map(([date, evs]) => ({ date, events: evs })),
        sources: uniqueSources(visible),
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
  const { result, epsResult, revenueResult, epsSurprisePct, revenueSurprisePct } = earningsOutcome(row)

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
    result,
    epsResult,
    revenueResult,
    epsSurprisePct,
    revenueSurprisePct,
    // Kursveränderung am Reaktionstag (%) und Ø absolute Reaktion der vorherigen Termine
    reactionPct: row.reaction_pct ?? null,
    typicalMovePct: row.typical_move_pct ?? null,
    typicalMoveCount: row.typical_move_count ?? null,
    source: row.source,
  }
}

function uniqueSources(rows: CalendarRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) if (r.source) set.add(r.source)
  return Array.from(set)
}
