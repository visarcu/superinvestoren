// Earnings-Termine für Benachrichtigungen, Feed und die alten
// /api/earnings-calendar-Routen.
//
// Quelle ist SecEarningsCalendar (NASDAQ + SEC, täglich von
// /api/cron/ingest-earnings befüllt, Ist-Zahlen von sync-earnings-results).
// Bis 2026-11-20 las diese Funktion die Prisma-Tabelle "EarningsCalendar",
// die seit April 2026 nicht mehr befüllt wird; die Earnings-Mails sind
// seitdem nicht mehr rausgegangen.
//
// Unsere Tabelle kennt nur US-Listings. Termine für alle anderen Symbole
// (z.B. ALV.DE, ULVR.L) ergänzt FMP, damit europäische Positionen ihre
// Erinnerungen weiter bekommen.

import { isBetterEarningsRow } from './earningsCalendarRows'
import { fetchFmpLegacyEarningsRange, normalizeSymbol } from './earningsData'
import { supabaseAdmin } from './supabaseAdmin'

export interface EarningsRecord {
  /** FMP-Schreibweise (BRK-B), wie in Watchlists und Depots gespeichert */
  symbol: string
  companyName: string | null
  date: string // ISO YYYY-MM-DD
  time: string // 'bmo' | 'amc' | '' (unbekannt)
  fiscalQuarter: number | null
  fiscalYear: number | null
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
}

interface CalendarRow {
  ticker: string
  company_name: string | null
  date: string
  fiscal_quarter: string | null
  fiscal_year: number | null
  source: string | null
  call_time: string | null
  eps_actual: number | null
  eps_estimate: number | null
  revenue_actual: number | null
  revenue_estimate: number | null
  updated_at: string | null
}

const PAGE_SIZE = 1000
const TICKER_CHUNK = 100
const FMP_CACHE_MS = 60 * 60 * 1000

/** Kalender (NASDAQ) schreibt Aktienklassen mit Punkt, Watchlists/Depots (FMP) mit Bindestrich */
function toFmpStyle(ticker: string): string {
  return /^[A-Z0-9]+\.[A-Z]$/.test(ticker) ? ticker.replace('.', '-') : ticker
}

// FMP-Ergänzung je Zeitraum pro Server-Instanz zwischenspeichern (Feed wird oft geladen)
const fmpCache = new Map<string, { at: number; rows: EarningsRecord[] }>()

async function fmpRecords(from: string, to: string): Promise<EarningsRecord[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return []
  const key = `${from}|${to}`
  const cached = fmpCache.get(key)
  if (cached && Date.now() - cached.at < FMP_CACHE_MS) return cached.rows

  // v3 statt /stable: nur v3 enthält im Tarif auch .DE/.L-Werte
  const raw = await fetchFmpLegacyEarningsRange(from, to, apiKey)
  const rows: EarningsRecord[] = raw.map(r => ({
    symbol: r.symbol,
    companyName: null,
    date: r.date,
    time: r.time ?? '',
    fiscalQuarter: null,
    fiscalYear: null,
    epsEstimate: r.epsEstimated,
    epsActual: r.epsActual,
    revenueEstimate: r.revenueEstimated,
    revenueActual: r.revenueActual,
  }))
  fmpCache.set(key, { at: Date.now(), rows })
  return rows
}

/**
 * Earnings-Termine im Zeitraum.
 *
 * @param from ISO YYYY-MM-DD (inklusive)
 * @param to   ISO YYYY-MM-DD (inklusive)
 * @param tickers optional — falls gesetzt, nur diese Symbole (FMP-Schreibweise)
 */
export async function getEarningsFromDb(
  from: string,
  to: string,
  tickers?: string[]
): Promise<EarningsRecord[]> {
  const supabase = supabaseAdmin
  const wanted = tickers && tickers.length > 0 ? tickers.map(t => t.trim().toUpperCase()).filter(Boolean) : null
  const calendarTickers = wanted ? Array.from(new Set(wanted.map(normalizeSymbol))) : null

  const rows: CalendarRow[] = []
  const chunks = calendarTickers
    ? Array.from({ length: Math.ceil(calendarTickers.length / TICKER_CHUNK) }, (_, i) =>
        calendarTickers.slice(i * TICKER_CHUNK, (i + 1) * TICKER_CHUNK)
      )
    : [null]
  for (const chunk of chunks) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      let q = supabase
        .from('SecEarningsCalendar')
        .select(
          'ticker, company_name, date, fiscal_quarter, fiscal_year, source, call_time, ' +
          'eps_actual, eps_estimate, revenue_actual, revenue_estimate, updated_at'
        )
        .eq('confirmed', true)
        .gte('date', from)
        .lte('date', to)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
      if (chunk) q = q.in('ticker', chunk)
      const { data, error } = await q
      if (error) throw new Error(`Earnings lesen: ${error.message}`)
      const page = ((data as unknown) as CalendarRow[] | null) ?? []
      rows.push(...page)
      if (page.length < PAGE_SIZE) break
    }
  }

  // Ein Termin je Ticker und Quartal (verschobene Termine, SEC-8-K-Duplikate)
  const best = new Map<string, CalendarRow>()
  for (const r of rows) {
    const key = r.fiscal_quarter && r.fiscal_year ? `${r.ticker}|${r.fiscal_quarter}|${r.fiscal_year}` : `${r.ticker}|${r.date}`
    const current = best.get(key)
    if (!current || isBetterEarningsRow(r, current)) best.set(key, r)
  }

  const records: EarningsRecord[] = Array.from(best.values()).map(r => ({
    symbol: toFmpStyle(r.ticker),
    companyName: r.company_name,
    date: r.date,
    time: r.call_time === 'bmo' || r.call_time === 'amc' ? r.call_time : '',
    fiscalQuarter: r.fiscal_quarter ? parseInt(r.fiscal_quarter.replace('Q', ''), 10) || null : null,
    fiscalYear: r.fiscal_year,
    epsEstimate: r.eps_estimate,
    epsActual: r.eps_actual,
    revenueEstimate: r.revenue_estimate,
    revenueActual: r.revenue_actual,
  }))

  // FMP-Ergänzung für Symbole, die unsere Tabelle im Zeitraum nicht hat
  const covered = new Set(records.map(r => r.symbol))
  const missingWanted = wanted ? wanted.filter(t => !covered.has(t)) : null
  if (!missingWanted || missingWanted.length > 0) {
    try {
      const allowed = missingWanted ? new Set(missingWanted) : null
      const seen = new Set<string>()
      for (const f of await fmpRecords(from, to)) {
        if (covered.has(f.symbol) || (allowed && !allowed.has(f.symbol))) continue
        const key = `${f.symbol}|${f.date}`
        if (seen.has(key)) continue
        seen.add(key)
        records.push(f)
      }
    } catch (err) {
      console.warn('[earningsCalendarDb] FMP-Ergänzung fehlgeschlagen:', err instanceof Error ? err.message : err)
    }
  }

  return records.sort((a, b) => (a.date === b.date ? a.symbol.localeCompare(b.symbol) : a.date < b.date ? -1 : 1))
}

/**
 * Konvertiert Records ins Format, das die FMP /v3/earning_calendar API liefert.
 * Damit können bestehende Routes ohne große Umbauten von FMP auf DB switchen.
 */
export function toFmpShape(records: EarningsRecord[]): Array<{
  symbol: string
  date: string
  time: string
  epsEstimated: number | null
  epsActual: number | null
  revenueEstimated: number | null
  revenueActual: number | null
  name?: string | null
}> {
  return records.map(r => ({
    symbol: r.symbol,
    date: r.date,
    time: r.time,
    epsEstimated: r.epsEstimate,
    epsActual: r.epsActual,
    revenueEstimated: r.revenueEstimate,
    revenueActual: r.revenueActual,
    name: r.companyName,
  }))
}
