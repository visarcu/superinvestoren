// Vercel Cron: Täglicher NASDAQ-Earnings-Refresh
// Läuft via vercel.json (Schedule: "0 6 * * *" = 06:00 UTC).
//
// Zieht die nächsten 30 Tage aus NASDAQ Public Calendar
// (api.nasdaq.com/api/calendar/earnings) und upserted in die
// Supabase-Tabelle SecEarningsCalendar mit source='nasdaq-public'.
//
// Kein FMP/EODHD — direkt Primary-Source.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vercel setzt Node-Runtime auf 10s default — Cron darf länger
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 Minuten Cap

const CRON_SECRET = process.env.CRON_SECRET

// ── Parsing-Helpers (spiegelt scripts/ingestUpcomingEarnings.ts) ─────────

const MONTH_TO_Q: Record<string, string> = {
  Jan: 'Q1', Feb: 'Q1', Mar: 'Q1',
  Apr: 'Q2', May: 'Q2', Jun: 'Q2',
  Jul: 'Q3', Aug: 'Q3', Sep: 'Q3',
  Oct: 'Q4', Nov: 'Q4', Dec: 'Q4',
}

function parseFiscalQuarter(s?: string): { quarter: string | null; year: number | null } {
  if (!s) return { quarter: null, year: null }
  const [mon, yearStr] = s.split('/')
  const y = Number(yearStr)
  if (!y || !MONTH_TO_Q[mon]) return { quarter: null, year: null }
  return { quarter: MONTH_TO_Q[mon], year: y }
}

function parseEps(s?: string): number | null {
  if (!s || s === '--' || s === 'N/A') return null
  const neg = s.startsWith('(') && s.endsWith(')')
  const cleaned = s.replace(/[$,()]/g, '').trim()
  const n = Number(cleaned)
  if (isNaN(n)) return null
  return neg ? -n : n
}

function parseCallTime(s?: string): string | null {
  if (s === 'time-pre-market') return 'bmo'
  if (s === 'time-after-hours') return 'amc'
  return null
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── NASDAQ-Fetch ─────────────────────────────────────────────────────────

interface NasdaqRow {
  symbol?: string
  name?: string
  fiscalQuarterEnding?: string
  time?: string
  epsForecast?: string
}

async function fetchNasdaqDay(date: string): Promise<NasdaqRow[]> {
  const url = `https://api.nasdaq.com/api/calendar/earnings?date=${date}`
  const res = await fetch(url, {
    headers: {
      // Cloudflare-Bypass: realistischer Browser-UA + Referer ist nötig
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.nasdaq.com/',
      Origin: 'https://www.nasdaq.com',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`NASDAQ ${date}: HTTP ${res.status}`)
  const json = await res.json()
  return json?.data?.rows ?? []
}

// ── Route-Handler ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Cron-Auth: Vercel setzt Authorization automatisch für eigene Crons.
  // Zusätzlich: CRON_SECRET Check wenn gesetzt.
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  const startedAt = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = isoDate(today)

  // Default-Reichweite: 30 Tage. Via ?days=N überschreibbar (für manuelle Runs).
  const daysParam = request.nextUrl.searchParams.get('days')
  const days = Math.max(1, Math.min(90, parseInt(daysParam || '30')))

  let daysWithData = 0
  let totalRows = 0
  let totalSaved = 0
  const failures: { date: string; error: string }[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // Wochenende

    const dateStr = isoDate(d)
    try {
      const rows = await fetchNasdaqDay(dateStr)
      if (rows.length === 0) continue

      const nowIso = new Date().toISOString()
      let saved = 0
      for (const r of rows) {
        if (!r.symbol) continue
        const fp = parseFiscalQuarter(r.fiscalQuarterEnding)
        const epsEst = parseEps(r.epsForecast)
        const callTime = parseCallTime(r.time)
        const isUpcoming = new Date(dateStr + 'T00:00:00') >= today

        const { error } = await supabase
          .from('SecEarningsCalendar')
          .upsert(
            {
              ticker: r.symbol.toUpperCase(),
              company_name: r.name,
              date: dateStr,
              fiscal_quarter: fp.quarter,
              fiscal_year: fp.year,
              eps_estimate: epsEst,
              call_time: callTime,
              is_upcoming: isUpcoming,
              confirmed: true,
              source: 'nasdaq-public',
              updated_at: nowIso,
            },
            { onConflict: 'ticker,date' }
          )
        if (!error) saved++
      }

      daysWithData++
      totalRows += rows.length
      totalSaved += saved
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push({ date: dateStr, error: msg })
    }

    // NASDAQ ist nicht hart rate-limited aber 250ms ist höflich
    await new Promise(r => setTimeout(r, 250))
  }

  // Optional: alte Upcoming-Einträge deren Datum inzwischen in der Vergangenheit
  // liegt auf is_upcoming=false setzen (Housekeeping).
  await supabase
    .from('SecEarningsCalendar')
    .update({ is_upcoming: false })
    .eq('is_upcoming', true)
    .lt('date', todayIso)

  const elapsedMs = Date.now() - startedAt

  return NextResponse.json({
    ok: true,
    days,
    daysWithData,
    totalRows,
    totalSaved,
    failures: failures.length,
    failureDetails: failures.slice(0, 10),
    elapsedMs,
    fetchedAt: new Date().toISOString(),
  })
}
