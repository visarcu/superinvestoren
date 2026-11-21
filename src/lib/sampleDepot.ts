// src/lib/sampleDepot.ts
// Server-only: Plan für das Beispieldepot im Workspace. Warren Buffetts zehn
// größte Positionen aus dem letzten 13F, so gekauft, als hätte man vor drei
// Jahren 10.000 € nach diesen Gewichten investiert. Echte Schlusskurse in USD
// und der echte Euro-Dollar-Kurs am Kaufdatum, dazu alle seither tatsächlich
// gezahlten Dividenden (nach 15 % US-Quellensteuer), keine erfundenen Werte.

import holdingsHistory, { type Snapshot } from '@/data/holdings'
import { investorNames, splitInvestorName } from '@/data/investorNames'
import { stocks } from '@/data/stocks'
import { shortCompanyName } from '@/lib/displayFormat'
import { reportQuarter } from '@/lib/investorQuarterSummary'
import { SHOWCASE_SLUG, fetchCloses, topHoldings } from '@/lib/depotShowcase'
import { SAMPLE_DEPOT_DIVIDEND_WITHHOLDING, SAMPLE_DEPOT_START_VALUE_EUR, SAMPLE_DEPOT_YEARS_BACK } from '@/lib/sampleDepotShared'
import type { QuantSeriesPoint } from '@/lib/portfolioQuant'

export interface SampleDepotPosition {
  symbol: string
  name: string
  quantity: number
  /** Kaufkurs je Aktie in EUR */
  priceEur: number
  /** EUR je USD am Kaufdatum (Feld purchase_fx_rate) */
  fxRate: number
}

export interface SampleDepotDividend {
  symbol: string
  name: string
  /** Zahltag */
  date: string
  quantity: number
  /** Dividende je Aktie in EUR, nach US-Quellensteuer */
  perShareEur: number
  totalEur: number
}

export interface SampleDepotPlan {
  investorName: string
  periodLabel: string
  startDate: string
  positions: SampleDepotPosition[]
  dividends: SampleDepotDividend[]
}

interface FmpDividendRecord {
  date?: string
  paymentDate?: string | null
  dividend?: number | null
  adjDividend?: number | null
}

/** Ausschüttungen je Aktie in USD (splitbereinigt wie die Kurse) */
async function fetchDividendHistory(symbol: string): Promise<FmpDividendRecord[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${encodeURIComponent(symbol)}?apikey=${apiKey}`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as { historical?: FmpDividendRecord[] } | Array<{ historical?: FmpDividendRecord[] }>
    return (Array.isArray(data) ? data[0]?.historical : data.historical) ?? []
  } catch {
    return []
  }
}

/** Letzter Schlusskurs am oder vor dem Datum */
function closeOnOrBefore(series: QuantSeriesPoint[], date: string): QuantSeriesPoint | null {
  let found: QuantSeriesPoint | null = null
  for (const point of series) {
    if (point.date > date) break
    found = point
  }
  return found
}

/** Erster Schlusskurs am oder nach dem Datum (max. 10 Tage später, sonst null) */
function closeOnOrAfter(series: QuantSeriesPoint[], date: string): { date: string; value: number } | null {
  const point = series.find(p => p.date >= date)
  if (!point) return null
  const gapDays = (new Date(point.date).getTime() - new Date(date).getTime()) / 86_400_000
  return gapDays <= 10 ? point : null
}

export async function buildSampleDepotPlan(): Promise<SampleDepotPlan | null> {
  const snapshots = (holdingsHistory as Record<string, Snapshot[]>)[SHOWCASE_SLUG]
  const latest = snapshots?.[snapshots.length - 1]?.data
  if (!latest?.date) return null

  const { top } = topHoldings(latest)
  if (top.length === 0) return null

  const target = new Date()
  target.setFullYear(target.getFullYear() - SAMPLE_DEPOT_YEARS_BACK)
  const targetDate = target.toISOString().slice(0, 10)

  const [benchmark, eurusd, ...series] = await Promise.all([
    fetchCloses('SPY'),
    fetchCloses('EURUSD'),
    ...top.map(([ticker]) => fetchCloses(ticker)),
  ])

  // Kaufdatum = erster Handelstag am oder nach dem Zieldatum
  const startPoint = closeOnOrAfter(benchmark, targetDate)
  const fxPoint = startPoint ? closeOnOrAfter(eurusd, startPoint.date) : null
  if (!startPoint || !fxPoint || fxPoint.value <= 0) return null
  const startDate = startPoint.date
  const eurPerUsd = 1 / fxPoint.value

  // Nur Positionen mit Kurs am Kaufdatum; Gewichte darauf neu verteilen
  const stockNames = new Map(stocks.map(s => [s.ticker, s.name]))
  const priced = top
    .map(([ticker, holding], i) => ({ ticker, holding, price: closeOnOrAfter(series[i], startDate) }))
    .filter((p): p is typeof p & { price: { date: string; value: number } } => !!p.price && p.price.value > 0)
  const totalValue = priced.reduce((sum, p) => sum + p.holding.value, 0)
  if (priced.length === 0 || totalValue <= 0) return null

  const positions: SampleDepotPosition[] = priced.map(p => {
    const priceEur = p.price.value * eurPerUsd
    const amountEur = (p.holding.value / totalValue) * SAMPLE_DEPOT_START_VALUE_EUR
    return {
      symbol: p.ticker,
      name: shortCompanyName(stockNames.get(p.ticker) ?? p.holding.name),
      quantity: Math.round((amountEur / priceEur) * 10_000) / 10_000,
      priceEur: Math.round(priceEur * 10_000) / 10_000,
      fxRate: Math.round(eurPerUsd * 1_000_000) / 1_000_000,
    }
  })

  // Seit dem Kauf gezahlte Dividenden: Ex-Tag nach dem Kaufdatum, Zahltag
  // bis heute. Nach US-Quellensteuer, umgerechnet zum Euro-Dollar-Kurs am Zahltag.
  const today = new Date().toISOString().slice(0, 10)
  const histories = await Promise.all(positions.map(position => fetchDividendHistory(position.symbol)))
  const dividends: SampleDepotDividend[] = []
  positions.forEach((position, i) => {
    for (const record of histories[i]) {
      const perShareUsd = record.adjDividend ?? record.dividend ?? 0
      const exDate = record.date ?? ''
      const payDate = record.paymentDate || exDate
      if (!(perShareUsd > 0) || !exDate || exDate <= startDate || payDate > today) continue
      const fx = closeOnOrBefore(eurusd, payDate)
      if (!fx || fx.value <= 0) continue
      const perShareEur = (perShareUsd * (1 - SAMPLE_DEPOT_DIVIDEND_WITHHOLDING)) / fx.value
      dividends.push({
        symbol: position.symbol,
        name: position.name,
        date: payDate,
        quantity: position.quantity,
        perShareEur: Math.round(perShareEur * 10_000) / 10_000,
        totalEur: Math.round(perShareEur * position.quantity * 100) / 100,
      })
    }
  })
  dividends.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol))

  const { q, year } = reportQuarter(latest.date)
  return {
    investorName: splitInvestorName(investorNames[SHOWCASE_SLUG] ?? SHOWCASE_SLUG).name,
    periodLabel: `Q${q} ${year}`,
    startDate,
    positions,
    dividends,
  }
}
