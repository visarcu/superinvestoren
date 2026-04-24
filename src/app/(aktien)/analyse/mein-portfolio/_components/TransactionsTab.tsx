'use client'

import React, { useMemo } from 'react'
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

function formatGroupDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(d, today)) return 'Heute'
  if (sameDay(d, yesterday)) return 'Gestern'

  return d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

export default function TransactionsTab({
  transactions,
  realizedGainByTxId,
  formatCurrency,
  formatPercentage,
  onEdit,
  onDelete,
}: TransactionsTabProps) {
  const groups = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const map = new Map<string, Transaction[]>()
    for (const t of sorted) {
      const key = t.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries())
  }, [transactions])

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Keine Transaktionen</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map(([date, rows]) => (
        <section
          key={date}
          className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]"
        >
          <div className="px-5 py-2.5 border-b border-white/[0.04] bg-white/[0.015]">
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.14em]">
              {formatGroupDate(date)}
            </p>
          </div>

          {rows.map((t, i) => {
            const isInflow = INFLOW_TYPES.has(t.type)
            const label = TYPE_LABELS[t.type] ?? t.type
            const value = t.total_value || t.price * t.quantity
            const realized = realizedGainByTxId.get(t.id)
            const hasFee = t.fee && t.fee > 0

            return (
              <div
                key={t.id}
                className={`
                  relative group flex items-center justify-between gap-3 px-5 py-3 pr-14
                  ${i > 0 ? 'border-t border-white/[0.04]' : ''}
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
                    <p className="text-[13px] font-medium text-white/85 truncate tracking-tight">
                      {t.symbol || label}
                    </p>
                    <p className="text-[10px] text-white/40 truncate">
                      {label}
                      {t.quantity > 0 && t.symbol !== 'CASH'
                        ? ` · ${t.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.`
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
                      <p className="text-[10px] text-white/30 truncate italic mt-0.5">{t.notes}</p>
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
                  {/* Realisierter Gewinn bei Sell-Transaktionen */}
                  {realized && t.type === 'sell' && (
                    <p
                      className={`text-[10px] tabular-nums mt-0.5 ${
                        realized.realizedGain >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
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
                    <p className="text-[10px] text-white/30 mt-0.5">{t.portfolio_name}</p>
                  )}
                </div>

                {/* Kebab-Menu */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <TransactionRowMenu
                    onEdit={() => onEdit(t)}
                    onDelete={() => onDelete(t)}
                  />
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
