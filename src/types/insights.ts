// src/types/insights.ts - TypeScript Interfaces für Insights Page

export interface Position {
  cusip: string
  ticker?: string
  name?: string
  shares: number
  value: number
}

export interface HoldingData {
  date: string
  positions: Position[]
}

export interface HoldingSnapshot {
  data: HoldingData
}

export interface TopBuyItem {
  ticker: string
  count: number
}

export interface TopOwnedItem {
  ticker: string
  count: number
}

export interface BiggestInvestmentItem {
  ticker: string
  name: string
  value: number
}

export interface SectorAnalysis {
  sector: string
  value: number
  count: number
}

export interface GeographicExposure {
  usValue: number
  internationalValue: number
  usPercentage: number
  intlPercentage: number
}

export interface QuarterOption {
  id: string
  label: string
  quarters: string[]
  description: string
}

export interface DataSourceStats {
  totalInvestors: number
  investorsWithData: number
  totalFilings: number
  filingsInPeriod: number
  lastUpdated: string
  quarters: string[]
}

export interface MomentumShift {
  ticker: string
  name: string
  shifters: string[]
  fromSelling: number
  toBuying: number
  totalShift: number
}

export interface ExitTrackerItem {
  ticker: string
  name: string
  exitedBy: string[]
  avgHoldingPeriod: number
  totalValueExited: number
}

export interface NewDiscoveryItem {
  ticker: string
  name: string
  discoveredBy: string[]
  totalValue: number
  avgPosition: number
}

export interface ResearchGemsResult {
  unknownStocks: Array<{
    ticker: string
    name: string
    investorCount: number
    investors: string[]
    totalValue: number
  }>
  germanStocks: Array<{
    ticker: string
    name: string
    investorCount: number
    investors: string[]
    totalValue: number
  }>
  popularETFs: Array<{
    ticker: string
    name: string
    investorCount: number
    investors: string[]
    totalValue: number
    category?: string
  }>
}

export interface BuySellBalance {
  quarter: string
  totalBuys: number
  totalSells: number
  netFlow: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  buysCount: number
  sellsCount: number
}

export interface ActivityData {
  investor: string
  changes: number
  buys: number
  sells: number
  lastActivity: string
}

export interface BigMove {
  investor: string
  ticker: string
  type: 'buy' | 'sell'
  percentChange: number
  value: number
  date: string
}

export interface ConcentrationData {
  investor: string
  concentration: number
  top3Percentage: number
  totalPositions: number
  type: 'high' | 'medium' | 'low'
}

export interface BigBetData {
  ticker: string
  name: string
  maxPortfolioPercent: number
  ownershipCount: number
  totalValue: number
  topInvestor: string
}

export interface ContrarianData {
  ticker: string
  name: string
  portfolioPercent: number
  investor: string
  value: number
  ownershipCount: number
}
