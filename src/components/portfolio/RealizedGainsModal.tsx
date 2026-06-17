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
        const fee = Number(tx.fee) || 0

        return {
          tx,
          realized,
          quantity,
          proceeds,
          fee,
          costBasis: realized.avgCostBasis * quantity,
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
      className="fixed inset-0 z-[100] overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="realized-gains-title"
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
      <aside
        className="terminal-glass-strong absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-white/[0.08] bg-theme-card shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-theme px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-theme-muted">
              Performance-Details
            </p>
            <h2 id="realized-gains-title" className="mt-1 text-lg font-semibold tracking-tight text-theme-primary">
              Realisierte Gewinne
            </h2>
            <p className="mt-1 text-sm text-theme-muted">
              Verkäufe mit durchschnittlicher Kaufbasis und realisiertem Gewinn/Verlust.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-theme-muted transition-colors hover:bg-theme-hover hover:text-theme-primary focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            aria-label="Schließen"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-theme px-6 py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <Metric
              label="Realisiert"
              value={`${totalPositive ? '+' : ''}${formatCurrency(summary.total)}`}
              tone={totalPositive ? 'positive' : 'negative'}
            />
            <Metric label="Erlöse" value={formatCurrency(summary.proceeds)} />
            <Metric label="Gewinne" value={String(summary.winners)} tone="positive" />
            <Metric label="Verluste" value={String(summary.losers)} tone={summary.losers > 0 ? 'negative' : undefined} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 py-16 text-center">
              <div>
                <p className="text-sm font-medium text-theme-primary">Noch keine realisierten Gewinne</p>
                <p className="mt-1 max-w-sm text-sm text-theme-muted">
                  Sobald Verkaufstransaktionen vorhanden sind, erscheinen hier die Details.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-theme">
              {rows.map(row => {
                const gainPositive = row.realized.realizedGain >= 0
                return (
                  <article key={row.tx.id} className="px-6 py-4 transition-colors hover:bg-theme-hover">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-sm font-semibold text-theme-primary">{row.tx.symbol}</p>
                          <span className="text-xs text-theme-muted">{formatDate(row.tx.date)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-theme-muted">
                          {row.tx.name || row.tx.portfolio_name || 'Verkauf'}
                        </p>
                        {row.tx.portfolio_name && (
                          <p className="mt-0.5 text-xs text-theme-muted">{row.tx.portfolio_name}</p>
                        )}
                      </div>

                      <div className="shrink-0 text-right tabular-nums">
                        <p className={`text-sm font-semibold ${gainPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {gainPositive ? '+' : ''}
                          {formatCurrency(row.realized.realizedGain)}
                        </p>
                        <p className="mt-0.5 text-xs text-theme-muted">
                          {formatPercentage(row.realized.realizedGainPercent)}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-5">
                      <Detail label="Stück" value={row.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} />
                      <Detail label="Ø Kauf" value={formatCurrency(row.realized.avgCostBasis)} />
                      <Detail label="Verkauf" value={formatCurrency(row.tx.price)} />
                      <Detail label="Kostenbasis" value={formatCurrency(row.costBasis)} />
                      <Detail
                        label={row.fee > 0 ? 'Erlös / Gebühr' : 'Erlös'}
                        value={row.fee > 0 ? `${formatCurrency(row.proceeds)} / ${formatCurrency(row.fee)}` : formatCurrency(row.proceeds)}
                      />
                    </dl>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-theme px-6 py-3">
          <p className="text-[11px] leading-relaxed text-theme-muted">
            Durchschnittskostenmethode. Keine Steuerberechnung.
          </p>
        </footer>
      </aside>
    </div>
  )
}

function Metric({
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
      : 'text-theme-primary'

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">{label}</p>
      <p className={`mt-1 text-[15px] font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-theme-muted">{label}</dt>
      <dd className="mt-0.5 truncate tabular-nums text-theme-secondary">{value}</dd>
    </div>
  )
}
