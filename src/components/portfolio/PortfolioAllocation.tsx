// src/components/portfolio/PortfolioAllocation.tsx
// Premium Allokations-Donut für das Portfolio.
// Zeigt Wertverteilung der Holdings, optional mit/ohne Cash, mit Hover-Detail im Center.
'use client'

import React, { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import Logo from '@/components/Logo'
import type { Holding } from '@/hooks/usePortfolio'

interface PortfolioAllocationProps {
  holdings: Holding[]
  cashPosition: number
  totalValue: number
  formatCurrency: (amount: number) => string
  includeCash: boolean
}

// Premium-Farbpalette — dezente Töne, monochrom mit Akzenten
const SLICE_COLORS = [
  '#10b981', // emerald-500 (primary accent)
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#14b8a6', // teal-500
  '#ef4444', // red-500
  '#6366f1', // indigo-500
]
const REST_COLOR = '#404040' // neutral-700 für "Andere"
const CASH_COLOR = '#525252' // neutral-600 für Cash

interface Slice {
  name: string
  symbol: string
  value: number
  percent: number
  color: string
  isCash?: boolean
  isOther?: boolean
}

export default function PortfolioAllocation({
  holdings,
  cashPosition,
  totalValue,
  formatCurrency,
  includeCash,
}: PortfolioAllocationProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const slices = useMemo<Slice[]>(() => {
    const stockValue = holdings.reduce((s, h) => s + h.value, 0)
    const denominator = includeCash ? stockValue + Math.max(0, cashPosition) : stockValue
    if (denominator <= 0) return []

    // Holdings sortiert nach Wert
    const sorted = [...holdings]
      .filter(h => h.value > 0)
      .sort((a, b) => b.value - a.value)

    // Top N + "Andere" — wir zeigen max 11 Positionen explizit, Rest bündeln
    const TOP_N = 11
    const top = sorted.slice(0, TOP_N)
    const rest = sorted.slice(TOP_N)
    const restValue = rest.reduce((s, h) => s + h.value, 0)

    const slices: Slice[] = top.map((h, i) => ({
      name: h.name || h.symbol,
      symbol: h.symbol,
      value: h.value,
      percent: (h.value / denominator) * 100,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }))

    if (restValue > 0) {
      slices.push({
        name: `${rest.length} weitere Positionen`,
        symbol: '...',
        value: restValue,
        percent: (restValue / denominator) * 100,
        color: REST_COLOR,
        isOther: true,
      })
    }

    if (includeCash && cashPosition > 0) {
      slices.push({
        name: 'Cash',
        symbol: 'CASH',
        value: cashPosition,
        percent: (cashPosition / denominator) * 100,
        color: CASH_COLOR,
        isCash: true,
      })
    }

    return slices
  }, [holdings, cashPosition, includeCash])

  const displayedTotal = useMemo(() => {
    return slices.reduce((s, sl) => s + sl.value, 0)
  }, [slices])

  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-neutral-500">
        Keine Positionen für Allokations-Diagramm vorhanden.
      </div>
    )
  }

  const hovered = hoveredIdx !== null ? slices[hoveredIdx] : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr,1.2fr] gap-6 items-center">
      {/* Donut links */}
      <div className="relative h-[280px] mx-auto w-full max-w-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="98%"
              paddingAngle={1.5}
              stroke="#0a0a0a"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              animationDuration={400}
              onMouseEnter={(_, i) => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {slices.map((s, i) => (
                <Cell
                  key={s.symbol + i}
                  fill={s.color}
                  fillOpacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.3}
                  style={{ transition: 'fill-opacity 200ms', cursor: 'pointer' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            {hovered ? (
              <>
                {!hovered.isCash && !hovered.isOther && (
                  <div className="flex justify-center mb-1.5">
                    <Logo ticker={hovered.symbol} alt={hovered.symbol} className="w-7 h-7" padding="none" />
                  </div>
                )}
                <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-0.5">
                  {hovered.symbol === 'CASH' ? 'Cash' : hovered.symbol === '...' ? 'Andere' : hovered.symbol}
                </p>
                <p className="text-base font-semibold text-white tracking-tight tabular-nums">
                  {formatCurrency(hovered.value)}
                </p>
                <p className="text-[11px] text-neutral-400 tabular-nums">
                  {hovered.percent.toFixed(1)}%
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-0.5">
                  {includeCash ? 'Gesamtwert' : 'Wertpapiere'}
                </p>
                <p className="text-lg font-semibold text-white tracking-tight tabular-nums">
                  {formatCurrency(displayedTotal)}
                </p>
                <p className="text-[11px] text-neutral-500 tabular-nums">
                  {slices.length} {slices.length === 1 ? 'Position' : 'Positionen'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend rechts */}
      <div className="space-y-0">
        {slices.slice(0, 12).map((s, i) => (
          <div
            key={s.symbol + i}
            className={`flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
              hoveredIdx === i ? 'bg-neutral-900' : 'hover:bg-neutral-900/50'
            }`}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-white truncate">
                  {s.symbol === 'CASH' ? 'Cash' : s.symbol === '...' ? `Andere (${s.name.split(' ')[0]})` : s.symbol}
                </p>
                {!s.isCash && !s.isOther && (
                  <p className="text-[10px] text-neutral-500 truncate">{s.name}</p>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-[12px] font-medium text-white tabular-nums">
                {s.percent.toFixed(1)}%
              </p>
              <p className="text-[10px] text-neutral-500 tabular-nums">
                {formatCurrency(s.value)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
