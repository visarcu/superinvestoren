'use client'

import React, { useMemo, useState } from 'react'
import TransactionRowMenu from './TransactionRowMenu'
import type { RealizedGainInfo, Transaction } from '../_lib/types'

interface TransactionsTabProps {
  transactions: Transaction[]
  realizedGainByTxId: Map<string, RealizedGainInfo>
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}

const TYPE_LABELS: Record<string, string> = {
  buy: 'Kauf',
  sell: 'Verkauf',
  dividend: 'Dividende',
  cash_deposit: 'Einzahlung',
  cash_withdrawal: 'Auszahlung',
  transfer_in: 'Transfer rein',
  transfer_out: 'Transfer raus',
}

// Inflows = grün; outflows = rot
const INFLOW_TYPES = new Set(['buy', 'cash_deposit', 'dividend', 'transfer_in'])

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export default function TransactionsTab({
  transactions,
  realizedGainByTxId,
  formatCurrency,
  formatPercentage,
  onEdit,
  onDelete,
}: TransactionsTabProps) {
  // Nach Jahr → Monat → Tag gruppieren
  const byYear = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    type MonthBucket = { key: string; label: string; rows: Transaction[] }
    type YearBucket = {
      year: string
      count: number
      netValue: number
      months: MonthBucket[]
    }

    const yearMap = new Map<string, Map<string, Transaction[]>>()
    for (const t of sorted) {
      const d = new Date(t.date)
      const year = String(d.getFullYear())
      const monthKey = `${year}-${String(d.getMonth()).padStart(2, '0')}`
      if (!yearMap.has(year)) yearMap.set(year, new Map())
      const monthMap = yearMap.get(year)!
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, [])
      monthMap.get(monthKey)!.push(t)
    }

    const result: YearBucket[] = []
    for (const [year, monthMap] of yearMap) {
      let count = 0
      let netValue = 0
      const months: MonthBucket[] = []
      for (const [monthKey, rows] of monthMap) {
        count += rows.length
        for (const t of rows) {
          const v = t.total_value || t.price * t.quantity
          netValue += INFLOW_TYPES.has(t.type) ? v : -v
        }
        const monthIdx = parseInt(monthKey.split('-')[1], 10)
        months.push({
          key: monthKey,
          label: `${MONTH_NAMES[monthIdx]} ${year}`,
          rows,
        })
      }
      result.push({ year, count, netValue, months })
    }
    return result
  }, [transactions])

  // Expand-State: aktuelles Jahr standardmäßig auf
  const currentYear = String(new Date().getFullYear())
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    init[currentYear] = true
    return init
  })

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Keine Transaktionen</p>
      </div>
    )
  }

  const toggle = (year: string) =>
    setExpanded(e => ({ ...e, [year]: !e[year] }))

  return (
    <div className="space-y-3">
      {byYear.map(({ year, count, netValue, months }) => {
        const isOpen = !!expanded[year]
        const netPositive = netValue >= 0
        return (
          <section
            key={year}
            className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]"
          >
            {/* Jahr-Header: klickbar, toggled */}
            <button
              type="button"
              onClick={() => toggle(year)}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/[0.015] transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-3.5 h-3.5 text-white/40 transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-[15px] font-semibold text-white/90 tabular-nums tracking-tight">
                  {year}
                </span>
                <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
                  {count} {count === 1 ? 'Transaktion' : 'Transaktionen'}
                </span>
              </div>
              <span
                className={`text-[12px] font-medium tabular-nums ${
                  netPositive ? 'text-emerald-400/80' : 'text-red-400/80'
                }`}
              >
                {netPositive ? '+' : '−'}
                {formatCurrency(Math.abs(netValue))}
              </span>
            </button>

            {/* Geöffneter Jahres-Inhalt */}
            {isOpen && (
              <div className="border-t border-white/[0.04]">
                {months.map(({ key, label, rows }) => (
                  <div key={key}>
                    <div className="px-5 py-2 border-b border-white/[0.04] bg-white/[0.01]">
                      <p className="text-[10px] font-medium text-white/35 uppercase tracking-[0.14em]">
                        {label}
                      </p>
                    </div>
                    {rows.map((t, i) => {
                      const isInflow = INFLOW_TYPES.has(t.type)
                      const tLabel = TYPE_LABELS[t.type] ?? t.type
                      const value = t.total_value || t.price * t.quantity
                      const realized = realizedGainByTxId.get(t.id)
                      const hasFee = t.fee && t.fee > 0

                      return (
                        <div
                          key={t.id}
                          className={`
                            relative group flex items-center justify-between gap-3 px-5 py-3 pr-14
                            ${i > 0 ? 'border-t border-white/[0.03]' : ''}
                            hover:bg-white/[0.02] transition-colors
                          `}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 ${
                                isInflow
                                  ? 'bg-emerald-400/[0.08] text-emerald-300'
                                  : 'bg-red-400/[0.08] text-red-300'
                              }`}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.2}
                              >
                                {isInflow ? (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 19.5V4.5m0 0l-7.5 7.5M12 4.5l7.5 7.5"
                                  />
                                ) : (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m0 0l-7.5-7.5m7.5 7.5l7.5-7.5"
                                  />
                                )}
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2">
                                <p className="text-[13px] font-medium text-white/85 truncate tracking-tight">
                                  {t.symbol || tLabel}
                                </p>
                                <span className="text-[10px] text-white/35 tabular-nums">
                                  {formatShortDate(t.date)}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/40 truncate">
                                {tLabel}
                                {t.quantity > 0 && t.symbol !== 'CASH'
                                  ? ` · ${t.quantity.toLocaleString('de-DE', {
                                      maximumFractionDigits: 4,
                                    })} Stk.`
                                  : ''}
                                {t.price > 0 && t.symbol && t.symbol !== 'CASH'
                                  ? ` @ ${formatCurrency(t.price)}`
                                  : ''}
                                {hasFee ? (
                                  <>
                                    <span className="text-white/25"> · </span>
                                    <span className="text-white/40">
                                      Gebühr {formatCurrency(t.fee!)}
                                    </span>
                                  </>
                                ) : null}
                              </p>
                              {t.notes && (
                                <p className="text-[10px] text-white/30 truncate italic mt-0.5">
                                  {t.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className={`text-[13px] font-semibold tabular-nums ${
                                isInflow ? 'text-emerald-300' : 'text-red-300'
                              }`}
                            >
                              {isInflow ? '+' : '-'}
                              {formatCurrency(value)}
                            </p>
                            {realized && t.type === 'sell' && (
                              <p
                                className={`text-[10px] tabular-nums mt-0.5 ${
                                  realized.realizedGain >= 0
                                    ? 'text-emerald-400/70'
                                    : 'text-red-400/70'
                                }`}
                              >
                                G/V {realized.realizedGain >= 0 ? '+' : ''}
                                {formatCurrency(realized.realizedGain)}{' '}
                                <span className="text-white/30">
                                  ({formatPercentage(realized.realizedGainPercent)})
                                </span>
                              </p>
                            )}
                            {t.portfolio_name && (!realized || t.type !== 'sell') && (
                              <p className="text-[10px] text-white/30 mt-0.5">
                                {t.portfolio_name}
                              </p>
                            )}
                          </div>

                          {/* Kebab-Menu */}
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
                            <TransactionRowMenu
                              onEdit={() => onEdit(t)}
                              onDelete={() => onDelete(t)}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  } catch {
    return iso
  }
}
