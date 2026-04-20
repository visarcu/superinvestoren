'use client'

import React from 'react'

interface Props {
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPercent: number
  totalRealizedGain: number
  totalDividends: number
  totalReturn: number
  totalReturnPercent: number
  xirrPercent: number | null
  dividendCount: number
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}

export default function PerformanceStatsGrid({
  totalValue,
  totalInvested,
  totalGainLoss,
  totalGainLossPercent,
  totalRealizedGain,
  totalDividends,
  totalReturn,
  totalReturnPercent,
  xirrPercent,
  dividendCount,
  formatCurrency,
  formatPercentage,
}: Props) {
  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6">
      {/* Hero: Total Return */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest">Gesamtrendite</p>
        <div className="flex items-baseline gap-3 mt-1 flex-wrap">
          <p
            className={`text-3xl font-bold tabular-nums ${
              totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {totalReturn >= 0 ? '+' : ''}
            {formatCurrency(totalReturn)}
          </p>
          <span
            className={`text-[14px] font-semibold tabular-nums ${
              totalReturnPercent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
            }`}
          >
            {formatPercentage(totalReturnPercent)}
          </span>
        </div>
        <p className="text-[11px] text-white/30 mt-1">
          Unrealisiert + Realisiert + Dividenden auf {formatCurrency(totalInvested)} investiert
        </p>
      </div>

      {/* Stat-Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-white/[0.03]">
        <Stat label="Aktueller Wert" value={formatCurrency(totalValue)} />
        <Stat label="Investiert" value={formatCurrency(totalInvested)} />
        <Stat
          label="Unrealisiert"
          value={formatCurrency(totalGainLoss)}
          sub={formatPercentage(totalGainLossPercent)}
          color={totalGainLoss >= 0 ? 'emerald' : 'red'}
        />
        <Stat
          label="Realisiert"
          value={formatCurrency(totalRealizedGain)}
          color={totalRealizedGain >= 0 ? 'emerald' : 'red'}
          dim={totalRealizedGain === 0}
        />
        <Stat
          label="Dividenden"
          value={formatCurrency(totalDividends)}
          sub={`${dividendCount} ${dividendCount === 1 ? 'Zahlung' : 'Zahlungen'}`}
          color={totalDividends > 0 ? 'emerald' : undefined}
          dim={totalDividends === 0}
        />
        <Stat
          label="XIRR (annualisiert)"
          value={xirrPercent !== null ? formatPercentage(xirrPercent) : '–'}
          color={xirrPercent !== null ? (xirrPercent >= 0 ? 'emerald' : 'red') : undefined}
          dim={xirrPercent === null}
        />
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  sub,
  color,
  dim,
}: {
  label: string
  value: string
  sub?: string
  color?: 'emerald' | 'red'
  dim?: boolean
}) {
  const colorClass =
    color === 'emerald' ? 'text-emerald-400' : color === 'red' ? 'text-red-400' : 'text-white'
  return (
    <div>
      <p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className={`text-[15px] font-semibold tabular-nums ${dim ? 'text-white/30' : colorClass}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-white/25 tabular-nums mt-0.5">{sub}</p>}
    </div>
  )
}
