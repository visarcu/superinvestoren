// src/components/chart-builder/ChartCanvas.tsx
'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
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

  // Get current values for performance labels
  const currentValues = useMemo(() => {
    if (chartData.length === 0) return {}
    const lastPoint = chartData[chartData.length - 1]
    const values: Record<string, { value: number; color: string; label: string }> = {}
    for (const metric of visibleMetrics) {
      const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
      const val = lastPoint[seriesKey]
      if (typeof val === 'number') {
        const def = getMetricDefinition(metric.metricKey)
        const unit = viewMode === 'percent_change' || viewMode === 'indexed'
          ? 'percent'
          : (def?.unit || 'number')
        values[seriesKey] = {
          value: val,
          color: metric.color,
          label: `${metric.stockTicker} ${def?.label || ''}`,
        }
      }
    }
    return values
  }, [chartData, visibleMetrics, viewMode])

  if (visibleMetrics.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
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

  // Determine Y-axis unit for formatting
  const leftAxisUnit = yAxisConfigs.find(c => c.side === 'left')?.unit || 'number'
  const rightAxisUnit = yAxisConfigs.find(c => c.side === 'right')?.unit
  const hasRightAxis = yAxisConfigs.length > 1

  // Override unit for view modes that transform values
  const effectiveLeftUnit = (viewMode === 'percent_change' || viewMode === 'indexed') ? 'percent' : leftAxisUnit
  const effectiveRightUnit = (viewMode === 'percent_change' || viewMode === 'indexed') ? 'percent' : rightAxisUnit

  return (
    <div className="flex-1 relative" id="chart-builder-canvas">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-theme-primary/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      <div className="h-full w-full p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: hasRightAxis ? 80 : 60, left: 20, bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.1)"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={(value: string) => {
                if (value.length <= 4) return value
                // Quarterly format like "Q1 2023"
                if (value.startsWith('Q')) return value
                // Date format
                const date = new Date(value)
                return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
              }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="rgba(255,255,255,0.1)"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              width={70}
              tickFormatter={(value: number) => formatYAxisTick(value, effectiveLeftUnit)}
              domain={['auto', 'auto']}
              scale={viewMode === 'log' ? 'log' : 'auto'}
              allowDataOverflow={viewMode === 'log'}
            />
            {hasRightAxis && effectiveRightUnit && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="rgba(255,255,255,0.1)"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                width={70}
                tickFormatter={(value: number) => formatYAxisTick(value, effectiveRightUnit)}
                domain={['auto', 'auto']}
                scale={viewMode === 'log' ? 'log' : 'auto'}
                allowDataOverflow={viewMode === 'log'}
              />
            )}

            {/* Reference line at zero for indexed/percent_change modes */}
            {(viewMode === 'indexed' || viewMode === 'percent_change') && (
              <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
            )}

            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#1a1a1d',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '8px', fontWeight: 500 }}
              formatter={(value: number, name: string) => {
                const [ticker, metricKey] = name.split('_')
                const def = getMetricDefinition(metricKey)
                const unit = (viewMode === 'percent_change' || viewMode === 'indexed')
                  ? 'percent'
                  : (def?.unit || 'number')
                return [formatMetricValue(value, unit), `${ticker} ${def?.label || metricKey}`]
              }}
            />

            {visibleMetrics.map(metric => {
              const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
              const def = getMetricDefinition(metric.metricKey)
              const yAxisId = hasRightAxis && metric.yAxisSide === 'right' ? 'right' : 'left'

              return (
                <Line
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  yAxisId={yAxisId}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  name={seriesKey}
                  connectNulls
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance labels on right edge */}
      {Object.entries(currentValues).length > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {Object.entries(currentValues).map(([key, { value, color, label }]) => {
            const def = getMetricDefinition(key.split('_')[1])
            const unit = (viewMode === 'percent_change' || viewMode === 'indexed')
              ? 'percent'
              : (def?.unit || 'number')
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap"
                style={{ backgroundColor: `${color}20`, color }}
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
