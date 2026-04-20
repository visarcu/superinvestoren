'use client'

import React from 'react'
import type { Transaction } from '../_lib/types'

interface TransactionsTabProps {
  transactions: Transaction[]
  formatCurrency: (v: number) => string
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

// Inflows = Wert wird grün dargestellt; outflows = rot
const INFLOW_TYPES = new Set(['buy', 'cash_deposit', 'dividend', 'transfer_in'])

export default function TransactionsTab({ transactions, formatCurrency }: TransactionsTabProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/15 text-sm">Keine Transaktionen</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {transactions.map(t => {
        const isInflow = INFLOW_TYPES.has(t.type)
        const label = TYPE_LABELS[t.type] ?? t.type
        const value = t.total_value || t.price * t.quantity

        return (
          <div
            key={t.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0c0c16] border border-white/[0.04]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isInflow ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 ${isInflow ? 'text-emerald-400' : 'text-red-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {isInflow ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                  )}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-white/70 truncate">{t.symbol || label}</p>
                <p className="text-[10px] text-white/20">
                  {label}
                  {t.quantity > 0 ? ` · ${t.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.` : ''}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p
                className={`text-[13px] font-semibold tabular-nums ${
                  isInflow ? 'text-emerald-400/70' : 'text-red-400/70'
                }`}
              >
                {isInflow ? '+' : '-'}
                {formatCurrency(value)}
              </p>
              <p className="text-[10px] text-white/15">{new Date(t.date).toLocaleDateString('de-DE')}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
