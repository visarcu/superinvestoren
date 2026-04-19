'use client'

import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { fmt, TT } from '../_lib/format'
import type { ExpandedChartState } from '../_lib/types'

interface ExpandedChartModalProps {
  state: ExpandedChartState | null
  onClose: () => void
}

export default function ExpandedChartModal({ state, onClose }: ExpandedChartModalProps) {
  if (!state) return null

  const vals = state.data.filter(d => d[state.dataKey])
  const latestVal = vals[vals.length - 1]?.[state.dataKey]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0c0c16] border border-white/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
          <div className="px-6 py-5 flex items-start justify-between">
            <div>
              <p className="text-[15px] font-semibold text-white">{state.label}</p>
              <p className="text-3xl font-bold text-white mt-1">
                {state.format === 'dollar' ? `${latestVal?.toFixed(2).replace('.', ',')} $` : fmt(latestVal)}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06]" aria-label="Schließen">
              <svg
                className="w-5 h-5 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 pb-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vals} margin={{ top: 10, right: 10, bottom: 20, left: 50 }}>
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.15)' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={v => (state.format === 'dollar' ? `$${v}` : fmt(v).replace(' $', ''))}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload, label: l }) => {
                    if (!active || !payload?.length) return null
                    const v = payload[0].value as number
                    return (
                      <div style={TT}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{l}</p>
                        <p style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                          {state.format === 'dollar' ? `${v.toFixed(2).replace('.', ',')} $` : fmt(v)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey={state.dataKey} fill={state.color} opacity={0.75} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
