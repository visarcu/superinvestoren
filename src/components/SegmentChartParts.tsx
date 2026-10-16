// src/components/SegmentChartParts.tsx
// Gemeinsame Bausteine der Segment-Charts (Übersichtskachel + Modal)
'use client'

import React from 'react'
import { Bar, Cell } from 'recharts'
import {
  SegmentPeriod,
  SegmentSeries,
  UNASSIGNED_COLOR,
  UNASSIGNED_LABEL,
  hasUnassigned,
} from '@/lib/revenueSegments'

// Schraffur für den Umsatzanteil ohne Segmentzuordnung.
// Als Funktion statt Komponente, weil Recharts nur direkte <defs>-Kinder rendert.
export function unassignedPatternDefs(id: string) {
  return (
    <defs key={`defs-${id}`}>
      <pattern id={id} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="6" height="6" fill={UNASSIGNED_COLOR} fillOpacity={0.18} />
        <line x1="0" y1="0" x2="0" y2="6" stroke={UNASSIGNED_COLOR} strokeWidth="2.5" strokeOpacity={0.75} />
      </pattern>
    </defs>
  )
}

// Gestapelte Balken: größtes aktuelles Segment unten, "Nicht zugeordnet" oben.
// Mit highlightLabel werden alle anderen Perioden abgeblendet.
export function renderSegmentBars(series: SegmentSeries, patternId: string, highlightLabel?: string | null) {
  const showUnassigned = hasUnassigned(series.periods)
  const cells = highlightLabel
    ? series.periods.map(p => (
        <Cell
          key={p.label}
          fillOpacity={p.label === highlightLabel ? 1 : 0.3}
          style={{ transition: 'fill-opacity 200ms' }}
        />
      ))
    : null
  const bars = series.keys.map((key, index) => (
    <Bar
      key={key}
      dataKey={(p: SegmentPeriod) => p.values[key] ?? 0}
      name={series.names[key]}
      stackId="segments"
      fill={series.colors[key]}
      radius={!showUnassigned && index === series.keys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
    >
      {cells}
    </Bar>
  ))
  if (showUnassigned) {
    bars.push(
      <Bar
        key="__unassigned"
        dataKey={(p: SegmentPeriod) => p.unassigned}
        name={UNASSIGNED_LABEL}
        stackId="segments"
        fill={`url(#${patternId})`}
        radius={[2, 2, 0, 0]}
      >
        {cells}
      </Bar>
    )
  }
  return bars
}

// Gesamtwert einer Periode: bei fehlenden Segmenten der gemeldete Umsatz
export function periodTotal(p: SegmentPeriod): number {
  return p.unassigned > 0 && p.revenue ? p.revenue : p.segmentSum
}

interface SegmentTooltipProps {
  active?: boolean
  payload?: any[]
  series: SegmentSeries
  variant: 'card' | 'modal'
  formatCurrency: (value: number) => string
}

export function SegmentTooltip({ active, payload, series, variant, formatCurrency }: SegmentTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const period: SegmentPeriod | undefined = payload[0]?.payload
  if (!period) return null

  const maxRows = variant === 'card' ? 6 : 10
  const rows = series.keys
    .filter(key => (period.values[key] || 0) > 0)
    .map(key => ({ key, name: series.names[key], color: series.colors[key], value: period.values[key] }))
  const visibleRows = rows.slice(0, maxRows)
  const hiddenCount = rows.length - visibleRows.length

  const isModal = variant === 'modal'
  const containerClass = isModal
    ? 'rounded-[10px] border border-slate-400/20 bg-slate-900/95 px-3.5 py-2.5 shadow-xl'
    : 'bg-theme-card rounded-lg px-3 py-2 backdrop-blur-sm border border-theme/20 shadow-lg'
  const labelClass = isModal ? 'text-[13px] font-semibold text-slate-100 mb-2' : 'text-theme-secondary text-xs mb-1'
  const valueClass = isModal ? 'text-slate-100 font-medium' : 'text-theme-primary font-medium'
  const mutedClass = isModal ? 'text-slate-400' : 'text-theme-secondary'
  const textSize = isModal ? 'text-xs' : 'text-[11px]'

  return (
    <div className={`${containerClass} max-w-[320px]`}>
      <p className={labelClass}>{period.label}</p>
      {visibleRows.map(row => (
        <div key={row.key} className={`flex items-center justify-between gap-4 ${textSize} leading-5`}>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
            <span className={`truncate ${mutedClass}`}>{row.name}</span>
          </span>
          <span className={`${valueClass} tabular-nums whitespace-nowrap`}>{formatCurrency(row.value)}</span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <p className={`${textSize} ${mutedClass} mt-0.5`}>+{hiddenCount} weitere</p>
      )}
      {period.unassigned > 0 && (
        <div className={`flex items-center justify-between gap-4 ${textSize} leading-5`}>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: UNASSIGNED_COLOR }} />
            <span className={`truncate ${mutedClass}`}>{UNASSIGNED_LABEL}</span>
          </span>
          <span className={`${valueClass} tabular-nums whitespace-nowrap`}>{formatCurrency(period.unassigned)}</span>
        </div>
      )}
      <div className={`mt-1.5 pt-1.5 border-t ${isModal ? 'border-slate-400/20' : 'border-theme/20'}`}>
        <div className={`flex justify-between gap-4 ${textSize} font-semibold`}>
          <span className={mutedClass}>{period.unassigned > 0 ? 'Gemeldeter Umsatz' : 'Gesamt'}</span>
          <span className={`${valueClass} tabular-nums`}>{formatCurrency(periodTotal(period))}</span>
        </div>
        {period.overlapping && period.revenue && (
          <div className={`flex justify-between gap-4 ${textSize} ${mutedClass}`}>
            <span>Gemeldeter Umsatz</span>
            <span className="tabular-nums">{formatCurrency(period.revenue)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Kompakte Legende unter dem Verlauf (Modal)
export function SegmentLegend({ series, patternId }: { series: SegmentSeries; patternId: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {series.keys.map(key => (
        <span key={key} className="flex items-center gap-1.5 text-xs text-theme-secondary">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: series.colors[key] }} />
          {series.names[key]}
        </span>
      ))}
      {hasUnassigned(series.periods) && (
        <span className="flex items-center gap-1.5 text-xs text-theme-secondary">
          <svg className="w-2.5 h-2.5 rounded-sm" aria-hidden>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
          {UNASSIGNED_LABEL}
        </span>
      )}
    </div>
  )
}
