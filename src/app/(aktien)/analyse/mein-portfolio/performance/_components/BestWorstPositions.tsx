'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import type { Holding } from '@/hooks/usePortfolio'

interface Props {
  holdings: Holding[]
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}

const TOP_N = 5

export default function BestWorstPositions({ holdings, formatCurrency, formatPercentage }: Props) {
  const { winners, losers } = useMemo(() => {
    const sorted = [...holdings].sort((a, b) => b.gain_loss_percent - a.gain_loss_percent)
    return {
      winners: sorted.filter(h => h.gain_loss_percent > 0).slice(0, TOP_N),
      losers: sorted.filter(h => h.gain_loss_percent < 0).slice(-TOP_N).reverse(),
    }
  }, [holdings])

  if (winners.length === 0 && losers.length === 0) return null

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <Side title="Top Gewinner" emptyText="Noch keine Gewinner" items={winners} positive formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
      <Side title="Top Verlierer" emptyText="Keine Verlierer 🎉" items={losers} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
    </section>
  )
}

function Side({
  title,
  emptyText,
  items,
  positive,
  formatCurrency,
  formatPercentage,
}: {
  title: string
  emptyText: string
  items: Holding[]
  positive?: boolean
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}) {
  return (
    <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.04]">
        <h3 className="text-[12px] font-semibold text-white/80">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[12px] text-white/15">{emptyText}</p>
        </div>
      ) : (
        <div>
          {items.map(h => {
            const isPos = h.gain_loss_percent >= 0
            return (
              <Link
                key={h.id}
                href={`/analyse/mein-portfolio/aktien/${h.symbol}`}
                className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/logo/${h.symbol}?size=60`}
                    alt={h.symbol}
                    className="w-6 h-6 rounded-lg bg-white/[0.06] object-contain flex-shrink-0"
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white/70 group-hover:text-white">{h.symbol}</p>
                    <p className="text-[9px] text-white/20 truncate max-w-[150px]">{h.name}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-[12px] font-semibold tabular-nums ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercentage(h.gain_loss_percent)}
                  </p>
                  <p className={`text-[10px] tabular-nums ${isPos ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                    {isPos ? '+' : ''}
                    {formatCurrency(h.gain_loss)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
