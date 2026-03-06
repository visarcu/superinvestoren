// src/components/chart-builder/TimeControls.tsx
'use client'

import { Granularity, TimeRange, ViewMode } from './types'

interface TimeControlsProps {
  granularity: Granularity
  timeRange: TimeRange
  viewMode: ViewMode
  hasPriceMetric: boolean
  onGranularityChange: (g: Granularity) => void
  onTimeRangeChange: (r: TimeRange) => void
  onViewModeChange: (m: ViewMode) => void
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'annual', label: 'Jährlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
  { value: 'quarterly_ttm', label: 'Q-TTM' },
]

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1Y', label: '1J' },
  { value: '3Y', label: '3J' },
  { value: '5Y', label: '5J' },
  { value: '10Y', label: '10J' },
  { value: 'MAX', label: 'MAX' },
]

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'indexed', label: 'Indiziert' },
  { value: 'percent_change', label: '% Veränderung' },
  { value: 'log', label: 'Log' },
]

export default function TimeControls({
  granularity,
  timeRange,
  viewMode,
  hasPriceMetric,
  onGranularityChange,
  onTimeRangeChange,
  onViewModeChange,
}: TimeControlsProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 flex-wrap">
      {/* Granularity */}
      {!hasPriceMetric && (
        <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5">
          {GRANULARITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onGranularityChange(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                granularity === opt.value
                  ? 'bg-white/[0.1] text-theme-primary'
                  : 'text-theme-muted hover:text-theme-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Time Range */}
      <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5">
        {TIME_RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onTimeRangeChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              timeRange === opt.value
                ? 'bg-white/[0.1] text-theme-primary'
                : 'text-theme-muted hover:text-theme-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* View Mode */}
      <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5">
        {VIEW_MODE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onViewModeChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === opt.value
                ? 'bg-white/[0.1] text-theme-primary'
                : 'text-theme-muted hover:text-theme-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
