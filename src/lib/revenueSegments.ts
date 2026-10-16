// src/lib/revenueSegments.ts
// Gemeinsame Aufbereitung der FMP-Segmentdaten für Übersichtskachel und Modal:
// - gleiche Segmente mit abweichender Schreibweise zusammenführen (MSFT: "Search Advertising" / "Search advertising")
// - Geschäftsjahr-Labels wie im Umsatz-Chart (JNJ: Periodenende 2022-01-02 gehört zu 2021)
// - Abgleich mit dem gemeldeten Umsatz, damit fehlende Segmente als "Nicht zugeordnet" sichtbar werden
// - feste Farben je Segment, unabhängig vom gewählten Zeitraum

export type SegmentType = 'product' | 'geographic'

export const SEGMENT_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#84CC16', '#EC4899', '#F97316', '#14B8A6',
]
export const UNASSIGNED_LABEL = 'Nicht zugeordnet'
export const UNASSIGNED_COLOR = '#64748B'

// Ab dieser Lücke zwischen Segmentsumme und Umsatz gilt die Aufteilung als unvollständig.
// Kleinere Abweichungen sind Konzern-Eliminierungen und Rundung.
const GAP_THRESHOLD = 0.03
// Ab dieser Überdeckung summieren sich die Segmente spürbar über den Umsatz hinaus
const OVERLAP_THRESHOLD = 0.05
// Periodenenden bei 52/53-Wochen-Jahren liegen oft ein paar Tage nach dem Monatsende
const PERIOD_END_TOLERANCE_DAYS = 10

export interface SegmentPeriod {
  label: string
  date: string
  values: Record<string, number>
  segmentSum: number
  revenue: number | null
  unassigned: number
  // Segmente summieren sich deutlich über den gemeldeten Umsatz (z.B. konzerninterne Umsätze, Restatements)
  overlapping: boolean
}

export interface SegmentSeries {
  periods: SegmentPeriod[]
  keys: string[]
  names: Record<string, string>
  colors: Record<string, string>
  isQuarterly: boolean
}

interface ReportedRevenue {
  date: string
  fiscalYear: string
  revenue: number
}

const DAY_MS = 24 * 60 * 60 * 1000

const toTime = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime()

function canonicalKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
    .replace(/(segments?|division|corporation|member)$/, '')
}

function displayName(name: string): string {
  return name.replace(/\s+(segments?|member)$/i, '').trim() || name
}

// Ende kurz nach Jahres-/Quartalswechsel → Periode davor (JNJ 2022-01-02 = Geschäftsjahr 2021)
function shiftedPeriodEnd(date: string): Date {
  return new Date(toTime(date) - PERIOD_END_TOLERANCE_DAYS * DAY_MS)
}

function periodLabel(date: string, isQuarterly: boolean, fiscalYear?: string): string {
  const shifted = shiftedPeriodEnd(date)
  if (!isQuarterly) return fiscalYear || String(shifted.getUTCFullYear())
  const quarter = Math.floor(shifted.getUTCMonth() / 3) + 1
  return `Q${quarter}'${String(shifted.getUTCFullYear()).slice(-2)}`
}

function findRevenue(date: string, revenue: ReportedRevenue[]): ReportedRevenue | null {
  const t = toTime(date)
  let best: ReportedRevenue | null = null
  let bestDiff = Infinity
  for (const r of revenue) {
    const diff = Math.abs(toTime(r.date) - t)
    if (diff <= PERIOD_END_TOLERANCE_DAYS * DAY_MS && diff < bestDiff) {
      best = r
      bestDiff = diff
    }
  }
  return best
}

// FMP liefert entweder { "2024-12-31": { Segment: Wert } } oder { date, symbol, Segment: Wert }
function splitRawEntry(entry: any): { date: string; segments: Record<string, unknown> } | null {
  if (!entry || typeof entry !== 'object') return null
  const firstKey = Object.keys(entry)[0]
  if (firstKey && /^\d{4}-\d{2}-\d{2}$/.test(firstKey) && typeof entry[firstKey] === 'object') {
    return { date: firstKey, segments: entry[firstKey] || {} }
  }
  if (typeof entry.date === 'string') {
    const { date, symbol, ...segments } = entry
    return { date, segments }
  }
  return null
}

function assignColors(keys: string[], periods: SegmentPeriod[]): Record<string, string> {
  const activeIn = (key: string) => new Set(periods.filter(p => p.values[key]).map(p => p.date))
  const active: Record<string, Set<string>> = {}
  keys.forEach(k => { active[k] = activeIn(k) })

  const colors: Record<string, string> = {}
  const holders: Record<string, string[]> = {}

  keys.forEach((key, i) => {
    // Erst unbenutzte Farben verteilen; erst wenn die Palette aufgebraucht ist,
    // Farben von Segmenten wiederverwenden, die nie gleichzeitig vorkommen
    let color = SEGMENT_PALETTE.find(c => !holders[c])
    if (!color) {
      color = SEGMENT_PALETTE.find(c =>
        holders[c].every(other => ![...active[other]].some(d => active[key].has(d)))
      )
    }
    color = color || SEGMENT_PALETTE[i % SEGMENT_PALETTE.length]
    colors[key] = color
    holders[color] = [...(holders[color] || []), key]
  })
  return colors
}

export function buildSegmentSeries(
  rawData: any[],
  rawRevenue: ReportedRevenue[] | undefined,
  isQuarterly: boolean
): SegmentSeries {
  const revenue = Array.isArray(rawRevenue) ? rawRevenue : []
  const names: Record<string, string> = {}
  const nameDates: Record<string, string> = {}

  const byLabel = new Map<string, SegmentPeriod>()

  for (const entry of rawData) {
    const split = splitRawEntry(entry)
    if (!split) continue

    const values: Record<string, number> = {}
    for (const [rawName, value] of Object.entries(split.segments)) {
      if (typeof value !== 'number' || value <= 0) continue
      const key = canonicalKey(rawName)
      if (!key) continue
      // Doppelte Schreibweisen in derselben Periode sind Dubletten, nicht Teilsummen
      values[key] = Math.max(values[key] || 0, value)
      // Anzeigename aus der jüngsten Periode, in der das Segment vorkommt
      if (!nameDates[key] || split.date > nameDates[key]) {
        nameDates[key] = split.date
        names[key] = displayName(rawName)
      }
    }
    if (Object.keys(values).length === 0) continue

    const reported = findRevenue(split.date, revenue)
    const segmentSum = Object.values(values).reduce((s, v) => s + v, 0)
    const gap = reported ? reported.revenue - segmentSum : 0
    const label = periodLabel(split.date, isQuarterly, reported?.fiscalYear)

    const period: SegmentPeriod = {
      label,
      date: split.date,
      values,
      segmentSum,
      revenue: reported?.revenue ?? null,
      unassigned: reported && gap > reported.revenue * GAP_THRESHOLD ? gap : 0,
      overlapping: !!reported && segmentSum > reported.revenue * (1 + OVERLAP_THRESHOLD),
    }

    // Gleiches Label zweimal → jüngere Meldung gewinnt
    const existing = byLabel.get(label)
    if (!existing || period.date > existing.date) byLabel.set(label, period)
  }

  const periods = Array.from(byLabel.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Reihenfolge: aktuelle Segmente nach Größe, danach ausgelaufene nach letztem Auftreten
  const latest = periods[periods.length - 1]
  const lastSeen: Record<string, { date: string; value: number }> = {}
  periods.forEach(p => {
    Object.entries(p.values).forEach(([k, v]) => { lastSeen[k] = { date: p.date, value: v } })
  })
  const keys = Object.keys(lastSeen).sort((a, b) => {
    const aLatest = latest?.values[a] || 0
    const bLatest = latest?.values[b] || 0
    if (aLatest !== bLatest) return bLatest - aLatest
    if (lastSeen[a].date !== lastSeen[b].date) return lastSeen[b].date.localeCompare(lastSeen[a].date)
    return lastSeen[b].value - lastSeen[a].value
  })

  return { periods, keys, names, colors: assignColors(keys, periods), isQuarterly }
}

// Zeitraum begrenzen, Farben bleiben erhalten
export function sliceSegmentSeries(series: SegmentSeries, count: number): SegmentSeries {
  const periods = series.periods.slice(-count)
  const keys = series.keys.filter(k => periods.some(p => p.values[k]))
  return { ...series, periods, keys }
}

export function hasUnassigned(periods: SegmentPeriod[]): boolean {
  return periods.some(p => p.unassigned > 0)
}

export async function loadSegmentSeries(
  ticker: string,
  type: SegmentType,
  period: 'annual' | 'quarterly'
): Promise<SegmentSeries | null> {
  const apiPeriod = period === 'quarterly' ? 'quarter' : 'annual'
  const res = await fetch(`/api/revenue-segmentation/${ticker}?type=${type}&period=${apiPeriod}&structure=flat`)
  if (!res.ok) return null

  const response = await res.json()
  const data = response.success ? response.data : []
  if (!Array.isArray(data) || data.length === 0) return null

  // API fällt bei fehlenden Jahresdaten auf Quartale zurück — Labels danach richten
  const isQuarterly = period === 'quarterly' || response.period === 'quarter'
  const series = buildSegmentSeries(data, response.revenue, isQuarterly)
  return series.periods.length > 0 ? series : null
}
