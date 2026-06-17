'use client'

import React, { useEffect, useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { RealizedGainInfo, Transaction } from '@/hooks/usePortfolio'

interface RealizedGainsModalProps {
  open: boolean
  onClose: () => void
  transactions: Transaction[]
  realizedGainByTxId: Map<string, RealizedGainInfo>
  formatCurrency: (value: number) => string
  formatPercentage: (value: number) => string
}

function transactionAmount(tx: Transaction): number {
  const totalValue = Number(tx.total_value) || 0
  if (totalValue > 0) return totalValue
  return Math.abs((Number(tx.quantity) || 0) * (Number(tx.price) || 0))
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function RealizedGainsModal({
  open,
  onClose,
  transactions,
  realizedGainByTxId,
  formatCurrency,
  formatPercentage,
}: RealizedGainsModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const rows = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'sell' && realizedGainByTxId.has(tx.id))
      .map(tx => {
        const realized = realizedGainByTxId.get(tx.id)!
        const quantity = Number(tx.quantity) || 0
        const proceeds = transactionAmount(tx)
        const costBasis = realized.avgCostBasis * quantity
        const fee = Number(tx.fee) || 0

        return {
          tx,
          realized,
          proceeds,
          costBasis,
          fee,
        }
      })
      .sort((a, b) => new Date(b.tx.date).getTime() - new Date(a.tx.date).getTime())
  }, [transactions, realizedGainByTxId])

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.realized.realizedGain, 0)
    const proceeds = rows.reduce((sum, row) => sum + row.proceeds, 0)
    const winners = rows.filter(row => row.realized.realizedGain >= 0).length
    const losers = rows.length - winners
    return { total, proceeds, winners, losers }
  }, [rows])

  if (!open) return null

  const totalPositive = summary.total >= 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="realized-gains-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c16] shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
              Portfolio
            </p>
            <h2 id="realized-gains-title" className="mt-1 text-[17px] font-semibold text-white">
              Realisierte Gewinne
            </h2>
            <p className="mt-1 text-[12px] text-white/35">
              Verkaufstransaktionen mit durchschnittlicher Kaufbasis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-300/50"
            aria-label="Schließen"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryStat
              label="Realisiert"
              value={`${totalPositive ? '+' : ''}${formatCurrency(summary.total)}`}
              tone={totalPositive ? 'positive' : 'negative'}
            />
            <SummaryStat label="Verkaufserlöse" value={formatCurrency(summary.proceeds)} />
            <SummaryStat label="Gewinner" value={String(summary.winners)} tone="positive" />
            <SummaryStat label="Verlierer" value={String(summary.losers)} tone={summary.losers > 0 ? 'negative' : undefined} />
          </div>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-10 text-center">
              <p className="text-sm font-medium text-white/70">Noch keine realisierten Gewinne</p>
              <p className="mt-1 text-xs text-white/35">
                Sobald Verkaufstransaktionen vorhanden sind, erscheinen hier die Details.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-xl border border-white/[0.06] sm:block">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/35">
                    <tr>
                      <th className="px-4 py-3 font-medium">Position</th>
                      <th className="px-4 py-3 font-medium">Verkauf</th>
                      <th className="px-4 py-3 text-right font-medium">Stück</th>
                      <th className="px-4 py-3 text-right font-medium">Ø Kauf</th>
                      <th className="px-4 py-3 text-right font-medium">Verkaufspreis</th>
                      <th className="px-4 py-3 text-right font-medium">Erlös</th>
                      <th className="px-4 py-3 text-right font-medium">Realisiert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-[12px]">
                    {rows.map(row => {
                      const gainPositive = row.realized.realizedGain >= 0
                      return (
                        <tr key={row.tx.id} className="transition-colors hover:bg-white/[0.025]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-white/85">{row.tx.symbol}</p>
                            <p className="mt-0.5 max-w-[190px] truncate text-[11px] text-white/35">
                              {row.tx.name || row.tx.portfolio_name || 'Position'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-white/55">
                            <p>{formatDate(row.tx.date)}</p>
                            {row.tx.portfolio_name && (
                              <p className="mt-0.5 text-[11px] text-white/30">{row.tx.portfolio_name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-white/65">
                            {row.tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-white/65">
                            {formatCurrency(row.realized.avgCostBasis)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-white/65">
                            {formatCurrency(row.tx.price)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-white/65">
                            {formatCurrency(row.proceeds)}
                            {row.fee > 0 && (
                              <p className="mt-0.5 text-[10px] text-white/30">
                                Gebühr {formatCurrency(row.fee)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <p className={`font-semibold ${gainPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {gainPositive ? '+' : ''}
                              {formatCurrency(row.realized.realizedGain)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/35">
                              {formatPercentage(row.realized.realizedGainPercent)}
                            </p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 space-y-3 sm:hidden">
                {rows.map(row => {
                  const gainPositive = row.realized.realizedGain >= 0
                  return (
                    <div key={row.tx.id} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-white/85">{row.tx.symbol}</p>
                          <p className="mt-0.5 truncate text-[11px] text-white/35">
                            {row.tx.name || row.tx.portfolio_name || formatDate(row.tx.date)}
                          </p>
                        </div>
                        <div className="text-right tabular-nums">
                          <p className={`font-semibold ${gainPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {gainPositive ? '+' : ''}
                            {formatCurrency(row.realized.realizedGain)}
                          </p>
                          <p className="text-[11px] text-white/35">
                            {formatPercentage(row.realized.realizedGainPercent)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                        <Detail label="Verkauf" value={formatDate(row.tx.date)} />
                        <Detail label="Stück" value={row.tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} />
                        <Detail label="Ø Kauf" value={formatCurrency(row.realized.avgCostBasis)} />
                        <Detail label="Verkaufspreis" value={formatCurrency(row.tx.price)} />
                        <Detail label="Erlös" value={formatCurrency(row.proceeds)} />
                        <Detail label="Gebühr" value={row.fee > 0 ? formatCurrency(row.fee) : '-'} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-white/30">
            Berechnung nach Durchschnittskostenmethode. Gebühren werden in der Gesamtrendite separat berücksichtigt; dies ist keine Steuerberechnung.
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative'
}) {
  const color = tone === 'positive'
    ? 'text-emerald-400'
    : tone === 'negative'
      ? 'text-red-400'
      : 'text-white/90'

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/30">{label}</p>
      <p className={`mt-1 text-[16px] font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.1em] text-white/25">{label}</p>
      <p className="mt-0.5 tabular-nums text-white/70">{value}</p>
    </div>
  )
}
