'use client'

import React from 'react'
import type { Transaction } from '@/hooks/usePortfolio'

interface StockTransactionsListProps {
  transactions: Transaction[]
  formatCurrency: (v: number) => string
}

const TYPE_LABELS: Record<string, string> = {
  buy: 'Kauf',
  sell: 'Verkauf',
  dividend: 'Dividende',
  transfer_in: 'Transfer rein',
  transfer_out: 'Transfer raus',
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  buy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  sell: { bg: 'bg-red-500/10', text: 'text-red-400' },
  dividend: { bg: 'bg-amber-400/10', text: 'text-amber-400' },
  transfer_in: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  transfer_out: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
}

export default function StockTransactionsList({
  transactions,
  formatCurrency,
}: StockTransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6 text-center">
        <p className="text-[12px] text-white/30">Keine Transaktionen für dieses Symbol</p>
      </section>
    )
  }

  // Chronologisch sortiert: neueste zuerst
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <h2 className="text-[13px] font-semibold text-white/80">Transaktionen</h2>
        <p className="text-[11px] text-white/25 mt-0.5">
          {sorted.length} {sorted.length === 1 ? 'Eintrag' : 'Einträge'}
        </p>
      </div>

      <div>
        {sorted.map(tx => {
          const colors = TYPE_COLORS[tx.type] || { bg: 'bg-white/[0.04]', text: 'text-white/40' }
          const label = TYPE_LABELS[tx.type] || tx.type
          const value = tx.total_value || tx.price * tx.quantity
          const isOutflow = tx.type === 'sell' || tx.type === 'transfer_out'

          return (
            <div
              key={tx.id}
              className="grid grid-cols-12 gap-3 items-center px-6 py-3 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-colors"
            >
              {/* Typ-Pill + Datum */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${colors.bg} ${colors.text}`}
                >
                  {label}
                </span>
                <p className="text-[11px] text-white/40 tabular-nums">
                  {new Date(tx.date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Stück */}
              <div className="col-span-2 text-right">
                {tx.quantity > 0 && (
                  <p className="text-[11px] text-white/30 tabular-nums">
                    {tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.
                  </p>
                )}
              </div>

              {/* Preis */}
              <div className="col-span-3 text-right">
                {tx.price > 0 && (
                  <p className="text-[11px] text-white/40 tabular-nums">{formatCurrency(tx.price)}</p>
                )}
              </div>

              {/* Summe */}
              <div className="col-span-3 text-right">
                <p
                  className={`text-[12px] font-semibold tabular-nums ${
                    isOutflow ? 'text-red-400/70' : tx.type === 'dividend' ? 'text-emerald-400' : 'text-white/80'
                  }`}
                >
                  {isOutflow ? '-' : tx.type === 'dividend' ? '+' : ''}
                  {formatCurrency(value)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
