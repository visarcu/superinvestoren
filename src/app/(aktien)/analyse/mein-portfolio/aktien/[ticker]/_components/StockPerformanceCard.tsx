'use client'

import React from 'react'
import type { SymbolPerformance } from '@/utils/portfolioCalculations'

interface StockPerformanceCardProps {
  performance: SymbolPerformance | null
  currentPriceEUR: number
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
  loading: boolean
}

export default function StockPerformanceCard({
  performance,
  currentPriceEUR,
  formatCurrency,
  formatPercentage,
  loading,
}: StockPerformanceCardProps) {
  if (loading || !performance) {
    return (
      <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
        <div className="h-12 w-40 bg-white/[0.04] rounded animate-pulse" />
      </div>
    )
  }

  const positive = performance.unrealizedGain >= 0
  const totalReturnPositive = performance.totalReturn >= 0

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
      {/* Aktueller Wert + unrealized Gain */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <p className="text-3xl font-bold text-white tabular-nums">
          {formatCurrency(performance.currentValue)}
        </p>
        <span
          className={`text-[13px] font-semibold tabular-nums ${
            positive ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {positive ? '+' : ''}
          {formatCurrency(performance.unrealizedGain)} ({formatPercentage(performance.unrealizedGainPercent)})
        </span>
      </div>
      <p className="text-[11px] text-white/30 mt-1">
        {performance.remainingQuantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk. ·
        Ø-Kostenbasis {formatCurrency(performance.currentAvgCostBasis)} · Aktuell{' '}
        {formatCurrency(currentPriceEUR)}
      </p>

      {/* Stat-Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/[0.03]">
        <Stat label="Investiert" value={formatCurrency(performance.totalInvested)} />
        <Stat
          label="Realisiert"
          value={formatCurrency(performance.totalRealizedGain)}
          color={performance.totalRealizedGain >= 0 ? 'emerald' : 'red'}
          dim={performance.totalRealizedGain === 0}
        />
        <Stat
          label="Dividenden"
          value={formatCurrency(performance.totalDividends)}
          color={performance.totalDividends > 0 ? 'emerald' : undefined}
          dim={performance.totalDividends === 0}
        />
        <Stat
          label="Gesamtrendite"
          value={formatCurrency(performance.totalReturn)}
          color={totalReturnPositive ? 'emerald' : 'red'}
          big
        />
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  color,
  big,
  dim,
}: {
  label: string
  value: string
  color?: 'emerald' | 'red'
  big?: boolean
  dim?: boolean
}) {
  const colorClass =
    color === 'emerald'
      ? 'text-emerald-400'
      : color === 'red'
        ? 'text-red-400'
        : 'text-white'
  return (
    <div>
      <p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
      <p
        className={`${big ? 'text-[16px] font-bold' : 'text-[14px] font-semibold'} tabular-nums ${
          dim ? 'text-white/30' : colorClass
        }`}
      >
        {value}
      </p>
    </div>
  )
}
