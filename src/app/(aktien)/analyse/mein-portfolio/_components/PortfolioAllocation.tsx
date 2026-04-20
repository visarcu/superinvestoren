'use client'

import React, { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { Holding } from '../_lib/types'

interface PortfolioAllocationProps {
  holdings: Holding[]
  cashPosition: number
  formatCurrency: (v: number) => string
}

// Fey-Farbpalette: dezenter, eher pastellig statt neon
const SLICE_COLORS = [
  '#4ade80', // emerald
  '#60a5fa', // blue
  '#c084fc', // violet
  '#fbbf24', // amber
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#a3e635', // lime
  '#f97316', // orange
  '#a78bfa', // purple
  '#34d399', // teal
  '#fb7185', // rose
  '#818cf8', // indigo
]
const REST_COLOR = 'rgba(255,255,255,0.12)'
const CASH_COLOR = 'rgba(255,255,255,0.18)'

interface Slice {
  name: string
  symbol: string
  value: number
  percent: number
  color: string
  isCash?: boolean
  isOther?: boolean
}

const TOP_N = 11

export default function PortfolioAllocation({
  holdings,
  cashPosition,
  formatCurrency,
}: PortfolioAllocationProps) {
  const [includeCash, setIncludeCash] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const slices = useMemo<Slice[]>(() => {
    const stockValue = holdings.reduce((s, h) => s + h.value, 0)
    const denominator = includeCash ? stockValue + Math.max(0, cashPosition) : stockValue
    if (denominator <= 0) return []

    const sorted = [...holdings].filter(h => h.value > 0).sort((a, b) => b.value - a.value)
    const top = sorted.slice(0, TOP_N)
    const rest = sorted.slice(TOP_N)
    const restValue = rest.reduce((s, h) => s + h.value, 0)

    const out: Slice[] = top.map((h, i) => ({
      name: h.name || h.symbol,
      symbol: h.symbol,
      value: h.value,
      percent: (h.value / denominator) * 100,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }))

    if (restValue > 0) {
      out.push({
        name: `${rest.length} weitere`,
        symbol: '',
        value: restValue,
        percent: (restValue / denominator) * 100,
        color: REST_COLOR,
        isOther: true,
      })
    }

    if (includeCash && cashPosition > 0) {
      out.push({
        name: 'Barmittel',
        symbol: '',
        value: cashPosition,
        percent: (cashPosition / denominator) * 100,
        color: CASH_COLOR,
        isCash: true,
      })
    }

    return out
  }, [holdings, cashPosition, includeCash])

  if (slices.length === 0) return null

  const total = slices.reduce((s, x) => s + x.value, 0)
  const hovered = hoveredIdx !== null ? slices[hoveredIdx] : null
  const centerLabel = hovered
    ? { name: hovered.name, value: hovered.value, percent: hovered.percent }
    : { name: 'Gesamt', value: total, percent: 100 }

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[13px] font-semibold text-white/80">Verteilung</h2>
          <p className="text-[11px] text-white/25 mt-0.5">Top {Math.min(TOP_N, holdings.length)} Positionen</p>
        </div>

        {cashPosition > 0 && (
          <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-0.5">
            <button
              onClick={() => setIncludeCash(false)}
              className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                !includeCash ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
              }`}
            >
              Nur Aktien
            </button>
            <button
              onClick={() => setIncludeCash(true)}
              className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                includeCash ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
              }`}
            >
              Mit Cash
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Donut */}
        <div className="relative h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={1}
                stroke="none"
                onMouseEnter={(_, i) => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {slices.map((s, i) => (
                  <Cell
                    key={i}
                    fill={s.color}
                    opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.4}
                    style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center-Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{centerLabel.name}</p>
            <p className="text-xl font-bold text-white tabular-nums mt-0.5">{formatCurrency(centerLabel.value)}</p>
            <p className="text-[11px] text-white/40 tabular-nums">{centerLabel.percent.toFixed(1).replace('.', ',')}%</p>
          </div>
        </div>

        {/* Liste */}
        <div className="space-y-1.5">
          {slices.map((s, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                hoveredIdx === i ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                <p className="text-[12px] text-white/70 truncate">
                  {s.symbol && <span className="font-semibold text-white/80 mr-1.5">{s.symbol}</span>}
                  <span className={s.symbol ? 'text-white/40' : ''}>{s.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[11px] text-white/40 tabular-nums">{formatCurrency(s.value)}</span>
                <span className="text-[12px] font-semibold text-white tabular-nums w-12 text-right">
                  {s.percent.toFixed(1).replace('.', ',')}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
