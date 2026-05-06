// src/components/portfolio/DividendIncomeChart.tsx
'use client'

import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
} from 'recharts'
import type { Transaction } from '@/hooks/usePortfolio'

type ChartView = 'monthly' | 'monthlyYear' | 'cumulative' | 'cumulativeYear' | 'breakdown'
type TimeRange = '12M' | '24M' | 'MAX'

interface DividendIncomeChartProps {
  transactions: Transaction[]
  formatCurrency: (amount: number) => string
}

interface Series {
  key: string
  label: string
  color: string
  total: number
}

interface BreakdownItem {
  key: string
  label: string
  value: number
  color: string
}

interface ChartPoint {
  label: string
  sortKey: string
  total: number
  cumulative: number
  ttmAverage: number
  breakdown: BreakdownItem[]
  [key: string]: string | number | BreakdownItem[]
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const SERIES_COLORS = [
  '#2dd4bf',
  '#60a5fa',
  '#f43f5e',
  '#a78bfa',
  '#f59e0b',
  '#34d399',
  '#fb7185',
  '#818cf8',
  '#f97316',
]

const VIEW_LABELS: Array<{ key: ChartView; label: string }> = [
  { key: 'monthly', label: 'Monatlich (fortl.)' },
  { key: 'monthlyYear', label: 'Monatlich (pro Jahr)' },
  { key: 'cumulative', label: 'Akkumuliert' },
  { key: 'cumulativeYear', label: 'Akkumuliert (pro Jahr)' },
  { key: 'breakdown', label: 'Breakdown' },
]

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

function formatCompactEuro(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value.toFixed(0)}`
}

function getRangeStart(transactions: Transaction[], range: TimeRange): Date {
  const now = new Date()
  if (range === '12M') return addMonths(now, -11)
  if (range === '24M') return addMonths(now, -23)

  const oldest = transactions.reduce((min, tx) => {
    const date = new Date(tx.date)
    return date < min ? date : min
  }, new Date())

  return new Date(oldest.getFullYear(), oldest.getMonth(), 1)
}

function buildSeries(totals: Map<string, number>, maxItems = 8): Series[] {
  const sorted = Array.from(totals.entries())
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])

  const top = sorted.slice(0, maxItems).map(([symbol, total], index) => ({
    key: `s${index}`,
    label: symbol,
    total,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  }))

  const remaining = sorted.slice(maxItems)
  if (remaining.length > 0) {
    top.push({
      key: 'other',
      label: 'Weitere',
      total: remaining.reduce((sum, [, total]) => sum + total, 0),
      color: '#737373',
    })
  }

  return top
}

function mapSymbolToSeries(symbol: string, series: Series[]): Series | undefined {
  return series.find(s => s.label === symbol) || (series.some(s => s.key === 'other') ? series.find(s => s.key === 'other') : undefined)
}

function DividendTooltip({
  active,
  payload,
  formatCurrency,
}: {
  active?: boolean
  payload?: Array<{ payload?: ChartPoint }>
  formatCurrency: (amount: number) => string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  const items = [...point.breakdown].sort((a, b) => b.value - a.value)

  return (
    <div className="terminal-glass-strong min-w-[260px] rounded-xl px-3 py-2 text-xs">
      <div className="mb-2 flex items-center justify-between gap-5">
        <span className="font-semibold text-neutral-100">{point.label}</span>
        <span className="tabular-nums font-semibold text-teal-300">{formatCurrency(point.total)}</span>
      </div>
      {point.ttmAverage > 0 && (
        <div className="mb-2 flex justify-between gap-5 border-b border-white/[0.06] pb-2 text-neutral-400">
          <span>Ø monatl. Einkommen (TTM)</span>
          <span className="tabular-nums text-neutral-200">{formatCurrency(point.ttmAverage)}</span>
        </div>
      )}
      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
        {items.slice(0, 10).map(item => (
          <div key={item.key} className="flex items-center justify-between gap-5">
            <span className="flex min-w-0 items-center gap-2 text-neutral-300">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="tabular-nums text-neutral-100">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DividendIncomeChart({
  transactions,
  formatCurrency,
}: DividendIncomeChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('24M')
  const [chartView, setChartView] = useState<ChartView>('monthly')

  const dividendTransactions = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'dividend' && Number(tx.total_value) > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [transactions])

  const chartModel = useMemo(() => {
    if (dividendTransactions.length === 0) {
      return { series: [] as Series[], data: [] as ChartPoint[], rangeTotal: 0, monthlyAverage: 0 }
    }

    const start = getRangeStart(dividendTransactions, selectedRange)
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    const rangeTransactions = dividendTransactions.filter(tx => new Date(tx.date) >= start)
    const monthCount = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1)

    if (chartView === 'monthlyYear') {
      const years = Array.from(new Set(rangeTransactions.map(tx => String(new Date(tx.date).getFullYear()))))
        .sort((a, b) => Number(a) - Number(b))
      const series = years.map((year, index) => ({
        key: `y${index}`,
        label: year,
        total: 0,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      }))
      const seriesByYear = new Map(series.map(s => [s.label, s]))
      const points: ChartPoint[] = MONTH_LABELS.map((label, index) => {
        const point: ChartPoint = {
          label,
          sortKey: String(index + 1).padStart(2, '0'),
          total: 0,
          cumulative: 0,
          ttmAverage: 0,
          breakdown: [],
        }
        for (const s of series) point[s.key] = 0
        return point
      })

      for (const tx of rangeTransactions) {
        const date = new Date(tx.date)
        const seriesItem = seriesByYear.get(String(date.getFullYear()))
        if (!seriesItem) continue
        const point = points[date.getMonth()]
        point[seriesItem.key] = Number(point[seriesItem.key] || 0) + tx.total_value
        point.total += tx.total_value
        seriesItem.total += tx.total_value
      }

      for (const point of points) {
        for (const s of series) {
          const value = Number(point[s.key]) || 0
          if (value <= 0) continue
          point.breakdown.push({
            key: s.key,
            label: s.label,
            value,
            color: s.color,
          })
        }
      }

      const rangeTotal = rangeTransactions.reduce((sum, tx) => sum + tx.total_value, 0)
      return {
        series,
        data: points,
        rangeTotal,
        monthlyAverage: rangeTotal / monthCount,
      }
    }

    const symbolTotals = new Map<string, number>()
    const byMonth = new Map<string, Map<string, number>>()
    const allByMonth = new Map<string, number>()

    for (const tx of dividendTransactions) {
      const date = new Date(tx.date)
      const key = monthKey(date)
      allByMonth.set(key, (allByMonth.get(key) || 0) + tx.total_value)
    }

    for (const tx of rangeTransactions) {
      const date = new Date(tx.date)
      const key = monthKey(date)
      const symbol = tx.symbol || 'Unbekannt'
      symbolTotals.set(symbol, (symbolTotals.get(symbol) || 0) + tx.total_value)
      if (!byMonth.has(key)) byMonth.set(key, new Map())
      const month = byMonth.get(key)!
      month.set(symbol, (month.get(symbol) || 0) + tx.total_value)
    }

    const series = buildSeries(symbolTotals)
    const points: ChartPoint[] = []
    const cumulativeBySeries = new Map<string, number>()
    let cumulative = 0

    for (let i = 0; i < monthCount; i++) {
      const date = addMonths(start, i)
      const key = monthKey(date)
      const month = byMonth.get(key) || new Map()
      const point: ChartPoint = {
        label: selectedRange === '12M'
          ? MONTH_LABELS[date.getMonth()]
          : `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
        sortKey: key,
        total: 0,
        cumulative: 0,
        ttmAverage: 0,
        breakdown: [],
      }

      for (const s of series) point[s.key] = 0

      for (const [symbol, amount] of month.entries()) {
        const matched = mapSymbolToSeries(symbol, series)
        if (!matched) continue
        point[matched.key] = Number(point[matched.key] || 0) + amount
      }

      for (const s of series) {
        const value = Number(point[s.key]) || 0
        if (chartView === 'cumulative') {
          const nextValue = (cumulativeBySeries.get(s.key) || 0) + value
          cumulativeBySeries.set(s.key, nextValue)
          point[s.key] = nextValue
        }
        if (Number(point[s.key]) > 0) {
          point.breakdown.push({
            key: s.key,
            label: s.label,
            value: Number(point[s.key]),
            color: s.color,
          })
        }
      }

      const monthTotal = Array.from(month.values()).reduce((sum, value) => sum + value, 0)
      cumulative += monthTotal
      point.total = chartView === 'cumulative' ? cumulative : monthTotal
      point.cumulative = cumulative

      let rolling = 0
      for (let lookback = 0; lookback < 12; lookback++) {
        rolling += allByMonth.get(monthKey(addMonths(date, -lookback))) || 0
      }
      point.ttmAverage = rolling / 12
      points.push(point)
    }

    if (chartView === 'cumulativeYear') {
      const byYear = new Map<string, Map<string, number>>()
      const yearlyPointsCumulative = new Map<string, number>()
      for (const tx of rangeTransactions) {
        const year = String(new Date(tx.date).getFullYear())
        const symbol = tx.symbol || 'Unbekannt'
        if (!byYear.has(year)) byYear.set(year, new Map())
        const yearMap = byYear.get(year)!
        yearMap.set(symbol, (yearMap.get(symbol) || 0) + tx.total_value)
      }

      let yearCumulative = 0
      const yearlyPoints = Array.from(byYear.entries())
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, values]) => {
          const point: ChartPoint = {
            label: year,
            sortKey: year,
            total: 0,
            cumulative: 0,
            ttmAverage: 0,
            breakdown: [],
          }
          for (const s of series) point[s.key] = 0
          for (const [symbol, amount] of values.entries()) {
            const matched = mapSymbolToSeries(symbol, series)
            if (!matched) continue
            point[matched.key] = Number(point[matched.key] || 0) + amount
          }
          const yearTotal = Array.from(values.values()).reduce((sum, value) => sum + value, 0)
          yearCumulative += yearTotal
          point.total = chartView === 'cumulativeYear' ? yearCumulative : yearTotal
          point.cumulative = yearCumulative
          for (const s of series) {
            const value = Number(point[s.key]) || 0
            if (chartView === 'cumulativeYear') {
              const previous = yearlyPointsCumulative.get(s.key) || 0
              const next = previous + value
              yearlyPointsCumulative.set(s.key, next)
              point[s.key] = next
            }
            if (Number(point[s.key]) > 0) {
              point.breakdown.push({
                key: s.key,
                label: s.label,
                value: Number(point[s.key]),
                color: s.color,
              })
            }
          }
          return point
        })

      return {
        series,
        data: yearlyPoints,
        rangeTotal: rangeTransactions.reduce((sum, tx) => sum + tx.total_value, 0),
        monthlyAverage: rangeTransactions.reduce((sum, tx) => sum + tx.total_value, 0) / Math.max(1, monthCount),
      }
    }

    return {
      series,
      data: points,
      rangeTotal: rangeTransactions.reduce((sum, tx) => sum + tx.total_value, 0),
      monthlyAverage: rangeTransactions.reduce((sum, tx) => sum + tx.total_value, 0) / Math.max(1, monthCount),
    }
  }, [chartView, dividendTransactions, selectedRange])

  const breakdownData = useMemo(() => {
    const total = chartModel.series.reduce((sum, s) => sum + s.total, 0)
    return chartModel.series
      .map(s => ({
        ...s,
        percent: total > 0 ? (s.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [chartModel.series])

  if (dividendTransactions.length === 0) return null

  return (
    <div className="terminal-glass rounded-2xl p-6">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="terminal-input flex max-w-full gap-1 overflow-x-auto rounded-xl p-0.5">
          {VIEW_LABELS.map(view => (
            <button
              key={view.key}
              onClick={() => setChartView(view.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-colors ${
                chartView === view.key ? 'bg-white/[0.085] text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="terminal-input flex w-fit gap-1 rounded-xl p-0.5">
          {(['12M', '24M', 'MAX'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                selectedRange === range ? 'bg-white/[0.085] text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-3 rounded-full bg-teal-300" />
          <span className="text-xs text-neutral-400">Dividenden im Intervall</span>
          <span className="text-xs font-medium tabular-nums text-teal-300">{formatCurrency(chartModel.rangeTotal)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-3 rounded-full bg-neutral-400" />
          <span className="text-xs text-neutral-400">Ø monatlich</span>
          <span className="text-xs font-medium tabular-nums text-neutral-200">{formatCurrency(chartModel.monthlyAverage)}</span>
        </div>
      </div>

      {chartView === 'breakdown' ? (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={breakdownData}
              layout="vertical"
              margin={{ top: 8, right: 18, left: 4, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#737373', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickFormatter={formatCompactEuro}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: '#a3a3a3', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0]?.payload as Series & { percent: number }
                  return (
                    <div className="terminal-glass-strong rounded-xl px-3 py-2 text-xs">
                      <div className="mb-1 font-semibold text-neutral-100">{item.label}</div>
                      <div className="flex min-w-[160px] justify-between gap-5">
                        <span className="text-neutral-400">Summe</span>
                        <span className="tabular-nums text-neutral-100">{formatCurrency(item.total)}</span>
                      </div>
                      <div className="flex min-w-[160px] justify-between gap-5">
                        <span className="text-neutral-400">Anteil</span>
                        <span className="tabular-nums text-neutral-100">{item.percent.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {breakdownData.map(item => (
                  <Cell key={item.key} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartModel.data} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#737373', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#737373', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactEuro}
                width={50}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={<DividendTooltip formatCurrency={formatCurrency} />}
              />
              {chartModel.series.map(series => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  stackId="dividends"
                  fill={series.color}
                  maxBarSize={30}
                  radius={[3, 3, 0, 0]}
                />
              ))}
              {(chartView === 'monthly' || chartView === 'cumulative') && (
                <Line
                  type="monotone"
                  dataKey="ttmAverage"
                  stroke="rgba(255,255,255,0.42)"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 5"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartModel.series.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {chartModel.series.slice(0, 9).map(series => (
            <div key={series.key} className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: series.color }} />
              <span>{series.label}</span>
            </div>
          ))}
          {(chartView === 'monthly' || chartView === 'cumulative') && (
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <span className="h-0.5 w-4 rounded-full bg-neutral-400" />
              <span>Ø monatl. Einkommen (TTM)</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
