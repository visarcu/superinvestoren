// Gemeinsame Helfer für Earnings-Daten aus FMP (Ist-Zahlen, Termin-Historie,
// Kursreaktion). Genutzt von den Crons sync-earnings-results und
// sync-earnings-reactions sowie von scripts/backfillEarningsHistory.ts.

// ── Datum (UTC, Format YYYY-MM-DD) ──────────────────────────────────────────

const DAY_MS = 86_400_000

export function isIsoDate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(`${s}T00:00:00Z`))
}

function toMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function todayUtc(): string {
  return fromMs(Date.now())
}

export function addDays(iso: string, days: number): string {
  return fromMs(toMs(iso) + days * DAY_MS)
}

export function dayDiff(a: string, b: string): number {
  return Math.round(Math.abs(toMs(a) - toMs(b)) / DAY_MS)
}

// ── FMP ─────────────────────────────────────────────────────────────────────

export function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** FMP schreibt Aktienklassen mit Bindestrich (BRK-B), NASDAQ mit Punkt (BRK.B). */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/-/g, '.')
}

/** Umkehrung für FMP-Abrufe: BRK.B → BRK-B */
export function toFmpSymbol(ticker: string): string {
  return ticker.replace(/\./g, '-')
}

export interface FmpEarningsRow {
  symbol?: string
  date?: string
  epsActual?: number | null
  epsEstimated?: number | null
  revenueActual?: number | null
  revenueEstimated?: number | null
}

// FMP liefert pro Abruf höchstens 4000 Zeilen und schneidet dann die
// FRÜHEN Tage ab. Bei Erreichen der Grenze wird der Zeitraum halbiert.
const FMP_ROW_CAP = 4000

export async function fetchFmpEarningsRange(from: string, to: string, apiKey: string): Promise<FmpEarningsRow[]> {
  const url = `https://financialmodelingprep.com/stable/earnings-calendar?from=${from}&to=${to}&apikey=${apiKey}`
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`FMP ${from}..${to}: HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(`FMP ${from}..${to}: unerwartete Antwort`)

  if (data.length >= FMP_ROW_CAP && from !== to) {
    const mid = addDays(from, Math.floor(dayDiff(from, to) / 2))
    const [left, right] = await Promise.all([
      fetchFmpEarningsRange(from, mid, apiKey),
      fetchFmpEarningsRange(addDays(mid, 1), to, apiKey),
    ])
    return [...left, ...right]
  }
  return data as FmpEarningsRow[]
}

export interface FmpLegacyEarningsRow {
  symbol: string
  date: string
  time: 'bmo' | 'amc' | null
  epsActual: number | null
  epsEstimated: number | null
  revenueActual: number | null
  revenueEstimated: number | null
}

/**
 * FMP v3 /earning_calendar. Anders als /stable enthält er im aktuellen Tarif
 * auch internationale Börsen (z.B. ALV.DE, ULVR.L), dafür andere Feldnamen
 * (eps/revenue statt epsActual/revenueActual) und eine Uhrzeit.
 */
export async function fetchFmpLegacyEarningsRange(from: string, to: string, apiKey: string): Promise<FmpLegacyEarningsRow[]> {
  const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${apiKey}`
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`FMP v3 ${from}..${to}: HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(`FMP v3 ${from}..${to}: unerwartete Antwort`)
  const out: FmpLegacyEarningsRow[] = []
  for (const r of data as Array<Record<string, unknown>>) {
    const symbol = typeof r.symbol === 'string' ? r.symbol.toUpperCase() : null
    const date = typeof r.date === 'string' ? r.date.slice(0, 10) : null
    if (!symbol || !isIsoDate(date)) continue
    out.push({
      symbol,
      date,
      time: r.time === 'bmo' || r.time === 'amc' ? r.time : null,
      epsActual: num(r.eps),
      epsEstimated: num(r.epsEstimated),
      revenueActual: num(r.revenue),
      revenueEstimated: num(r.revenueEstimated),
    })
  }
  return out
}

// ── Beat / Miss ─────────────────────────────────────────────────────────────

export type EarningsOutcome = 'beat' | 'miss' | 'meet'
export type EarningsResult = EarningsOutcome | 'mixed'

// EPS gilt bis auf den Cent als getroffen, Umsatz bis auf 0,1 %.
const EPS_MEET_TOLERANCE = 0.005
const REVENUE_MEET_TOLERANCE = 0.001

function compareToEstimate(actual: number | null, estimate: number | null, tolerance: number, relative: boolean): EarningsOutcome | null {
  if (actual === null || estimate === null) return null
  const diff = actual - estimate
  const threshold = relative ? Math.abs(estimate) * tolerance : tolerance
  if (Math.abs(diff) < threshold) return 'meet'
  return diff > 0 ? 'beat' : 'miss'
}

function surprisePct(actual: number | null, estimate: number | null): number | null {
  if (actual === null || estimate === null || estimate === 0) return null
  return Math.round(((actual - estimate) / Math.abs(estimate)) * 1000) / 10
}

/** EPS und Umsatz zusammen: gleiche Richtung → die, gegenläufig → mixed, "meet" zählt neutral. */
function combineOutcomes(eps: EarningsOutcome | null, revenue: EarningsOutcome | null): EarningsResult | null {
  if (!eps) return revenue
  if (!revenue || eps === revenue) return eps
  if (eps === 'meet') return revenue
  if (revenue === 'meet') return eps
  return 'mixed'
}

/** Beat/Miss für EPS, Umsatz und zusammen, dazu die Abweichung in % */
export function earningsOutcome(row: {
  eps_actual: number | null
  eps_estimate: number | null
  revenue_actual: number | null
  revenue_estimate: number | null
}) {
  const epsResult = compareToEstimate(row.eps_actual, row.eps_estimate, EPS_MEET_TOLERANCE, false)
  const revenueResult = compareToEstimate(row.revenue_actual, row.revenue_estimate, REVENUE_MEET_TOLERANCE, true)
  return {
    result: combineOutcomes(epsResult, revenueResult),
    epsResult,
    revenueResult,
    epsSurprisePct: surprisePct(row.eps_actual, row.eps_estimate),
    revenueSurprisePct: surprisePct(row.revenue_actual, row.revenue_estimate),
  }
}

// ── Plausibilität von Ist/Prognose-Paaren ───────────────────────────────────
// FMP mischt bei manchen Auslandswerten die Währungen (PDD Q3/26: Umsatz-Ist
// 108 Mrd in CNY, Prognose 17 Mrd in USD) und hat bei Kleinwerten unsinnige
// Prognosen (z.B. EPS-Prognose −2.250.000). Ein Paar, das so weit
// auseinanderliegt, wird verworfen: besser keine Angabe als ein falsches
// "Beat +531 %". Beim Umsatz sind echte Abweichungen über 30 % praktisch nie,
// beim EPS dagegen schon.

const MAX_REVENUE_RATIO = 1.3
const MAX_EPS_RATIO = 5
const EPS_RATIO_MIN_ESTIMATE = 0.1

export function plausibleRevenue(actual: number | null, estimate: number | null): boolean {
  if (actual === null || estimate === null) return true
  if (estimate <= 0) return false
  const ratio = actual / estimate
  return ratio >= 1 / MAX_REVENUE_RATIO && ratio <= MAX_REVENUE_RATIO
}

export function plausibleEps(actual: number | null, estimate: number | null): boolean {
  if (actual === null || estimate === null) return true
  // Bei Prognosen nahe null sind große Abweichungen normal (0,02 → 0,10 $)
  if (Math.abs(estimate) < EPS_RATIO_MIN_ESTIMATE) return true
  const ratio = Math.abs(actual / estimate)
  return ratio >= 1 / MAX_EPS_RATIO && ratio <= MAX_EPS_RATIO
}
