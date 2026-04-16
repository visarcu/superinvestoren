// src/components/portfolio/DividendsTab.tsx
// Premium Dividenden-Übersicht mit Hero-Zone, Forward-Projection, Income-
// Milestones und Yield-on-Cost-Tabelle. Inspiriert von Parqet/Getquin.
'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { type Transaction, type Holding } from '@/hooks/usePortfolio'
import { getBrokerDisplayName, getBrokerColor } from '@/lib/brokerConfig'
import Logo from '@/components/Logo'
import { BanknotesIcon, CalendarDaysIcon, ArrowTrendingUpIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
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

type TimeRange = '12M' | '24M' | 'ALL'

// ============================================================
// Helpers: Datums-Arithmetik + Chart-Tooltip
// ============================================================
const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function ChartTooltip({
  active,
  payload,
  label,
  formatCurrency,
}: TooltipProps<number, string> & { formatCurrency: (v: number) => string }) {
  if (!active || !payload || payload.length === 0) return null
  const monthly = payload.find(p => p.dataKey === 'amount')?.value as number | undefined
  const cumulative = payload.find(p => p.dataKey === 'cumulative')?.value as number | undefined
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 shadow-2xl">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      {monthly !== undefined && (
        <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
          {formatCurrency(monthly)}
          <span className="text-[10px] text-neutral-500 font-normal ml-1">Monat</span>
        </p>
      )}
      {cumulative !== undefined && (
        <p className="text-[11px] text-neutral-400 tabular-nums mt-0.5">
          {formatCurrency(cumulative)}
          <span className="text-[10px] text-neutral-500 ml-1">kumuliert</span>
        </p>
      )}
    </div>
  )
}

// ============================================================
// Sub: StatCard (kleine Kennzahl-Box)
// ============================================================
function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: React.ReactNode
}) {
  return (
    <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4">
      <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-[17px] font-semibold tracking-tight tabular-nums text-white">{value}</p>
      {sub && <div className="text-[11px] text-neutral-500 mt-1 tabular-nums">{sub}</div>}
    </div>
  )
}

// ============================================================
// Haupt-Komponente
// ============================================================
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
  const [timeRange, setTimeRange] = useState<TimeRange>('12M')

  // Upcoming Dividends via API
  useEffect(() => {
    const tickers = [...new Set(holdings.map(h => h.symbol))].filter(Boolean)
    if (tickers.length === 0) return
    setUpcomingLoading(true)
    fetch(`/api/dividends-calendar?tickers=${tickers.join(',')}`)
      .then(r => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const today = new Date().toISOString().split('T')[0]
        const upcoming = data.filter((d: any) => d.date >= today && d.dividend > 0).slice(0, 5)
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

  // ============================================================
  // Aggregierte Kennzahlen
  // ============================================================
  const stats = useMemo(() => {
    if (dividendTransactions.length === 0) {
      return {
        totalDividends: 0,
        thisYear: 0,
        lastYear: 0,
        avgMonthly: 0,
        dividendYield: 0,
        totalPayments: 0,
        monthsSpan: 0,
        rolling12m: 0,
        prevRolling12m: 0,
      }
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())
    const twentyFourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 24, now.getDate())

    let total = 0
    let thisYearTotal = 0
    let lastYearTotal = 0
    let rolling12m = 0
    let prevRolling12m = 0

    for (const tx of dividendTransactions) {
      total += tx.total_value
      const txDate = new Date(tx.date)
      const txYear = txDate.getFullYear()
      if (txYear === currentYear) thisYearTotal += tx.total_value
      if (txYear === currentYear - 1) lastYearTotal += tx.total_value
      if (txDate >= twelveMonthsAgo) rolling12m += tx.total_value
      if (txDate < twelveMonthsAgo && txDate >= twentyFourMonthsAgo) prevRolling12m += tx.total_value
    }

    const dates = dividendTransactions.map(tx => new Date(tx.date).getTime())
    const oldest = new Date(Math.min(...dates))
    const monthsSpan = Math.max(
      1,
      (now.getFullYear() - oldest.getFullYear()) * 12 +
        (now.getMonth() - oldest.getMonth()) +
        1,
    )

    const avgMonthly = total / monthsSpan
    const dividendYield = totalPortfolioValue > 0 ? (rolling12m / totalPortfolioValue) * 100 : 0

    return {
      totalDividends: total,
      thisYear: thisYearTotal,
      lastYear: lastYearTotal,
      avgMonthly,
      dividendYield,
      totalPayments: dividendTransactions.length,
      monthsSpan,
      rolling12m,
      prevRolling12m,
    }
  }, [dividendTransactions, totalPortfolioValue])

  // ============================================================
  // Forward-Yield-Projektion: pro Holding die annualisierte Dividende aus
  // der 12-Monats-Historie berechnen und mit aktueller Quantity hochrechnen.
  //
  // Kritischer Fix: Früher hatten wir eine Map<symbol, quantity> die bei jeder
  // Div-Tx überschrieben wurde. Da dividendTransactions neueste-zuerst sortiert
  // ist, blieb am Ende die Qty der ÄLTESTEN Tx stehen. Wenn der User in der
  // Zwischenzeit nachgekauft hatte, war diese Qty viel kleiner als aktuell →
  // perShareDiv wurde um den Faktor (aktuell / alt) überschätzt → Prognose
  // explodierte (User berichtete 9107€ statt ~420€ — Faktor 21).
  //
  // Neue Logik: wir berechnen pro einzelner Div-Transaktion perShare =
  // total_value / tx.quantity und summieren diese Stück-Dividenden über die
  // letzten 12 Monate. Das ist robust gegen Qty-Änderungen.
  // ============================================================
  const forwardProjection = useMemo(() => {
    if (dividendTransactions.length === 0 || holdings.length === 0) {
      return { annualExpected: 0, perHolding: [] as Array<{ symbol: string; annual: number; yieldOnCost: number; currentYield: number }> }
    }

    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())

    // Summe der Stück-Dividenden pro Symbol (über 12 M): Σ (total_value / quantity)
    const perSymbolDivPerShare = new Map<string, number>()
    for (const tx of dividendTransactions) {
      if (new Date(tx.date) < twelveMonthsAgo) continue
      if (tx.quantity <= 0) continue // Fallback-Divs (qty=1) würden sonst explodieren
      const perShare = tx.total_value / tx.quantity
      if (!isFinite(perShare) || perShare <= 0) continue
      perSymbolDivPerShare.set(tx.symbol, (perSymbolDivPerShare.get(tx.symbol) || 0) + perShare)
    }

    const perHolding: Array<{ symbol: string; annual: number; yieldOnCost: number; currentYield: number }> = []
    let annualExpected = 0

    for (const h of holdings) {
      const perShareAnnual = perSymbolDivPerShare.get(h.symbol) || 0
      if (perShareAnnual <= 0 || h.quantity <= 0) continue

      const annual = perShareAnnual * h.quantity
      annualExpected += annual

      const costBasis = h.purchase_price_display * h.quantity
      const yieldOnCost = costBasis > 0 ? (annual / costBasis) * 100 : 0
      const currentYield = h.value > 0 ? (annual / h.value) * 100 : 0

      perHolding.push({ symbol: h.symbol, annual, yieldOnCost, currentYield })
    }

    perHolding.sort((a, b) => b.annual - a.annual)
    return { annualExpected, perHolding }
  }, [dividendTransactions, holdings])

  // ============================================================
  // Monatlicher Chart mit kumulativer Linie (nach timeRange)
  // ============================================================
  const chartData = useMemo(() => {
    if (dividendTransactions.length === 0) return []
    const now = new Date()
    const numMonths = timeRange === '12M' ? 12 : timeRange === '24M' ? 24 : 0

    // Aggregiere pro Monat
    const byMonth = new Map<string, number>()
    for (const tx of dividendTransactions) {
      const d = new Date(tx.date)
      const k = monthKey(d)
      byMonth.set(k, (byMonth.get(k) || 0) + tx.total_value)
    }

    // Für ALL: starte am ältesten Monat
    const oldest = new Date(Math.min(...dividendTransactions.map(tx => new Date(tx.date).getTime())))
    const startMonths = numMonths > 0 ? numMonths - 1 : (now.getFullYear() - oldest.getFullYear()) * 12 + (now.getMonth() - oldest.getMonth())

    const months: { month: string; amount: number; cumulative: number; key: string }[] = []
    let cumulative = 0
    for (let i = startMonths; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const k = monthKey(d)
      const amount = byMonth.get(k) || 0
      cumulative += amount
      const label = numMonths === 0 || numMonths > 12
        ? `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
        : `${MONTH_LABELS[d.getMonth()]}`
      months.push({ month: label, amount, cumulative, key: k })
    }
    return months
  }, [dividendTransactions, timeRange])

  // ============================================================
  // Gruppiert nach Symbol (für "Top-Zahler" Liste)
  // ============================================================
  const bySymbol = useMemo(() => {
    if (dividendTransactions.length === 0) return []
    const map = new Map<string, { symbol: string; name: string; totalAmount: number; count: number; lastDate: string }>()
    for (const tx of dividendTransactions) {
      const e = map.get(tx.symbol)
      if (e) {
        e.totalAmount += tx.total_value
        e.count += 1
        if (tx.date > e.lastDate) e.lastDate = tx.date
      } else {
        map.set(tx.symbol, { symbol: tx.symbol, name: tx.name, totalAmount: tx.total_value, count: 1, lastDate: tx.date })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [dividendTransactions])

  // ============================================================
  // Forward-Yield-Wachstum: 12M rolling vs. vorherige 12M
  // ============================================================
  const growth = useMemo(() => {
    if (stats.prevRolling12m === 0 && stats.rolling12m === 0) return null
    if (stats.prevRolling12m === 0) return { percent: null as number | null, label: 'Erstes Jahr' }
    const percent = ((stats.rolling12m - stats.prevRolling12m) / stats.prevRolling12m) * 100
    return { percent, label: `${percent >= 0 ? '+' : ''}${percent.toFixed(1)} % YoY` }
  }, [stats])

  // ============================================================
  // Passive Income Milestones
  // ============================================================
  const milestones = useMemo(() => {
    if (forwardProjection.annualExpected === 0) return null
    const annual = forwardProjection.annualExpected
    const monthly = annual / 12
    const daily = annual / 365
    // Nächster "runder" Jahres-Meilenstein (1.000, 2.500, 5.000, 10.000, 25.000, 50.000)
    const targets = [500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000]
    const next = targets.find(t => t > annual)
    const progress = next ? (annual / next) * 100 : 100
    return { annual, monthly, daily, next, progress }
  }, [forwardProjection])

  // ============================================================
  // Empty State
  // ============================================================
  if (dividendTransactions.length === 0) {
    return (
      <div className="space-y-5">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Dividenden</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">Aus deinen aktuellen Positionen</p>
          </div>
          {upcomingLoading ? (
            <LoadingRows count={3} />
          ) : upcomingDividends.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDaysIcon className="w-7 h-7 text-neutral-700 mx-auto mb-2" />
              <p className="text-[12px] text-neutral-500">Keine anstehenden Dividenden gefunden</p>
            </div>
          ) : (
            <UpcomingDividendsList items={upcomingDividends} holdings={holdings} />
          )}
        </div>

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

  return (
    <div className="space-y-5">
      {/* ================================================================
          HERO: 12M-Rolling-Dividende + YoY + Forward-Projektion
      ================================================================ */}
      <div className="bg-gradient-to-br from-emerald-500/5 via-neutral-900/50 to-neutral-900/50 border border-neutral-800/80 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2">Letzte 12 Monate · Netto nach Steuern</p>
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="text-[40px] lg:text-[44px] font-semibold tracking-tight text-white tabular-nums leading-none">
                {formatCurrency(stats.rolling12m)}
              </h2>
              {growth && growth.percent !== null && (
                <span className={`text-sm font-medium tabular-nums ${growth.percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {growth.label}
                </span>
              )}
            </div>
            <p className="text-[13px] text-neutral-400">
              Ø <span className="tabular-nums">{formatCurrency(stats.rolling12m / 12)}</span> / Monat · {stats.totalPayments} Zahlungen insgesamt · Yield <span className="tabular-nums">{stats.dividendYield.toFixed(2)} %</span>
            </p>
          </div>

          {forwardProjection.annualExpected > 0 && (
            <div className="lg:text-right border-t lg:border-t-0 lg:border-l border-neutral-800 lg:pl-6 pt-4 lg:pt-0">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2">Prognose nächste 12 Monate</p>
              <p className="text-[28px] lg:text-[32px] font-semibold tracking-tight text-emerald-400 tabular-nums leading-none">
                {formatCurrency(forwardProjection.annualExpected)}
              </p>
              <p className="text-[12px] text-neutral-500 mt-1">
                basierend auf aktuellem Bestand × Historie
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          STAT-GRID: 4 kompakte Kennzahlen
      ================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Gesamt erhalten"
          value={formatCurrency(stats.totalDividends)}
          sub={`über ${stats.monthsSpan} Monate`}
        />
        <StatCard
          label="Dieses Jahr"
          value={formatCurrency(stats.thisYear)}
          sub={`${new Date().getFullYear()}`}
        />
        <StatCard
          label="Ø pro Monat"
          value={formatCurrency(stats.avgMonthly)}
          sub={`~${formatCurrency(stats.avgMonthly / 30)} / Tag`}
        />
        <StatCard
          label="Yield on Cost"
          value={(() => {
            const totalCost = holdings.reduce((s, h) => s + h.purchase_price_display * h.quantity, 0)
            const yoc = totalCost > 0 ? (forwardProjection.annualExpected / totalCost) * 100 : 0
            return `${yoc.toFixed(2)} %`
          })()}
          sub="nächste 12 M / Einstandswert"
        />
      </div>

      {/* ================================================================
          MILESTONE-CARD: Passive Income Zielstand
      ================================================================ */}
      {milestones && (
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-400" />
                Passives Einkommen
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">Projektion basierend auf aktuellem Bestand</p>
            </div>
            {milestones.next && (
              <div className="text-right">
                <p className="text-[11px] text-neutral-500">Nächstes Ziel</p>
                <p className="text-[15px] font-semibold text-white tabular-nums">{formatCurrency(milestones.next)}</p>
              </div>
            )}
          </div>

          {milestones.next && (
            <div className="mb-4">
              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, milestones.progress)}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5 tabular-nums">
                {milestones.progress.toFixed(0)} % · noch {formatCurrency(milestones.next - milestones.annual)} bis zum Ziel
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Pro Tag</p>
              <p className="text-[14px] font-semibold text-white tabular-nums">{formatCurrency(milestones.daily)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Pro Monat</p>
              <p className="text-[14px] font-semibold text-white tabular-nums">{formatCurrency(milestones.monthly)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Pro Jahr</p>
              <p className="text-[14px] font-semibold text-emerald-400 tabular-nums">{formatCurrency(milestones.annual)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          ANSTEHENDE DIVIDENDEN
      ================================================================ */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Zahlungen</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Aus deinen aktuellen Positionen</p>
        </div>
        {upcomingLoading ? (
          <LoadingRows count={3} />
        ) : upcomingDividends.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDaysIcon className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
            <p className="text-[12px] text-neutral-500">Keine anstehenden Dividenden gefunden</p>
          </div>
        ) : (
          <UpcomingDividendsList items={upcomingDividends} holdings={holdings} />
        )}
      </div>

      {/* ================================================================
          MONATS-CHART mit kumulativer Linie + Zeitraum-Toggle
      ================================================================ */}
      {chartData.length > 0 && (
        <div className="bg-neutral-900/50 rounded-xl p-5 border border-neutral-800/80">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Monatlicher Verlauf</h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {timeRange === '12M' ? 'Letzte 12 Monate' : timeRange === '24M' ? 'Letzte 24 Monate' : 'Gesamte Historie'} · Balken = Monat · Linie = kumuliert
              </p>
            </div>
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
              {(['12M', '24M', 'ALL'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    timeRange === r ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[260px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dividendBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#525252', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#525252', fontSize: 10 }}
                  tickFormatter={v => (v === 0 ? '0' : `${v.toFixed(0)}€`)}
                  width={48}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#525252', fontSize: 10 }}
                  tickFormatter={v => (v === 0 ? '0' : `${(v / 1000).toFixed(1)}k`)}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={<ChartTooltip formatCurrency={formatCurrency} />}
                />
                <Bar yAxisId="left" dataKey="amount" fill="url(#dividendBar)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#a3a3a3"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ================================================================
          DIVIDENDEN-ZAHLER mit Yield on Cost / Current Yield
      ================================================================ */}
      {bySymbol.length > 0 && (
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-neutral-400" />
                Dividenden-Zahler
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">Kumulative Auszahlungen + erwartete Yield</p>
            </div>
          </div>

          {/* Desktop-Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2 border-b border-neutral-800/80 text-[10px] text-neutral-500 uppercase tracking-wider">
            <div className="col-span-4">Titel</div>
            <div className="col-span-2 text-right">Kumuliert</div>
            <div className="col-span-2 text-right">Forward 12M</div>
            <div className="col-span-2 text-right">YoC</div>
            <div className="col-span-2 text-right">Current Yield</div>
          </div>

          <div>
            {bySymbol.map(item => {
              const forward = forwardProjection.perHolding.find(p => p.symbol === item.symbol)
              const percentOfTotal = stats.totalDividends > 0 ? (item.totalAmount / stats.totalDividends) * 100 : 0

              return (
                <div
                  key={item.symbol}
                  className="px-5 py-3 grid grid-cols-12 gap-3 items-center border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/50 transition-colors"
                >
                  {/* Titel + Logo */}
                  <div className="col-span-12 md:col-span-4 flex items-center gap-3 min-w-0">
                    <Logo ticker={item.symbol} alt={item.symbol} className="w-8 h-8 flex-shrink-0" padding="none" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white truncate">{item.symbol}</span>
                        <span className="text-[10px] text-neutral-500 tabular-nums flex-shrink-0">{percentOfTotal.toFixed(0)}%</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">{item.name}</p>
                    </div>
                  </div>

                  {/* Kumuliert */}
                  <div className="col-span-4 md:col-span-2 text-right">
                    <p className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(item.totalAmount)}</p>
                    <p className="text-[10px] text-neutral-500">{item.count}× gezahlt</p>
                  </div>

                  {/* Forward 12M */}
                  <div className="col-span-4 md:col-span-2 text-right">
                    <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                      {forward ? formatCurrency(forward.annual) : '–'}
                    </p>
                    <p className="text-[10px] text-neutral-500">Prognose</p>
                  </div>

                  {/* Yield on Cost */}
                  <div className="col-span-2 md:col-span-2 text-right">
                    <p className="text-[13px] font-medium text-white tabular-nums">
                      {forward && forward.yieldOnCost > 0 ? `${forward.yieldOnCost.toFixed(2)} %` : '–'}
                    </p>
                    <p className="text-[10px] text-neutral-500 hidden md:block">YoC</p>
                  </div>

                  {/* Current Yield */}
                  <div className="col-span-2 md:col-span-2 text-right">
                    <p className="text-[13px] font-medium text-white tabular-nums">
                      {forward && forward.currentYield > 0 ? `${forward.currentYield.toFixed(2)} %` : '–'}
                    </p>
                    <p className="text-[10px] text-neutral-500 hidden md:block">Current</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================================================================
          LETZTE ZAHLUNGEN
      ================================================================ */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800/80">
          <h3 className="text-sm font-semibold text-white tracking-tight">Letzte Zahlungen</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Chronologisch absteigend</p>
        </div>
        <div>
          {visiblePayments.map(tx => {
            const txDate = new Date(tx.date)
            const formattedDate = `${String(txDate.getDate()).padStart(2, '0')}.${String(txDate.getMonth() + 1).padStart(2, '0')}.${txDate.getFullYear()}`
            return (
              <div
                key={tx.id}
                className="px-5 py-2.5 flex items-center gap-3 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/50 transition-colors"
              >
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
// Sub: LoadingRows, UpcomingDividendsList
// ============================================================
function LoadingRows({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
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
  )
}

function UpcomingDividendsList({ items, holdings }: { items: UpcomingDividend[]; holdings: Holding[] }) {
  return (
    <div>
      {items.map((div, idx) => {
        const exDate = new Date(div.date)
        const formattedDate = exDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
        const holding = holdings.find(h => h.symbol === div.ticker)
        // Erwartete Auszahlung berechnen wenn Holding existiert: quantity × dividend
        const expectedPayment = holding ? holding.quantity * div.dividend : 0
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
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Ex-Datum: {formattedDate} · {div.frequency}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {expectedPayment > 0 ? (
                <>
                  <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                    ~${expectedPayment.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-neutral-500">${div.dividend.toFixed(3)} × {holding?.quantity.toFixed(2)}</p>
                </>
              ) : (
                <p className="text-[13px] font-semibold text-neutral-400 tabular-nums">
                  ${div.dividend.toFixed(2)}/Stk
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
