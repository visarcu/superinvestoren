'use client'

import React from 'react'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { fmt, TT } from '../_lib/format'

interface ChartCardProps {
  data: any[]
  dataKey: string
  label: string
  color: string
  format?: 'dollar'
  className?: string
  guidanceValue?: number | null
  guidanceLabel?: string
  onExpand?: () => void
}

export default function ChartCard({
  data,
  dataKey,
  label,
  color,
  format,
  className,
  guidanceValue,
  guidanceLabel,
  onExpand,
}: ChartCardProps) {
  let vals = data.filter(d => d[dataKey] !== null && d[dataKey] !== undefined && d[dataKey] !== 0)
  if (vals.length === 0) return null

  // Für korrekte Darstellung negativer Werte: 0 muss in der Y-Achsen-Domain sein,
  // damit Bars entweder nach oben (positiv) oder nach unten (negativ) wachsen.
  const numericVals = vals.map(v => v[dataKey]).filter(v => typeof v === 'number') as number[]
  const minVal = Math.min(...numericVals, 0)
  const maxVal = Math.max(...numericVals, 0)
  const hasNegativeValues = minVal < 0

  // Guidance als letzten grauen Balken hinzufügen
  if (guidanceValue) {
    const lastPeriod = vals[vals.length - 1]?.period
    const nextYear = lastPeriod ? String(parseInt(lastPeriod) + 1) : 'Guidance'
    vals = [...vals, { period: `${guidanceLabel || nextYear}*`, [dataKey]: guidanceValue, _isGuidance: true }]
  }

  const latest = vals[vals.length - (guidanceValue ? 2 : 1)]?.[dataKey]
  const prev = vals[vals.length - (guidanceValue ? 3 : 2)]?.[dataKey]
  const growth = latest && prev ? ((latest - prev) / Math.abs(prev)) * 100 : null

  // Period label for latest value
  const latestPeriod = vals[vals.length - 1]?.period

  return (
    <div
      className={`bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.06] transition-all group ${onExpand ? 'cursor-pointer' : ''} ${className || ''}`}
      onClick={onExpand}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[11px] text-white/30 font-medium tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {format === 'dollar' ? `${latest?.toFixed(2).replace('.', ',')} $` : fmt(latest)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {growth !== null && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}
              >
                {growth >= 0 ? '+' : ''}
                {growth.toFixed(1)}%
              </span>
            )}
            {onExpand && (
              <svg
                className="w-3.5 h-3.5 text-white/0 group-hover:text-white/25 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
            )}
          </div>
          {latestPeriod && <span className="text-[9px] text-white/30">GJ {latestPeriod}</span>}
        </div>
      </div>
      <div className="h-40 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vals} margin={{ top: 4, right: 2, bottom: 0, left: 2 }} barCategoryGap={vals.length > 8 ? '15%' : '20%'}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: vals.length > 8 ? 8 : 9, fill: 'rgba(255,255,255,0.18)' }}
              axisLine={false}
              tickLine={false}
              interval={vals.length > 12 ? 1 : 0}
            />
            <YAxis
              hide
              domain={[
                hasNegativeValues ? minVal * 1.1 : 0,
                maxVal > 0 ? maxVal * 1.1 : 0,
              ]}
            />
            {hasNegativeValues && (
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            )}
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={({ active, payload, label: l }) => {
                if (!active || !payload?.length) return null
                const v = payload[0].value as number
                const isG = payload[0]?.payload?._isGuidance
                return (
                  <div style={TT}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                      {l} {isG && <span style={{ color: 'rgba(255,255,255,0.15)' }}>Guidance</span>}
                    </p>
                    <p style={{ color: isG ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: '15px', fontWeight: 700 }}>
                      {format === 'dollar' ? `${v.toFixed(2).replace('.', ',')} $` : fmt(v)}
                    </p>
                    {isG && <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '9px', marginTop: '2px' }}>Unternehmens-Prognose</p>}
                  </div>
                )
              }}
            />
            {/* Cell-Pattern statt custom shape:
                Recharts rendert Bars mit korrekter Behandlung negativer Werte automatisch
                (nach unten wachsend von Zero-Line). Per-Cell Farbe erlaubt uns trotzdem
                Guidance-Bars optisch abzusetzen. */}
            <Bar
              dataKey={dataKey}
              radius={hasNegativeValues ? [3, 3, 3, 3] : [3, 3, 0, 0]}
              isAnimationActive={false}
            >
              {vals.map((v, i) => {
                const isGuidance = v?._isGuidance
                return (
                  <Cell
                    key={i}
                    fill={isGuidance ? 'rgba(255,255,255,0.08)' : color}
                    opacity={isGuidance ? 1 : 0.75}
                    stroke={isGuidance ? 'rgba(255,255,255,0.2)' : 'none'}
                    strokeWidth={isGuidance ? 1 : 0}
                    strokeDasharray={isGuidance ? '3 3' : undefined}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
