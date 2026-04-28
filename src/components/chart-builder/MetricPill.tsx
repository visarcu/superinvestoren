// src/components/chart-builder/MetricPill.tsx
'use client'

import { EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ActiveMetric } from './types'
import { getMetricDefinition } from './metricRegistry'

interface MetricPillProps {
  metric: ActiveMetric
  onToggleVisibility: (id: string) => void
  onRemove: (id: string) => void
}

export default function MetricPill({ metric, onToggleVisibility, onRemove }: MetricPillProps) {
  const def = getMetricDefinition(metric.metricKey)
  if (!def) return null

  return (
    <div
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-[12px] ${
        metric.visible
          ? 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
          : 'bg-white/[0.015] border border-white/[0.03] opacity-50'
      }`}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: metric.visible ? metric.color : 'rgba(255,255,255,0.2)' }}
      />
      <span className="text-white/85 font-medium truncate">
        {metric.stockTicker}
      </span>
      <span className="text-white/35 truncate flex-1">
        {def.label}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onToggleVisibility(metric.id)}
          className="p-1 hover:bg-white/[0.08] rounded-md transition-colors"
          title={metric.visible ? 'Ausblenden' : 'Einblenden'}
        >
          {metric.visible ? (
            <EyeIcon className="w-3.5 h-3.5 text-white/45" />
          ) : (
            <EyeSlashIcon className="w-3.5 h-3.5 text-white/45" />
          )}
        </button>
        <button
          onClick={() => onRemove(metric.id)}
          className="p-1 hover:bg-red-500/15 rounded-md transition-colors"
          title="Entfernen"
        >
          <XMarkIcon className="w-3.5 h-3.5 text-white/45 hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}
