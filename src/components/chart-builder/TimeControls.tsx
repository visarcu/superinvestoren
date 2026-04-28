// src/components/chart-builder/TimeControls.tsx
'use client'

import { LockClosedIcon } from '@heroicons/react/24/outline'
import { Granularity, TimeRange, ViewMode } from './types'

const PREMIUM_TIMERANGES = new Set<TimeRange>(['10Y', 'MAX'])

interface TimeControlsProps {
  granularity: Granularity
  timeRange: TimeRange
  viewMode: ViewMode
  hasPriceMetric: boolean
  isPremium: boolean
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
  isPremium,
  onGranularityChange,
  onTimeRangeChange,
  onViewModeChange,
}: TimeControlsProps) {
  return (
    <div className="flex items-center gap-3 px-6 sm:px-8 py-3 flex-wrap">
      {/* Granularity */}
      {!hasPriceMetric && (
        <div className="flex items-center bg-white/[0.02] border border-white/[0.05] rounded-xl p-0.5">
          {GRANULARITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onGranularityChange(opt.value)}
              className={`px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                granularity === opt.value
                  ? 'bg-white/[0.08] text-white/90'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Time Range */}
      <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5">
        {TIME_RANGE_OPTIONS.map(opt => {
          const locked = !isPremium && PREMIUM_TIMERANGES.has(opt.value)
          return (
            <a
              key={opt.value}
              href={locked ? '/pricing' : undefined}
              onClick={locked ? undefined : () => onTimeRangeChange(opt.value)}
              className={`flex items-center gap-1 px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors cursor-pointer ${
                timeRange === opt.value
                  ? 'bg-white/[0.08] text-white/90'
                  : locked
                  ? 'text-white/30 opacity-60'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {opt.label}
              {locked && <LockClosedIcon className="w-2.5 h-2.5" />}
            </a>
          )
        })}
      </div>

      <div className="flex-1" />

      {/* View Mode */}
      <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5">
        {VIEW_MODE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onViewModeChange(opt.value)}
            className={`px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
              viewMode === opt.value
                ? 'bg-white/[0.08] text-white/90'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
