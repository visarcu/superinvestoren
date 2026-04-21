// Shared Types für die Aktien-Detail-Seite (Fey-Style)

export interface UnternehmenProfile {
  name: string
  ticker: string
  cik: string
  exchangeName: string
  sector: string
  industry: string
  fiscalYearEndFormatted: string
  phone: string | null
  address: { street: string; city: string; state: string; zip: string } | null
}

export interface Period {
  period: string
  revenue: number | null
  netIncome: number | null
  grossProfit: number | null
  operatingIncome: number | null
  eps: number | null
  [key: string]: any
}

export interface BalancePeriod {
  period: string
  totalAssets: number | null
  cash: number | null
  longTermDebt: number | null
  totalDebt: number | null
  shareholdersEquity: number | null
  [key: string]: any
}

export interface CashFlowPeriod {
  period: string
  operatingCashFlow: number | null
  capitalExpenditure: number | null
  freeCashFlow: number | null
  dividendPerShare: number | null
  shareRepurchase: number | null
  [key: string]: any
}

export interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  sourceName: string
  publishedAt: string
  category: string
}

export interface KPIMetric {
  label: string
  unit: string
  data: { period: string; value: number; filingUrl?: string }[]
}

export interface EarningsBeatMiss {
  revenue?: { actual: number; priorGuidance: number; beatMiss: 'beat' | 'miss' | 'inline'; diffPct: number }
  eps?: { actual: number; priorGuidance: number; beatMiss: 'beat' | 'miss' | 'inline'; diffPct: number }
  source: string
}

export interface EarningsEntry {
  period: string
  fiscalQuarter: number
  fiscalYear: number
  filingDate: string
  periodEndDate: string
  filingUrl: string
  summary: string | null
  highlights: {
    revenue_reported?: number | null
    eps_reported?: number | null
    net_income?: number | null
    revenue_yoy_pct?: number | null
    eps_yoy_pct?: number | null
    guidance_revenue?: number | null
    guidance_eps?: number | null
    sentiment?: 'positiv' | 'negativ' | 'neutral'
  } | null
  beatMiss: EarningsBeatMiss | null
}

export interface Quote {
  price: number
  change: number
  changePercent: number
  marketCap?: number
  /** Unix-Timestamp (Sekunden) des letzten Quotes — für Market-Status-Badge */
  timestamp?: number
  source: string
}

export interface PricePoint {
  date: string
  price: number
}

export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'

export type Tab = 'overview' | 'news' | 'financials' | 'earnings' | 'kpis' | 'ai'

export interface ExpandedChartState {
  data: any[]
  dataKey: string
  label: string
  color: string
  format?: 'dollar'
}
