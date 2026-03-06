// src/components/chart-builder/dataProcessing.ts

import {
  MetricDefinition,
  ActiveMetric,
  StockFinancialData,
  ChartDataPoint,
  YAxisConfig,
  ViewMode,
  Granularity,
} from './types'
import { getMetricDefinition } from './metricRegistry'

/**
 * Extract a time series for a specific metric from raw financial data.
 */
export function extractMetricTimeSeries(
  data: StockFinancialData,
  metricDef: MetricDefinition,
  granularity: Granularity
): { date: string; value: number }[] {
  if (metricDef.source === 'historical-price') {
    if (!data.historicalPrices || data.historicalPrices.length === 0) return []
    const sorted = [...data.historicalPrices].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const firstValue = sorted[0].close
    if (firstValue === 0) return []
    return sorted.map(d => ({
      date: d.date,
      value: ((d.close - firstValue) / firstValue) * 100,
    }))
  }

  // Determine which data source to use
  let records: Record<string, any>[] = []
  if (metricDef.source === 'income-statement') {
    records = data.incomeStatements
  } else if (metricDef.source === 'key-metrics') {
    records = data.keyMetrics
  } else if (metricDef.source === 'cash-flow-statement') {
    records = data.cashFlows
  } else if (metricDef.source === 'calculated' && metricDef.calculatedFrom) {
    // For calculated metrics, we need to combine two sources
    return extractCalculatedMetric(data, metricDef, granularity)
  }

  if (!records || records.length === 0) return []

  const sorted = [...records].reverse() // API returns newest first

  if (granularity === 'quarterly_ttm' && metricDef.isFlowMetric) {
    return computeQuarterlyTTM(sorted, metricDef.field)
  }

  return sorted
    .filter(r => {
      const val = r[metricDef.field]
      if (val === null || val === undefined) return false
      // Filter out exact zeros (no data)
      if (val === 0) return false
      return true
    })
    .map(r => {
      let val = r[metricDef.field]
      // Cap extreme multiples to keep the chart readable
      if (metricDef.unit === 'multiple') {
        val = Math.max(-200, Math.min(500, val))
      }
      return {
        date: getDateLabel(r, granularity),
        value: normalizeValue(val, metricDef.unit),
      }
    })
}

/**
 * Extract a calculated metric (e.g., EBITDA margin = EBITDA / Revenue)
 */
function extractCalculatedMetric(
  data: StockFinancialData,
  metricDef: MetricDefinition,
  granularity: Granularity
): { date: string; value: number }[] {
  if (!metricDef.calculatedFrom) return []

  const { numerator, denominator } = metricDef.calculatedFrom

  const getRecords = (source: string) => {
    switch (source) {
      case 'income-statement': return data.incomeStatements
      case 'key-metrics': return data.keyMetrics
      case 'cash-flow-statement': return data.cashFlows
      default: return []
    }
  }

  const numRecords = [...(getRecords(numerator.source) || [])].reverse()
  const denRecords = [...(getRecords(denominator.source) || [])].reverse()

  const result: { date: string; value: number }[] = []

  for (const numRec of numRecords) {
    const dateLabel = getDateLabel(numRec, granularity)
    const denRec = denRecords.find(d => getDateLabel(d, granularity) === dateLabel)
    if (!denRec) continue

    const numVal = numRec[numerator.field]
    const denVal = denRec[denominator.field]
    if (!numVal || !denVal || denVal === 0) continue

    result.push({
      date: dateLabel,
      value: (numVal / denVal) * 100, // As percentage
    })
  }

  return result
}

/**
 * Compute quarterly TTM (trailing twelve months) by summing 4 consecutive quarters.
 */
function computeQuarterlyTTM(
  sortedRecords: Record<string, any>[],
  field: string
): { date: string; value: number }[] {
  if (sortedRecords.length < 4) return []

  const result: { date: string; value: number }[] = []

  for (let i = 3; i < sortedRecords.length; i++) {
    const trailing = [
      sortedRecords[i],
      sortedRecords[i - 1],
      sortedRecords[i - 2],
      sortedRecords[i - 3],
    ]

    const allValid = trailing.every(r => r[field] !== null && r[field] !== undefined)
    if (!allValid) continue

    const ttmValue = trailing.reduce((sum, r) => sum + (r[field] || 0), 0)
    result.push({
      date: getDateLabel(sortedRecords[i], 'quarterly'),
      value: ttmValue,
    })
  }

  return result
}

/**
 * Normalize metric values (e.g., convert ratios like 0.25 to 25%)
 */
function normalizeValue(value: number, unit: string): number {
  if (unit === 'percent' && Math.abs(value) < 1) {
    return value * 100
  }
  return value
}

/**
 * Get a date label from a financial record.
 */
function getDateLabel(record: Record<string, any>, granularity: Granularity): string {
  if (granularity === 'annual') {
    return record.calendarYear?.toString() || record.date?.substring(0, 4) || ''
  }
  // For quarterly data, use the period string or date
  if (record.period && record.calendarYear) {
    return `${record.period} ${record.calendarYear}`
  }
  return record.date?.substring(0, 10) || ''
}

/**
 * Build unified chart data from all active metrics.
 */
export function buildChartData(
  activeMetrics: ActiveMetric[],
  dataCache: Record<string, StockFinancialData>,
  viewMode: ViewMode,
  granularity: Granularity
): ChartDataPoint[] {
  const seriesMap = new Map<string, Map<string, number>>()

  for (const metric of activeMetrics) {
    if (!metric.visible) continue
    const data = dataCache[metric.stockTicker]
    if (!data) continue

    const metricDef = getMetricDefinition(metric.metricKey)
    if (!metricDef) continue

    const timeSeries = extractMetricTimeSeries(data, metricDef, granularity)
    const seriesKey = `${metric.stockTicker}_${metric.metricKey}`

    for (const point of timeSeries) {
      if (!seriesMap.has(point.date)) {
        seriesMap.set(point.date, new Map())
      }
      seriesMap.get(point.date)!.set(seriesKey, point.value)
    }
  }

  // Convert to array and sort by date
  const dates = Array.from(seriesMap.keys()).sort((a, b) => {
    // Handle both year strings ("2023") and full dates ("2023-01-15")
    if (a.length <= 4 && b.length <= 4) return parseInt(a) - parseInt(b)
    return a.localeCompare(b)
  })

  const chartData: ChartDataPoint[] = dates.map(date => {
    const point: ChartDataPoint = { date }
    const values = seriesMap.get(date)!
    values.forEach((value, key) => {
      point[key] = value
    })
    return point
  })

  // Apply view mode transforms
  if (viewMode === 'indexed' || viewMode === 'percent_change') {
    return applyViewModeTransform(chartData, activeMetrics, viewMode)
  }

  return chartData
}

/**
 * Apply view mode transformations (indexed to zero, percent change).
 */
function applyViewModeTransform(
  data: ChartDataPoint[],
  activeMetrics: ActiveMetric[],
  viewMode: ViewMode
): ChartDataPoint[] {
  if (data.length === 0) return data

  // Find first non-null value for each series
  const firstValues: Record<string, number> = {}
  for (const metric of activeMetrics) {
    if (!metric.visible) continue
    const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
    for (const point of data) {
      const val = point[seriesKey]
      if (typeof val === 'number' && val !== 0) {
        firstValues[seriesKey] = val
        break
      }
    }
  }

  return data.map(point => {
    const transformed: ChartDataPoint = { date: point.date }
    for (const metric of activeMetrics) {
      if (!metric.visible) continue
      const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
      const val = point[seriesKey]
      const firstVal = firstValues[seriesKey]

      if (typeof val === 'number' && firstVal) {
        if (viewMode === 'indexed') {
          transformed[seriesKey] = val - firstVal
        } else {
          transformed[seriesKey] = ((val - firstVal) / Math.abs(firstVal)) * 100
        }
      }
    }
    return transformed
  })
}

/**
 * Determine Y-axis configuration based on active metrics.
 */
export function determineYAxisConfig(activeMetrics: ActiveMetric[]): YAxisConfig[] {
  const visibleMetrics = activeMetrics.filter(m => m.visible)
  if (visibleMetrics.length === 0) return []

  const unitGroups = new Map<string, string>()

  for (const metric of visibleMetrics) {
    const def = getMetricDefinition(metric.metricKey)
    if (!def) continue
    if (!unitGroups.has(def.unit)) {
      unitGroups.set(def.unit, def.unit)
    }
  }

  const units = Array.from(unitGroups.keys())

  if (units.length <= 1) {
    return [{
      id: 'left',
      side: 'left',
      unit: (units[0] || 'number') as any,
      label: getUnitLabel(units[0] || 'number'),
    }]
  }

  // Two axes: first unit on left, rest on right
  return [
    {
      id: 'left',
      side: 'left',
      unit: units[0] as any,
      label: getUnitLabel(units[0]),
    },
    {
      id: 'right',
      side: 'right',
      unit: units[1] as any,
      label: getUnitLabel(units[1]),
    },
  ]
}

function getUnitLabel(unit: string): string {
  switch (unit) {
    case 'multiple': return 'Multiple (x)'
    case 'percent': return 'Prozent (%)'
    case 'currency': return 'USD'
    case 'number': return 'Anzahl'
    case 'ratio': return 'Verhältnis'
    default: return ''
  }
}

/**
 * Calculate statistics for a metric series.
 */
export function calculateSeriesStats(
  data: ChartDataPoint[],
  seriesKey: string
): { min: number; max: number; avg: number; current: number } | null {
  const values: number[] = []
  for (const point of data) {
    const val = point[seriesKey]
    if (typeof val === 'number') values.push(val)
  }

  if (values.length === 0) return null

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    current: values[values.length - 1],
  }
}

/**
 * Filter chart data by time range.
 */
export function filterByTimeRange(
  data: ChartDataPoint[],
  timeRange: string,
  customRange?: { start: string; end: string }
): ChartDataPoint[] {
  if (timeRange === 'MAX') return data
  if (data.length === 0) return data

  if (timeRange === 'custom' && customRange) {
    return data.filter(d => d.date >= customRange.start && d.date <= customRange.end)
  }

  const yearsMap: Record<string, number> = {
    '1Y': 1, '3Y': 3, '5Y': 5, '10Y': 10,
  }
  const years = yearsMap[timeRange]
  if (!years) return data

  // For annual data (dates like "2023"), use the latest data point as anchor
  // instead of current year, since annual data for the current year often isn't available yet
  const firstDate = data[0].date
  if (firstDate.length <= 4) {
    const lastYear = Math.max(...data.map(d => parseInt(d.date)))
    const cutoff = lastYear - years
    return data.filter(d => parseInt(d.date) >= cutoff)
  }

  // For quarterly data (like "Q1 2023"), also use last data point as anchor
  if (firstDate.startsWith('Q')) {
    const lastYear = Math.max(...data.map(d => parseInt(d.date.split(' ')[1]) || 0))
    const cutoff = lastYear - years
    return data.filter(d => {
      const year = parseInt(d.date.split(' ')[1]) || 0
      return year >= cutoff
    })
  }

  // For daily data, filter by date
  const cutoffDate = new Date()
  cutoffDate.setFullYear(cutoffDate.getFullYear() - years)
  const cutoffStr = cutoffDate.toISOString().substring(0, 10)
  return data.filter(d => d.date >= cutoffStr)
}

/**
 * Format a metric value for display.
 */
export function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case 'multiple':
      return `${value.toFixed(1)}x`
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'currency':
      if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(1)} Bio $`
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)} Mrd $`
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)} Mio $`
      return `${value.toFixed(2)} $`
    case 'number':
      if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)} Bio`
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)} Mrd`
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)} Mio`
      return value.toLocaleString('de-DE')
    default:
      return value.toFixed(2)
  }
}

/**
 * Format Y-axis tick value.
 */
export function formatYAxisTick(value: number, unit: string): string {
  switch (unit) {
    case 'multiple':
      return `${value.toFixed(0)}x`
    case 'percent':
      return `${value.toFixed(0)}%`
    case 'currency':
      if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(0)} Bio`
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(0)} Mrd`
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(0)} Mio`
      return `$${value.toFixed(0)}`
    case 'number':
      if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(1)} Bio`
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)} Mrd`
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(0)} Mio`
      return value.toLocaleString('de-DE')
    default:
      return value.toFixed(1)
  }
}
