'use client'

import React from 'react'

interface PortfolioValueHeroProps {
  loading: boolean
  hasHoldings: boolean
  /** Aktueller Marktwert nur der Aktienpositionen (Haupt-Hero-Zahl) */
  stockValue: number
  /** stockValue + cashPosition (für "inkl. Cash"-Hinweis) */
  totalValue: number
  /** Unrealisierter Kursgewinn (Kursgewinn offener Positionen) */
  totalGainLoss: number
  totalGainLossPercent: number
  /** Gesamtrendite = Kursgewinn + Realisiert + Dividenden − Gebühren */
  totalReturn: number
  totalReturnPercent: number
  todayChange: number
  todayChangePercent: number
  cashPosition: number
  brokerCredit?: number
  totalDividends: number
  totalRealizedGain: number
  totalFees: number
  xirrPercent: number | null
  positionsCount: number
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}

export default function PortfolioValueHero({
  loading,
  hasHoldings,
  stockValue,
  totalValue,
  totalGainLoss,
  totalGainLossPercent,
  totalReturn,
  totalReturnPercent,
  todayChange,
  todayChangePercent,
  cashPosition,
  brokerCredit = 0,
  totalDividends,
  totalRealizedGain,
  totalFees,
  xirrPercent,
  positionsCount,
  formatCurrency,
  formatPercentage,
}: PortfolioValueHeroProps) {
  if (loading) {
    return (
      <div className="pt-4 pb-8">
        <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
        <div className="h-12 w-56 bg-white/[0.04] rounded mt-3 animate-pulse" />
        <div className="h-4 w-72 bg-white/[0.04] rounded mt-4 animate-pulse" />
      </div>
    )
  }

  if (!hasHoldings) {
    return (
      <div className="text-center py-20">
        <p className="text-white/35 text-lg">Noch keine Positionen</p>
        <p className="text-white/25 text-sm mt-1">
          Füge deine erste Aktie hinzu, um loszulegen
        </p>
      </div>
    )
  }

  const todayPositive = todayChange >= 0
  const totalPositive = totalReturn >= 0

  return (
    <div className="pt-4 pb-6">
      {/* Kontext-Label */}
      <p className="text-[10px] font-medium text-white/35 uppercase tracking-[0.14em]">
        Depotwert · Aktien
      </p>

      {/* Foil-Gradient Display Number: Aktien-Marktwert (ohne Cash) */}
      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
        <h1
          className="
            text-[44px] sm:text-[54px] leading-[1.05] font-semibold tracking-tight tabular-nums
            bg-gradient-to-r from-white via-white to-white/80
            bg-clip-text text-transparent
            [text-shadow:0_4px_24px_rgba(0,0,0,0.6)]
          "
        >
          {formatCurrency(stockValue)}
        </h1>

        {/* Heute-Chip */}
        <div
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
            border ${todayPositive ? 'border-emerald-400/10 bg-emerald-400/[0.08]' : 'border-red-400/10 bg-red-400/[0.08]'}
            text-[12px] font-medium tabular-nums
            ${todayPositive ? 'text-emerald-300' : 'text-red-300'}
          `}
          aria-label="Heutige Veränderung"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={todayPositive ? 'M4.5 15.75l7.5-7.5 7.5 7.5' : 'M19.5 8.25l-7.5 7.5-7.5-7.5'}
            />
          </svg>
          <span>
            {todayPositive ? '+' : ''}
            {formatCurrency(todayChange)}
          </span>
          <span className={todayPositive ? 'text-emerald-300/60' : 'text-red-300/60'}>
            · {formatPercentage(todayChangePercent)}
          </span>
          <span className={`ml-0.5 text-[10px] uppercase tracking-wider ${todayPositive ? 'text-emerald-300/50' : 'text-red-300/50'}`}>
            Heute
          </span>
        </div>
      </div>

      {/* Gesamt-Rendite Zeile: totalReturn = Kursgewinn + Realisiert + Dividenden − Gebühren */}
      <div className="mt-3 flex items-center gap-2 text-[12px] tabular-nums flex-wrap">
        <span className="text-white/35">Rendite gesamt</span>
        <span
          className={`font-medium ${
            totalPositive ? 'text-emerald-400/90' : 'text-red-400/90'
          }`}
          title="Summe aus Kursgewinn, realisiert, Dividenden abzüglich Gebühren"
        >
          {totalPositive ? '+' : ''}
          {formatCurrency(totalReturn)}
        </span>
        <span
          className={`${totalPositive ? 'text-emerald-400/55' : 'text-red-400/55'}`}
        >
          ({formatPercentage(totalReturnPercent)})
        </span>
        {/* Zusätzlich der Kursgewinn als dezenter Hint */}
        <span className="text-white/25">·</span>
        <span className="text-white/40 text-[11px]">
          davon Kurs:{' '}
          <span
            className={
              totalGainLoss >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
            }
          >
            {totalGainLoss >= 0 ? '+' : ''}
            {formatCurrency(totalGainLoss)}
          </span>
        </span>
      </div>

      {/* Stat-Row mit Hairline-Dividers */}
      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4 pt-5 border-t border-white/[0.06]">
        <Stat label="Positionen" value={String(positionsCount)} />
        <HairlineDivider />
        <Stat label="Barmittel" value={formatCurrency(cashPosition)} />
        {brokerCredit > 0 && (
          <>
            <HairlineDivider />
            <Stat
              label="Kredit"
              value={`-${formatCurrency(brokerCredit)}`}
              accent="red"
              hint="Margin"
            />
          </>
        )}
        {xirrPercent !== null && (
          <>
            <HairlineDivider />
            <Stat
              label="Rendite p.a."
              value={`${xirrPercent >= 0 ? '+' : ''}${formatPercentage(xirrPercent)}`}
              hint="XIRR"
              accent={xirrPercent >= 0 ? 'emerald' : 'red'}
            />
          </>
        )}
        {totalDividends > 0 && (
          <>
            <HairlineDivider />
            <Stat
              label="Dividenden"
              value={formatCurrency(totalDividends)}
              accent="emerald"
            />
          </>
        )}
        {totalRealizedGain !== 0 && (
          <>
            <HairlineDivider />
            <Stat
              label="Realisiert"
              value={`${totalRealizedGain >= 0 ? '+' : ''}${formatCurrency(totalRealizedGain)}`}
              accent={totalRealizedGain >= 0 ? 'emerald' : 'red'}
            />
          </>
        )}
        {totalFees > 0 && (
          <>
            <HairlineDivider />
            <Stat label="Gebühren" value={`-${formatCurrency(totalFees)}`} muted />
          </>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  accent,
  muted,
}: {
  label: string
  value: string
  hint?: string
  accent?: 'emerald' | 'red'
  muted?: boolean
}) {
  const color = muted
    ? 'text-white/55'
    : accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'red'
        ? 'text-red-400'
        : 'text-white/90'
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-medium text-white/30 uppercase tracking-[0.14em]">
        {label}
        {hint && <span className="ml-1 text-white/20 normal-case tracking-normal">· {hint}</span>}
      </span>
      <span className={`mt-1 text-[15px] font-semibold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  )
}

function HairlineDivider() {
  return <span aria-hidden className="hidden sm:block w-px h-8 bg-white/[0.06]" />
}
