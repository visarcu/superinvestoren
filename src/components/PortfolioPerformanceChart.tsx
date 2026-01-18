// src/components/PortfolioPerformanceChart.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'
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
type ChartView = 'value' | 'performance'

interface ValueDataPoint {
  date: string
  value: number
  invested: number
  performance: number
  label: string
}

interface PerformanceDataPoint {
  date: string
  portfolioPerformance: number
  spyPerformance: number
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
  const [selectedRange, setSelectedRange] = useState<TimeRange>('MAX')
  const [chartView, setChartView] = useState<ChartView>('value')
  const [valueData, setValueData] = useState<ValueDataPoint[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvested, setShowInvested] = useState(true)

  const totalGain = totalValue - totalCost
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
  const isPositive = totalGain >= 0

  const fetchHistoricalData = useCallback(async () => {
    if (holdings.length === 0) {
      setValueData([])
      setPerformanceData([])
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
        // Wertentwicklung-Daten formatieren
        const formattedValueData: ValueDataPoint[] = result.data.map((point: { date: string; value: number; invested: number; performance: number }) => {
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

        setValueData(formattedValueData)

        // Performance-Daten formatieren (falls vorhanden)
        if (result.performanceData && result.performanceData.length > 0) {
          const formattedPerfData: PerformanceDataPoint[] = result.performanceData.map((point: { date: string; portfolioPerformance: number; spyPerformance: number }) => {
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
              portfolioPerformance: point.portfolioPerformance,
              spyPerformance: point.spyPerformance,
              label
            }
          })

          setPerformanceData(formattedPerfData)
        }
      } else {
        setValueData([])
        setPerformanceData([])
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

  // Tooltip für Wertentwicklung
  const ValueTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ValueDataPoint
      const dayGain = data.value - data.invested
      const dayGainPercent = data.invested > 0 ? (dayGain / data.invested) * 100 : 0

      return (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-neutral-400 mb-1">{data.label}</p>
          <p className="text-sm font-semibold text-white">{formatCurrency(data.value)}</p>
          <p className="text-xs text-neutral-500 mt-1">
            Investiert: {formatCurrency(data.invested)}
          </p>
          <p className={`text-xs mt-1 ${dayGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {dayGain >= 0 ? '+' : ''}{formatCurrency(dayGain)} ({dayGainPercent >= 0 ? '+' : ''}{dayGainPercent.toFixed(2)}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Tooltip für Performance
  const PerformanceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PerformanceDataPoint
      const diff = data.portfolioPerformance - data.spyPerformance
      const outperforming = diff >= 0

      return (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-neutral-400 mb-2">{data.label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-400">Portfolio</span>
              <span className={`text-sm font-medium ${data.portfolioPerformance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.portfolioPerformance >= 0 ? '+' : ''}{data.portfolioPerformance.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-400">S&P 500</span>
              <span className={`text-sm font-medium ${data.spyPerformance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {data.spyPerformance >= 0 ? '+' : ''}{data.spyPerformance.toFixed(2)}%
              </span>
            </div>
            <div className="border-t border-neutral-700 pt-1 mt-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-neutral-500">vs. S&P 500</span>
                <span className={`text-xs font-medium ${outperforming ? 'text-emerald-400' : 'text-red-400'}`}>
                  {outperforming ? '+' : ''}{diff.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const timeRanges: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'MAX']

  // Berechne Rendite für aktuellen Zeitraum
  const rangePerformance = useMemo(() => {
    if (valueData.length === 0) {
      return { gain: totalGain, percent: totalGainPercent, isPositive }
    }

    const lastPoint = valueData[valueData.length - 1]
    const currentValue = lastPoint?.value || 0
    const currentInvested = lastPoint?.invested || 0

    const gain = currentValue - currentInvested
    const percent = currentInvested > 0 ? (gain / currentInvested) * 100 : 0

    return { gain, percent, isPositive: gain >= 0 }
  }, [valueData, totalGain, totalGainPercent, isPositive])

  // Berechne aktuelle Performance vs S&P 500
  const currentPerformanceVsSpy = useMemo(() => {
    if (performanceData.length === 0) return null

    const lastPoint = performanceData[performanceData.length - 1]
    return {
      portfolio: lastPoint.portfolioPerformance,
      spy: lastPoint.spyPerformance,
      diff: lastPoint.portfolioPerformance - lastPoint.spyPerformance
    }
  }, [performanceData])

  return (
    <div>
      {/* Header mit Tabs */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-800/50 rounded-lg w-fit">
          <button
            onClick={() => setChartView('value')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              chartView === 'value'
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ChartBarIcon className="w-3.5 h-3.5" />
            Wertentwicklung
          </button>
          <button
            onClick={() => setChartView('performance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              chartView === 'performance'
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            Performance
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            {chartView === 'value' ? (
              <>
                <h3 className="text-sm font-medium text-neutral-400 mb-2">
                  Wertentwicklung
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold text-white">
                    {formatCurrency(totalValue)}
                  </span>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                    rangePerformance.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {rangePerformance.isPositive ? (
                      <ArrowTrendingUpIcon className="w-4 h-4" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {rangePerformance.isPositive ? '+' : ''}{formatCurrency(Math.abs(rangePerformance.gain))}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-medium text-neutral-400 mb-2">
                  Performance vs. S&P 500
                </h3>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-semibold ${rangePerformance.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {rangePerformance.isPositive ? '+' : ''}{rangePerformance.percent.toFixed(2)}%
                  </span>
                  {currentPerformanceVsSpy && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                      currentPerformanceVsSpy.diff >= 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      vs. S&P: {currentPerformanceVsSpy.diff >= 0 ? '+' : ''}{currentPerformanceVsSpy.diff.toFixed(2)}%
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedRange === range
                    ? 'bg-emerald-500 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Options - nur bei Wertentwicklung */}
      {chartView === 'value' && (
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-neutral-800">
          <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showInvested}
              onChange={(e) => setShowInvested(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            Investiertes Kapital
          </label>
        </div>
      )}

      {/* Legende für Performance-Chart */}
      {chartView === 'performance' && (
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-3 h-0.5 bg-emerald-500 rounded"></span>
            Portfolio
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-3 h-0.5 bg-blue-500 rounded"></span>
            S&P 500
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm text-neutral-500">Lade Kursdaten...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-400 mb-2">{error}</p>
              <button
                onClick={fetchHistoricalData}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        ) : chartView === 'value' && valueData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-neutral-500">Keine Daten verfügbar</p>
          </div>
        ) : chartView === 'performance' && performanceData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-neutral-500">Keine Performance-Daten verfügbar</p>
          </div>
        ) : chartView === 'value' ? (
          /* Wertentwicklung Chart */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={valueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={rangePerformance.isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0.2}
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
                tick={{ fill: '#525252', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#525252', fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                domain={['dataMin - 100', 'dataMax + 100']}
                width={50}
              />
              <Tooltip content={<ValueTooltip />} />
              {showInvested && (
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="#525252"
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
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          /* Performance Chart */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#525252', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#525252', fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                domain={['auto', 'auto']}
                width={50}
              />
              <ReferenceLine y={0} stroke="#404040" strokeDasharray="3 3" />
              <Tooltip content={<PerformanceTooltip />} />
              <Line
                type="monotone"
                dataKey="spyPerformance"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="S&P 500"
              />
              <Line
                type="monotone"
                dataKey="portfolioPerformance"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Portfolio"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats Footer */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 mt-6 pt-4 border-t border-neutral-800">
        <div>
          <p className="text-xs text-neutral-500 mb-1">Investiert</p>
          <p className="text-sm font-medium text-white">{formatCurrency(totalCost)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Gewinn/Verlust</p>
          <p className={`text-sm font-medium ${rangePerformance.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {rangePerformance.isPositive ? '+' : ''}{formatCurrency(rangePerformance.gain)}
          </p>
        </div>
        {chartView === 'performance' && currentPerformanceVsSpy && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">S&P 500 Rendite</p>
            <p className={`text-sm font-medium ${currentPerformanceVsSpy.spy >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {currentPerformanceVsSpy.spy >= 0 ? '+' : ''}{currentPerformanceVsSpy.spy.toFixed(2)}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
