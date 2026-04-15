// src/components/portfolio/DividendsTab.tsx
// Premium-Style Dividenden-Übersicht — neutral, dezent, mit klaren Hierarchien.
'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { type Transaction, type Holding } from '@/hooks/usePortfolio'
import { getBrokerDisplayName, getBrokerColor } from '@/lib/brokerConfig'
import Logo from '@/components/Logo'
import { BanknotesIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts'

interface UpcomingDividend {
  ticker: string
  date: string
  paymentDate: string
  dividend: number
  frequency: string
}

interface DividendsTabProps {
  transactions: Transaction[]
  holdings: Holding[]
  totalPortfolioValue: number
  formatCurrency: (amount: number) => string
  isAllDepotsView: boolean
}

// Premium-Tooltip
function DividendChartTooltip({ active, payload, label, formatCurrency }: TooltipProps<number, string> & { formatCurrency: (v: number) => string }) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 shadow-2xl">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13px] font-semibold text-white tabular-nums">
        {formatCurrency(payload[0].value as number)}
      </p>
    </div>
  )
}

// Wiederverwendbare Karten-Komponente
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: React.ReactNode; accent?: 'positive' | 'neutral' }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4">
      <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-xl font-semibold tracking-tight tabular-nums ${
        accent === 'positive' ? 'text-emerald-400' : 'text-white'
      }`}>{value}</p>
      {sub && <div className="text-[11px] text-neutral-500 mt-1.5 tabular-nums">{sub}</div>}
    </div>
  )
}

export default function DividendsTab({
  transactions,
  holdings,
  totalPortfolioValue,
  formatCurrency,
  isAllDepotsView,
}: DividendsTabProps) {
  const [showAllPayments, setShowAllPayments] = useState(false)
  const [upcomingDividends, setUpcomingDividends] = useState<UpcomingDividend[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(false)

  useEffect(() => {
    const tickers = [...new Set(holdings.map(h => h.symbol))].filter(Boolean)
    if (tickers.length === 0) return

    setUpcomingLoading(true)
    fetch(`/api/dividends-calendar?tickers=${tickers.join(',')}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const today = new Date().toISOString().split('T')[0]
        const upcoming = data
          .filter((d: any) => d.date >= today && d.dividend > 0)
          .slice(0, 5)
        setUpcomingDividends(upcoming)
      })
      .catch(() => {})
      .finally(() => setUpcomingLoading(false))
  }, [holdings])

  // Alle Dividenden-Transaktionen (neueste zuerst)
  const dividendTransactions = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'dividend')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions])

  // Aggregierte Kennzahlen
  const stats = useMemo(() => {
    if (dividendTransactions.length === 0) {
      return { totalDividends: 0, thisYear: 0, lastYear: 0, avgMonthly: 0, dividendYield: 0, totalPayments: 0, monthsSpan: 0 }
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const lastYearN = currentYear - 1

    let total = 0
    let thisYearTotal = 0
    let lastYearTotal = 0

    for (const tx of dividendTransactions) {
      total += tx.total_value
      const txYear = new Date(tx.date).getFullYear()
      if (txYear === currentYear) thisYearTotal += tx.total_value
      if (txYear === lastYearN) lastYearTotal += tx.total_value
    }

    const dates = dividendTransactions.map(tx => new Date(tx.date).getTime())
    const oldest = new Date(Math.min(...dates))
    const monthsSpan = Math.max(1,
      (now.getFullYear() - oldest.getFullYear()) * 12 + (now.getMonth() - oldest.getMonth()) + 1
    )

    const avgMonthly = total / monthsSpan
    const dividendYield = totalPortfolioValue > 0 ? (thisYearTotal / totalPortfolioValue) * 100 : 0

    return {
      totalDividends: total,
      thisYear: thisYearTotal,
      lastYear: lastYearTotal,
      avgMonthly,
      dividendYield,
      totalPayments: dividendTransactions.length,
      monthsSpan,
    }
  }, [dividendTransactions, totalPortfolioValue])

  // Monatliche Daten für BarChart (letzte 12 Monate)
  const monthlyData = useMemo(() => {
    if (dividendTransactions.length === 0) return []

    const now = new Date()
    const months: { month: string; amount: number; key: string }[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
      months.push({ month: label, amount: 0, key })
    }

    for (const tx of dividendTransactions) {
      const txDate = new Date(tx.date)
      const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
      const entry = months.find(m => m.key === txKey)
      if (entry) entry.amount += tx.total_value
    }

    return months
  }, [dividendTransactions])

  // Gruppiert nach Symbol
  const bySymbol = useMemo(() => {
    if (dividendTransactions.length === 0) return []

    const map = new Map<string, { symbol: string; name: string; totalAmount: number; count: number; lastDate: string }>()

    for (const tx of dividendTransactions) {
      const existing = map.get(tx.symbol)
      if (existing) {
        existing.totalAmount += tx.total_value
        existing.count += 1
        if (tx.date > existing.lastDate) existing.lastDate = tx.date
      } else {
        map.set(tx.symbol, {
          symbol: tx.symbol,
          name: tx.name,
          totalAmount: tx.total_value,
          count: 1,
          lastDate: tx.date,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [dividendTransactions])

  // YoY-Vergleich
  const yoyText = useMemo(() => {
    if (stats.lastYear === 0 && stats.thisYear === 0) return null
    if (stats.lastYear === 0) return 'Erstes Jahr'
    const change = ((stats.thisYear - stats.lastYear) / stats.lastYear) * 100
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(0)}% vs. Vorjahr`
  }, [stats])

  // ============================================================
  // EMPTY STATE
  // ============================================================
  if (dividendTransactions.length === 0) {
    return (
      <div className="space-y-5">
        {/* Anstehende Dividenden */}
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Dividenden</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Aus deinen aktuellen Positionen</p>
          </div>
          {upcomingLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-neutral-800 rounded-full" />
                    <div>
                      <div className="h-3 bg-neutral-800 rounded w-16 mb-1" />
                      <div className="h-2.5 bg-neutral-800 rounded w-24" />
                    </div>
                  </div>
                  <div className="h-3 bg-neutral-800 rounded w-20" />
                </div>
              ))}
            </div>
          ) : upcomingDividends.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDaysIcon className="w-7 h-7 text-neutral-700 mx-auto mb-2" />
              <p className="text-[12px] text-neutral-500">Keine anstehenden Dividenden gefunden</p>
            </div>
          ) : (
            <UpcomingDividendsList items={upcomingDividends} holdings={holdings} />
          )}
        </div>

        {/* Empty Hint */}
        <div className="bg-neutral-900/30 rounded-xl border border-neutral-800/80 border-dashed p-10 text-center">
          <div className="w-11 h-11 mx-auto mb-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center">
            <BanknotesIcon className="w-5 h-5 text-neutral-400" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1 tracking-tight">Noch keine Dividenden</h3>
          <p className="text-[12px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Dividenden erscheinen automatisch hier, sobald sie über den Import oder den + Button erfasst werden.
          </p>
        </div>
      </div>
    )
  }

  const visiblePayments = showAllPayments ? dividendTransactions : dividendTransactions.slice(0, 15)
  const maxSymbolAmount = bySymbol.length > 0 ? bySymbol[0].totalAmount : 1

  return (
    <div className="space-y-5">
      {/* Kennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Gesamt erhalten"
          value={formatCurrency(stats.totalDividends)}
          accent="positive"
          sub={`${stats.totalPayments} Zahlung${stats.totalPayments !== 1 ? 'en' : ''}`}
        />
        <StatCard
          label={`Dieses Jahr (${new Date().getFullYear()})`}
          value={formatCurrency(stats.thisYear)}
          accent="positive"
          sub={yoyText && (
            <span className={
              yoyText === 'Erstes Jahr' ? 'text-neutral-500'
                : yoyText.startsWith('+') ? 'text-emerald-400/80'
                : 'text-red-400/80'
            }>{yoyText}</span>
          )}
        />
        <StatCard
          label="Ø Monatlich"
          value={formatCurrency(stats.avgMonthly)}
          accent="positive"
          sub={`über ${stats.monthsSpan} Monat${stats.monthsSpan !== 1 ? 'e' : ''}`}
        />
        <StatCard
          label="Persönliche Rendite"
          value={`${stats.dividendYield.toFixed(2)}%`}
          accent="positive"
          sub="Jahres-Div. / Portfoliowert"
        />
      </div>

      {/* Anstehende Dividenden */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Dividenden</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Aus deinen aktuellen Positionen</p>
        </div>
        {upcomingLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-neutral-800 rounded-full" />
                  <div>
                    <div className="h-3 bg-neutral-800 rounded w-16 mb-1" />
                    <div className="h-2.5 bg-neutral-800 rounded w-24" />
                  </div>
                </div>
                <div className="h-3 bg-neutral-800 rounded w-20" />
              </div>
            ))}
          </div>
        ) : upcomingDividends.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDaysIcon className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
            <p className="text-[12px] text-neutral-500">Keine anstehenden Dividenden gefunden</p>
          </div>
        ) : (
          <UpcomingDividendsList items={upcomingDividends} holdings={holdings} />
        )}
      </div>

      {/* Monatlicher Verlauf */}
      {monthlyData.length > 0 && (
        <div className="bg-neutral-900/50 rounded-xl p-5 border border-neutral-800/80">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">Monatlicher Verlauf</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Letzte 12 Monate</p>
          </div>
          <div className="h-[240px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#525252', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#525252', fontSize: 10 }}
                  tickFormatter={(v) => v === 0 ? '0' : `${v.toFixed(0)}€`}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={<DividendChartTooltip formatCurrency={formatCurrency} />}
                />
                <Bar
                  dataKey="amount"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dividenden nach Aktie */}
      {bySymbol.length > 0 && (
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800/80">
            <h3 className="text-sm font-semibold text-white tracking-tight">Top Dividendenzahler</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Sortiert nach kumulierter Auszahlung</p>
          </div>
          <div>
            {bySymbol.map((item) => {
              const percent = stats.totalDividends > 0 ? (item.totalAmount / stats.totalDividends) * 100 : 0
              return (
                <div key={item.symbol} className="px-5 py-3 flex items-center gap-3 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/50 transition-colors">
                  <Logo ticker={item.symbol} alt={item.symbol} className="w-7 h-7 flex-shrink-0" padding="none" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[13px] font-medium text-white">{item.symbol}</span>
                      <span className="text-[11px] text-neutral-500 truncate">{item.name}</span>
                    </div>
                    <div className="h-1 bg-neutral-800/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/70 rounded-full transition-all"
                        style={{ width: `${(item.totalAmount / maxSymbolAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-semibold text-white tabular-nums">
                      {formatCurrency(item.totalAmount)}
                    </p>
                    <p className="text-[10px] text-neutral-500 tabular-nums">
                      {item.count}× · {percent.toFixed(0)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Letzte Zahlungen */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800/80">
          <h3 className="text-sm font-semibold text-white tracking-tight">Letzte Zahlungen</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Chronologisch absteigend</p>
        </div>
        <div>
          {visiblePayments.map((tx) => {
            const txDate = new Date(tx.date)
            const formattedDate = `${String(txDate.getDate()).padStart(2, '0')}.${String(txDate.getMonth() + 1).padStart(2, '0')}.${txDate.getFullYear()}`

            return (
              <div key={tx.id} className="px-5 py-2.5 flex items-center gap-3 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/50 transition-colors">
                <Logo ticker={tx.symbol} alt={tx.symbol} className="w-7 h-7 flex-shrink-0" padding="none" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">{tx.symbol}</span>
                    <span className="text-[11px] text-neutral-500 truncate">{tx.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-neutral-500 tabular-nums">{formattedDate}</span>
                    {isAllDepotsView && tx.portfolio_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getBrokerColor(tx.broker_type, tx.broker_color) }}
                        />
                        {getBrokerDisplayName(tx.broker_type, tx.broker_name) || tx.portfolio_name}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-emerald-400 tabular-nums flex-shrink-0">
                  {formatCurrency(tx.total_value)}
                </p>
              </div>
            )
          })}
        </div>

        {dividendTransactions.length > 15 && !showAllPayments && (
          <button
            onClick={() => setShowAllPayments(true)}
            className="w-full py-3 text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-neutral-900/50 transition-colors border-t border-neutral-800/80"
          >
            Alle {dividendTransactions.length} Zahlungen anzeigen
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// UpcomingDividendsList — Sub-Komponente
// ============================================================
function UpcomingDividendsList({ items, holdings }: { items: UpcomingDividend[]; holdings: Holding[] }) {
  return (
    <div>
      {items.map((div, idx) => {
        const exDate = new Date(div.date)
        const formattedDate = exDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
        const holding = holdings.find(h => h.symbol === div.ticker)
        return (
          <Link
            key={idx}
            href={`/analyse/stocks/${div.ticker.toLowerCase()}`}
            className="flex items-center justify-between py-2.5 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/40 transition-colors -mx-2 px-2 rounded"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Logo ticker={div.ticker} alt={div.ticker} className="w-7 h-7 flex-shrink-0" padding="none" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white">{div.ticker}</span>
                  {holding?.name && (
                    <span className="text-[11px] text-neutral-500 truncate hidden sm:inline">{holding.name}</span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5">Ex-Datum: {formattedDate}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                ${div.dividend.toFixed(2)}
              </p>
              <p className="text-[10px] text-neutral-500">{div.frequency}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
