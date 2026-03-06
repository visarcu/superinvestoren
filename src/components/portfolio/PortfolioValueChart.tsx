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

interface PortfolioValueChartProps {
  portfolioId: string
  holdings: Array<{
    symbol: string
    quantity: number
    purchase_price: number
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
  label: string
}

export default function PortfolioValueChart({
  portfolioId,
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

    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'MAX': 730 }[selectedRange]

    try {
      const response = await fetch('/api/portfolio-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          holdings: holdings.map(h => ({
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

      if (result.data) {
        setValueData(result.data.map((d: any) => ({
          ...d,
          label: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
        })))
      }

      if (result.performanceData) {
        setPerformanceData(result.performanceData.map((d: any) => ({
          ...d,
          label: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
        })))
      }
    } catch (error) {
      console.error('Chart data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [portfolioId, holdings, cashPosition, selectedRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const lastPerf = performanceData.length > 0 ? performanceData[performanceData.length - 1] : null

  return (
    <div>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setChartView('value')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartView === 'value' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Wertentwicklung
          </button>
          <button
            onClick={() => setChartView('performance')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartView === 'performance' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Performance vs. S&amp;P 500 (TWR)
          </button>
        </div>

        <div className="flex gap-1">
          {(['1M', '3M', '6M', '1Y', 'MAX'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedRange === range
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Labels */}
      {chartView === 'performance' && lastPerf && (
        <div className="flex gap-6 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-xs text-neutral-400">Portfolio (TWR)</span>
            <span className={`text-xs font-medium ${lastPerf.portfolioPerformance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {lastPerf.portfolioPerformance >= 0 ? '+' : ''}{lastPerf.portfolioPerformance.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-400 rounded-full" />
            <span className="text-xs text-neutral-400">S&P 500</span>
            <span className={`text-xs font-medium ${lastPerf.spyPerformance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {lastPerf.spyPerformance >= 0 ? '+' : ''}{lastPerf.spyPerformance.toFixed(2)}%
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
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#404040' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'value' ? 'Wert' : 'Investiert'
                    return [`${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`, label]
                  }}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#valueGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#525252"
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
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#404040' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  width={45}
                />
                <ReferenceLine y={0} stroke="#404040" strokeWidth={1} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'portfolioPerformance' ? 'Portfolio (TWR)' : 'S&P 500'
                    return [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, label]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="portfolioPerformance"
                  stroke="#10b981"
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
