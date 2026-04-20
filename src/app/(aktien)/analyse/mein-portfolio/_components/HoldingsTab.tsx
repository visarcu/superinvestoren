'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import type { Holding } from '../_lib/types'

interface HoldingsTabProps {
  holdings: Holding[]
  totalValue: number
  isAllDepotsView: boolean
  formatCurrency: (v: number) => string
  formatStockPrice: (price: number, showCurrency?: boolean) => string
  formatPercentage: (v: number) => string
}

export default function HoldingsTab({
  holdings,
  totalValue,
  isAllDepotsView,
  formatCurrency,
  formatStockPrice,
  formatPercentage,
}: HoldingsTabProps) {
  const sorted = useMemo(() => [...holdings].sort((a, b) => b.value - a.value), [holdings])

  if (sorted.length === 0) return null

  return (
    <div className="space-y-1.5">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] text-white/15 uppercase tracking-wider">
        <div className="col-span-4">Aktie</div>
        <div className="col-span-1 text-right">Stk.</div>
        <div className="col-span-2 text-right">Kurs</div>
        <div className="col-span-2 text-right">Wert</div>
        <div className="col-span-2 text-right">Rendite</div>
        <div className="col-span-1 text-right">Anteil</div>
      </div>

      {sorted.map(h => {
        const portfolioPct = totalValue > 0 ? (h.value / totalValue) * 100 : 0
        const positive = h.gain_loss >= 0
        return (
          <Link
            key={h.id}
            href={`/analyse/mein-portfolio/aktien/${h.symbol}`}
            className="grid grid-cols-12 gap-3 items-center px-4 py-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
          >
            {/* Aktie */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
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
                <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">
                  {h.symbol}
                </p>
                <p className="text-[10px] text-white/20 truncate">{h.name}</p>
                {isAllDepotsView && h.portfolio_name && (
                  <p className="text-[9px] text-white/15 mt-0.5 truncate">{h.portfolio_name}</p>
                )}
              </div>
            </div>

            {/* Stk */}
            <div className="col-span-1 text-right">
              <p className="text-[12px] text-white/30 tabular-nums">
                {h.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
              </p>
            </div>

            {/* Kurs */}
            <div className="col-span-2 text-right">
              <p className="text-[13px] text-white/70 tabular-nums">
                {formatStockPrice(h.current_price_display ?? h.current_price, true)}
              </p>
            </div>

            {/* Wert */}
            <div className="col-span-2 text-right">
              <p className="text-[13px] font-semibold text-white/80 tabular-nums">{formatCurrency(h.value)}</p>
            </div>

            {/* Rendite */}
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

            {/* Anteil */}
            <div className="col-span-1 text-right">
              <p className="text-[11px] text-white/25 tabular-nums">{portfolioPct.toFixed(1)}%</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
