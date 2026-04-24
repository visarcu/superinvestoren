'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import type { Transaction } from '../_lib/types'

interface DividendsTabProps {
  transactions: Transaction[]
  totalDividends: number
  formatCurrency: (v: number) => string
}

export default function DividendsTab({
  transactions,
  totalDividends,
  formatCurrency,
}: DividendsTabProps) {
  const dividends = useMemo(
    () =>
      transactions
        .filter(t => t.type === 'dividend')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  )

  // Jahres-Gruppierung mit YoY-Growth
  const byYear = useMemo(() => {
    const map = new Map<string, { total: number; rows: Transaction[] }>()
    for (const d of dividends) {
      const year = new Date(d.date).getFullYear().toString()
      if (!map.has(year)) map.set(year, { total: 0, rows: [] })
      const entry = map.get(year)!
      entry.total += d.total_value || d.price * d.quantity
      entry.rows.push(d)
    }
    const years = Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]))

    // YoY-Growth-Prozent anreichern (newer-year vs next-older-year)
    return years.map(([year, data], i) => {
      const prevYear = years[i + 1]
      const prevTotal = prevYear?.[1].total ?? 0
      const growthPct = prevTotal > 0 ? ((data.total - prevTotal) / prevTotal) * 100 : null
      return { year, total: data.total, rows: data.rows, growthPct }
    })
  }, [dividends])

  // TTM (Trailing Twelve Months) — Summe der letzten 12 Monate
  const ttm = useMemo(() => {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - 12)
    return dividends
      .filter(t => new Date(t.date) >= cutoff)
      .reduce((s, t) => s + (t.total_value || t.price * t.quantity), 0)
  }, [dividends])

  if (dividends.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Keine Dividenden erfasst</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header-Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2.5">
          <p className="text-[13px] font-semibold text-white/90 tracking-tight">Dividenden</p>
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
            {dividends.length} {dividends.length === 1 ? 'Zahlung' : 'Zahlungen'}
          </span>
        </div>
        <Link
          href="/analyse/mein-portfolio/dividenden"
          className="text-[11px] text-white/45 hover:text-white/90 transition-colors"
        >
          Detail-Ansicht →
        </Link>
      </div>

      {/* Summary-Karte */}
      <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.04]">
          <SummaryCell label="Gesamt Lebenszeit" value={formatCurrency(totalDividends)} accent="emerald" />
          <SummaryCell label="TTM · letzte 12 Monate" value={formatCurrency(ttm)} />
          <SummaryCell
            label="Aktuelles Jahr"
            value={formatCurrency(byYear[0]?.total ?? 0)}
            hint={byYear[0]?.year}
          />
        </div>
      </section>

      {byYear.map(({ year, total, rows, growthPct }) => (
        <section
          key={year}
          className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]"
        >
          <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/[0.04] bg-white/[0.015]">
            <div className="flex items-baseline gap-2.5">
              <p className="text-[11px] font-medium text-white/50 tracking-tight">{year}</p>
              {growthPct !== null && (
                <span
                  className={`text-[10px] font-medium tabular-nums ${
                    growthPct >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'
                  }`}
                >
                  {growthPct >= 0 ? '+' : ''}
                  {growthPct.toFixed(1).replace('.', ',')}% YoY
                </span>
              )}
            </div>
            <p className="text-[12px] font-semibold text-emerald-300 tabular-nums">
              +{formatCurrency(total)}
            </p>
          </div>

          {rows.map((t, i) => (
            <div
              key={t.id}
              className={`
                flex items-center justify-between gap-3 px-5 py-3
                ${i > 0 ? 'border-t border-white/[0.04]' : ''}
                hover:bg-white/[0.02] transition-colors
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-[7px] bg-white/[0.04] border border-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/logo/${t.symbol}?size=60`}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white/85 tracking-tight">
                    {t.symbol}
                  </p>
                  <p className="text-[10px] text-white/40 truncate">{t.name}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-semibold text-emerald-300 tabular-nums">
                  +{formatCurrency(t.total_value || t.price * t.quantity)}
                </p>
                <p className="text-[10px] text-white/35">
                  {new Date(t.date).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function SummaryCell({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: 'emerald'
}) {
  return (
    <div className="bg-[#0a0a12] p-4">
      <p className="text-[9px] font-medium text-white/30 uppercase tracking-[0.14em]">{label}</p>
      <p
        className={`mt-1.5 text-[18px] font-semibold tabular-nums tracking-tight ${
          accent === 'emerald' ? 'text-emerald-400' : 'text-white'
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-white/35 mt-0.5">{hint}</p>}
    </div>
  )
}
