'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/hooks/usePortfolio'
import DividendsByYear from './DividendsByYear'
import DividendsByStock from './DividendsByStock'
import DividendsHistory from './DividendsHistory'

export default function DividendsDetailClient() {
  const router = useRouter()
  const { transactions, totalDividends, loading, formatCurrency } = usePortfolio()

  const dividends = useMemo(
    () => transactions.filter(t => t.type === 'dividend'),
    [transactions]
  )

  // Pro Jahr aggregieren
  const byYear = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const d of dividends) {
      const year = String(new Date(d.date).getFullYear())
      const existing = map.get(year) || { total: 0, count: 0 }
      const value = d.total_value || d.price * d.quantity
      map.set(year, { total: existing.total + value, count: existing.count + 1 })
    }
    return Array.from(map.entries())
      .map(([year, v]) => ({ year, total: v.total, count: v.count }))
      .sort((a, b) => a.year.localeCompare(b.year))
  }, [dividends])

  // Pro Aktie aggregieren
  const byStock = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; lastDate: string }>()
    for (const d of dividends) {
      const value = d.total_value || d.price * d.quantity
      const existing = map.get(d.symbol)
      if (existing) {
        existing.total += value
        existing.count += 1
        if (d.date > existing.lastDate) existing.lastDate = d.date
      } else {
        map.set(d.symbol, { name: d.name, total: value, count: 1, lastDate: d.date })
      }
    }
    return Array.from(map.entries())
      .map(([symbol, v]) => ({ symbol, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [dividends])

  const thisYear = useMemo(() => {
    const y = String(new Date().getFullYear())
    return byYear.find(b => b.year === y)?.total ?? 0
  }, [byYear])

  return (
    <div className="min-h-screen bg-[#06060e] text-white flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center gap-4 border-b border-white/[0.03] max-w-6xl mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          aria-label="Zurück"
        >
          <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Dividenden</h1>
          <p className="text-[12px] text-white/25">Mein Portfolio</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 py-6 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Hero */}
            <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6">
              <p className="text-4xl font-bold text-emerald-400 tabular-nums">
                {formatCurrency(totalDividends)}
              </p>
              <p className="text-[12px] text-white/30 mt-1">Gesamte erhaltene Dividenden</p>

              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/[0.03]">
                <div>
                  <p className="text-[9px] text-white/15 uppercase tracking-wider">Dieses Jahr</p>
                  <p className="text-[15px] font-semibold text-emerald-400 tabular-nums">
                    {formatCurrency(thisYear)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-white/15 uppercase tracking-wider">Aktien</p>
                  <p className="text-[15px] font-semibold text-white tabular-nums">{byStock.length}</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/15 uppercase tracking-wider">Zahlungen</p>
                  <p className="text-[15px] font-semibold text-white tabular-nums">{dividends.length}</p>
                </div>
              </div>
            </div>

            <DividendsByYear data={byYear} formatCurrency={formatCurrency} />
            <DividendsByStock data={byStock} formatCurrency={formatCurrency} />
            <DividendsHistory dividends={dividends} formatCurrency={formatCurrency} />
          </>
        )}
      </div>
    </div>
  )
}
