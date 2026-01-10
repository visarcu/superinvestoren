// src/components/PortfolioPerformanceChart.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'

interface PortfolioPerformanceChartProps {
  portfolioId: string
  holdings: Array<{
    symbol: string
    name: string
    quantity: number
    purchase_price: number
    current_price: number
    value: number
    purchase_date?: string
  }>
  totalValue: number
  totalCost: number
  cashPosition: number
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'MAX'

interface ChartDataPoint {
  date: string
  value: number
  invested: number
  performance: number
  label: string
}

export default function PortfolioPerformanceChart({
  portfolioId,
  holdings,
  totalValue,
  totalCost,
  cashPosition
}: PortfolioPerformanceChartProps) {
  const { formatCurrency } = useCurrency()
  const [selectedRange, setSelectedRange] = useState<TimeRange>('MAX') // DEFAULT: MAX
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvested, setShowInvested] = useState(true)

  // Gesamt-Performance
  const totalGain = totalValue - totalCost
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
  const isPositive = totalGain >= 0

  // Lade historische Daten
  const fetchHistoricalData = useCallback(async () => {
    if (holdings.length === 0) {
      setChartData([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let days: number
    switch (selectedRange) {
      case '1W': days = 7; break
      case '1M': days = 30; break
      case '3M': days = 90; break
      case '6M': days = 180; break
      case '1Y': days = 365; break
      case 'MAX': days = 730; break
      default: days = 730
    }

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

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }

      const result = await response.json()

      if (result.success && result.data && result.data.length > 0) {
        const formattedData: ChartDataPoint[] = result.data.map((point: { date: string; value: number; invested: number; performance: number }) => {
          const date = new Date(point.date)
          let label: string

          if (selectedRange === '1W') {
            label = date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' })
          } else if (selectedRange === '1M' || selectedRange === '3M') {
            label = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
          } else {
            label = date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
          }

          return {
            date: point.date,
            value: point.value,
            invested: point.invested,
            performance: point.performance,
            label
          }
        })

        setChartData(formattedData)
      } else {
        setChartData([])
      }
    } catch (err) {
      console.error('Fehler beim Laden der Portfolio-Historie:', err)
      setError('Daten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [portfolioId, holdings, cashPosition, selectedRange])

  useEffect(() => {
    fetchHistoricalData()
  }, [fetchHistoricalData])

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const dayGain = data.value - data.invested
      const dayGainPercent = data.invested > 0 ? (dayGain / data.invested) * 100 : 0

      return (
        <div className="bg-theme-card border border-theme/20 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-theme-secondary mb-1">{data.label}</p>
          <p className="text-sm font-bold text-theme-primary">{formatCurrency(data.value)}</p>
          <p className="text-xs text-theme-secondary mt-1">
            Investiert: {formatCurrency(data.invested)}
          </p>
          <p className={`text-xs mt-1 ${dayGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {dayGain >= 0 ? '+' : ''}{formatCurrency(dayGain)} ({dayGainPercent >= 0 ? '+' : ''}{dayGainPercent.toFixed(2)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const timeRanges: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'MAX']

  // Zeitraum-Performance aus Chart-Daten
  const rangePerformance = useMemo(() => {
    if (chartData.length === 0) {
      return { gain: totalGain, percent: totalGainPercent, isPositive }
    }

    const startValue = chartData[0]?.value || 0
    const endValue = chartData[chartData.length - 1]?.value || 0
    const gain = endValue - startValue
    const percent = startValue > 0 ? (gain / startValue) * 100 : 0

    return { gain, percent, isPositive: gain >= 0 }
  }, [chartData, totalGain, totalGainPercent, isPositive])

  return (
    <div className="bg-theme-card rounded-xl border border-theme/10 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-theme-primary mb-1">
            Wertentwicklung
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-theme-primary">
              {formatCurrency(totalValue)}
            </span>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              rangePerformance.isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {rangePerformance.isPositive ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {rangePerformance.isPositive ? '+' : ''}{formatCurrency(Math.abs(rangePerformance.gain))}
              </span>
            </div>
          </div>
          <p className="text-sm text-theme-secondary mt-1">
            {rangePerformance.isPositive ? '+' : ''}{rangePerformance.percent.toFixed(2)}%{' '}
            {selectedRange === '1W' && 'diese Woche'}
            {selectedRange === '1M' && 'diesen Monat'}
            {selectedRange === '3M' && 'in 3 Monaten'}
            {selectedRange === '6M' && 'in 6 Monaten'}
            {selectedRange === '1Y' && 'dieses Jahr'}
            {selectedRange === 'MAX' && 'seit Kauf'}
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-theme-secondary/20 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedRange === range
                  ? 'bg-brand text-white'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Show Invested Toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showInvested}
            onChange={(e) => setShowInvested(e.target.checked)}
            className="w-4 h-4 rounded border-theme/20 text-brand focus:ring-brand"
          />
          Investiertes Kapital anzeigen
        </label>
      </div>

      {/* Chart */}
      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              <span className="text-sm text-theme-secondary">Lade Kursdaten...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button
                onClick={fetchHistoricalData}
                className="text-xs text-brand hover:underline"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-theme-secondary">Keine Daten verfügbar</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={rangePerformance.isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={rangePerformance.isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                domain={['dataMin - 100', 'dataMax + 100']}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Invested Line */}
              {showInvested && (
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  name="Investiert"
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={rangePerformance.isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-theme/10">
        <div>
          <p className="text-xs text-theme-muted mb-1">Investiert</p>
          <p className="text-sm font-semibold text-theme-primary">{formatCurrency(totalCost)}</p>
        </div>
        <div>
          <p className="text-xs text-theme-muted mb-1">Gewinn/Verlust</p>
          <p className={`text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{formatCurrency(totalGain)}
          </p>
        </div>
        <div>
          <p className="text-xs text-theme-muted mb-1">Rendite (Gesamt)</p>
          <p className={`text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  )
}