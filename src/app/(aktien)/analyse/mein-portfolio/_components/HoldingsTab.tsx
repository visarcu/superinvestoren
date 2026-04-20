'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import type { Holding } from '../_lib/types'

interface HoldingsTabProps {
  holdings: Holding[]
  totalValue: number
  isAllDepotsView: boolean
  /** Tagesänderung in Quote-Währung pro Symbol (aus /api/v1/quotes/batch) */
  dayChangeBySymbol?: Record<string, number>
  /** Tagesänderung in % pro Symbol */
  dayChangePercentBySymbol?: Record<string, number>
  formatCurrency: (v: number) => string
  formatStockPrice: (price: number, showCurrency?: boolean) => string
  formatPercentage: (v: number) => string
}

export default function HoldingsTab({
  holdings,
  totalValue,
  isAllDepotsView,
  dayChangeBySymbol = {},
  dayChangePercentBySymbol = {},
  formatCurrency,
  formatStockPrice,
  formatPercentage,
}: HoldingsTabProps) {
  const sorted = useMemo(() => [...holdings].sort((a, b) => b.value - a.value), [holdings])

  if (sorted.length === 0) return null

  return (
    <div className="space-y-1.5">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] text-white/30 uppercase tracking-wider">
        <div className="col-span-3">Aktie</div>
        <div className="col-span-1 text-right">Stk.</div>
        <div className="col-span-2 text-right">Kurs</div>
        <div className="col-span-2 text-right">Wert</div>
        <div className="col-span-2 text-right">Heute</div>
        <div className="col-span-2 text-right">Rendite</div>
      </div>

      {sorted.map(h => {
        const positive = h.gain_loss >= 0

        // P/L (1D): Tages-Performance pro Position in Portfolio-Währung
        const dayChangePerShare = dayChangeBySymbol[h.symbol]
        const dayChangePct = dayChangePercentBySymbol[h.symbol]
        const dayPositionChange =
          typeof dayChangePerShare === 'number' ? dayChangePerShare * h.quantity : null
        const dayPositive = (dayPositionChange ?? 0) >= 0

        return (
          <Link
            key={h.id}
            href={`/analyse/mein-portfolio/aktien/${h.symbol}`}
            className="grid grid-cols-12 gap-3 items-center px-4 py-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
          >
            {/* Aktie */}
            <div className="col-span-3 flex items-center gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/v1/logo/${h.symbol}?size=60`}
                alt={h.symbol}
                className="w-8 h-8 rounded-lg bg-white/[0.06] object-contain flex-shrink-0"
                onError={e => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">
                    {h.symbol}
                  </p>
                  {h.investment_case && (
                    <span
                      title="Investment-Case vorhanden"
                      className="text-amber-400/70 group-hover:text-amber-400 transition-colors"
                      aria-label="Investment-Case vorhanden"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.749 8.713L23 9.423l-5 4.875 1.182 6.882L13 18l-6.182 3.18L8 14.298 3 9.423l3.252-.71L9.999 2l3.751 6.713 5.999 0z" />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/35 truncate">{h.name}</p>
                {isAllDepotsView && h.portfolio_name && (
                  <p className="text-[9px] text-white/30 mt-0.5 truncate">{h.portfolio_name}</p>
                )}
              </div>
            </div>

            {/* Stk */}
            <div className="col-span-1 text-right">
              <p className="text-[12px] text-white/30 tabular-nums">
                {h.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
              </p>
            </div>

            {/* Kurs (+ 1D %) */}
            <div className="col-span-2 text-right">
              <p className="text-[13px] text-white/70 tabular-nums">
                {formatStockPrice(h.current_price_display ?? h.current_price, true)}
              </p>
              {typeof dayChangePct === 'number' && (
                <p
                  className={`text-[10px] tabular-nums ${
                    dayChangePct >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'
                  }`}
                >
                  {dayChangePct >= 0 ? '+' : ''}
                  {dayChangePct.toFixed(2).replace('.', ',')}%
                </p>
              )}
            </div>

            {/* Wert */}
            <div className="col-span-2 text-right">
              <p className="text-[13px] font-semibold text-white/80 tabular-nums">
                {formatCurrency(h.value)}
              </p>
            </div>

            {/* Heute (P/L 1D pro Position) */}
            <div className="col-span-2 text-right">
              {dayPositionChange !== null ? (
                <>
                  <p
                    className={`text-[12px] font-semibold tabular-nums ${
                      dayPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {dayPositive ? '+' : ''}
                    {formatCurrency(dayPositionChange)}
                  </p>
                  {typeof dayChangePct === 'number' && (
                    <p
                      className={`text-[10px] tabular-nums ${
                        dayPositive ? 'text-emerald-400/50' : 'text-red-400/50'
                      }`}
                    >
                      {dayPositive ? '+' : ''}
                      {dayChangePct.toFixed(2).replace('.', ',')}%
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-white/20 tabular-nums">–</p>
              )}
            </div>

            {/* Rendite (Gesamt) */}
            <div className="col-span-2 text-right">
              <p
                className={`text-[12px] font-semibold tabular-nums ${
                  positive ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatPercentage(h.gain_loss_percent)}
              </p>
              <p
                className={`text-[10px] tabular-nums ${
                  positive ? 'text-emerald-400/50' : 'text-red-400/50'
                }`}
              >
                {positive ? '+' : ''}
                {formatCurrency(h.gain_loss)}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
