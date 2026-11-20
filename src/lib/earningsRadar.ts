// Earnings-Radar für E-Mails (serverseitig).
//
// Lädt die Earnings-Termine zu einer Liste von Depot- oder Watchlist-Symbolen
// aus SecEarningsCalendar (samt Ergebnis, Kursreaktion und üblicher Bewegung)
// und baut daraus den Radar-Block der Mails:
//   • nächste Woche: Anteil am Depot und übliche Schwankung in Euro
//   • diese Woche gemeldet: Kursreaktion und ihre Wirkung aufs Depot
// Die Workspace-Karte (components/portfolio/EarningsRadar.tsx) zeigt dasselbe
// im Browser, auf Basis der Live-Bewertung.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isBetterEarningsRow } from './earningsCalendarRows'
import {
  earningsOutcome,
  fetchFmpLegacyEarningsRange,
  normalizeSymbol,
  type EarningsResult,
} from './earningsData'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tabelle ist nicht im generierten Schema
type Supabase = SupabaseClient<any, 'public', any>

export interface RadarEvent {
  /** Symbol wie im Depot bzw. in der Watchlist */
  symbol: string
  date: string
  time: 'bmo' | 'amc' | null
  result: EarningsResult | null
  reactionPct: number | null
  typicalMovePct: number | null
}

interface CalendarRow {
  ticker: string
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
  reaction_pct: number | null
  typical_move_pct: number | null
}

const TICKER_CHUNK = 100
const PAGE_SIZE = 1000

/**
 * Termine je Symbol im Zeitraum [from, to]. Symbole, die unsere Tabelle nicht
 * kennt (z.B. SAP.DE), werden aus FMP ergänzt (nur Datum, ohne Uhrzeit).
 */
export async function loadEarningsForSymbols(
  supabase: Supabase,
  symbols: string[],
  from: string,
  to: string,
  fmpApiKey?: string
): Promise<RadarEvent[]> {
  // Kalender schreibt Aktienklassen mit Punkt (BRK.B), Depots oft mit Bindestrich (BRK-B)
  const bySymbol = new Map<string, string>() // Kalender-Ticker → Original-Symbol
  for (const s of symbols) {
    const original = s.trim().toUpperCase()
    if (original && original !== 'CASH') bySymbol.set(normalizeSymbol(original), original)
  }
  const tickers = Array.from(bySymbol.keys())
  if (tickers.length === 0) return []

  const rows: CalendarRow[] = []
  for (let i = 0; i < tickers.length; i += TICKER_CHUNK) {
    const chunk = tickers.slice(i, i + TICKER_CHUNK)
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('SecEarningsCalendar')
        .select(
          'ticker, date, fiscal_quarter, fiscal_year, source, call_time, eps_actual, eps_estimate, ' +
          'revenue_actual, revenue_estimate, updated_at, reaction_pct, typical_move_pct'
        )
        .eq('confirmed', true)
        .in('ticker', chunk)
        .gte('date', from)
        .lte('date', to)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)
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

  const events: RadarEvent[] = Array.from(best.values()).map(r => ({
    symbol: bySymbol.get(r.ticker) ?? r.ticker,
    date: r.date,
    time: r.call_time === 'bmo' || r.call_time === 'amc' ? r.call_time : null,
    result: earningsOutcome(r).result,
    reactionPct: r.reaction_pct,
    typicalMovePct: r.typical_move_pct,
  }))

  // FMP-Ergänzung für unbekannte Symbole (v.a. europäische Werte)
  const found = new Set(best.size ? Array.from(best.values()).map(r => r.ticker) : [])
  const missing = new Set(tickers.filter(t => !found.has(t)).map(t => bySymbol.get(t)!))
  if (fmpApiKey && missing.size > 0) {
    try {
      // v3 statt /stable: nur v3 enthält im Tarif auch .DE/.L-Werte
      const fmpRows = await fetchFmpLegacyEarningsRange(from, to, fmpApiKey)
      const seen = new Set<string>()
      for (const f of fmpRows) {
        if (!missing.has(f.symbol) || seen.has(`${f.symbol}|${f.date}`)) continue
        seen.add(`${f.symbol}|${f.date}`)
        events.push({ symbol: f.symbol, date: f.date, time: f.time, result: null, reactionPct: null, typicalMovePct: null })
      }
    } catch (err) {
      console.warn('[earningsRadar] FMP-Ergänzung fehlgeschlagen:', err instanceof Error ? err.message : err)
    }
  }

  return events.sort((a, b) => (a.date === b.date ? a.symbol.localeCompare(b.symbol) : a.date < b.date ? -1 : 1))
}

// ── Radar-Rechnung ──────────────────────────────────────────────────────────

export interface RadarRow extends RadarEvent {
  value: number
  weightPct: number
  /** übliche Schwankung in Euro (Betrag) */
  typicalEur: number | null
  /** geschätzte Wirkung der Kursreaktion in Euro */
  impactEur: number | null
}

export interface Radar {
  upcoming: RadarRow[]
  reported: RadarRow[]
  upcomingWeightPct: number
  upcomingSwingEur: number | null
  reportedImpactEur: number | null
}

/**
 * Verknüpft Termine mit Positionswerten (EUR). `upcoming` sind Termine ab
 * `upcomingFrom`, `reported` die davor. Der Positionswert ist schon nach der
 * Reaktion bewertet, die Wirkung deshalb ≈ Wert × r / (100 + r).
 */
export function buildRadar(
  events: RadarEvent[],
  values: Map<string, number>,
  totalValue: number,
  upcomingFrom: string
): Radar {
  const rows: RadarRow[] = []
  for (const e of events) {
    const value = values.get(e.symbol)
    if (!value || value <= 0) continue
    rows.push({
      ...e,
      value,
      weightPct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      typicalEur: e.typicalMovePct !== null ? (value * e.typicalMovePct) / 100 : null,
      impactEur: e.reactionPct !== null && e.reactionPct > -100 ? (value * e.reactionPct) / (100 + e.reactionPct) : null,
    })
  }
  const upcoming = rows.filter(r => r.date >= upcomingFrom)
  const reported = rows.filter(r => r.date < upcomingFrom)
  const swing = upcoming.filter(r => r.typicalEur !== null)
  const impact = reported.filter(r => r.impactEur !== null)
  return {
    upcoming,
    reported,
    upcomingWeightPct: upcoming.reduce((s, r) => s + r.weightPct, 0),
    upcomingSwingEur: swing.length > 0 ? swing.reduce((s, r) => s + r.typicalEur!, 0) : null,
    reportedImpactEur: impact.length > 0 ? impact.reduce((s, r) => s + r.impactEur!, 0) : null,
  }
}

// ── E-Mail-Block ────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.']
const WEEKDAYS_SHORT = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.']
const RESULT_LABEL: Record<EarningsResult, string> = { beat: 'Beat', miss: 'Miss', mixed: 'Gemischt', meet: 'Inline' }
const RESULT_COLOR: Record<EarningsResult, string> = { beat: '#059669', miss: '#dc2626', mixed: '#d97706', meet: '#6b7280' }

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function euro(v: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(v))
}

function signedEuro(v: number): string {
  const r = Math.round(v)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${euro(Math.abs(r))}`
}

function pct(v: number, digits = 1): string {
  return `${Math.abs(v).toFixed(digits).replace('.', ',')} %`
}

function signedPct(v: number): string {
  const r = Math.round(v * 10) / 10
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${pct(r)}`
}

function dayLabel(date: string, time: 'bmo' | 'amc' | null): string {
  const d = new Date(`${date}T12:00:00Z`)
  const base = `${WEEKDAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_SHORT[d.getUTCMonth()]}`
  return time === 'bmo' ? `${base} · vor Börse` : time === 'amc' ? `${base} · nach Börse` : base
}

function row(left: string, sub: string, right: string, rightSub: string): string {
  return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="color: #111827; font-size: 14px; font-weight: 600;">${left}</div>
          <div style="color: #6b7280; font-size: 12px;">${sub}</div>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; white-space: nowrap;">
          <div style="font-size: 14px; font-weight: 600;">${right}</div>
          <div style="color: #6b7280; font-size: 12px;">${rightSub}</div>
        </td>
      </tr>`
}

/**
 * HTML-Block für den Depot-Bericht. Leer, wenn weder anstehende noch
 * gemeldete Termine deiner Positionen dabei sind.
 */
export function radarEmailSection(
  radar: Radar,
  labels: { upcoming: string; reported: string },
  maxRows = 8
): string {
  if (radar.upcoming.length === 0 && radar.reported.length === 0) return ''

  const upcomingRows = radar.upcoming
    .slice()
    .sort((a, b) => (b.typicalEur ?? 0) - (a.typicalEur ?? 0) || b.value - a.value)
    .slice(0, maxRows)
    .sort((a, b) => (a.date === b.date ? b.value - a.value : a.date < b.date ? -1 : 1))
    .map(r =>
      row(
        escapeHtml(r.symbol),
        dayLabel(r.date, r.time),
        r.typicalEur !== null ? `<span style="color: #111827;">±${euro(r.typicalEur)}</span>` : `<span style="color: #111827;">${pct(r.weightPct)}</span>`,
        r.typicalEur !== null && r.typicalMovePct !== null
          ? `${pct(r.weightPct)} des Depots · üblich ±${pct(r.typicalMovePct)}`
          : 'des Depots'
      )
    )
    .join('')

  const reportedRows = radar.reported
    .slice()
    .sort((a, b) => Math.abs(b.impactEur ?? 0) - Math.abs(a.impactEur ?? 0))
    .slice(0, maxRows)
    .map(r => {
      const color = r.reactionPct === null ? '#111827' : r.reactionPct > 0 ? '#059669' : r.reactionPct < 0 ? '#dc2626' : '#111827'
      const badge = r.result
        ? ` <span style="color: ${RESULT_COLOR[r.result]}; font-size: 11px; font-weight: 600;">${RESULT_LABEL[r.result]}</span>`
        : ''
      return row(
        `${escapeHtml(r.symbol)}${badge}`,
        dayLabel(r.date, r.time),
        r.reactionPct !== null ? `<span style="color: ${color};">${signedPct(r.reactionPct)}</span>` : '<span style="color: #6b7280;">offen</span>',
        r.impactEur !== null ? `≈ ${signedEuro(r.impactEur)}` : ''
      )
    })
    .join('')

  const summaryParts: string[] = []
  if (radar.upcoming.length > 0) {
    summaryParts.push(
      `${labels.upcoming} melden Positionen mit <strong>${pct(radar.upcomingWeightPct)}</strong> deines Depots` +
        (radar.upcomingSwingEur !== null
          ? `. Bewegen sie sich so stark wie üblich, sind das zusammen etwa <strong>±${euro(radar.upcomingSwingEur)}</strong>.`
          : '.')
    )
  }
  if (radar.reportedImpactEur !== null) {
    summaryParts.push(`${labels.reported} haben die Zahlen dein Depot um etwa <strong>${signedEuro(radar.reportedImpactEur)}</strong> bewegt.`)
  }

  return `
    <div style="margin-top: 28px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <h3 style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Earnings-Radar</h3>
      </div>
      <div style="padding: 12px 16px 4px 16px;">
        ${summaryParts.map(p => `<p style="color: #374151; font-size: 13px; margin: 0 0 8px 0; line-height: 1.5;">${p}</p>`).join('')}
        ${upcomingRows ? `<p style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 0 0;">${labels.upcoming}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">${upcomingRows}</table>` : ''}
        ${reportedRows ? `<p style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin: 16px 0 0 0;">${labels.reported} gemeldet</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">${reportedRows}</table>` : ''}
        <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 8px 0; line-height: 1.4;">Übliche Bewegung: Durchschnitt der Kursreaktionen am Tag nach den Zahlen in den letzten bis zu 8 Quartalen.</p>
      </div>
    </div>
  `
}
