'use client'

import React from 'react'
import type { Holding } from '../_lib/types'

interface PortfolioValueHeroProps {
  loading: boolean
  hasHoldings: boolean
  totalValue: number
  totalGainLoss: number
  totalGainLossPercent: number
  todayChange: number
  todayChangePercent: number
  cashPosition: number
  totalDividends: number
  totalRealizedGain: number
  positionsCount: number
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}

export default function PortfolioValueHero({
  loading,
  hasHoldings,
  totalValue,
  totalGainLoss,
  totalGainLossPercent,
  todayChange,
  todayChangePercent,
  cashPosition,
  totalDividends,
  totalRealizedGain,
  positionsCount,
  formatCurrency,
  formatPercentage,
}: PortfolioValueHeroProps) {
  if (loading) {
    return (
      <div className="h-24 flex items-center">
        <div className="w-40 h-8 bg-white/[0.04] rounded animate-pulse" />
      </div>
    )
  }

  if (!hasHoldings) {
    return (
      <div className="text-center py-20">
        <p className="text-white/35 text-lg">Noch keine Positionen</p>
        <p className="text-white/25 text-sm mt-1">Füge deine erste Aktie hinzu, um loszulegen</p>
      </div>
    )
  }

  const todayPositive = todayChange >= 0
  const totalPositive = totalGainLoss >= 0

  return (
    <div>
      <p className="text-4xl font-bold text-white tabular-nums">{formatCurrency(totalValue)}</p>

      <div className="flex flex-wrap items-center gap-4 mt-1.5">
        {/* Heute */}
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[14px] font-semibold tabular-nums ${
              todayPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {todayPositive ? '+' : ''}
            {formatCurrency(todayChange)}
          </span>
          <span
            className={`text-[12px] tabular-nums ${
              todayPositive ? 'text-emerald-400/50' : 'text-red-400/50'
            }`}
          >
            ({formatPercentage(todayChangePercent)})
          </span>
          <span className="text-[10px] text-white/30">Heute</span>
        </div>

        <div className="w-px h-4 bg-white/[0.06]" />

        {/* Gesamt */}
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[13px] font-medium tabular-nums ${
              totalPositive ? 'text-emerald-400/70' : 'text-red-400/70'
            }`}
          >
            {totalPositive ? '+' : ''}
            {formatCurrency(totalGainLoss)}
          </span>
          <span
            className={`text-[11px] tabular-nums ${
              totalPositive ? 'text-emerald-400/40' : 'text-red-400/40'
            }`}
          >
            ({formatPercentage(totalGainLossPercent)})
          </span>
          <span className="text-[10px] text-white/30">Gesamt</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/[0.03]">
        <div>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">Positionen</p>
          <p className="text-[15px] font-semibold text-white tabular-nums">{positionsCount}</p>
        </div>
        <div>
          <p className="text-[9px] text-white/30 uppercase tracking-wider">Barmittel</p>
          <p className="text-[15px] font-semibold text-white tabular-nums">{formatCurrency(cashPosition)}</p>
        </div>
        {totalDividends > 0 && (
          <div>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Dividenden</p>
            <p className="text-[15px] font-semibold text-emerald-400 tabular-nums">
              {formatCurrency(totalDividends)}
            </p>
          </div>
        )}
        {totalRealizedGain !== 0 && (
          <div>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Realisiert</p>
            <p
              className={`text-[15px] font-semibold tabular-nums ${
                totalRealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {totalRealizedGain >= 0 ? '+' : ''}
              {formatCurrency(totalRealizedGain)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
