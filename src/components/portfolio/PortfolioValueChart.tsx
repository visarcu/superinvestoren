// src/components/portfolio/PortfolioValueChart.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { perfColor } from '@/utils/formatters'

interface PortfolioValueChartProps {
  /** Einzel-Depot-ID. Bei "Alle Depots"-Ansicht ignoriert — dann portfolioIds nutzen. */
  portfolioId: string
  /**
   * UUIDs aller Depots in der "Alle Depots"-Ansicht. Wird nur gesetzt wenn der
   * User die Aggregat-Ansicht aktiv hat — sonst undefined. Die API nutzt dann
   * `.in('portfolio_id', portfolioIds)` statt einer einzelnen Abfrage.
   */
  portfolioIds?: string[]
  holdings: Array<{
    portfolio_id?: string
    symbol: string
    quantity: number
    purchase_price: number
    current_value?: number
    purchase_date?: string
  }>
  cashPosition: number
  formatCurrency: (amount: number) => string
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'MAX'
type ChartView = 'value' | 'performance'

interface ValueDataPoint {
  date: string
  value: number
  invested: number
  label: string
}

interface PerformanceDataPoint {
  date: string
  portfolioPerformance: number
  spyPerformance: number
  msciWorldPerformance: number
  ftseAllWorldPerformance: number
  label: string
}

export default function PortfolioValueChart({
  portfolioId,
  portfolioIds,
  holdings,
  cashPosition,
  formatCurrency
}: PortfolioValueChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('MAX')
  const [chartView, setChartView] = useState<ChartView>('value')
  const [valueData, setValueData] = useState<ValueDataPoint[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (holdings.length === 0) {
      setValueData([])
      setPerformanceData([])
      setLoading(false)
      return
    }

    setLoading(true)

    // MAX: 15 Jahre erlauben — Backend trimmt auf das erste Transaktionsdatum,
    // sodass nur die tatsächlich relevante Historie geladen wird.
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'MAX': 5475 }[selectedRange]

    try {
      const response = await fetch('/api/portfolio-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Bei Alle-Depots-Ansicht: echte UUIDs aller Portfolios durchreichen.
          // Sonst würde die API die synthetische 'all'-ID als UUID interpretieren
          // und keine Transaktionen finden → Chart fällt auf Holdings-Fallback
          // zurück und zählt Symbole nur einfach statt aggregiert.
          portfolioId: portfolioIds && portfolioIds.length > 0 ? undefined : portfolioId,
          portfolioIds,
          holdings: holdings.map(h => ({
            portfolio_id: h.portfolio_id,
            symbol: h.symbol,
            quantity: h.quantity,
            purchase_date: h.purchase_date,
            purchase_price: h.purchase_price
          })),
          cashPosition,
          days
        })
      })

      if (!response.ok) throw new Error('API Error')
      const result = await response.json()

      // Jahresübergreifende Ranges: Jahr im Label zeigen
      const spansMultipleYears = ['1Y', 'MAX'].includes(selectedRange)
      const formatLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        if (spansMultipleYears) {
          // "Jan. 25" statt "07. Jan." — kompakt mit Jahr
          return d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
        }
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
      }

      if (result.data) {
        const mappedData = result.data.map((d: any) => ({
          ...d,
          label: formatLabel(d.date)
        }))

        const livePortfolioValue = holdings.reduce((sum, h) => sum + (Number(h.current_value) || 0), 0) + cashPosition
        if (mappedData.length > 0 && livePortfolioValue > 0) {
          const today = new Date().toISOString().split('T')[0]
          const last = mappedData[mappedData.length - 1]
          const livePoint = {
            ...last,
            date: today,
            label: formatLabel(today),
            value: Math.round(livePortfolioValue * 100) / 100,
            performance: last.invested > 0
              ? Math.round(((livePortfolioValue - last.invested) / last.invested) * 10000) / 100
              : 0,
          }

          if (last.date === today) mappedData[mappedData.length - 1] = livePoint
          else mappedData.push(livePoint)
        }

        setValueData(mappedData)
      }

      if (result.performanceData) {
        setPerformanceData(result.performanceData.map((d: any) => ({
          ...d,
          label: formatLabel(d.date)
        })))
      }
    } catch (error) {
      console.error('Chart data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [portfolioId, portfolioIds, holdings, cashPosition, selectedRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const lastPerf = performanceData.length > 0 ? performanceData[performanceData.length - 1] : null
  const formatEuro = (value: number) =>
    `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

  const ValueTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload as ValueDataPoint | undefined
    if (!point) return null

    const difference = point.value - point.invested
    const dateLabel = new Date(point.date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    return (
      <div className="terminal-glass-strong rounded-xl px-3 py-2 text-xs">
        <div className="mb-2 font-semibold text-theme-primary">{dateLabel}</div>
        <div className="space-y-1">
          <div className="flex min-w-[190px] justify-between gap-5">
            <span className="text-theme-secondary">Portfoliowert</span>
            <span className="tabular-nums text-theme-primary">{formatEuro(point.value)}</span>
          </div>
          <div className="flex min-w-[190px] justify-between gap-5">
            <span className="text-theme-secondary">Zugeführtes Kapital</span>
            <span className="tabular-nums text-theme-primary">{formatEuro(point.invested)}</span>
          </div>
          <div className="flex min-w-[190px] justify-between gap-5 border-t border-theme pt-1">
            <span className="text-theme-secondary">Differenz</span>
            <span className={`tabular-nums font-medium ${difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {difference >= 0 ? '+' : ''}{formatEuro(difference)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="terminal-input flex gap-1 rounded-xl p-0.5">
          <button
            onClick={() => setChartView('value')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              chartView === 'value'
                ? 'bg-theme-secondary text-theme-primary dark:bg-white/[0.085] dark:text-white'
                : 'text-theme-muted hover:text-theme-secondary'
            }`}
          >
            Wertentwicklung
          </button>
          <button
            onClick={() => setChartView('performance')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              chartView === 'performance'
                ? 'bg-theme-secondary text-theme-primary dark:bg-white/[0.085] dark:text-white'
                : 'text-theme-muted hover:text-theme-secondary'
            }`}
          >
            Performance vs. Benchmarks (TWR)
          </button>
        </div>

        <div className="terminal-input flex gap-1 rounded-xl p-0.5">
          {(['1M', '3M', '6M', '1Y', 'MAX'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                selectedRange === range
                  ? 'bg-theme-secondary text-theme-primary dark:bg-white/[0.085] dark:text-white'
                  : 'text-theme-muted hover:text-theme-secondary'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Labels */}
      {chartView === 'performance' && lastPerf && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-xs text-theme-secondary">Portfolio (TWR)</span>
            <span className={`text-xs font-medium ${perfColor(lastPerf.portfolioPerformance)}`}>
              {lastPerf.portfolioPerformance >= 0 ? '+' : ''}{lastPerf.portfolioPerformance.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-400 rounded-full" />
            <span className="text-xs text-theme-secondary">S&P 500</span>
            <span className={`text-xs font-medium ${lastPerf.spyPerformance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {lastPerf.spyPerformance >= 0 ? '+' : ''}{lastPerf.spyPerformance.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-violet-400 rounded-full" />
            <span className="text-xs text-theme-secondary">MSCI World</span>
            <span className={`text-xs font-medium ${lastPerf.msciWorldPerformance >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
              {lastPerf.msciWorldPerformance >= 0 ? '+' : ''}{lastPerf.msciWorldPerformance.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-400 rounded-full" />
            <span className="text-xs text-theme-secondary">FTSE All-World</span>
            <span className={`text-xs font-medium ${lastPerf.ftseAllWorldPerformance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {lastPerf.ftseAllWorldPerformance >= 0 ? '+' : ''}{lastPerf.ftseAllWorldPerformance.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-[280px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <ArrowPathIcon className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : chartView === 'value' ? (
          valueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={valueData}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
                    return `${v.toFixed(0)}`
                  }}
                  width={50}
                />
                <Tooltip
                  content={<ValueTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  fill="url(#valueGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="var(--chart-axis)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
              Keine Daten verfügbar
            </div>
          )
        ) : (
          performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  width={45}
                />
                <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      portfolioPerformance: 'Portfolio (TWR)',
                      spyPerformance: 'S&P 500',
                      msciWorldPerformance: 'MSCI World',
                      ftseAllWorldPerformance: 'FTSE All-World',
                    }
                    return [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, labels[name] || name]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="portfolioPerformance"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="spyPerformance"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="msciWorldPerformance"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ftseAllWorldPerformance"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
              Keine Performancedaten verfügbar
            </div>
          )
        )}
      </div>
    </div>
  )
}
