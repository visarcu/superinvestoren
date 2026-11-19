// src/lib/investorListData.ts
// Server-only: Daten der Investorenliste (/superinvestor/investors) inkl. der
// Kartendaten (Portfolio-Verlauf, Top-Positionen). Vorher hat jede Karte das
// komplette Holdings-Paket im Browser durchsucht.

import holdingsHistory from '@/data/holdings'
import { investorListMeta } from '@/data/investorListMeta'

export interface InvestorChartPoint {
  date: string
  value: number
  quarter: string
}

export interface InvestorTopHolding {
  ticker: string
  name: string
  percent: number
  value: number
}

export interface InvestorListItem {
  slug: string
  name: string
  subtitle: string
  type: 'investor' | 'fund'
  totalValue: number
  chartData: InvestorChartPoint[]
  performanceData: { changePercent: number; changeQuarter: number; lastUpdate: string | null }
  topHoldings: InvestorTopHolding[]
}

// Kürzel aus dem Firmennamen (übernommen aus der früheren InvestorCard-Logik)
function extractTicker(companyName: string): string {
  const name = companyName.toUpperCase()
  if (name.includes('APPLE')) return 'AAPL'
  if (name.includes('MICROSOFT')) return 'MSFT'
  if (name.includes('AMAZON')) return 'AMZN'
  if (name.includes('GOOGLE') || name.includes('ALPHABET')) return 'GOOGL'
  if (name.includes('TESLA')) return 'TSLA'
  if (name.includes('BERKSHIRE')) return 'BRK.A'
  if (name.includes('AMERICAN EXPRESS')) return 'AXP'
  if (name.includes('COCA COLA')) return 'KO'
  if (name.includes('BANK AMER')) return 'BAC'
  if (name.includes('VISA')) return 'V'
  if (name.includes('MASTERCARD')) return 'MA'
  if (name.includes('CHEVRON')) return 'CVX'
  if (name.includes('KRAFT HEINZ')) return 'KHC'
  if (name.includes('OCCIDENTAL')) return 'OXY'
  if (name.includes('CHUBB')) return 'CB'
  if (name.includes('MOODYS')) return 'MCO'
  if (name.includes('DAVITA')) return 'DVA'
  if (name.includes('SIRIUS')) return 'SIRI'
  if (name.includes('CITIGROUP')) return 'C'
  if (name.includes('KROGER')) return 'KR'
  if (name.includes('VERISIGN')) return 'VRSN'
  if (name.includes('NU HLDGS')) return 'NU'
  const words = name.split(' ')
  if (words.length >= 2) return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4)
  return words[0].substring(0, 4)
}

function buildItem(slug: string): InvestorListItem {
  const meta = investorListMeta[slug] || { type: 'investor' as const }
  const snapshots = holdingsHistory[slug] ?? []
  const latest = snapshots[snapshots.length - 1]?.data

  const totalValue = latest ? latest.totalValue || latest.positions?.reduce((sum, p) => sum + p.value, 0) || 0 : 0

  const chartData: InvestorChartPoint[] = snapshots
    .slice(-8)
    .map((snapshot, index) => ({
      date: snapshot.data.date || snapshot.quarter || '',
      value: snapshot.data.totalValue || 0,
      quarter: snapshot.quarter || `Q${index + 1}`,
    }))
    .filter(point => point.value > 0)

  let changePercent = 0
  let changeQuarter = 0
  if (chartData.length > 1) {
    const last = chartData[chartData.length - 1].value
    const previous = chartData[chartData.length - 2].value
    const earliest = chartData[0].value
    changePercent = earliest > 0 ? ((last - earliest) / earliest) * 100 : 0
    changeQuarter = previous > 0 ? ((last - previous) / previous) * 100 : 0
  }

  const topHoldings: InvestorTopHolding[] = []
  if (latest?.positions) {
    const byCusip = new Map<string, { name: string; value: number }>()
    for (const position of latest.positions) {
      const existing = byCusip.get(position.cusip)
      if (existing) existing.value += position.value
      else byCusip.set(position.cusip, { name: position.name, value: position.value })
    }
    topHoldings.push(
      ...Array.from(byCusip.values())
        .map(p => ({
          ticker: extractTicker(p.name),
          name: p.name,
          value: p.value,
          percent: (p.value / (latest.totalValue || 1)) * 100,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    )
  }

  return {
    slug,
    name: meta.name || slug.charAt(0).toUpperCase() + slug.slice(1),
    subtitle: meta.subtitle || '',
    type: meta.type,
    totalValue,
    chartData,
    performanceData: {
      changePercent: Math.round(changePercent * 10) / 10,
      changeQuarter: Math.round(changeQuarter * 10) / 10,
      lastUpdate: latest?.date || null,
    },
    topHoldings,
  }
}

let cached: InvestorListItem[] | null = null

/** Alle Investoren, sortiert nach Portfolio-Größe. */
export function buildInvestorList(): InvestorListItem[] {
  cached ??= Object.keys(holdingsHistory)
    .map(buildItem)
    .sort((a, b) => b.totalValue - a.totalValue)
  return cached
}
