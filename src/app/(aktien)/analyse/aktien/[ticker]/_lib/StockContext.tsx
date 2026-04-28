'use client'

// Context für Stock-Detail. Layout lädt alle Daten einmal und stellt sie
// allen Sub-Routes (Tab-Pages) via useStockContext() zur Verfügung.
// Damit fühlen sich Tabs wie eigenständige Sub-Pages an, ohne dass die
// Daten bei jedem Tab-Wechsel neu geladen werden.

import React, { createContext, useContext } from 'react'
import type {
  UnternehmenProfile,
  Period,
  BalancePeriod,
  CashFlowPeriod,
  NewsArticle,
  KPIMetric,
  EarningsEntry,
  AnalystEstimate,
  Quote,
  PricePoint,
  ChartTimeframe,
  ExpandedChartState,
  AftermarketQuote,
} from './types'

export interface StockContextValue {
  ticker: string
  profile: UnternehmenProfile | null
  income: Period[]
  balance: BalancePeriod[]
  cashflow: CashFlowPeriod[]
  financialSource: 'sec-xbrl' | 'finclue-manual' | 'no-data' | null
  financialNotice: string | null
  news: NewsArticle[]
  kpis: Record<string, KPIMetric>
  earnings: EarningsEntry[]
  estimates: AnalystEstimate[]
  quote: Quote | null
  aftermarket: AftermarketQuote | null
  priceChart: PricePoint[]
  fullPriceHistory: PricePoint[]
  chartTimeframe: ChartTimeframe
  setChartTimeframe: (t: ChartTimeframe) => void
  chartLoading: boolean
  aiAnalysis: string | null
  aiLoading: boolean
  startAiAnalysis: () => void
  loading: boolean
  expandedChart: ExpandedChartState | null
  setExpandedChart: (s: ExpandedChartState | null) => void
  financialPeriod: 'annual' | 'quarterly'
  setFinancialPeriod: (p: 'annual' | 'quarterly') => void
  isPremium: boolean
  userLoading: boolean
  metrics: { label: string; value: string; color?: number }[]
  fyLabel: string
}

const StockContext = createContext<StockContextValue | null>(null)

interface ProviderProps {
  value: StockContextValue
  children: React.ReactNode
}

export function StockContextProvider({ value, children }: ProviderProps) {
  return <StockContext.Provider value={value}>{children}</StockContext.Provider>
}

export function useStockContext(): StockContextValue {
  const ctx = useContext(StockContext)
  if (!ctx) {
    throw new Error('useStockContext muss innerhalb von StockContextProvider verwendet werden')
  }
  return ctx
}
