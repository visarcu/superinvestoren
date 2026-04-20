'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { Transaction } from '@/hooks/usePortfolio'

interface DividendsHistoryProps {
  dividends: Transaction[]
  formatCurrency: (v: number) => string
}

const PAGE_SIZE = 20

export default function DividendsHistory({ dividends, formatCurrency }: DividendsHistoryProps) {
  const [showAll, setShowAll] = useState(false)

  if (dividends.length === 0) {
    return (
      <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-12 mt-6 text-center">
        <p className="text-[14px] text-white/25">Noch keine Dividenden erfasst</p>
        <p className="text-[12px] text-white/30 mt-1">
          Sobald Dividenden via Import oder manuell hinzugefügt werden, erscheinen sie hier.
        </p>
      </section>
    )
  }

  const sorted = [...dividends].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const visible = showAll ? sorted : sorted.slice(0, PAGE_SIZE)

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <h2 className="text-[13px] font-semibold text-white/80">Alle Zahlungen</h2>
        <p className="text-[11px] text-white/25 mt-0.5">
          {dividends.length} {dividends.length === 1 ? 'Eintrag' : 'Einträge'}
        </p>
      </div>

      <div>
        {visible.map(d => {
          const value = d.total_value || d.price * d.quantity
          return (
            <Link
              key={d.id}
              href={`/analyse/mein-portfolio/aktien/${d.symbol}`}
              className="flex items-center justify-between px-6 py-3 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/logo/${d.symbol}?size=60`}
                  alt={d.symbol}
                  className="w-7 h-7 rounded-lg bg-white/[0.06] object-contain flex-shrink-0"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/70 group-hover:text-white">{d.symbol}</p>
                  <p className="text-[10px] text-white/35 truncate">{d.name}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[12px] font-semibold text-emerald-400 tabular-nums">
                  +{formatCurrency(value)}
                </p>
                <p className="text-[10px] text-white/30">
                  {new Date(d.date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </Link>
          )
        })}

        {!showAll && sorted.length > PAGE_SIZE && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full px-6 py-3 text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
          >
            Alle {sorted.length} Zahlungen anzeigen
          </button>
        )}
      </div>
    </section>
  )
}
