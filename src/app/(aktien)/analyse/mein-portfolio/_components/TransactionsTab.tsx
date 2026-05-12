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
  // Nach Jahr → Monat → Tag gruppieren, mit Summary pro Monat
  const byYear = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    type MonthSummary = {
      bought: number   // Σ Käufe (€ in den Markt)
      sold: number     // Σ Verkäufe (€ aus dem Markt)
      divs: number     // Σ Dividenden
      depositsIn: number   // Σ Einzahlungen ("frisches Geld")
      withdrawalsOut: number  // Σ Auszahlungen
      buyCount: number
      sellCount: number
      divCount: number
    }
    type MonthBucket = {
      key: string
      label: string
      rows: Transaction[]
      summary: MonthSummary
    }
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
        const summary: MonthSummary = {
          bought: 0, sold: 0, divs: 0,
          depositsIn: 0, withdrawalsOut: 0,
          buyCount: 0, sellCount: 0, divCount: 0,
        }
        for (const t of rows) {
          const v = t.total_value || t.price * t.quantity
          netValue += INFLOW_TYPES.has(t.type) ? v : -v
          if (t.type === 'buy') {
            summary.bought += v
            summary.buyCount++
          } else if (t.type === 'sell') {
            summary.sold += v
            summary.sellCount++
          } else if (t.type === 'dividend') {
            summary.divs += v
            summary.divCount++
          } else if (t.type === 'cash_deposit') {
            summary.depositsIn += v
          } else if (t.type === 'cash_withdrawal') {
            summary.withdrawalsOut += v
          }
        }
        const monthIdx = parseInt(monthKey.split('-')[1], 10)
        months.push({
          key: monthKey,
          label: `${MONTH_NAMES[monthIdx]} ${year}`,
          rows,
          summary,
        })
      }
      result.push({ year, count, netValue, months })
    }
    return result
  }, [transactions])

  // "Frisches Geld" — Aggregat über alle Transaktionen (für Stat-Karte oben)
  const cashflowStats = useMemo(() => {
    let depositsIn = 0       // Σ Einzahlungen (vom Bankkonto rein)
    let withdrawalsOut = 0   // Σ Auszahlungen (raus aufs Bankkonto)
    let bought = 0           // Σ Käufe (in Markt investiert)
    let sold = 0             // Σ Verkäufe (aus Markt zurück)
    for (const t of transactions) {
      const v = t.total_value || t.price * t.quantity
      if (t.type === 'cash_deposit') depositsIn += v
      else if (t.type === 'cash_withdrawal') withdrawalsOut += v
      else if (t.type === 'buy') bought += v
      else if (t.type === 'sell') sold += v
    }
    const netDeposits = depositsIn - withdrawalsOut  // echte Sparquote-Basis
    const netInvested = bought - sold                // netto in den Markt
    // "Fremdfinanziert" = Käufe minus echtes Geld (Kredit / Reinvest aus Verkäufen)
    const externallyFinanced = Math.max(0, netInvested - netDeposits)
    return { depositsIn, withdrawalsOut, netDeposits, bought, sold, netInvested, externallyFinanced }
  }, [transactions])

  // Expand-State: aktuelles Jahr und aktueller Monat standardmäßig auf
  const now = new Date()
  const currentYear = String(now.getFullYear())
  const currentMonthKey = `${currentYear}-${String(now.getMonth()).padStart(2, '0')}`
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    init[currentYear] = true
    return init
  })
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => ({
    [currentMonthKey]: true,
  }))

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Keine Transaktionen</p>
      </div>
    )
  }

  const toggle = (year: string) =>
    setExpanded(e => ({ ...e, [year]: !e[year] }))

  const toggleMonth = (key: string) =>
    setExpandedMonths(e => ({ ...e, [key]: !e[key] }))

  const hasCashflowData =
    cashflowStats.depositsIn > 0 ||
    cashflowStats.withdrawalsOut > 0 ||
    cashflowStats.bought > 0

  return (
    <div className="space-y-3">
      {hasCashflowData && (
        <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="text-[13px] font-semibold text-white/90 tracking-tight">
                Frisches Geld
              </h3>
              <p className="text-[11px] text-white/35 mt-0.5">
                Was wirklich vom Bankkonto kam — die Basis deiner echten Sparquote.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] rounded-lg overflow-hidden">
            <Stat
              label="Eingezahlt"
              value={`+${formatCurrency(cashflowStats.depositsIn)}`}
              tone="emerald"
              hint="Σ Einzahlungen aufs Depot"
            />
            <Stat
              label="Ausgezahlt"
              value={cashflowStats.withdrawalsOut > 0
                ? `−${formatCurrency(cashflowStats.withdrawalsOut)}`
                : `${formatCurrency(0)}`}
              tone={cashflowStats.withdrawalsOut > 0 ? 'red' : 'neutral'}
              hint="Σ Auszahlungen vom Depot"
            />
            <Stat
              label="Netto-Sparen"
              value={`${cashflowStats.netDeposits >= 0 ? '+' : '−'}${formatCurrency(Math.abs(cashflowStats.netDeposits))}`}
              tone={cashflowStats.netDeposits >= 0 ? 'emerald' : 'red'}
              hint="Eingezahlt − Ausgezahlt"
              emphasised
            />
            <Stat
              label="Investiert"
              value={`${formatCurrency(cashflowStats.bought)}`}
              tone="neutral"
              hint={cashflowStats.externallyFinanced > 0
                ? `Davon ${formatCurrency(cashflowStats.externallyFinanced)} aus Kredit/Verkäufen`
                : 'Σ Käufe (brutto)'}
            />
          </div>
          {cashflowStats.externallyFinanced > 0 && (
            <p className="mt-3 text-[11px] text-amber-400/70 leading-relaxed">
              Du hast {formatCurrency(cashflowStats.bought)} investiert, aber nur{' '}
              {formatCurrency(cashflowStats.netDeposits)} netto eingezahlt — die Differenz von{' '}
              <span className="font-medium text-amber-300">
                {formatCurrency(cashflowStats.externallyFinanced)}
              </span>{' '}
              kam aus Kredit oder Verkaufserlösen.
            </p>
          )}
        </section>
      )}

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
                {months.map(({ key, label, rows, summary }) => {
                  const isMonthOpen = !!expandedMonths[key]
                  return (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => toggleMonth(key)}
                      className="w-full px-5 py-2.5 border-b border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.025] transition-colors text-left"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <svg
                            className={`w-3 h-3 text-white/30 transition-transform ${
                              isMonthOpen ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                          <p className="text-[10px] font-medium text-white/35 uppercase tracking-[0.14em]">
                            {label}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] tabular-nums">
                          {summary.buyCount > 0 && (
                            <span className="flex items-baseline gap-1.5">
                              <span className="text-white/30">
                                {summary.buyCount} {summary.buyCount === 1 ? 'Kauf' : 'Käufe'}
                              </span>
                              <span className="text-emerald-300/85 font-medium">
                                +{formatCurrency(summary.bought)}
                              </span>
                            </span>
                          )}
                          {summary.sellCount > 0 && (
                            <span className="flex items-baseline gap-1.5">
                              <span className="text-white/30">
                                {summary.sellCount} {summary.sellCount === 1 ? 'Verkauf' : 'Verkäufe'}
                              </span>
                              <span className="text-red-300/85 font-medium">
                                −{formatCurrency(summary.sold)}
                              </span>
                            </span>
                          )}
                          {summary.divCount > 0 && (
                            <span className="flex items-baseline gap-1.5">
                              <span className="text-white/30">
                                {summary.divCount} Div.
                              </span>
                              <span className="text-emerald-300/85 font-medium">
                                +{formatCurrency(summary.divs)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {isMonthOpen && rows.map((t, i) => {
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
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
  hint,
  emphasised,
}: {
  label: string
  value: string
  tone: 'emerald' | 'red' | 'neutral'
  hint?: string
  emphasised?: boolean
}) {
  const valueColor =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'red'
      ? 'text-red-300'
      : 'text-white/85'
  return (
    <div
      className={`px-4 py-3 bg-[#0a0a12] ${
        emphasised ? 'bg-white/[0.015]' : ''
      }`}
    >
      <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.14em]">
        {label}
      </p>
      <p
        className={`mt-1.5 text-[15px] font-semibold tabular-nums tracking-tight ${valueColor}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[10px] text-white/30 leading-snug">{hint}</p>
      )}
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
