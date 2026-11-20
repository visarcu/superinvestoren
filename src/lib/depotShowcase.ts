// src/lib/depotShowcase.ts
// Server-only: echte Beispielanalyse für die Depot-Landingpage (/depot).
// Nimmt die zehn größten Positionen aus Warren Buffetts letztem 13F-Filing als
// Musterdepot und rechnet darauf genau die Analysen, die Premium-Nutzer für ihr
// eigenes Depot bekommen (lib/portfolioRisk, lib/portfolioQuant). Keine
// erfundenen Zahlen: Gewichte aus dem 13F, Kurse von FMP.
//
// Vereinfachungen (auf der Seite offen genannt): Kurse ohne Dividenden, in USD,
// Gewichte täglich konstant gehalten.

import holdingsHistory, { type Snapshot } from '@/data/holdings'
import { investorNames, splitInvestorName } from '@/data/investorNames'
import { getPositionTicker } from '@/lib/holdingsTicker'
import { reportQuarter } from '@/lib/investorQuarterSummary'
import { shortCompanyName } from '@/lib/displayFormat'
import { stocks } from '@/data/stocks'
import { annualizedReturnPct, computeRiskMeasures, type RiskMeasures } from '@/lib/portfolioRisk'
import {
  STRESS_SCENARIOS,
  computeAssetBeta,
  computeStressTest,
  runMonteCarlo,
  windowReturnPct,
  type MonteCarloResult,
  type QuantSeriesPoint,
  type StressTestResult,
} from '@/lib/portfolioQuant'

export const SHOWCASE_SLUG = 'buffett'
const TOP_N = 10
/** Beispiel-Startwert für Monte Carlo und Stresstest (Eingabewert, keine Depotangabe) */
export const SHOWCASE_START_VALUE = 10_000
/** Ab hier Kurse laden – deckt die Finanzkrise 2008/09 für den Stresstest ab */
const HISTORY_FROM = '2008-06-01'
/** Fenster für Kennzahlen und Monte-Carlo-Bootstrap */
const ANALYSIS_YEARS = 5
const BENCHMARK = 'SPY'
/** Kurzläufige US-Staatsanleihen als risikofreier Zins */
const RISK_FREE_PROXY = 'BIL'

export interface ShowcaseHolding {
  ticker: string
  name: string
  weightPct: number
}

export interface DepotShowcase {
  investorName: string
  periodLabel: string
  filingDate: string
  coveragePct: number
  holdings: ShowcaseHolding[]
  windowFrom: string
  windowTo: string
  risk: RiskMeasures | null
  benchmarkRisk: RiskMeasures | null
  monteCarlo: MonteCarloResult | null
  stressTests: StressTestResult[]
}

/** Tägliche Schlusskurse seit Mitte 2008 (FMP, 1 Tag Cache) */
export async function fetchCloses(symbol: string): Promise<QuantSeriesPoint[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return []
  try {
    // serietype=line: nur Datum + Schlusskurs – klein genug für den Fetch-Cache
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?from=${HISTORY_FROM}&serietype=line&apikey=${apiKey}`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as { historical?: Array<{ date: string; close: number }> }
    return (data.historical ?? [])
      .filter(p => p.date && p.close > 0)
      .map(p => ({ date: p.date, value: p.close }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

/** Größte Aktienpositionen eines 13F-Filings, zusammengeführt je Ticker */
export function topHoldings(snapshot: Snapshot['data']) {
  const byTicker = new Map<string, { value: number; name: string }>()
  for (const p of snapshot.positions) {
    if (p.putCall || (p.optionType && p.optionType !== 'STOCK')) continue
    const ticker = getPositionTicker(p)?.toUpperCase()
    if (!ticker) continue
    const entry = byTicker.get(ticker)
    if (entry) entry.value += p.value
    else byTicker.set(ticker, { value: p.value, name: p.name })
  }
  const total = snapshot.positions.reduce((sum, p) => sum + p.value, 0)
  const top = Array.from(byTicker.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, TOP_N)
  return { top, total }
}

/** Täglich rebalanciertes Musterdepot über den Kalender der Benchmark */
function buildWealthSeries(
  weights: Map<string, number>,
  prices: Map<string, Map<string, number>>,
  calendar: string[],
): QuantSeriesPoint[] {
  const series: QuantSeriesPoint[] = [{ date: calendar[0], value: 1 }]
  let value = 1
  for (let i = 1; i < calendar.length; i++) {
    const today = calendar[i]
    const yesterday = calendar[i - 1]
    let weighted = 0
    let weightSum = 0
    weights.forEach((weight, ticker) => {
      const p0 = prices.get(ticker)?.get(yesterday)
      const p1 = prices.get(ticker)?.get(today)
      if (!p0 || !p1) return
      weighted += weight * (p1 / p0 - 1)
      weightSum += weight
    })
    if (weightSum > 0) value *= 1 + weighted / weightSum
    series.push({ date: today, value })
  }
  return series
}

let cached: { data: DepotShowcase | null; at: number } | null = null
const CACHE_MS = 6 * 60 * 60 * 1000

export async function buildDepotShowcase(): Promise<DepotShowcase | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data

  const snapshots = (holdingsHistory as Record<string, Snapshot[]>)[SHOWCASE_SLUG]
  const latest = snapshots?.[snapshots.length - 1]?.data
  if (!latest?.date) return null

  const { top, total } = topHoldings(latest)
  const topValue = top.reduce((sum, [, h]) => sum + h.value, 0)
  if (top.length === 0 || topValue <= 0) return null

  const tickers = top.map(([ticker]) => ticker)
  const [benchmark, riskFree, ...priceSeries] = await Promise.all([
    fetchCloses(BENCHMARK),
    fetchCloses(RISK_FREE_PROXY),
    ...tickers.map(fetchCloses),
  ])
  if (benchmark.length < 250) {
    cached = { data: null, at: Date.now() }
    return null
  }

  const seriesByTicker = new Map(tickers.map((t, i) => [t, priceSeries[i]]))
  const prices = new Map(tickers.map((t, i) => [t, new Map(priceSeries[i].map(p => [p.date, p.value]))]))
  const weights = new Map(top.map(([ticker, h]) => [ticker, h.value / topValue]))

  // Analysefenster: die letzten fünf Jahre
  const windowTo = benchmark[benchmark.length - 1].date
  const fromDate = new Date(windowTo)
  fromDate.setFullYear(fromDate.getFullYear() - ANALYSIS_YEARS)
  const windowFrom = fromDate.toISOString().slice(0, 10)
  const calendar = benchmark.filter(p => p.date >= windowFrom).map(p => p.date)
  const wealth = buildWealthSeries(weights, prices, calendar)
  const benchmarkWindow = benchmark.filter(p => p.date >= windowFrom)
  const riskFreePct = annualizedReturnPct(riskFree.filter(p => p.date >= windowFrom))

  // Stresstests: echte Kurse im Krisenfenster, sonst Beta × Markt (wie im Depot)
  const betaBySymbol = new Map(
    tickers.map(t => [t, computeAssetBeta((seriesByTicker.get(t) ?? []).filter(p => p.date >= windowFrom), benchmarkWindow)]),
  )
  const stressTests = STRESS_SCENARIOS.map(scenario => {
    const marketReturnPct = windowReturnPct(benchmark, scenario.from, scenario.to)
    if (marketReturnPct === null) return null
    const windowReturns = new Map(
      tickers.map(t => [t, windowReturnPct(seriesByTicker.get(t) ?? [], scenario.from, scenario.to)]),
    )
    return computeStressTest(scenario, weights, windowReturns, betaBySymbol, marketReturnPct, SHOWCASE_START_VALUE)
  }).filter((r): r is StressTestResult => r !== null)

  const { q, year } = reportQuarter(latest.date)
  const stockNames = new Map(stocks.map(s => [s.ticker, s.name]))

  const data: DepotShowcase = {
    investorName: splitInvestorName(investorNames[SHOWCASE_SLUG] ?? SHOWCASE_SLUG).name,
    periodLabel: `Q${q} ${year}`,
    filingDate: latest.date,
    coveragePct: total > 0 ? (topValue / total) * 100 : 0,
    holdings: top.map(([ticker, h]) => ({
      ticker,
      name: shortCompanyName(stockNames.get(ticker) ?? h.name),
      weightPct: (h.value / topValue) * 100,
    })),
    windowFrom,
    windowTo,
    risk: computeRiskMeasures(wealth, riskFreePct, benchmarkWindow),
    benchmarkRisk: computeRiskMeasures(benchmarkWindow, riskFreePct),
    monteCarlo: runMonteCarlo(wealth, SHOWCASE_START_VALUE, 10, 1000),
    stressTests,
  }
  cached = { data, at: Date.now() }
  return data
}
