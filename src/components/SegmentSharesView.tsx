// src/components/SegmentSharesView.tsx
// Anteils-Ansicht der Segmente im Modal: Donut für eine Periode + Liste mit Anteil und Vorjahresvergleich
'use client'

import React, { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import {
  SegmentPeriod,
  SegmentSeries,
  UNASSIGNED_COLOR,
  UNASSIGNED_LABEL,
} from '@/lib/revenueSegments'
import { periodTotal } from './SegmentChartParts'

const DAY_MS = 24 * 60 * 60 * 1000

interface Slice {
  key: string
  name: string
  value: number
  share: number
  color: string
  fill: string
  yoy: number | null
  isNew: boolean
  isUnassigned?: boolean
}

// Vergleichsperiode ein Jahr davor (bei Quartalen: Vorjahresquartal)
function findPreviousYear(periods: SegmentPeriod[], current: SegmentPeriod): SegmentPeriod | null {
  const target = new Date(`${current.date}T00:00:00Z`).getTime() - 365 * DAY_MS
  let best: SegmentPeriod | null = null
  let bestDiff = Infinity
  for (const p of periods) {
    const diff = Math.abs(new Date(`${p.date}T00:00:00Z`).getTime() - target)
    if (diff <= 20 * DAY_MS && diff < bestDiff) {
      best = p
      bestDiff = diff
    }
  }
  return best
}

const formatPercent = (value: number, digits = 1) =>
  `${value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`

const formatChange = (value: number) =>
  `${value >= 0 ? '+' : '−'}${formatPercent(Math.abs(value))}`

export default function SegmentSharesView({
  series,
  allPeriods,
  selectedLabel,
  onSelectLabel,
  patternId,
  formatCurrency,
  layout = 'wide',
}: {
  series: SegmentSeries
  // Vollständige Historie für den Vorjahresvergleich der ältesten sichtbaren Periode
  allPeriods: SegmentPeriod[]
  selectedLabel: string | null
  onSelectLabel: (label: string) => void
  patternId: string
  formatCurrency: (value: number) => string
  // wide: Donut und Liste nebeneinander (volle Breite); stacked: untereinander (Seitenspalte neben dem Verlauf)
  layout?: 'wide' | 'stacked'
}) {
  const stacked = layout === 'stacked'
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const periods = series.periods
  // Ohne (gültige) Auswahl: jüngste Periode
  const found = selectedLabel ? periods.findIndex(p => p.label === selectedLabel) : -1
  const index = found === -1 ? periods.length - 1 : found
  const period = periods[index]

  const { slices, base } = useMemo(() => {
    if (!period) return { slices: [] as Slice[], base: 0 }
    const base = periodTotal(period)
    const previous = findPreviousYear(allPeriods, period)

    const segmentSlices: Slice[] = Object.entries(period.values)
      .map(([key, value]) => {
        const prevValue = previous?.values[key]
        return {
          key,
          name: series.names[key] || key,
          value,
          share: (value / base) * 100,
          color: series.colors[key],
          fill: series.colors[key],
          yoy: prevValue ? ((value - prevValue) / prevValue) * 100 : null,
          isNew: !!previous && !prevValue,
        }
      })
      .sort((a, b) => b.value - a.value)

    if (period.unassigned > 0) {
      segmentSlices.push({
        key: '__unassigned',
        name: UNASSIGNED_LABEL,
        value: period.unassigned,
        share: (period.unassigned / base) * 100,
        color: UNASSIGNED_COLOR,
        fill: `url(#${patternId})`,
        yoy: null,
        isNew: false,
        isUnassigned: true,
      })
    }
    return { slices: segmentSlices, base }
  }, [period, allPeriods, series, patternId])

  if (!period) return null

  const hovered = slices.find(s => s.key === hoveredKey) || null
  const gapX = stacked ? 'gap-x-3' : 'gap-x-5'
  const textSize = stacked ? 'text-xs' : 'text-[13px]'
  const segmentCount = Object.keys(period.values).length

  return (
    <div className={`h-full flex flex-col min-h-0 ${stacked ? 'gap-3' : 'gap-5'}`}>
      {/* Periodenwahl */}
      <div className="flex items-center justify-center gap-2 shrink-0">
        <button
          onClick={() => onSelectLabel(periods[index - 1].label)}
          disabled={index === 0}
          aria-label="Vorherige Periode"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="min-w-[72px] text-center text-sm font-semibold text-theme-primary tabular-nums">
          {period.label}
        </span>
        <button
          onClick={() => onSelectLabel(periods[index + 1].label)}
          disabled={index === periods.length - 1}
          aria-label="Nächste Periode"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      <div className={stacked
        ? 'flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto'
        : 'flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),minmax(0,1.2fr)] gap-8 items-center overflow-y-auto lg:overflow-visible'
      }>
        {/* Donut */}
        <div className={`relative w-full aspect-square mx-auto ${stacked ? 'max-w-[220px] shrink-0' : 'max-w-[380px]'}`}>
          <svg width="0" height="0" className="absolute" aria-hidden>
            <defs>
              <pattern id={patternId} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={UNASSIGNED_COLOR} fillOpacity={0.18} />
                <line x1="0" y1="0" x2="0" y2="6" stroke={UNASSIGNED_COLOR} strokeWidth="2.5" strokeOpacity={0.75} />
              </pattern>
            </defs>
          </svg>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="98%"
                paddingAngle={slices.length > 1 ? 1.5 : 0}
                stroke="var(--color-bg-primary)"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
                animationDuration={400}
                onMouseEnter={(_, i) => setHoveredKey(slices[i]?.key ?? null)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                {slices.map(s => (
                  <Cell
                    key={s.key}
                    fill={s.fill}
                    fillOpacity={hoveredKey === null || hoveredKey === s.key ? 1 : 0.3}
                    style={{ transition: 'fill-opacity 200ms', cursor: 'pointer', outline: 'none' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-[58%]">
              {hovered ? (
                <>
                  <p className="text-[11px] text-theme-muted uppercase tracking-wider mb-1 truncate">{hovered.name}</p>
                  <p className={`${stacked ? 'text-lg' : 'text-xl'} font-semibold text-theme-primary tracking-tight tabular-nums`}>
                    {formatPercent(hovered.share)}
                  </p>
                  <p className="text-xs text-theme-secondary tabular-nums mt-0.5">{formatCurrency(hovered.value)}</p>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-theme-muted uppercase tracking-wider mb-1">Umsatz {period.label}</p>
                  <p className={`${stacked ? 'text-lg' : 'text-xl'} font-semibold text-theme-primary tracking-tight tabular-nums`}>
                    {formatCurrency(base)}
                  </p>
                  <p className="text-xs text-theme-secondary mt-0.5">
                    {segmentCount} {segmentCount === 1 ? 'Segment' : 'Segmente'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Liste */}
        <div className={stacked ? 'w-full' : 'w-full max-w-[560px] mx-auto lg:mx-0'}>
          <div className={`grid grid-cols-[minmax(0,1fr),auto,auto,auto] ${gapX} px-2 pb-2 text-[11px] uppercase tracking-wider text-theme-muted border-b border-theme`}>
            <span>Segment</span>
            <span className="text-right">Umsatz</span>
            <span className="text-right w-14">Anteil</span>
            <span className={`text-right ${stacked ? 'w-16' : 'w-20'}`}>{stacked ? 'ggü. VJ' : 'ggü. Vorjahr'}</span>
          </div>
          <div className="mt-1">
            {slices.map(s => (
              <div
                key={s.key}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`grid grid-cols-[minmax(0,1fr),auto,auto,auto] ${gapX} items-center px-2 ${stacked ? 'py-1.5' : 'py-2'} rounded-lg transition-colors ${
                  hoveredKey === s.key ? 'bg-theme-hover' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.isUnassigned ? (
                      <svg className="w-2.5 h-2.5 rounded-sm shrink-0" aria-hidden>
                        <rect width="100%" height="100%" fill={s.fill} />
                      </svg>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                    )}
                    <span className={`${textSize} truncate ${s.isUnassigned ? 'text-theme-muted' : 'text-theme-primary'}`}>
                      {s.name}
                    </span>
                  </div>
                  <div className="ml-[18px] mt-1.5 h-1 rounded-full bg-theme-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, s.share)}%`, backgroundColor: s.color, opacity: 0.8 }}
                    />
                  </div>
                </div>
                <span className={`${textSize} text-theme-primary tabular-nums text-right whitespace-nowrap`}>
                  {formatCurrency(s.value)}
                </span>
                <span className={`${textSize} text-theme-secondary tabular-nums text-right w-14 whitespace-nowrap`}>
                  {formatPercent(s.share)}
                </span>
                <span className={`${textSize} tabular-nums text-right ${stacked ? 'w-16' : 'w-20'} whitespace-nowrap ${
                  s.yoy == null
                    ? 'text-theme-muted'
                    : s.yoy >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {s.yoy != null ? formatChange(s.yoy) : s.isNew ? 'neu' : '—'}
                </span>
              </div>
            ))}
          </div>

          {period.unassigned > 0 && period.revenue && (
            <p className="mt-4 px-2 text-xs leading-relaxed text-theme-muted">
              Für {period.label} fehlen in den Segmentdaten {formatCurrency(period.unassigned)} (
              {formatPercent((period.unassigned / period.revenue) * 100)}) des gemeldeten Umsatzes.
              Dieser Teil ist als „{UNASSIGNED_LABEL}“ dargestellt.
            </p>
          )}
          {period.overlapping && period.revenue && (
            <p className="mt-4 px-2 text-xs leading-relaxed text-theme-muted">
              Die Segmente summieren sich auf {formatPercent((period.segmentSum / period.revenue) * 100, 0)} des
              gemeldeten Umsatzes ({formatCurrency(period.revenue)}), etwa durch konzerninterne Umsätze oder
              nachträglich angepasste Zahlen. Die Anteile beziehen sich auf die Summe der Segmente.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
