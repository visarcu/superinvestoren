// src/components/portfolio/RealizedGainsTab.tsx
// Eigener Workspace-Reiter für realisierte Gewinne/Verluste aus Verkäufen —
// mit Jahresübersicht (für mehrjährige Nutzung) und Ansicht je Verkauf oder
// je Position. Rechenbasis wie im Rest des Depots: Durchschnittskostenmethode.
'use client'

import React, { useMemo, useState } from 'react'
import type { RealizedGainInfo, Transaction } from '@/hooks/usePortfolio'
import Logo from '@/components/Logo'
import { perfColor } from '@/utils/formatters'

interface RealizedGainsTabProps {
  transactions: Transaction[]
  realizedGainByTxId: Map<string, RealizedGainInfo>
  formatCurrency: (value: number) => string
  formatPercentage: (value: number) => string
  isAllDepotsView?: boolean
}

type GroupMode = 'sales' | 'positions'

interface SaleRow {
  tx: Transaction
  year: string
  quantity: number
  proceeds: number
  fee: number
  costBasis: number
  gain: number
  gainPercent: number
  avgCostBasis: number
}

interface YearSummary {
  year: string
  sales: number
  gains: number
  losses: number
  net: number
  proceeds: number
  fees: number
}

function transactionAmount(tx: Transaction): number {
  const totalValue = Number(tx.total_value) || 0
  if (totalValue > 0) return totalValue
  return Math.abs((Number(tx.quantity) || 0) * (Number(tx.price) || 0))
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function summarize(rows: SaleRow[]): Omit<YearSummary, 'year'> {
  let gains = 0
  let losses = 0
  let proceeds = 0
  let fees = 0
  for (const row of rows) {
    if (row.gain >= 0) gains += row.gain
    else losses += row.gain
    proceeds += row.proceeds
    fees += row.fee
  }
  return { sales: rows.length, gains, losses, net: gains + losses, proceeds, fees }
}

const signed = (formatCurrency: (v: number) => string, v: number) =>
  `${v > 0 ? '+' : ''}${formatCurrency(v)}`

export default function RealizedGainsTab({
  transactions,
  realizedGainByTxId,
  formatCurrency,
  formatPercentage,
  isAllDepotsView,
}: RealizedGainsTabProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [groupMode, setGroupMode] = useState<GroupMode>('sales')

  const allRows = useMemo<SaleRow[]>(() => {
    return transactions
      .filter(tx => tx.type === 'sell' && realizedGainByTxId.has(tx.id))
      .map(tx => {
        const realized = realizedGainByTxId.get(tx.id)!
        const quantity = Number(tx.quantity) || 0
        return {
          tx,
          year: String(new Date(tx.date).getFullYear()),
          quantity,
          proceeds: transactionAmount(tx),
          fee: Number(tx.fee) || 0,
          costBasis: realized.avgCostBasis * quantity,
          gain: realized.realizedGain,
          gainPercent: realized.realizedGainPercent,
          avgCostBasis: realized.avgCostBasis,
        }
      })
      .sort((a, b) => new Date(b.tx.date).getTime() - new Date(a.tx.date).getTime())
  }, [transactions, realizedGainByTxId])

  const years = useMemo<YearSummary[]>(() => {
    const byYear = new Map<string, SaleRow[]>()
    for (const row of allRows) {
      if (!byYear.has(row.year)) byYear.set(row.year, [])
      byYear.get(row.year)!.push(row)
    }
    return Array.from(byYear.entries())
      .map(([year, rows]) => ({ year, ...summarize(rows) }))
      .sort((a, b) => Number(b.year) - Number(a.year))
  }, [allRows])

  const rows = useMemo(
    () => (selectedYear === 'all' ? allRows : allRows.filter(r => r.year === selectedYear)),
    [allRows, selectedYear]
  )
  const summary = useMemo(() => summarize(rows), [rows])

  // Je Position aggregiert (Symbol, bei "Alle Depots" depotübergreifend)
  const positionRows = useMemo(() => {
    const bySymbol = new Map<string, { symbol: string; name: string; sales: number; quantity: number; proceeds: number; costBasis: number; fees: number; gain: number; lastDate: string }>()
    for (const row of rows) {
      const key = row.tx.symbol
      const entry = bySymbol.get(key) ?? {
        symbol: row.tx.symbol,
        name: row.tx.name || row.tx.symbol,
        sales: 0,
        quantity: 0,
        proceeds: 0,
        costBasis: 0,
        fees: 0,
        gain: 0,
        lastDate: row.tx.date,
      }
      entry.sales += 1
      entry.quantity += row.quantity
      entry.proceeds += row.proceeds
      entry.costBasis += row.costBasis
      entry.fees += row.fee
      entry.gain += row.gain
      if (row.tx.date > entry.lastDate) entry.lastDate = row.tx.date
      bySymbol.set(key, entry)
    }
    return Array.from(bySymbol.values()).sort((a, b) => b.gain - a.gain)
  }, [rows])

  if (allRows.length === 0) {
    return (
      <div className="rounded-xl border border-theme bg-theme-card px-6 py-16 text-center">
        <p className="text-sm font-medium text-theme-primary">Noch keine realisierten Gewinne</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-theme-muted">
          Sobald Verkäufe erfasst sind, erscheinen hier deine realisierten Gewinne und Verluste — nach Jahren aufgeteilt.
        </p>
      </div>
    )
  }

  const periodLabel = selectedYear === 'all' ? 'Gesamt' : selectedYear

  return (
    <div className="space-y-4">
      {/* Kennzahlen für den gewählten Zeitraum */}
      <div className="rounded-xl border border-theme bg-theme-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-theme-primary">Realisierte Gewinne · {periodLabel}</h2>
            <p className="mt-0.5 text-xs text-theme-muted">
              Verkäufe gegen die durchschnittliche Kaufbasis{isAllDepotsView ? ' · alle Depots' : ''}
            </p>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-theme p-0.5">
            {['all', ...years.map(y => y.year)].map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors ${
                  selectedYear === year ? 'bg-theme-hover text-theme-primary' : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                {year === 'all' ? 'Alle Jahre' : year}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Netto realisiert" value={signed(formatCurrency, summary.net)} valueClass={perfColor(summary.net)} />
          <Metric label="Gewinne" value={signed(formatCurrency, summary.gains)} valueClass={summary.gains > 0 ? 'text-emerald-400' : undefined} />
          <Metric label="Verluste" value={signed(formatCurrency, summary.losses)} valueClass={summary.losses < 0 ? 'text-red-400' : undefined} />
          <Metric label="Verkäufe" value={String(summary.sales)} />
          <Metric label="Erlöse" value={formatCurrency(summary.proceeds)} />
          <Metric label="Gebühren" value={summary.fees > 0 ? `-${formatCurrency(summary.fees)}` : formatCurrency(0)} />
        </div>
      </div>

      {/* Jahresübersicht — klickbar als Filter */}
      {years.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-theme bg-theme-card">
          <div className="border-b border-theme px-5 py-3">
            <h3 className="text-xs font-semibold text-theme-primary">Nach Jahren</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-theme-muted">
                  <th className="px-5 py-2 text-left font-medium">Jahr</th>
                  <th className="px-3 py-2 text-right font-medium">Verkäufe</th>
                  <th className="px-3 py-2 text-right font-medium">Gewinne</th>
                  <th className="px-3 py-2 text-right font-medium">Verluste</th>
                  <th className="px-3 py-2 text-right font-medium">Gebühren</th>
                  <th className="px-5 py-2 text-right font-medium">Netto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {years.map(y => (
                  <tr
                    key={y.year}
                    onClick={() => setSelectedYear(prev => (prev === y.year ? 'all' : y.year))}
                    className={`cursor-pointer tabular-nums transition-colors hover:bg-theme-hover ${
                      selectedYear === y.year ? 'bg-theme-hover' : ''
                    }`}
                  >
                    <td className="px-5 py-2.5 font-medium text-theme-primary">{y.year}</td>
                    <td className="px-3 py-2.5 text-right text-theme-secondary">{y.sales}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400">{signed(formatCurrency, y.gains)}</td>
                    <td className="px-3 py-2.5 text-right text-red-400">{signed(formatCurrency, y.losses)}</td>
                    <td className="px-3 py-2.5 text-right text-theme-muted">{y.fees > 0 ? `-${formatCurrency(y.fees)}` : '–'}</td>
                    <td className={`px-5 py-2.5 text-right font-semibold ${perfColor(y.net)}`}>{signed(formatCurrency, y.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail: je Verkauf oder je Position */}
      <div className="overflow-hidden rounded-xl border border-theme bg-theme-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme px-5 py-3">
          <h3 className="text-xs font-semibold text-theme-primary">
            {groupMode === 'sales' ? 'Verkäufe' : 'Nach Position'} · {periodLabel}
          </h3>
          <div className="flex gap-1 rounded-lg border border-theme p-0.5">
            {([['sales', 'Verkäufe'], ['positions', 'Nach Position']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  groupMode === mode ? 'bg-theme-hover text-theme-primary' : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {groupMode === 'sales' ? (
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-theme-muted">
                  <th className="px-5 py-2 text-left font-medium">Position</th>
                  <th className="px-3 py-2 text-left font-medium">Datum</th>
                  <th className="px-3 py-2 text-right font-medium">Stück</th>
                  <th className="px-3 py-2 text-right font-medium">Ø Kauf</th>
                  <th className="px-3 py-2 text-right font-medium">Verkauf</th>
                  <th className="px-3 py-2 text-right font-medium">Erlös</th>
                  <th className="px-3 py-2 text-right font-medium">Gebühr</th>
                  <th className="px-5 py-2 text-right font-medium">Gewinn/Verlust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {rows.map(row => (
                  <tr key={row.tx.id} className="tabular-nums transition-colors hover:bg-theme-hover">
                    <td className="px-5 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Logo ticker={row.tx.symbol} alt={row.tx.symbol} className="h-6 w-6 shrink-0" padding="none" />
                        <div className="min-w-0">
                          <p className="font-medium text-theme-primary">{row.tx.symbol}</p>
                          <p className="max-w-[200px] truncate text-[10px] text-theme-muted">
                            {row.tx.name}
                            {isAllDepotsView && row.tx.portfolio_name ? ` · ${row.tx.portfolio_name}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-theme-secondary">{formatDate(row.tx.date)}</td>
                    <td className="px-3 py-2.5 text-right text-theme-secondary">
                      {row.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-theme-secondary">{formatCurrency(row.avgCostBasis)}</td>
                    <td className="px-3 py-2.5 text-right text-theme-secondary">{formatCurrency(Number(row.tx.price) || 0)}</td>
                    <td className="px-3 py-2.5 text-right text-theme-secondary">{formatCurrency(row.proceeds)}</td>
                    <td className="px-3 py-2.5 text-right text-theme-muted">{row.fee > 0 ? formatCurrency(row.fee) : '–'}</td>
                    <td className="px-5 py-2.5 text-right">
                      <p className={`font-semibold ${perfColor(row.gain)}`}>{signed(formatCurrency, row.gain)}</p>
                      <p className={`text-[10px] ${perfColor(row.gainPercent, 'muted')}`}>{formatPercentage(row.gainPercent)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-theme-muted">
                  <th className="px-5 py-2 text-left font-medium">Position</th>
                  <th className="px-3 py-2 text-right font-medium">Verkäufe</th>
                  <th className="px-3 py-2 text-right font-medium">Stück</th>
                  <th className="px-3 py-2 text-right font-medium">Kostenbasis</th>
                  <th className="px-3 py-2 text-right font-medium">Erlös</th>
                  <th className="px-3 py-2 text-right font-medium">Letzter Verkauf</th>
                  <th className="px-5 py-2 text-right font-medium">Gewinn/Verlust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {positionRows.map(pos => {
                  const pct = pos.costBasis > 0 ? (pos.gain / pos.costBasis) * 100 : 0
                  return (
                    <tr key={pos.symbol} className="tabular-nums transition-colors hover:bg-theme-hover">
                      <td className="px-5 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Logo ticker={pos.symbol} alt={pos.symbol} className="h-6 w-6 shrink-0" padding="none" />
                          <div className="min-w-0">
                            <p className="font-medium text-theme-primary">{pos.symbol}</p>
                            <p className="max-w-[200px] truncate text-[10px] text-theme-muted">{pos.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">{pos.sales}</td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">
                        {pos.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">{formatCurrency(pos.costBasis)}</td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">{formatCurrency(pos.proceeds)}</td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">{formatDate(pos.lastDate)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <p className={`font-semibold ${perfColor(pos.gain)}`}>{signed(formatCurrency, pos.gain)}</p>
                        <p className={`text-[10px] ${perfColor(pct, 'muted')}`}>{formatPercentage(pct)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="border-t border-theme px-5 py-2.5 text-[10px] text-theme-muted">
          Durchschnittskostenmethode. Kaufgebühren stecken in der Kaufbasis, Verkaufsgebühren sind separat
          ausgewiesen. Keine Steuerberechnung — für die Steuer gilt die Abrechnung deines Brokers.
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">{label}</p>
      <p className={`mt-1 truncate text-[15px] font-semibold tabular-nums ${valueClass ?? 'text-theme-primary'}`}>{value}</p>
    </div>
  )
}
