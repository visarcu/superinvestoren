// src/components/portfolio/QuickStats.tsx
'use client'

import React from 'react'
import { perfColor } from '@/utils/formatters'

interface QuickStatsProps {
  totalValue: number
  cashPosition: number
  totalGainLoss: number
  totalGainLossPercent: number
  xirrPercent: number | null
  activeInvestments: number
  formatCurrency: (amount: number) => string
  formatPercentage: (value: number) => string
  onCashClick?: () => void
}

export default function QuickStats({
  totalValue,
  cashPosition,
  totalGainLoss,
  totalGainLossPercent,
  xirrPercent,
  activeInvestments,
  formatCurrency,
  formatPercentage,
  onCashClick,
}: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Gesamtwert */}
      <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800/50">
        <p className="text-xs text-neutral-500 mb-1">Gesamtwert</p>
        <p className="text-xl font-bold text-white">{formatCurrency(totalValue)}</p>
        <p className="text-xs text-neutral-500 mt-1">
          {activeInvestments} Position{activeInvestments !== 1 ? 'en' : ''} + Cash
        </p>
      </div>

      {/* Cash */}
      <div
        className={`bg-neutral-900/50 rounded-xl p-4 border border-neutral-800/50 ${onCashClick ? 'cursor-pointer hover:border-neutral-700 transition-colors' : ''}`}
        onClick={onCashClick}
      >
        <p className="text-xs text-neutral-500 mb-1">Cash {onCashClick && <span className="text-neutral-600">✎</span>}</p>
        <p className="text-xl font-bold text-white">{formatCurrency(cashPosition)}</p>
        <p className="text-xs text-neutral-500 mt-1">
          {totalValue > 0 ? ((cashPosition / totalValue) * 100).toFixed(1) : '0,0'}% Cash-Quote
        </p>
      </div>

      {/* Gewinn / XIRR */}
      <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800/50">
        <p className="text-xs text-neutral-500 mb-1">Gewinn / Verlust</p>
        <p className={`text-xl font-bold ${perfColor(totalGainLoss)}`}>
          {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
        </p>
        <p className={`text-xs mt-1 ${perfColor(totalGainLossPercent, 'muted')}`}>
          {formatPercentage(totalGainLossPercent)} gesamt
        </p>
      </div>

      {/* XIRR */}
      <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800/50">
        <p className="text-xs text-neutral-500 mb-1">Interner Zinsfuß (XIRR)</p>
        {xirrPercent !== null ? (
          <>
            <p className={`text-xl font-bold ${perfColor(xirrPercent)}`}>
              {xirrPercent >= 0 ? '+' : ''}{xirrPercent.toFixed(2)}%
            </p>
            <p className="text-xs text-neutral-500 mt-1">annualisiert (p.a.)</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-neutral-600">–</p>
            <p className="text-xs text-neutral-600 mt-1">min. 30 Tage Haltedauer</p>
          </>
        )}
      </div>
    </div>
  )
}
