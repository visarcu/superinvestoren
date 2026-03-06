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
      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-xs ${
        metric.visible
          ? 'bg-white/[0.05] border border-white/[0.08]'
          : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
      }`}
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: metric.visible ? metric.color : '#555' }}
      />
      <span className="text-theme-secondary font-medium truncate flex-1">
        {metric.stockTicker}
      </span>
      <span className="text-theme-muted truncate">
        {def.label}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleVisibility(metric.id)}
          className="p-0.5 hover:bg-white/10 rounded transition-colors"
          title={metric.visible ? 'Ausblenden' : 'Einblenden'}
        >
          {metric.visible ? (
            <EyeIcon className="w-3.5 h-3.5 text-theme-muted" />
          ) : (
            <EyeSlashIcon className="w-3.5 h-3.5 text-theme-muted" />
          )}
        </button>
        <button
          onClick={() => onRemove(metric.id)}
          className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
          title="Entfernen"
        >
          <XMarkIcon className="w-3.5 h-3.5 text-theme-muted hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}
