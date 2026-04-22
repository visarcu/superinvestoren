/**
 * ingestUpcomingEarnings.ts
 *
 * Zieht anstehende Earnings aus dem öffentlichen NASDAQ Calendar:
 *   https://api.nasdaq.com/api/calendar/earnings?date=YYYY-MM-DD
 *
 * Das ist eine kostenlose, öffentliche Quelle direkt von der Börse — kein
 * FMP, kein EODHD. NASDAQ liefert symbol, name, fiscal-quarter,
 * call-time (pre-/after-market), EPS-Estimate und Last-Year-EPS.
 *
 * Wir speichern in dieselbe Tabelle wie SEC-Past-Earnings
 * (SecEarningsCalendar) aber mit `is_upcoming = true` und
 * `source = 'nasdaq-public'`.
 *
 * Usage:
 *   npx tsx scripts/ingestUpcomingEarnings.ts                 # 30 Tage default
 *   npx tsx scripts/ingestUpcomingEarnings.ts --days 60
 *   npx tsx scripts/ingestUpcomingEarnings.ts --dry-run       # nur loggen
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── NASDAQ Response Types ───────────────────────────────────────────────────

interface NasdaqEarningsRow {
  symbol: string
  name: string
  fiscalQuarterEnding?: string   // "Mar/2026"
  time?: string                  // "time-pre-market" | "time-after-hours" | "time-not-supplied"
  epsForecast?: string           // "$4.03" oder "($0.11)" oder "--"
  noOfEsts?: string
  lastYearEPS?: string
  lastYearRptDt?: string
  marketCap?: string
}

interface NasdaqResponse {
  data?: {
    rows?: NasdaqEarningsRow[] | null
  }
  status?: { rCode?: number }
}

// ─── Parser ──────────────────────────────────────────────────────────────────

const MONTH_TO_Q: Record<string, string> = {
  Jan: 'Q1', Feb: 'Q1', Mar: 'Q1',
  Apr: 'Q2', May: 'Q2', Jun: 'Q2',
  Jul: 'Q3', Aug: 'Q3', Sep: 'Q3',
  Oct: 'Q4', Nov: 'Q4', Dec: 'Q4',
}

/** "Mar/2026" → { quarter: 'Q1', year: 2026 }. Calendar-based (Standard-FY). */
function parseFiscalQuarter(s?: string): { quarter: string | null; year: number | null } {
  if (!s) return { quarter: null, year: null }
  const [mon, yearStr] = s.split('/')
  const y = Number(yearStr)
  if (!y || !MONTH_TO_Q[mon]) return { quarter: null, year: null }
  return { quarter: MONTH_TO_Q[mon], year: y }
}

/** "$4.03" → 4.03, "($0.11)" → -0.11, "--" → null */
function parseEps(s?: string): number | null {
  if (!s || s === '--' || s === 'N/A') return null
  const neg = s.startsWith('(') && s.endsWith(')')
  const cleaned = s.replace(/[$,()]/g, '').trim()
  const n = Number(cleaned)
  if (isNaN(n)) return null
  return neg ? -n : n
}

/** "time-pre-market" → 'bmo', "time-after-hours" → 'amc' */
function parseCallTime(s?: string): string | null {
  if (s === 'time-pre-market') return 'bmo'
  if (s === 'time-after-hours') return 'amc'
  return null
}

/** "$123,456,789,012" → 123456789012 */
function parseMarketCap(s?: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/[$,]/g, '').trim()
  const n = Number(cleaned)
  return isNaN(n) ? null : Math.round(n)
}

// ─── NASDAQ Fetch ────────────────────────────────────────────────────────────

async function fetchNasdaqDay(date: string): Promise<NasdaqEarningsRow[]> {
  const url = `https://api.nasdaq.com/api/calendar/earnings?date=${date}`
  const res = await fetch(url, {
    headers: {
      // NASDAQ blockiert "Bot"-UAs (Cloudflare/Akamai). Browser-artige
      // Headers inkl. Referer/Origin auf nasdaq.com sind nötig, sonst
      // hängt die Connection bis Timeout.
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
  const json = (await res.json()) as NasdaqResponse
  return json.data?.rows ?? []
}

// ─── Main ────────────────────────────────────────────────────────────────────

/** Lokales YYYY-MM-DD (nicht toISOString, damit kein UTC-Offset-Bug). */
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function processDay(date: string, dryRun: boolean): Promise<{ rows: number; saved: number }> {
  const rows = await fetchNasdaqDay(date)
  if (rows.length === 0) return { rows: 0, saved: 0 }

  let saved = 0
  const nowIso = new Date().toISOString()

  for (const r of rows) {
    if (!r.symbol) continue

    const fp = parseFiscalQuarter(r.fiscalQuarterEnding)
    const epsEst = parseEps(r.epsForecast)
    const callTime = parseCallTime(r.time)
    const marketCap = parseMarketCap(r.marketCap)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isUpcoming = new Date(date + 'T00:00:00') >= today

    if (dryRun) { saved++; continue }

    const { error } = await supabase
      .from('SecEarningsCalendar')
      .upsert({
        ticker: r.symbol.toUpperCase(),
        company_name: r.name,
        date,
        fiscal_quarter: fp.quarter,
        fiscal_year: fp.year,
        eps_estimate: epsEst,
        call_time: callTime,
        market_cap: marketCap,
        is_upcoming: isUpcoming,
        confirmed: true,
        source: 'nasdaq-public',
        updated_at: nowIso,
      }, { onConflict: 'ticker,date' })

    if (error) {
      console.error(`  ⚠️  ${r.symbol}: ${error.message}`)
    } else {
      saved++
    }
  }

  return { rows: rows.length, saved }
}

async function main() {
  const args = process.argv.slice(2)
  const daysArg = args.indexOf('--days')
  const days = daysArg !== -1 ? parseInt(args[daysArg + 1]) : 30
  const dryRun = args.includes('--dry-run')

  console.log(`🚀 Finclue Upcoming Earnings Ingestion (NASDAQ Public)`)
  console.log(`   Reichweite: ${days} Tage ab heute`)
  console.log(`   Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}\n`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalRows = 0
  let totalSaved = 0
  let daysWithData = 0

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // Wochenende skippen

    const dateStr = isoDate(d)
    try {
      const { rows, saved } = await processDay(dateStr, dryRun)
      if (rows > 0) {
        console.log(`  ${dateStr}: ${rows} Earnings, ${saved} gespeichert`)
        daysWithData++
        totalRows += rows
        totalSaved += saved
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ❌ ${dateStr}: ${msg}`)
    }

    // NASDAQ ist nicht dokumentiert rate-limited, 250ms ist höflich
    await new Promise(r => setTimeout(r, 250))
  }

  console.log(`\n✅ Done!`)
  console.log(`   ${daysWithData} Tage mit Daten, ${totalRows} Earnings insgesamt, ${totalSaved} gespeichert`)
}

main().catch(err => { console.error(err); process.exit(1) })
