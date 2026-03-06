// src/components/chart-builder/ChartFooter.tsx
'use client'

import { useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ActiveMetric, ChartDataPoint, ViewMode } from './types'
import { getMetricDefinition } from './metricRegistry'
import { calculateSeriesStats, formatMetricValue } from './dataProcessing'

interface ChartFooterProps {
  activeMetrics: ActiveMetric[]
  chartData: ChartDataPoint[]
  viewMode: ViewMode
  onRemoveMetric: (id: string) => void
}

export default function ChartFooter({
  activeMetrics,
  chartData,
  viewMode,
  onRemoveMetric,
}: ChartFooterProps) {
  const visibleMetrics = activeMetrics.filter(m => m.visible)

  if (visibleMetrics.length === 0) return null

  return (
    <div className="border-t border-white/[0.06] bg-theme-primary">
      <div className="px-4 py-2">
        <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider mb-2">
          Graph-Serien
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-theme-muted uppercase tracking-wider">
                <th className="text-left pb-1.5 pr-4 font-medium">Serie</th>
                <th className="text-right pb-1.5 px-3 font-medium">Min</th>
                <th className="text-right pb-1.5 px-3 font-medium">Durchschnitt</th>
                <th className="text-right pb-1.5 px-3 font-medium">Max</th>
                <th className="text-right pb-1.5 px-3 font-medium">Aktuell</th>
                <th className="w-8 pb-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {visibleMetrics.map(metric => {
                const def = getMetricDefinition(metric.metricKey)
                const seriesKey = `${metric.stockTicker}_${metric.metricKey}`
                const stats = calculateSeriesStats(chartData, seriesKey)
                const unit = (viewMode === 'percent_change' || viewMode === 'indexed')
                  ? 'percent'
                  : (def?.unit || 'number')

                return (
                  <tr key={metric.id} className="group">
                    <td className="py-1.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: metric.color }}
                        />
                        <span className="text-xs font-semibold text-theme-primary">{metric.stockTicker}</span>
                        <span className="text-xs text-theme-muted">{def?.label}</span>
                      </div>
                    </td>
                    <td className="text-right py-1.5 px-3">
                      <span className="text-xs text-red-400 font-mono">
                        {stats ? formatMetricValue(stats.min, unit) : '-'}
                      </span>
                    </td>
                    <td className="text-right py-1.5 px-3">
                      <span className="text-xs text-theme-muted font-mono">
                        {stats ? formatMetricValue(stats.avg, unit) : '-'}
                      </span>
                    </td>
                    <td className="text-right py-1.5 px-3">
                      <span className="text-xs text-green-400 font-mono">
                        {stats ? formatMetricValue(stats.max, unit) : '-'}
                      </span>
                    </td>
                    <td className="text-right py-1.5 px-3">
                      <span className="text-xs text-theme-primary font-semibold font-mono">
                        {stats ? formatMetricValue(stats.current, unit) : '-'}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <button
                        onClick={() => onRemoveMetric(metric.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all"
                      >
                        <XMarkIcon className="w-3.5 h-3.5 text-theme-muted hover:text-red-400" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
