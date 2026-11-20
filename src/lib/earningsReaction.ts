// Kursreaktion auf Quartalszahlen.
//
// Je Termin wird die Kursveränderung am Reaktionstag gespeichert:
//   vor Börse (bmo):  Schluss Vortag → Schluss am Termin
//   nach Börse (amc): Schluss am Termin → Schluss am nächsten Handelstag
//   ohne Uhrzeit:     der größere der beiden Schritte (der Reaktionstag ist bei
//                     Zahlen fast immer der mit der deutlich größeren Bewegung)
// Daraus ergibt sich je Termin die "typische Bewegung": Ø der absoluten
// Reaktionen der bis zu 8 vorherigen Termine (mind. 4), auch für anstehende.
//
// Kurse: FMP /stable/historical-price-eod/light, ein Abruf je Ticker (Bulk ist
// im FMP-Tarif gesperrt).

import type { SupabaseClient } from '@supabase/supabase-js'
import { isBetterEarningsRow } from './earningsCalendarRows'
import { addDays, dayDiff, toFmpSymbol, todayUtc } from './earningsData'

export const TYPICAL_MOVE_WINDOW = 8
export const TYPICAL_MOVE_MIN = 4
// Höchstens so viele Kalendertage zwischen Termin und Vergleichskurs
// (Wochenende + Feiertag); sonst fehlen Kurse und das Ergebnis wäre verzerrt.
const MAX_GAP_DAYS = 5
// FMP-Schlusskurse sind ab etwa 18 Uhr New Yorker Zeit vollständig
const SESSION_COMPLETE_HOUR_NY = 18

const PAGE_SIZE = 1000
const TICKER_CHUNK = 100
const UPSERT_BATCH = 500
const FETCH_CONCURRENCY = 4

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tabelle ist nicht im generierten Schema
type Supabase = SupabaseClient<any, 'public', any>

export interface Close {
  date: string
  close: number
}

/** Letzter Handelstag (New Yorker Datum), dessen Schlusskurs feststeht. */
export function lastCompleteSession(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const nyDate = `${get('year')}-${get('month')}-${get('day')}`
  return Number(get('hour')) >= SESSION_COMPLETE_HOUR_NY ? nyDate : addDays(nyDate, -1)
}

// ── Reaktion eines Termins ──────────────────────────────────────────────────

function lastBefore(closes: Close[], date: string): Close | undefined {
  for (let i = closes.length - 1; i >= 0; i--) if (closes[i].date < date) return closes[i]
  return undefined
}
function lastOnOrBefore(closes: Close[], date: string): Close | undefined {
  for (let i = closes.length - 1; i >= 0; i--) if (closes[i].date <= date) return closes[i]
  return undefined
}
function firstOnOrAfter(closes: Close[], date: string): Close | undefined {
  return closes.find(c => c.date >= date)
}
function firstAfter(closes: Close[], date: string): Close | undefined {
  return closes.find(c => c.date > date)
}

function step(base: Close | undefined, target: Close | undefined, eventDate: string): number | null {
  if (!base || !target || base.date >= target.date) return null
  if (dayDiff(base.date, eventDate) > MAX_GAP_DAYS || dayDiff(target.date, eventDate) > MAX_GAP_DAYS) return null
  if (base.close <= 0) return null
  return (target.close / base.close - 1) * 100
}

/**
 * Reaktion in % oder `null` (keine Kurse), bzw. 'pending', solange der
 * Reaktionstag noch nicht abgeschlossen ist.
 * `closes` aufsteigend nach Datum, nur abgeschlossene Handelstage.
 */
export function computeReaction(
  closes: Close[],
  eventDate: string,
  callTime: string | null,
  lastComplete: string
): number | null | 'pending' {
  const bmo = step(lastBefore(closes, eventDate), firstOnOrAfter(closes, eventDate), eventDate)
  const amcTarget = firstAfter(closes, eventDate)
  const amc = step(lastOnOrBefore(closes, eventDate), amcTarget, eventDate)

  // Fehlt der Kurs nach dem Termin noch, aber das Zeitfenster läuft noch: warten
  const waiting = addDays(eventDate, MAX_GAP_DAYS) > lastComplete
  if (callTime === 'bmo') {
    if (bmo === null && !firstOnOrAfter(closes, eventDate) && waiting) return 'pending'
    return round2(bmo)
  }
  if (!amcTarget && waiting) return 'pending'
  if (callTime === 'amc') return round2(amc)

  if (bmo === null) return round2(amc)
  if (amc === null) return round2(bmo)
  return round2(Math.abs(bmo) >= Math.abs(amc) ? bmo : amc)
}

function round2(v: number | null): number | null {
  return v === null ? null : Math.round(v * 100) / 100
}

// ── Typische Bewegung ───────────────────────────────────────────────────────

interface HistoryRow {
  id: string
  ticker: string
  date: string
  fiscal_quarter: string | null
  fiscal_year: number | null
  source: string | null
  call_time: string | null
  eps_actual: number | null
  revenue_actual: number | null
  updated_at: string | null
  reaction_pct: number | null
  typical_move_pct: number | null
  typical_move_count: number | null
}

/**
 * Typische Bewegung je Zeile eines Tickers. Zählt nur den echten Termin je
 * Quartal (Duplikate wie SEC-8-K zu Produktionszahlen fallen raus).
 */
export function typicalMoves(rows: HistoryRow[]): Map<string, { pct: number | null; count: number | null }> {
  const best = new Map<string, HistoryRow>()
  for (const r of rows) {
    const key = r.fiscal_quarter && r.fiscal_year ? `${r.fiscal_quarter}|${r.fiscal_year}` : r.date
    const current = best.get(key)
    if (!current || isBetterEarningsRow(r, current)) best.set(key, r)
  }
  const history = Array.from(best.values())
    .filter(r => r.reaction_pct !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const out = new Map<string, { pct: number | null; count: number | null }>()
  for (const r of rows) {
    const previous = history.filter(h => h.date < r.date).slice(-TYPICAL_MOVE_WINDOW)
    if (previous.length < TYPICAL_MOVE_MIN) {
      out.set(r.id, { pct: null, count: null })
      continue
    }
    const avg = previous.reduce((s, h) => s + Math.abs(h.reaction_pct!), 0) / previous.length
    out.set(r.id, { pct: Math.round(avg * 100) / 100, count: previous.length })
  }
  return out
}

// ── FMP-Kurse ───────────────────────────────────────────────────────────────

async function fetchCloses(ticker: string, from: string, to: string, apiKey: string): Promise<Close[]> {
  const url =
    `https://financialmodelingprep.com/stable/historical-price-eod/light` +
    `?symbol=${encodeURIComponent(toFmpSymbol(ticker))}&from=${from}&to=${to}&apikey=${apiKey}`
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
    if (res.status === 429 && attempt < 4) {
      await new Promise(r => setTimeout(r, 2000 * 2 ** attempt))
      continue
    }
    if (!res.ok) throw new Error(`Kurse ${ticker}: HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return (data as Array<{ date?: string; price?: number }>)
      .filter(d => typeof d.date === 'string' && typeof d.price === 'number' && d.price > 0)
      .map(d => ({ date: d.date!.slice(0, 10), close: d.price! }))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }
}

// ── Sync ────────────────────────────────────────────────────────────────────

interface CandidateRow {
  id: string
  ticker: string
  date: string
  call_time: string | null
}

async function selectAll<T>(build: (offset: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await build(offset)
    if (error) throw new Error(error.message)
    const page = (data as T[] | null) ?? []
    out.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return out
}

async function upsertById(supabase: Supabase, rows: Array<Record<string, unknown>>) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const { error } = await supabase.from('SecEarningsCalendar').upsert(rows.slice(i, i + UPSERT_BATCH), { onConflict: 'id' })
    if (error) throw new Error(`DB schreiben: ${error.message}`)
  }
}

export interface ReactionSyncResult {
  lastComplete: string
  candidates: number
  tickersFetched: number
  tickersSkippedForTime: number
  fetchErrors: number
  reactions: number
  noData: number
  pending: number
  typicalTickers: number
  typicalUpdated: number
}

/**
 * Berechnet fehlende Reaktionen für Termine in [from, to] und aktualisiert die
 * typische Bewegung aller Termine der betroffenen Ticker, dazu die der
 * anstehenden Termine ohne Wert. `deadline` (ms) begrenzt die Laufzeit: was
 * nicht mehr drankommt, bleibt für den nächsten Lauf offen.
 */
export async function syncEarningsReactions(
  supabase: Supabase,
  apiKey: string,
  opts: { from: string; to: string; deadline?: number }
): Promise<ReactionSyncResult> {
  const lastComplete = lastCompleteSession()
  const to = opts.to < lastComplete ? opts.to : lastComplete

  const candidates = await selectAll<CandidateRow>(offset =>
    supabase
      .from('SecEarningsCalendar')
      .select('id, ticker, date, call_time')
      .eq('confirmed', true)
      .is('reaction_checked_at', null)
      .gte('date', opts.from)
      .lte('date', to)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
  )

  const byTicker = new Map<string, CandidateRow[]>()
  for (const c of candidates) {
    const list = byTicker.get(c.ticker) ?? []
    list.push(c)
    byTicker.set(c.ticker, list)
  }

  // ── 1) Reaktionen ──
  const result: ReactionSyncResult = {
    lastComplete,
    candidates: candidates.length,
    tickersFetched: 0,
    tickersSkippedForTime: 0,
    fetchErrors: 0,
    reactions: 0,
    noData: 0,
    pending: 0,
    typicalTickers: 0,
    typicalUpdated: 0,
  }
  const touchedTickers = new Set<string>()
  const tickers = Array.from(byTicker.keys())
  let next = 0
  const pendingWrites: Array<Record<string, unknown>> = []

  async function worker() {
    while (next < tickers.length) {
      if (opts.deadline && Date.now() > opts.deadline) {
        result.tickersSkippedForTime = tickers.length - next
        return
      }
      const ticker = tickers[next++]
      const rows = byTicker.get(ticker)!
      const minDate = rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0].date)
      let closes: Close[]
      try {
        closes = await fetchCloses(ticker, addDays(minDate, -10), lastComplete, apiKey)
      } catch {
        result.fetchErrors++
        continue
      }
      result.tickersFetched++
      closes = closes.filter(c => c.date <= lastComplete)
      const checkedAt = new Date().toISOString()
      for (const r of rows) {
        const reaction = computeReaction(closes, r.date, r.call_time, lastComplete)
        if (reaction === 'pending') {
          result.pending++
          continue
        }
        if (reaction === null) result.noData++
        else result.reactions++
        pendingWrites.push({ id: r.id, ticker: r.ticker, date: r.date, reaction_pct: reaction, reaction_checked_at: checkedAt })
        touchedTickers.add(ticker)
      }
      if (pendingWrites.length >= UPSERT_BATCH) await upsertById(supabase, pendingWrites.splice(0, pendingWrites.length))
    }
  }
  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker))
  await upsertById(supabase, pendingWrites)

  // ── 2) Typische Bewegung ──
  // Anstehende Termine ohne Wert dazunehmen (neu importiert oder bisher zu wenig Historie)
  const today = todayUtc()
  const upcoming = await selectAll<{ ticker: string }>(offset =>
    supabase
      .from('SecEarningsCalendar')
      .select('ticker')
      .eq('confirmed', true)
      .is('typical_move_pct', null)
      .gte('date', today)
      .lte('date', addDays(today, 90))
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
  )
  for (const u of upcoming) touchedTickers.add(u.ticker)

  const typicalTickers = Array.from(touchedTickers)
  result.typicalTickers = typicalTickers.length
  for (let i = 0; i < typicalTickers.length; i += TICKER_CHUNK) {
    const chunk = typicalTickers.slice(i, i + TICKER_CHUNK)
    const rows = await selectAll<HistoryRow>(offset =>
      supabase
        .from('SecEarningsCalendar')
        .select(
          'id, ticker, date, fiscal_quarter, fiscal_year, source, call_time, eps_actual, revenue_actual, ' +
          'updated_at, reaction_pct, typical_move_pct, typical_move_count'
        )
        .eq('confirmed', true)
        .in('ticker', chunk)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
    )
    const perTicker = new Map<string, HistoryRow[]>()
    for (const r of rows) {
      const list = perTicker.get(r.ticker) ?? []
      list.push(r)
      perTicker.set(r.ticker, list)
    }
    const updates: Array<Record<string, unknown>> = []
    for (const list of perTicker.values()) {
      const moves = typicalMoves(list)
      for (const r of list) {
        const m = moves.get(r.id)!
        if (m.pct === r.typical_move_pct && m.count === r.typical_move_count) continue
        updates.push({ id: r.id, ticker: r.ticker, date: r.date, typical_move_pct: m.pct, typical_move_count: m.count })
      }
    }
    await upsertById(supabase, updates)
    result.typicalUpdated += updates.length
  }

  return result
}
