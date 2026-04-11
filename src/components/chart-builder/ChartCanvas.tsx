// src/components/chart-builder/ChartCanvas.tsx
'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts'
import {
  ActiveMetric,
  ChartDataPoint,
  ViewMode,
  YAxisConfig,
} from './types'
import { getMetricDefinition } from './metricRegistry'
import { formatYAxisTick, formatMetricValue } from './dataProcessing'

interface ChartCanvasProps {
  chartData: ChartDataPoint[]
  activeMetrics: ActiveMetric[]
  yAxisConfigs: YAxisConfig[]
  viewMode: ViewMode
  loading: boolean
}

/** Determine whether a metric should render as a bar or line */
function getEffectiveChartType(metricKey: string, viewMode: ViewMode): 'bar' | 'line' {
  // In transformed views, always use lines (bars don't make sense for indexed/% change)
  if (viewMode === 'indexed' || viewMode === 'percent_change' || viewMode === 'log') {
    return 'line'
  }
  const def = getMetricDefinition(metricKey)
  return def?.preferredChartType || 'line'
}

// Custom tooltip component for a cleaner look
function CustomTooltip({ active, payload, label, viewMode }: any) {
  if (!active || !payload || payload.length === 0) return null

  // Format the date label
  let formattedLabel = label
  if (label && label.length === 10 && label.includes('-')) {
    const date = new Date(label)
    formattedLabel = date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-[#1c1c1f] border border-white/[0.12] rounded-lg shadow-xl px-3.5 py-3 min-w-[180px]">
      <div className="text-[11px] font-semibold text-white/60 mb-2 tracking-wide">
        {formattedLabel}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry: any) => {
          if (entry.value === undefined || entry.value === null) return null
          const [ticker, metricKey] = entry.name.split('_')
          const def = getMetricDefinition(metricKey)
          const unit = (viewMode === 'percent_change' || viewMode === 'indexed')
            ? 'percent'
            : (def?.unit || 'number')
          return (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span className="text-[11px] text-white/70 truncate">
                  {def?.label || metricKey}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white/50">{ticker}:</span>
                <span className="text-[11px] font-bold text-white tabular-nums">
                  {formatMetricValue(entry.value, unit)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ChartCanvas({
  chartData,
  activeMetrics,
  yAxisConfigs,
  viewMode,
  loading,
}: ChartCanvasProps) {
  const visibleMetrics = useMemo(
    () => activeMetrics.filter(m => m.visible),
    [activeMetrics]
  )

  // Split metrics into bar and line groups
  const { barMetrics, lineMetrics } = useMemo(() => {
    const bars: ActiveMetric[] = []
    const lines: ActiveMetric[] = []
    for (const m of visibleMetrics) {
      if (getEffectiveChartType(m.metricKey, viewMode) === 'bar') {
        bars.push(m)
      } else {
        lines.push(m)
      }
    }
    return { barMetrics: bars, lineMetrics: lines }
  }, [visibleMetrics, viewMode])

  const hasBars = barMetrics.length > 0
  const hasLines = lineMetrics.length > 0
  const isComboChart = hasBars && hasLines

  // In combo mode: bars → left axis, lines → right axis (separate scales)
  // Determine the unit for each axis based on chart type grouping
  const comboLeftUnit = useMemo(() => {
    if (!isComboChart) return null
    const barDef = barMetrics[0] && getMetricDefinition(barMetrics[0].metricKey)
    return barDef?.unit || 'currency'
  }, [isComboChart, barMetrics])

  const comboRightUnit = useMemo(() => {
    if (!isComboChart) return null
    // Pick the most common unit among line metrics
    const unitCounts = new Map<string, number>()
    for (const m of lineMetrics) {
      const def = getMetricDefinition(m.metricKey)
      if (def) unitCounts.set(def.unit, (unitCounts.get(def.unit) || 0) + 1)
    }
    let best = 'number'
    let bestCount = 0
    for (const [unit, count] of unitCounts) {
      if (count > bestCount) { best = unit; bestCount = count }
    }
    return best
  }, [isComboChart, lineMetrics])

  // Get current values for performance labels
  const currentValues = useMemo(() => {
    if (chartData.length === 0) return {}
    const lastPoint = chartData[chartData.length - 1]
    const values: Record<string, { value: number; color: string; ticker: string; label: string }> = {}
    for (const metric of visibleMetrics) {
      const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
      const val = lastPoint[seriesKey]
      if (typeof val === 'number') {
        const def = getMetricDefinition(metric.metricKey)
        values[seriesKey] = {
          value: val,
          color: metric.color,
          ticker: metric.stockTicker,
          label: def?.label || '',
        }
      }
    }
    return values
  }, [chartData, visibleMetrics])

  // Determine X-axis interval: show all ticks for sparse data (annual/quarterly),
  // use auto for dense data (daily prices)
  const xAxisInterval = useMemo(() => {
    if (chartData.length <= 15) return 0
    if (chartData.length <= 30) return 1
    return 'preserveStartEnd' as const
  }, [chartData.length])

  // Determine Y-axis unit for formatting
  // In combo mode, override axis units: bars (left) use bar unit, lines (right) use line unit
  const configLeftUnit = yAxisConfigs.find(c => c.side === 'left')?.unit || 'number'
  const configRightUnit = yAxisConfigs.find(c => c.side === 'right')?.unit
  const configHasRightAxis = yAxisConfigs.length > 1

  const leftAxisUnit = isComboChart ? (comboLeftUnit || 'currency') : configLeftUnit
  const rightAxisUnit = isComboChart ? (comboRightUnit || 'number') : configRightUnit
  const hasRightAxis = isComboChart || configHasRightAxis

  const effectiveLeftUnit = (viewMode === 'percent_change' || viewMode === 'indexed') ? 'percent' : leftAxisUnit
  const effectiveRightUnit = (viewMode === 'percent_change' || viewMode === 'indexed') ? 'percent' : rightAxisUnit

  if (visibleMetrics.length === 0 && !loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-theme-muted opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-theme-secondary text-sm font-medium">Vergleich starten</p>
          <p className="text-theme-muted text-xs mt-1">
            Füge mindestens eine Aktie und eine Metrik hinzu
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative" id="chart-builder-canvas">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-theme-primary/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-theme-muted font-medium">Daten laden...</span>
          </div>
        </div>
      )}

      <div className="h-full w-full px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 16, right: hasRightAxis ? 80 : 50, left: 10, bottom: 20 }}
            barCategoryGap={hasBars ? '15%' : undefined}
            barGap={2}
          >
            {/* Grid: subtle horizontal lines, very faint verticals */}
            <CartesianGrid
              strokeDasharray="none"
              stroke="rgba(255,255,255,0.06)"
              vertical={!hasBars}
              horizontalPoints={undefined}
              verticalFill={[]}
              horizontalFill={[]}
            />

            {/* X-Axis */}
            <XAxis
              dataKey="date"
              axisLine={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
              tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value: string) => {
                // Annual: "2023"
                if (value.length <= 4) return value
                // Quarterly: "Q1 2023"
                if (value.startsWith('Q')) return value
                // Daily: "Mär 25"
                const date = new Date(value)
                return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
              }}
              interval={xAxisInterval}
              minTickGap={40}
              dy={8}
              padding={{ left: 10, right: 10 }}
            />

            {/* Left Y-Axis — start from 0 when bars are present */}
            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500 }}
              width={65}
              tickFormatter={(value: number) => formatYAxisTick(value, effectiveLeftUnit)}
              domain={hasBars ? [0, 'auto'] : ['auto', 'auto']}
              scale={viewMode === 'log' ? 'log' : 'auto'}
              allowDataOverflow={viewMode === 'log'}
              dx={-4}
            />

            {/* Right Y-Axis */}
            {hasRightAxis && effectiveRightUnit && (
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500 }}
                width={65}
                tickFormatter={(value: number) => formatYAxisTick(value, effectiveRightUnit)}
                domain={['auto', 'auto']}
                scale={viewMode === 'log' ? 'log' : 'auto'}
                allowDataOverflow={viewMode === 'log'}
                dx={4}
              />
            )}

            {/* Reference line at zero for indexed/percent_change modes */}
            {(viewMode === 'indexed' || viewMode === 'percent_change') && (
              <ReferenceLine
                yAxisId="left"
                y={0}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}

            {/* Custom Tooltip */}
            <RechartsTooltip
              content={<CustomTooltip viewMode={viewMode} />}
              cursor={hasBars ? { fill: 'rgba(255,255,255,0.04)' } : {
                stroke: 'rgba(255,255,255,0.15)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
              isAnimationActive={false}
            />

            {/* === Bar metrics (rendered first so lines appear on top) === */}
            {/* In combo mode: bars always on left axis */}
            {barMetrics.map(metric => {
              const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
              const yAxisId = isComboChart
                ? 'left'
                : (hasRightAxis && metric.yAxisSide === 'right' ? 'right' : 'left')

              return (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  yAxisId={yAxisId}
                  fill={metric.color}
                  fillOpacity={0.88}
                  radius={[3, 3, 0, 0] as any}
                  name={seriesKey}
                  animationDuration={400}
                  animationEasing="ease-out"
                  maxBarSize={50}
                />
              )
            })}

            {/* === Line metrics (rendered on top of bars) === */}
            {/* In combo mode: lines always on right axis */}
            {lineMetrics.map(metric => {
              const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
              const yAxisId = isComboChart
                ? 'right'
                : (hasRightAxis && metric.yAxisSide === 'right' ? 'right' : 'left')

              return (
                <Line
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  yAxisId={yAxisId}
                  stroke={metric.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: metric.color,
                    fill: '#1c1c1f',
                  }}
                  name={seriesKey}
                  connectNulls
                  animationDuration={400}
                  animationEasing="ease-out"
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Performance labels on right edge */}
      {Object.entries(currentValues).length > 0 && (
        <div className="absolute right-2 top-8 flex flex-col gap-1.5">
          {Object.entries(currentValues).map(([key, { value, color, ticker, label }]) => {
            const def = getMetricDefinition(key.split('_')[1])
            const unit = (viewMode === 'percent_change' || viewMode === 'indexed')
              ? 'percent'
              : (def?.unit || 'number')
            return (
              <div
                key={key}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap tabular-nums"
                style={{
                  backgroundColor: `${color}15`,
                  color,
                  borderLeft: `2px solid ${color}`,
                }}
              >
                {formatMetricValue(value, unit)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
