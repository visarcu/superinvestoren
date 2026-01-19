// src/components/WorkingStockChart.tsx - FEY/QUARTR CLEAN STYLE
'use client'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Line
} from 'recharts'
import { ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/useTheme'
import { useCurrency } from '@/lib/CurrencyContext'

interface StockData {
  date: string
  close: number
}

interface Props {
  ticker: string
  data: StockData[]
}

const TIME_RANGES = [
  { label: '1D', days: 1 },
  { label: '5D', days: 5 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: 'YTD', days: 'ytd' as const },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 1095 },
  { label: '5Y', days: 1825 },
  { label: 'MAX', days: 'max' as const },
]

const CHART_MODES = [
  { id: 'price', label: 'Preis' },
  { id: 'total_return', label: 'Performance' },
]

export default function WorkingStockChart({ ticker, data }: Props) {
  const [selectedRange, setSelectedRange] = useState('1Y')
  const [selectedMode, setSelectedMode] = useState('price')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMA, setShowMA] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const { theme } = useTheme()
  const { formatStockPrice, formatPercentage } = useCurrency()

  const isDark = theme === 'dark'

  // Filter data by time range
  const getFilteredData = (stockData: StockData[]) => {
    if (!stockData.length) return []

    const now = new Date()
    let cutoffDate: Date

    if (selectedRange === 'YTD') {
      cutoffDate = new Date(now.getFullYear(), 0, 1)
    } else if (selectedRange === 'MAX') {
      return stockData.sort((a, b) => a.date.localeCompare(b.date))
    } else {
      const timeRange = TIME_RANGES.find(r => r.label === selectedRange)
      if (!timeRange || typeof timeRange.days !== 'number') {
        return stockData.sort((a, b) => a.date.localeCompare(b.date))
      }

      const days = timeRange.days
      if (days === 1) {
        const sortedData = stockData.sort((a, b) => b.date.localeCompare(a.date))
        return sortedData.slice(0, Math.min(5, sortedData.length)).reverse()
      }

      cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    }

    const filtered = stockData
      .filter(d => new Date(d.date) >= cutoffDate)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (filtered.length === 0 && stockData.length > 0) {
      const sortedData = stockData.sort((a, b) => b.date.localeCompare(a.date))
      return sortedData.slice(0, Math.min(10, sortedData.length)).reverse()
    }

    return filtered
  }

  // Calculate chart data
  const calculateChartData = (stockData: StockData[], mode: string) => {
    const filteredData = getFilteredData(stockData)
    if (!filteredData.length) return []

    const basePrice = filteredData[0].close

    return filteredData.map(d => {
      if (mode === 'total_return') {
        return { date: d.date, value: ((d.close - basePrice) / basePrice) * 100 }
      }
      return { date: d.date, value: d.close }
    })
  }

  // Moving Average
  const calculateMA = (stockData: StockData[], period: number) => {
    return stockData.map((item, index) => {
      if (index < period - 1) return null
      const slice = stockData.slice(index - period + 1, index + 1)
      return slice.reduce((sum, d) => sum + d.close, 0) / period
    })
  }

  // Chart data
  const chartData = useMemo(() => {
    const mainData = calculateChartData(data, selectedMode)
    if (!mainData.length) return []

    const filteredData = getFilteredData(data)
    const ma50 = showMA ? calculateMA(filteredData, 50) : []

    let result = mainData.map((d, i) => ({
      date: d.date,
      [ticker]: d.value,
      ma50: ma50[i] || null,
      formattedDate: new Date(d.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
    }))

    return result
  }, [data, selectedRange, selectedMode, ticker, showMA])

  // Current price & stats
  const currentPrice = useMemo(() => {
    if (!data.length) return 0
    const sortedData = [...data].sort((a, b) => b.date.localeCompare(a.date))
    return sortedData[0].close
  }, [data])

  const performanceStats = useMemo(() => {
    if (!chartData.length) return null
    const firstValue = chartData[0][ticker] as number
    const lastValue = chartData[chartData.length - 1][ticker] as number

    if (typeof firstValue !== 'number' || typeof lastValue !== 'number' || firstValue <= 0) return null

    if (selectedMode === 'total_return') {
      return { changePercent: lastValue }
    }

    return { changePercent: ((lastValue - firstValue) / firstValue) * 100 }
  }, [chartData, ticker, selectedMode])

  // Fullscreen
  const toggleFullscreen = async () => {
    if (!chartContainerRef.current) return
    try {
      if (!isFullscreen) {
        await chartContainerRef.current.requestFullscreen?.()
      } else {
        await document.exitFullscreen?.()
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Format functions
  const formatValue = (value: number) => {
    return selectedMode === 'total_return' ? formatPercentage(value) : formatStockPrice(value)
  }


  // Custom Tooltip - Clean Style
  const renderTooltip = (props: any) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null

    const data = payload[0].payload

    return (
      <div className="bg-theme-card border border-theme-light rounded-lg p-3 shadow-lg">
        <p className="text-xs text-theme-muted mb-2">{data.formattedDate}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === 'ma50') return null
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-theme-primary font-medium">
                {entry.dataKey}: {formatValue(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const isPositive = performanceStats && performanceStats.changePercent >= 0
  const chartColor = isPositive ? '#10b981' : '#ef4444'

  return (
    <div
      ref={chartContainerRef}
      className={`bg-theme-card rounded-xl border border-theme-light ${isFullscreen ? 'p-6' : ''}`}
    >
      {/* Header */}
      <div className="p-5 border-b border-theme-light">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-theme-muted mb-1">{ticker} • Historischer Kursverlauf</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-theme-primary">
                {formatStockPrice(currentPrice)}
              </span>
              {performanceStats && (
                <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '↗' : '↘'}{formatPercentage(performanceStats.changePercent, false)}
                </span>
              )}
              <span className="text-xs text-theme-muted">({selectedRange})</span>
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-theme-secondary/30 text-theme-muted transition-colors"
            title={isFullscreen ? 'Schließen' : 'Vollbild'}
          >
            {isFullscreen ? (
              <XMarkIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 space-y-4">
        {/* Mode & Time Range */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-muted">Modus:</span>
            <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg">
              {CHART_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedMode === mode.id
                      ? 'bg-theme-card text-theme-primary shadow-sm'
                      : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range - Pill Style */}
          <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg overflow-x-auto">
            {TIME_RANGES.map(range => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(range.label)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  selectedRange === range.label
                    ? 'bg-theme-card text-theme-primary shadow-sm'
                    : 'text-theme-muted hover:text-theme-secondary'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* MA Toggle */}
          {selectedMode === 'price' && (
            <button
              onClick={() => setShowMA(!showMA)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                showMA
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-theme-secondary/30 text-theme-muted hover:text-theme-secondary'
              }`}
            >
              MA
            </button>
          )}
        </div>

      </div>

      {/* Chart - Clean minimal style like Fey */}
      <div className={`px-2 ${isFullscreen ? 'h-[calc(100vh-250px)]' : 'h-[350px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Minimal X-Axis like Fey - just a few date labels, no lines */}
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#6b7280' : '#9ca3af', fontSize: 11 }}
              tickFormatter={(value) => {
                const date = new Date(value)
                if (['3Y', '5Y', 'MAX'].includes(selectedRange)) {
                  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                }
                return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
              }}
              interval="preserveStartEnd"
              minTickGap={80}
            />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip content={renderTooltip} cursor={{ stroke: isDark ? '#4b5563' : '#d1d5db', strokeWidth: 1 }} />

            {/* Performance Label */}
            {performanceStats && (
              <text
                x="97%"
                y="25"
                textAnchor="end"
                fill={chartColor}
                fontSize="13"
                fontWeight="600"
              >
                {formatPercentage(performanceStats.changePercent)}
              </text>
            )}

            {/* Main Area/Line */}
            {selectedMode === 'price' ? (
              <Area
                type="monotone"
                dataKey={ticker}
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{ r: 4, fill: chartColor }}
              />
            ) : (
              <Line
                type="monotone"
                dataKey={ticker}
                stroke={chartColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: chartColor }}
              />
            )}

            {/* MA50 */}
            {showMA && selectedMode === 'price' && (
              <Line
                type="monotone"
                dataKey="ma50"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      {showMA && selectedMode === 'price' && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 text-xs text-theme-muted">
            <div className="w-4 h-0.5 bg-purple-400" style={{ backgroundImage: 'repeating-linear-gradient(to right, #a855f7, #a855f7 3px, transparent 3px, transparent 6px)' }} />
            <span>MA50 (50-Tage Durchschnitt)</span>
          </div>
        </div>
      )}
    </div>
  )
}
