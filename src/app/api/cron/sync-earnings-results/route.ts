// Finclue Cron – Earnings-Ergebnisse nachtragen
//
// GET /api/cron/sync-earnings-results
//   from=YYYY-MM-DD   Default: heute − 10 Tage
//   to=YYYY-MM-DD     Default: heute
//
// Die Kalender-Tabelle "SecEarningsCalendar" kennt aus NASDAQ/SEC nur Termin
// und EPS-Prognose. Die Ist-Zahlen (EPS + Umsatz) kommen hier nach der
// Veröffentlichung aus FMP /stable/earnings-calendar dazu.
//
// Beat/Miss wird gegen die FMP-Prognose gerechnet, nicht gegen die
// NASDAQ-Prognose: Ist und Prognose müssen auf derselben Basis stehen
// (z.B. CSCO Q1/27: NASDAQ 1,15 $, FMP 1,33 $, Ist 1,40 $). Deshalb wird
// eps_estimate bei vergangenen Terminen durch den FMP-Wert ersetzt, sobald
// FMP einen hat.
//
// Zuordnung: Ticker gleich und Datum höchstens 4 Tage auseinander. So werden
// auch Termine getroffen, die NASDAQ verschoben hat (dann liegen zwei Zeilen
// für dasselbe Quartal in der Tabelle — beide bekommen die Ist-Zahlen, die
// Kalender-API zeigt ohnehin nur eine davon).

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { markSupersededEarningsRows } from '@/lib/earningsCalendarRows'
import {
  addDays,
  dayDiff,
  fetchFmpEarningsRange,
  isIsoDate,
  normalizeSymbol,
  num,
  plausibleEps,
  plausibleRevenue,
  todayUtc,
} from '@/lib/earningsData'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET

const DEFAULT_LOOKBACK_DAYS = 10
const MATCH_WINDOW_DAYS = 4
// NASDAQ verschiebt vorläufige Termine um bis zu einige Wochen
const DEDUP_MARGIN_DAYS = 30
const CHUNK_DAYS = 7
const DB_PAGE_SIZE = 1000
const UPSERT_BATCH = 500

interface DbRow {
  id: string
  ticker: string
  date: string
  eps_actual: number | null
  eps_estimate: number | null
  revenue_actual: number | null
  revenue_estimate: number | null
}

interface ResultRow {
  date: string
  epsActual: number | null
  epsEstimated: number | null
  revenueActual: number | null
  revenueEstimated: number | null
}

// ── DB ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tabelle ist nicht im generierten Schema
type Supabase = SupabaseClient<any, 'public', any>

async function loadDbRows(supabase: Supabase, from: string, to: string): Promise<DbRow[]> {
  const rows: DbRow[] = []
  for (let offset = 0; ; offset += DB_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('SecEarningsCalendar')
      .select('id, ticker, date, eps_actual, eps_estimate, revenue_actual, revenue_estimate')
      .gte('date', from)
      .lte('date', to)
      .order('id', { ascending: true })
      .range(offset, offset + DB_PAGE_SIZE - 1)
    if (error) throw new Error(`DB lesen: ${error.message}`)
    const page = (data as DbRow[] | null) ?? []
    rows.push(...page)
    if (page.length < DB_PAGE_SIZE) break
  }
  return rows
}

// ── Ein Zeitabschnitt ───────────────────────────────────────────────────────

async function syncChunk(supabase: Supabase, apiKey: string, from: string, to: string, today: string) {
  const fmpRows = await fetchFmpEarningsRange(from, to, apiKey)

  // Nur Zeilen mit Ist-Zahlen, gruppiert nach Ticker
  const resultsByTicker = new Map<string, ResultRow[]>()
  let reported = 0
  for (const r of fmpRows) {
    if (!r.symbol || !isIsoDate(r.date ?? null)) continue
    const epsActual = num(r.epsActual)
    const revenueActual = num(r.revenueActual)
    if (epsActual === null && revenueActual === null) continue
    reported++
    const ticker = normalizeSymbol(r.symbol)
    const list = resultsByTicker.get(ticker) ?? []
    list.push({
      date: r.date!,
      epsActual,
      epsEstimated: num(r.epsEstimated),
      revenueActual,
      revenueEstimated: num(r.revenueEstimated),
    })
    resultsByTicker.set(ticker, list)
  }

  // DB-Zeilen im Abschnitt plus Puffer für verschobene Termine; nichts in der Zukunft
  const dbTo = addDays(to, MATCH_WINDOW_DAYS) < today ? addDays(to, MATCH_WINDOW_DAYS) : today
  const dbRows = await loadDbRows(supabase, addDays(from, -MATCH_WINDOW_DAYS), dbTo)

  const nowIso = new Date().toISOString()
  const updates: Array<Record<string, unknown>> = []
  for (const row of dbRows) {
    const candidates = resultsByTicker.get(row.ticker)
    if (!candidates) continue

    // Nächstgelegenes Ergebnis innerhalb des Fensters
    let best: ResultRow | null = null
    let bestDiff = Infinity
    for (const c of candidates) {
      const diff = dayDiff(c.date, row.date)
      if (diff <= MATCH_WINDOW_DAYS && diff < bestDiff) {
        best = c
        bestDiff = diff
      }
    }
    if (!best) continue

    let epsActual = best.epsActual
    let epsEstimate = best.epsEstimated ?? row.eps_estimate
    if (!plausibleEps(epsActual, epsEstimate)) {
      epsActual = null
      // Stammt die gespeicherte Prognose aus einem früheren Lauf (= FMP-Wert), mit verwerfen
      epsEstimate = row.eps_estimate === best.epsEstimated ? null : row.eps_estimate
    }

    // revenue_estimate kommt ausschließlich aus diesem Sync (NASDAQ liefert keinen)
    let revenueActual = best.revenueActual !== null ? Math.round(best.revenueActual) : null
    let revenueEstimate = best.revenueEstimated !== null ? Math.round(best.revenueEstimated) : null
    if (!plausibleRevenue(revenueActual, revenueEstimate)) {
      revenueActual = null
      revenueEstimate = null
    }

    if (epsActual === null && revenueActual === null && row.eps_actual === null && row.revenue_actual === null) {
      continue
    }

    const unchanged =
      row.eps_actual === epsActual &&
      row.revenue_actual === revenueActual &&
      row.eps_estimate === epsEstimate &&
      row.revenue_estimate === revenueEstimate
    if (unchanged) continue

    updates.push({
      id: row.id,
      ticker: row.ticker,
      date: row.date,
      eps_actual: epsActual,
      revenue_actual: revenueActual,
      eps_estimate: epsEstimate,
      revenue_estimate: revenueEstimate,
      updated_at: nowIso,
    })
  }

  // Nur bestehende Zeilen (per id) — upsert schreibt ausschließlich die
  // übergebenen Spalten, alles andere bleibt unangetastet.
  let saved = 0
  for (let i = 0; i < updates.length; i += UPSERT_BATCH) {
    const batch = updates.slice(i, i + UPSERT_BATCH)
    const { error } = await supabase.from('SecEarningsCalendar').upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`DB schreiben: ${error.message}`)
    saved += batch.length
  }

  return { fmpRows: fmpRows.length, reported, dbRows: dbRows.length, updated: saved }
}

// ── Route ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FMP_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Nicht konfiguriert' }, { status: 500 })
  }

  const today = todayUtc()
  const sp = request.nextUrl.searchParams
  const fromParam = sp.get('from')
  const toParam = sp.get('to')
  if ((fromParam && !isIsoDate(fromParam)) || (toParam && !isIsoDate(toParam))) {
    return NextResponse.json({ error: 'from/to müssen YYYY-MM-DD sein' }, { status: 400 })
  }
  const from = fromParam ?? addDays(today, -DEFAULT_LOOKBACK_DAYS)
  const to = toParam && toParam < today ? toParam : today
  if (from > to) {
    return NextResponse.json({ error: 'from liegt nach to' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const startedAt = Date.now()
  const chunks: Array<{ from: string; to: string; fmpRows?: number; reported?: number; dbRows?: number; updated?: number; error?: string }> = []

  for (let chunkFrom = from; chunkFrom <= to; chunkFrom = addDays(chunkFrom, CHUNK_DAYS)) {
    const chunkTo = addDays(chunkFrom, CHUNK_DAYS - 1) < to ? addDays(chunkFrom, CHUNK_DAYS - 1) : to
    try {
      const stats = await syncChunk(supabase, apiKey, chunkFrom, chunkTo, today)
      chunks.push({ from: chunkFrom, to: chunkTo, ...stats })
    } catch (err) {
      chunks.push({ from: chunkFrom, to: chunkTo, error: err instanceof Error ? err.message : String(err) })
    }
  }

  // Ist-Zahlen entscheiden mit, welcher von zwei Terminen eines Quartals der
  // echte ist — deshalb danach überholte Termine neu markieren.
  let duplicates: Awaited<ReturnType<typeof markSupersededEarningsRows>> | { error: string }
  try {
    duplicates = await markSupersededEarningsRows(
      supabase,
      addDays(from, -DEDUP_MARGIN_DAYS),
      addDays(to, DEDUP_MARGIN_DAYS)
    )
  } catch (err) {
    duplicates = { error: err instanceof Error ? err.message : String(err) }
  }

  const failed = chunks.filter(c => c.error)
  return NextResponse.json(
    {
      ok: failed.length === 0 && !('error' in duplicates),
      from,
      to,
      updated: chunks.reduce((s, c) => s + (c.updated ?? 0), 0),
      duplicates,
      chunks,
      elapsedMs: Date.now() - startedAt,
    },
    { status: failed.length === chunks.length ? 502 : 200 }
  )
}
