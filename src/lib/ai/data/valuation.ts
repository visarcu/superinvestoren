// src/lib/ai/data/valuation.ts
// Server-only: Bewertungskennzahlen im Zeitverlauf, eine feste Definition für
// alle Antworten der KI.
//
// Tageskurs geteilt durch die Werte je Anteil der letzten zwölf gemeldeten
// Monate. Ein Quartal zählt erst ab dem Tag, an dem der Bericht veröffentlicht
// wurde, sonst kennt der Chart die Zukunft. FMP führt die Aktienzahl bereinigt
// um Splits und in gehandelten Anteilen (TSM: 5,19 Mrd. ADRs statt 25,9 Mrd.
// Aktien); einzelne unbereinigte Quartale werden über die Splitliste korrigiert.
// Weicht die Berichts- von der Handelswährung ab (TSM: TWD und USD), wird mit
// dem Wechselkurs des jeweiligen Tages umgerechnet.

import { getDailyHistory } from '@/lib/marketData/history'
import { fmpList, fmp, finite } from './fmp'

export const VALUATION_METRICS = {
  kgv: { label: 'KGV', formel: 'Kurs geteilt durch den verwässerten Gewinn je Anteil der letzten zwölf gemeldeten Monate' },
  kuv: { label: 'KUV', formel: 'Kurs geteilt durch den Umsatz je Anteil der letzten zwölf gemeldeten Monate' },
  kbv: { label: 'KBV', formel: 'Kurs geteilt durch das zuletzt gemeldete Eigenkapital je Anteil' },
  kcv: { label: 'KCV', formel: 'Kurs geteilt durch den operativen Cashflow je Anteil der letzten zwölf gemeldeten Monate' },
  kfcv: { label: 'Kurs/Free Cashflow', formel: 'Kurs geteilt durch den freien Cashflow je Anteil der letzten zwölf gemeldeten Monate' },
  ev_ebitda: { label: 'EV/EBITDA', formel: 'Unternehmenswert (Börsenwert plus Nettofinanzschulden) geteilt durch operatives Ergebnis plus Abschreibungen der letzten zwölf gemeldeten Monate' },
  ev_ebit: { label: 'EV/EBIT', formel: 'Unternehmenswert (Börsenwert plus Nettofinanzschulden) geteilt durch das operative Ergebnis der letzten zwölf gemeldeten Monate' },
  ev_umsatz: { label: 'EV/Umsatz', formel: 'Unternehmenswert (Börsenwert plus Nettofinanzschulden) geteilt durch den Umsatz der letzten zwölf gemeldeten Monate' },
} as const

export type ValuationMetric = keyof typeof VALUATION_METRICS

/**
 * Operatives Ergebnis plus Abschreibungen. Das EBITDA des Anbieters enthält auch
 * Bewertungsgewinne auf Beteiligungen (Alphabet 2026: 319 statt 185 Mrd. $).
 */
export function operatingEbitda(row: any): number | null {
  const operating = finite(row?.operatingIncome)
  const depreciation = finite(row?.depreciationAndAmortization)
  return operating != null && operating !== 0 && depreciation != null && depreciation > 0 ? operating + depreciation : finite(row?.ebitda)
}

interface Period {
  end: string
  /** ab wann die Zahlen bekannt waren */
  known: string
  knownExact: boolean
  shares: number
  netIncome: number | null
  revenue: number | null
  ebitda: number | null
  operatingIncome: number | null
  ocf: number | null
  fcf: number | null
  equity: number | null
  netDebt: number | null
}

export interface ValuationSeries {
  symbol: string
  metric: ValuationMetric
  /** Tageswerte, nur Tage mit positiver Bezugsgröße */
  points: Array<[string, number]>
  /** Tage mit negativem Ergebnis, für die es keinen sinnvollen Wert gibt */
  excludedDays: number
  tradingCurrency: string | null
  reportedCurrency: string | null
  converted: boolean
  /** Veröffentlichungstage geschätzt (Quelle liefert keine) */
  estimatedDates: boolean
  latestPeriodEnd: string | null
}

const DAY = 86_400_000

function days(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY)
}

function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10)
}

/** Aktienzahlen angleichen, wo FMP einzelne Quartale nicht um Splits bereinigt hat (z. B. WMT 2016). */
function fixShareGlitches(periods: Period[], splitRatios: number[]): void {
  let factor = 1
  for (let i = periods.length - 2; i >= 0; i--) {
    const newer = periods[i + 1].shares
    const raw = periods[i].shares * factor
    const ratio = newer / raw
    const hit = splitRatios.find(s => Math.abs(ratio / s - 1) < 0.1 || Math.abs(ratio * s - 1) < 0.1)
    if (hit && Math.abs(ratio - 1) > 0.3) {
      factor *= Math.abs(ratio / hit - 1) < 0.1 ? hit : 1 / hit
    }
    periods[i].shares = periods[i].shares * factor
  }
}

async function loadPeriods(symbol: string): Promise<{ periods: Period[]; reportedCurrency: string | null; estimated: boolean }> {
  const opts = { revalidate: 6 * 3600, timeout: 15_000 }
  const [income, cash, balance, splits] = await Promise.all([
    fmpList(`/api/v3/income-statement/${symbol}`, { period: 'quarter', limit: 80 }, opts),
    fmpList(`/api/v3/cash-flow-statement/${symbol}`, { period: 'quarter', limit: 80 }, opts),
    fmpList(`/api/v3/balance-sheet-statement/${symbol}`, { period: 'quarter', limit: 80 }, opts),
    fmp<{ historical?: Array<{ numerator: number; denominator: number }> }>(
      `/api/v3/historical-price-full/stock_split/${symbol}`, {}, opts
    ),
  ])
  const cashBy = new Map(cash.map(r => [r.date, r]))
  const balanceBy = new Map(balance.map(r => [r.date, r]))

  let estimated = false
  const periods: Period[] = []
  for (const row of [...income].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
    const shares = finite(row.weightedAverageShsOutDil) || finite(row.weightedAverageShsOut)
    if (!row.date || !shares || shares <= 0) continue
    const c = cashBy.get(row.date)
    const b = balanceBy.get(row.date)
    const filing = typeof row.fillingDate === 'string' ? row.fillingDate.slice(0, 10) : ''
    const exact = filing > row.date
    if (!exact) estimated = true
    periods.push({
      end: row.date,
      known: exact ? filing : addDays(row.date, row.period === 'Q4' || row.period === 'FY' ? 75 : 50),
      knownExact: exact,
      shares,
      netIncome: finite(row.netIncome),
      revenue: finite(row.revenue),
      ebitda: operatingEbitda(row),
      operatingIncome: finite(row.operatingIncome),
      ocf: finite(c?.operatingCashFlow ?? c?.netCashProvidedByOperatingActivities),
      fcf: finite(c?.freeCashFlow),
      equity: finite(b?.totalStockholdersEquity ?? b?.totalEquity),
      netDebt: finite(b?.netDebt),
    })
  }

  const ratios = (splits?.historical ?? [])
    .map(s => s.numerator / s.denominator)
    .filter(r => Number.isFinite(r) && (r >= 1.4 || r <= 0.7))
  if (ratios.length > 0) fixShareGlitches(periods, ratios)

  return { periods, reportedCurrency: income[0]?.reportedCurrency ?? null, estimated }
}

/** Summe der Perioden, die zusammen zwölf Monate ergeben (Quartale oder Halbjahre). */
function trailing(periods: Period[], index: number, pick: (p: Period) => number | null): number | null {
  let sum = 0
  for (let i = index; i >= 0; i--) {
    const value = pick(periods[i])
    if (value == null) return null
    sum += value
    const start = i > 0 ? periods[i - 1].end : null
    if (start == null) return null
    const covered = days(start, periods[index].end)
    if (covered >= 350) return covered <= 400 ? sum : null
  }
  return null
}

/** Faktor Berichts- → Handelswährung je Tag; null = kein Wechselkurs */
async function fxSeries(from: string, to: string, start: string, end: string): Promise<((date: string) => number | null) | null> {
  if (from === to) return () => 1
  let bars = await getDailyHistory(`${from}${to}`, start, end)
  let invert = false
  if (bars.length === 0) {
    bars = await getDailyHistory(`${to}${from}`, start, end)
    invert = true
  }
  if (bars.length === 0) return null
  const dates = bars.map(b => b.date)
  return date => {
    let lo = 0
    let hi = dates.length - 1
    if (date < dates[0]) return null
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (dates[mid] <= date) lo = mid
      else hi = mid - 1
    }
    const close = bars[lo].close
    return close > 0 ? (invert ? 1 / close : close) : null
  }
}

export async function getValuationSeries(
  symbol: string,
  metric: ValuationMetric,
  from: string,
  to: string
): Promise<ValuationSeries | null> {
  const [profile, { periods, reportedCurrency, estimated }, bars] = await Promise.all([
    fmpList(`/api/v3/profile/${symbol}`, {}, { revalidate: 24 * 3600 }),
    loadPeriods(symbol),
    getDailyHistory(symbol, from, to),
  ])
  if (periods.length < 2 || bars.length === 0) return null

  const rawCurrency: string | null = profile[0]?.currency ?? null
  // Londoner Werte notieren in Pence, berichtet wird in Pfund
  const pence = rawCurrency === 'GBp' || rawCurrency === 'GBX' || symbol.endsWith('.L')
  const tradingCurrency = pence ? 'GBP' : rawCurrency
  const converted = !!(reportedCurrency && tradingCurrency && reportedCurrency !== tradingCurrency)
  const fx = converted ? await fxSeries(reportedCurrency!, tradingCurrency!, addDays(from, -10), to) : () => 1
  if (!fx) return null

  // Bezugsgröße je Periode vorberechnen
  const perShare = periods.map((p, i) => {
    const eps = trailing(periods, i, q => (q.netIncome == null ? null : q.netIncome / q.shares))
    const over = (pick: (q: Period) => number | null) => trailing(periods, i, pick)
    switch (metric) {
      case 'kgv': return { value: eps, net: 0 }
      case 'kuv': return { value: over(q => (q.revenue == null ? null : q.revenue / q.shares)), net: 0 }
      case 'kcv': return { value: over(q => (q.ocf == null ? null : q.ocf / q.shares)), net: 0 }
      case 'kfcv': return { value: over(q => (q.fcf == null ? null : q.fcf / q.shares)), net: 0 }
      case 'kbv': return { value: p.equity == null ? null : p.equity / p.shares, net: 0 }
      default: {
        if (p.netDebt == null) return { value: null, net: 0 }
        const total =
          metric === 'ev_ebitda' ? over(q => q.ebitda) : metric === 'ev_ebit' ? over(q => q.operatingIncome) : over(q => q.revenue)
        return { value: total == null ? null : total / p.shares, net: p.netDebt / p.shares }
      }
    }
  })

  const points: Array<[string, number]> = []
  let excludedDays = 0
  let cursor = -1
  for (const bar of bars) {
    while (cursor + 1 < periods.length && periods[cursor + 1].known <= bar.date) cursor++
    if (cursor < 0) continue
    const base = perShare[cursor]
    if (base.value == null) continue
    // Nach langer Meldepause (Delisting, Datenlücke) keine alten Zahlen fortschreiben
    if (days(periods[cursor].end, bar.date) > 400) continue
    const rate = fx(bar.date)
    if (rate == null) continue
    const price = pence ? bar.close / 100 : bar.close
    const denominator = base.value * rate
    if (denominator <= 0) {
      excludedDays++
      continue
    }
    const numerator = price + base.net * rate
    if (numerator <= 0) {
      excludedDays++
      continue
    }
    points.push([bar.date, numerator / denominator])
  }
  if (points.length === 0 && excludedDays === 0) return null

  return {
    symbol,
    metric,
    points,
    excludedDays,
    tradingCurrency,
    reportedCurrency,
    converted,
    estimatedDates: estimated,
    latestPeriodEnd: periods[periods.length - 1]?.end ?? null,
  }
}

export interface SeriesStats {
  mean: number
  median: number
  min: number
  minDate: string
  max: number
  maxDate: string
  last: number
  lastDate: string
  firstDate: string
  count: number
  /** Tage im Zeitraum, an denen der Wert niedriger war als heute */
  daysBelow: number
}

export function seriesStats(points: Array<[string, number]>): SeriesStats | null {
  if (points.length === 0) return null
  const values = points.map(p => p[1]).sort((a, b) => a - b)
  const last = points[points.length - 1]
  let min = points[0]
  let max = points[0]
  for (const p of points) {
    if (p[1] < min[1]) min = p
    if (p[1] > max[1]) max = p
  }
  const mid = values.length >> 1
  return {
    mean: values.reduce((s, v) => s + v, 0) / values.length,
    median: values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2,
    min: min[1],
    minDate: min[0],
    max: max[1],
    maxDate: max[0],
    last: last[1],
    lastDate: last[0],
    firstDate: points[0][0],
    count: points.length,
    daysBelow: values.filter(v => v < last[1]).length,
  }
}

/** Mittelwert und Median je Kalenderjahr; angebrochene Jahre mit unter 30 Tagen entfallen */
export function yearlyValues(points: Array<[string, number]>): Array<{ jahr: number; mittel: number; median: number }> {
  const byYear = new Map<number, number[]>()
  for (const [date, value] of points) {
    const year = Number(date.slice(0, 4))
    const list = byYear.get(year)
    if (list) list.push(value)
    else byYear.set(year, [value])
  }
  return [...byYear.entries()].filter(([, v]) => v.length >= 30).map(([jahr, v]) => {
    const sorted = [...v].sort((a, b) => a - b)
    const mid = sorted.length >> 1
    return { jahr, mittel: v.reduce((sum, x) => sum + x, 0) / v.length, median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 }
  })
}

/** Für Charts ausdünnen: letzter Wert je Woche bzw. Monat */
export function thinOut(points: Array<[string, number]>): Array<[string, number]> {
  if (points.length <= 260) return points
  const spanDays = days(points[0][0], points[points.length - 1][0])
  const key = spanDays > 3 * 365
    ? (d: string) => d.slice(0, 7)
    : (d: string) => {
        const t = Date.parse(d)
        return String(Math.floor((t / DAY + 3) / 7))
      }
  const out: Array<[string, number]> = []
  let current = ''
  for (const p of points) {
    const k = key(p[0])
    if (k === current) out[out.length - 1] = p
    else out.push(p)
    current = k
  }
  return out
}
