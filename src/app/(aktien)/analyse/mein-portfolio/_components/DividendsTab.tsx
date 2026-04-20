'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import type { Transaction } from '../_lib/types'

interface DividendsTabProps {
  transactions: Transaction[]
  totalDividends: number
  formatCurrency: (v: number) => string
}

export default function DividendsTab({ transactions, totalDividends, formatCurrency }: DividendsTabProps) {
  const dividends = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'dividend')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  )

  if (dividends.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Keine Dividenden erfasst</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* Details-Link Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[10px] text-white/30 uppercase tracking-wider">
          {dividends.length} {dividends.length === 1 ? 'Zahlung' : 'Zahlungen'}
        </p>
        <Link
          href="/analyse/mein-portfolio/dividenden"
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
        >
          Detail-Ansicht →
        </Link>
      </div>

      {dividends.map(t => (
        <div
          key={t.id}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0c0c16] border border-white/[0.04]"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/v1/logo/${t.symbol}?size=60`}
              alt={t.symbol}
              className="w-8 h-8 rounded-lg bg-white/[0.06] object-contain flex-shrink-0"
              onError={e => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="min-w-0">
              <p className="text-[13px] text-white/70">{t.symbol}</p>
              <p className="text-[10px] text-white/35 truncate">{t.name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
              +{formatCurrency(t.total_value || t.price * t.quantity)}
            </p>
            <p className="text-[10px] text-white/30">{new Date(t.date).toLocaleDateString('de-DE')}</p>
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-white/[0.03] flex justify-between px-4">
        <span className="text-[12px] text-white/25">Gesamte Dividenden</span>
        <span className="text-[14px] font-bold text-emerald-400 tabular-nums">{formatCurrency(totalDividends)}</span>
      </div>
    </div>
  )
}
