// src/components/chart-builder/types.ts

export type MetricCategory = 'valuation' | 'profitability' | 'financial' | 'price'
export type MetricUnit = 'ratio' | 'percent' | 'currency' | 'number' | 'multiple'
export type MetricSource = 'key-metrics' | 'income-statement' | 'cash-flow-statement' | 'calculated' | 'historical-price'
export type Granularity = 'annual' | 'quarterly' | 'quarterly_ttm'
export type TimeRange = '1Y' | '3Y' | '5Y' | '10Y' | 'MAX' | 'custom'
export type ViewMode = 'normal' | 'indexed' | 'percent_change' | 'log'

export interface MetricDefinition {
  key: string
  label: string
  category: MetricCategory
  unit: MetricUnit
  description: string
  source: MetricSource
  field: string
  /** For calculated metrics that need multiple fields */
  calculatedFrom?: { numerator: { source: MetricSource; field: string }; denominator: { source: MetricSource; field: string } }
  /** Whether this metric is a flow metric (can be summed for TTM) vs. a point-in-time metric */
  isFlowMetric?: boolean
}

export interface ActiveMetric {
  id: string
  metricKey: string
  stockTicker: string
  color: string
  visible: boolean
  yAxisSide: 'left' | 'right'
}

export interface StockFinancialData {
  ticker: string
  name: string
  incomeStatements: Record<string, any>[]
  keyMetrics: Record<string, any>[]
  cashFlows: Record<string, any>[]
  balanceSheets: Record<string, any>[]
  historicalPrices?: { date: string; close: number }[]
  fetchedAt: number
  granularity: Granularity
}

export interface ChartDataPoint {
  date: string
  [seriesKey: string]: number | string | undefined
}

export interface YAxisConfig {
  id: string
  side: 'left' | 'right'
  unit: MetricUnit
  label: string
}

export interface ChartBuilderPreset {
  id: string
  name: string
  category: 'valuation' | 'profitability' | 'financial' | 'custom'
  description: string
  metrics: string[]
  granularity?: Granularity
  timeRange?: TimeRange
}

export interface ChartBuilderState {
  stocks: string[]
  stockNames: Record<string, string>
  activeMetrics: ActiveMetric[]
  granularity: Granularity
  timeRange: TimeRange
  customDateRange?: { start: string; end: string }
  viewMode: ViewMode
  title: string
  description: string
  loading: boolean
  dataCache: Record<string, StockFinancialData>
}

export type ChartBuilderAction =
  | { type: 'ADD_STOCK'; ticker: string; name: string }
  | { type: 'REMOVE_STOCK'; ticker: string }
  | { type: 'ADD_METRIC'; metric: ActiveMetric }
  | { type: 'ADD_METRICS_BULK'; metrics: ActiveMetric[] }
  | { type: 'REMOVE_METRIC'; id: string }
  | { type: 'TOGGLE_METRIC_VISIBILITY'; id: string }
  | { type: 'SET_METRIC_COLOR'; id: string; color: string }
  | { type: 'SET_GRANULARITY'; granularity: Granularity }
  | { type: 'SET_TIME_RANGE'; timeRange: TimeRange }
  | { type: 'SET_CUSTOM_DATE_RANGE'; range: { start: string; end: string } }
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'CACHE_DATA'; ticker: string; data: StockFinancialData }
  | { type: 'LOAD_PRESET'; preset: ChartBuilderPreset }
  | { type: 'CLEAR_METRICS' }
  | { type: 'RESET' }
