// src/lib/sec/secDividendService.ts
// SEC XBRL Dividend Data Service
// Extrahiert Dividenden-Daten direkt von der SEC XBRL API.

import { getCIK, getXbrlUrl } from './cikMapping'

// ─── Known Stock Splits ──────────────────────────────────────────────────────
// Splits die historische Dividenden verzerren.
// Format: { date: 'YYYY-MM-DD', ratio: Neuer/Alter (z.B. 4:1 → ratio: 4) }

const KNOWN_SPLITS: Record<string, { date: string; ratio: number }[]> = {
  AAPL: [
    { date: '2020-08-31', ratio: 4 },  // 4:1 Split
    { date: '2014-06-09', ratio: 7 },  // 7:1 Split
  ],
  TSLA: [
    { date: '2022-08-25', ratio: 3 },  // 3:1 Split
    { date: '2020-08-31', ratio: 5 },  // 5:1 Split
  ],
  NVDA: [
    { date: '2024-06-10', ratio: 10 }, // 10:1 Split
    { date: '2021-07-20', ratio: 4 },  // 4:1 Split
  ],
  GOOGL: [
    { date: '2022-07-18', ratio: 20 }, // 20:1 Split
  ],
  AMZN: [
    { date: '2022-06-06', ratio: 20 }, // 20:1 Split
  ],
}

function adjustForSplits(ticker: string, amount: number, endDate: string): number {
  const splits = KNOWN_SPLITS[ticker.toUpperCase()]
  if (!splits) return amount

  let adjusted = amount
  for (const split of splits) {
    // Wenn die Dividende VOR dem Split war, durch den Ratio teilen
    if (endDate < split.date) {
      adjusted /= split.ratio
    }
  }
  return adjusted
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SecQuarterlyDividend {
  endDate: string         // "2025-06-28"
  startDate: string       // "2025-03-30"
  amount: number          // 0.26
  fiscalQuarter: string   // "Q1", "Q2", "Q3", "Q4"
  fiscalYear: number
  calendarYear: number
  filed: string           // Wann bei SEC eingereicht
}

export interface SecAnnualDividend {
  year: number
  totalDividend: number       // Summe aller Quartale
  quarters: SecQuarterlyDividend[]
  growthPercent: number | null // YoY Wachstum
}

export interface SecDividendCAGR {
  period: string          // "3 Jahre", "5 Jahre", "10 Jahre"
  years: number
  cagr: number            // In Prozent
  startValue: number
  endValue: number
}

export interface SecPayoutRatio {
  year: number
  dividendPerShare: number
  eps: number
  payoutRatio: number     // In Prozent
}

export interface SecDividendResponse {
  ticker: string
  entityName: string
  // Quarterly History
  quarterlyDividends: SecQuarterlyDividend[]
  // Annual aggregated
  annualDividends: SecAnnualDividend[]
  // Analysis
  currentAnnualDividend: number | null
  consecutiveYearsGrowth: number
  cagr: SecDividendCAGR[]
  payoutHistory: SecPayoutRatio[]
  // Meta
  source: 'sec-xbrl'
  fetchedAt: string
}

// ─── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry { data: any; timestamp: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 60 * 1000

async function fetchFacts(cik: string): Promise<any> {
  const cached = cache.get(cik)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data

  const res = await fetch(getXbrlUrl(cik), {
    headers: { 'User-Agent': 'Finclue research@finclue.de' },
  })
  if (!res.ok) throw new Error(`SEC XBRL API failed: ${res.status}`)

  const data = await res.json()
  cache.set(cik, { data, timestamp: Date.now() })
  return data
}

// ─── Extraction ──────────────────────────────────────────────────────────────

function extractQuarterlyDividends(facts: any, ticker: string): SecQuarterlyDividend[] {
  const gaap = facts.facts?.['us-gaap'] || {}

  const conceptNames = [
    'CommonStockDividendsPerShareDeclared',
    'CommonStockDividendsPerShareCashPaid',
  ]

  // ── Schritt 1: Individuelle Quartale extrahieren (60-100 Tage) ──
  const quarterEntries: any[] = []

  for (const name of conceptNames) {
    const concept = gaap[name]
    if (!concept) continue

    for (const [, entries] of Object.entries(concept.units || {})) {
      for (const entry of entries as any[]) {
        if (!['10-K', '10-Q', '20-F', '6-K'].includes(entry.form)) continue
        if (!entry.start || !entry.end) continue

        const days = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 86400000
        if (days >= 60 && days <= 100) {
          quarterEntries.push(entry)
        }
      }
    }
    if (quarterEntries.length > 0) break
  }

  // ── Schritt 2: Full-Year Einträge extrahieren (≥300 Tage) ──
  // Für Q4-Berechnung: Q4 = Annual - (Q1 + Q2 + Q3)
  const annualEntries: any[] = []

  for (const name of conceptNames) {
    const concept = gaap[name]
    if (!concept) continue

    for (const [, entries] of Object.entries(concept.units || {})) {
      for (const entry of entries as any[]) {
        if (!['10-K', '20-F'].includes(entry.form)) continue
        if (!entry.start || !entry.end) continue

        const days = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 86400000
        if (days >= 300) {
          annualEntries.push(entry)
        }
      }
    }
    if (annualEntries.length > 0) break
  }

  // Dedupliziere Quartale nach End-Date
  const byEnd = new Map<string, any>()
  for (const e of quarterEntries) {
    const existing = byEnd.get(e.end)
    if (!existing || e.filed > existing.filed) {
      byEnd.set(e.end, e)
    }
  }

  // Dedupliziere Annual nach End-Year
  const annualByEndYear = new Map<string, any>()
  for (const e of annualEntries) {
    const year = e.end.slice(0, 4)
    const existing = annualByEndYear.get(year)
    if (!existing || e.filed > existing.filed) {
      annualByEndYear.set(year, e)
    }
  }

  // ── Schritt 3: Q4 berechnen wo es fehlt ──
  // Gruppiere Quartale nach Fiscal Year (basierend auf dem Annual End-Date)
  for (const [annualEndYear, annualEntry] of annualByEndYear) {
    const annualStart = annualEntry.start
    const annualEnd = annualEntry.end
    const annualVal = adjustForSplits(ticker, annualEntry.val, annualEntry.end)

    // Finde alle Quartale die in diesen Annual-Zeitraum fallen
    const quartersInPeriod = Array.from(byEnd.values()).filter(q => {
      return q.end > annualStart && q.end <= annualEnd
    })

    if (quartersInPeriod.length === 3) {
      // Q4 fehlt – berechnen
      const q1q2q3Sum = quartersInPeriod.reduce((sum: number, q: any) => sum + q.val, 0)
      const q4Val = annualVal - q1q2q3Sum

      if (q4Val > 0) {
        // Q4 End-Datum = Annual End-Datum
        // Q4 Start-Datum = letztes Quartal End-Datum + 1 Tag
        const lastQuarter = quartersInPeriod.sort((a: any, b: any) => a.end.localeCompare(b.end))[2]
        const q4Start = new Date(lastQuarter.end)
        q4Start.setDate(q4Start.getDate() + 1)
        const q4StartStr = q4Start.toISOString().slice(0, 10)

        byEnd.set(annualEnd, {
          start: q4StartStr,
          end: annualEnd,
          val: Math.round(q4Val * 10000) / 10000,
          form: '10-K',
          fp: 'FY',
          fy: annualEntry.fy,
          filed: annualEntry.filed,
          _calculated: true,
        })
      }
    }
  }

  // In SecQuarterlyDividend umwandeln
  return Array.from(byEnd.values())
    .sort((a, b) => a.end.localeCompare(b.end))
    .map(e => {
      const endDate = new Date(e.end)
      const month = endDate.getMonth()
      let fq = 'Q4'
      if (month <= 2) fq = 'Q1'
      else if (month <= 5) fq = 'Q2'
      else if (month <= 8) fq = 'Q3'

      return {
        endDate: e.end,
        startDate: e.start,
        amount: adjustForSplits(ticker, e.val, e.end),
        fiscalQuarter: fq,
        fiscalYear: e.fy,
        calendarYear: parseInt(e.end.slice(0, 4)),
        filed: e.filed,
      }
    })
}

function extractAnnualEPS(facts: any): Map<number, number> {
  const gaap = facts.facts?.['us-gaap'] || {}
  const concept = gaap['EarningsPerShareDiluted']
  if (!concept) return new Map()

  const result = new Map<number, number>()

  for (const [, entries] of Object.entries(concept.units || {})) {
    for (const entry of entries as any[]) {
      if (!['10-K', '20-F'].includes(entry.form) || entry.fp !== 'FY') continue
      if (!entry.start || !entry.end) continue

      const days = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 86400000
      if (days < 300) continue

      const year = parseInt(entry.end.slice(0, 4))
      const existing = result.get(year)
      if (!existing || entry.filed > (result as any)._filed?.[year]) {
        result.set(year, entry.val)
      }
    }
  }

  return result
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function buildAnnualDividends(quarterly: SecQuarterlyDividend[]): SecAnnualDividend[] {
  // Gruppiere nach Kalender-Jahr
  const byYear = new Map<number, SecQuarterlyDividend[]>()
  for (const q of quarterly) {
    const year = q.calendarYear
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(q)
  }

  const annuals: SecAnnualDividend[] = Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, quarters]) => ({
      year,
      totalDividend: quarters.reduce((sum, q) => sum + q.amount, 0),
      quarters,
      growthPercent: null,
    }))

  // YoY Growth berechnen
  for (let i = 1; i < annuals.length; i++) {
    const prev = annuals[i - 1].totalDividend
    const curr = annuals[i].totalDividend
    if (prev > 0) {
      annuals[i].growthPercent = ((curr - prev) / prev) * 100
    }
  }

  return annuals
}

function calculateCAGR(annuals: SecAnnualDividend[]): SecDividendCAGR[] {
  if (annuals.length < 2) return []

  const latest = annuals[annuals.length - 1]
  const results: SecDividendCAGR[] = []
  const periods = [
    { label: '3 Jahre', years: 3 },
    { label: '5 Jahre', years: 5 },
    { label: '10 Jahre', years: 10 },
    { label: '15 Jahre', years: 15 },
  ]

  for (const { label, years } of periods) {
    const startIdx = annuals.length - 1 - years
    if (startIdx < 0) continue

    const start = annuals[startIdx]
    if (start.totalDividend <= 0) continue

    const cagr = (Math.pow(latest.totalDividend / start.totalDividend, 1 / years) - 1) * 100

    results.push({
      period: label,
      years,
      cagr: Math.round(cagr * 100) / 100,
      startValue: start.totalDividend,
      endValue: latest.totalDividend,
    })
  }

  return results
}

function calculateConsecutiveGrowthYears(annuals: SecAnnualDividend[]): number {
  let streak = 0
  for (let i = annuals.length - 1; i > 0; i--) {
    if (annuals[i].totalDividend > annuals[i - 1].totalDividend) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function buildPayoutHistory(
  annuals: SecAnnualDividend[],
  epsMap: Map<number, number>
): SecPayoutRatio[] {
  return annuals
    .filter(a => epsMap.has(a.year))
    .map(a => {
      const eps = epsMap.get(a.year)!
      return {
        year: a.year,
        dividendPerShare: Math.round(a.totalDividend * 1000) / 1000,
        eps: Math.round(eps * 100) / 100,
        payoutRatio: eps > 0 ? Math.round((a.totalDividend / eps) * 10000) / 100 : 0,
      }
    })
}

// ─── Main API ────────────────────────────────────────────────────────────────

export async function getSecDividends(ticker: string): Promise<SecDividendResponse> {
  const cik = await getCIK(ticker)
  if (!cik) {
    throw new Error(`Kein CIK-Mapping für Ticker: ${ticker}`)
  }

  const facts = await fetchFacts(cik)

  const quarterly = extractQuarterlyDividends(facts, ticker)
  const annuals = buildAnnualDividends(quarterly)
  const epsMap = extractAnnualEPS(facts)
  const cagr = calculateCAGR(annuals)
  const streak = calculateConsecutiveGrowthYears(annuals)
  const payoutHistory = buildPayoutHistory(annuals, epsMap)

  const latestAnnual = annuals.length > 0 ? annuals[annuals.length - 1] : null

  return {
    ticker: ticker.toUpperCase(),
    entityName: facts.entityName || ticker,
    quarterlyDividends: quarterly,
    annualDividends: annuals,
    currentAnnualDividend: latestAnnual?.totalDividend ?? null,
    consecutiveYearsGrowth: streak,
    cagr,
    payoutHistory,
    source: 'sec-xbrl',
    fetchedAt: new Date().toISOString(),
  }
}
