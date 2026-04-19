// Shared Types für die Fey-Watchlist

export interface WatchlistItem {
  id: string
  ticker: string
  created_at: string
}

export interface StockData {
  ticker: string
  companyName?: string
  price: number
  change: number
  changePercent: number
  week52High: number
  week52Low: number
  dipPercent: number
  isDip: boolean
  marketCap?: number
  volume?: number
  peRatio?: number
  exchange?: string
  currency?: string
  revenueGrowthYOY?: number | null
}

export interface EarningsEvent {
  symbol: string
  companyName?: string
  date: string
  time: string
  epsEstimate?: number | null
}

export type SortColumn = 'ticker' | 'price' | 'changePercent' | 'revenueGrowthYOY' | 'earnings' | 'volume'
export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'list' | 'grid'
