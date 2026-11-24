'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { computeClosedPositions } from '@/lib/portfolio/closedPositions'
import type { Transaction } from '../_lib/types'

interface SoldPositionsProps {
  transactions: Transaction[]
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}

export default function SoldPositions({
  transactions,
  formatCurrency,
  formatPercentage,
}: SoldPositionsProps) {
  const [expanded, setExpanded] = useState(false)

  const closedPositions = useMemo(() => computeClosedPositions(transactions), [transactions])

  if (closedPositions.length === 0) return null

  const totalRealized = closedPositions.reduce((s, p) => s + p.realizedGain, 0)
  const totalDividends = closedPositions.reduce((s, p) => s + p.dividends, 0)
  const totalReturn = totalRealized + totalDividends

  const visible = expanded ? closedPositions : closedPositions.slice(0, 3)

  return (
    <section className="mt-6 rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-6 py-4 flex items-center justify-between border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors text-left"
      >
        <div>
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">
              Verkaufte Positionen
            </h2>
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
              {closedPositions.length}
            </span>
          </div>
          <p className="text-[11px] text-white/35 mt-0.5">
            Realisiert{' '}
            <span className={totalRealized >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}>
              {totalRealized >= 0 ? '+' : ''}
              {formatCurrency(totalRealized)}
            </span>
            {totalDividends > 0 && (
              <>
                {' · Dividenden '}
                <span className="text-emerald-400/80">+{formatCurrency(totalDividends)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-[9px] font-medium text-white/30 uppercase tracking-[0.14em]">
              Gesamt
            </p>
            <p
              className={`text-[15px] font-semibold tabular-nums mt-1 ${
                totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {totalReturn >= 0 ? '+' : ''}
              {formatCurrency(totalReturn)}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Liste */}
      <div>
        {visible.map((p, i) => {
          const positive = p.realizedGain >= 0
          return (
            <Link
              key={p.symbol}
              href={`/analyse/aktien/${p.symbol}`}
              className={`
                grid grid-cols-12 gap-3 items-center px-6 py-3
                ${i > 0 ? 'border-t border-white/[0.04]' : ''}
                hover:bg-white/[0.02] transition-colors group
              `}
            >
              {/* Aktie */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-[7px] bg-white/[0.04] border border-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/logo/${p.symbol}?size=60`}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/80 group-hover:text-white tracking-tight">
                    {p.symbol}
                  </p>
                  <p className="text-[10px] text-white/40 truncate">{p.name}</p>
                </div>
              </div>

              {/* Stk verkauft */}
              <div className="col-span-2 text-right">
                <p className="text-[11px] text-white/35 tabular-nums">
                  {p.totalBought.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.
                </p>
              </div>

              {/* Avg-Kauf → Avg-Verkauf */}
              <div className="col-span-3 text-right">
                <p className="text-[11px] text-white/45 tabular-nums">
                  Ø {formatCurrency(p.avgBuyPrice)} → {formatCurrency(p.avgSellPrice)}
                </p>
              </div>

              {/* Realisiert */}
              <div className="col-span-3 flex items-start justify-end">
                <div
                  className={`
                    inline-flex flex-col items-end px-2 py-1 rounded-md
                    ${
                      positive
                        ? 'bg-emerald-400/[0.08] text-emerald-300'
                        : 'bg-red-400/[0.08] text-red-300'
                    }
                  `}
                >
                  <span className="text-[12px] font-semibold tabular-nums leading-none">
                    {positive ? '+' : ''}
                    {formatCurrency(p.realizedGain)}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums mt-0.5 leading-none ${
                      positive ? 'text-emerald-300/60' : 'text-red-300/60'
                    }`}
                  >
                    {formatPercentage(p.realizedGainPercent)}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}

        {!expanded && closedPositions.length > 3 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full px-6 py-3 text-[11px] text-white/35 hover:text-white/70 hover:bg-white/[0.02] transition-colors border-t border-white/[0.04]"
          >
            Alle {closedPositions.length} verkauften Positionen zeigen
          </button>
        )}
      </div>
    </section>
  )
}
