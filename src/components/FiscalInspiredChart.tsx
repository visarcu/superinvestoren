// src/components/FiscalInspiredChart.tsx - RECHARTS mit FISCAL.AI DESIGN
'use client'

import React, { useState, useMemo } from 'react'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
} from 'recharts'
import { useTheme } from '@/lib/useTheme'
import { useCurrency } from '@/lib/CurrencyContext'

interface StockData {
  date: string
  close: number
}

interface Props {
  ticker: string
  data: StockData[]
  onAddComparison?: (ticker: string) => Promise<StockData[]>
}

const TIME_RANGES = [
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

const FiscalInspiredChart: React.FC<Props> = ({ ticker, data, onAddComparison }) => {
  const { theme } = useTheme()
  const { formatStockPrice } = useCurrency()
  const [selectedRange, setSelectedRange] = useState('1Y')

  // Theme colors - Fiscal.ai inspired
  const colors = useMemo(() => {
    const isDark = theme === 'dark'
    return {
      primary: isDark ? '#4ade80' : '#059669',
      primaryHover: isDark ? '#22c55e' : '#047857',
      background: isDark ? '#111827' : '#f9fafb',
      cardBg: isDark ? '#1f2937' : '#ffffff',
      textPrimary: isDark ? '#ffffff' : '#111827',
      textSecondary: isDark ? '#d1d5db' : '#4b5563',
      textMuted: isDark ? '#9ca3af' : '#6b7280',
      border: isDark ? '#374151' : '#e5e7eb',
      grid: isDark ? '#2a2e39' : '#f3f4f6',
      buttonBg: isDark ? '#374151' : '#f3f4f6',
      buttonActive: isDark ? '#4b5563' : '#ffffff',
      buttonActiveText: isDark ? '#ffffff' : '#111827',
      buttonHover: isDark ? '#4b5563' : '#e5e7eb',
    }
  }, [theme])

  // Filter data by time range - IMPROVED LOGIC
  const chartData = useMemo(() => {
    if (!data.length) return []
    
    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let filteredData: StockData[]
    const now = new Date()
    
    if (selectedRange === 'MAX') {
      filteredData = sortedData
    } else if (selectedRange === 'YTD') {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      filteredData = sortedData.filter(d => new Date(d.date) >= startOfYear)
    } else {
      const range = TIME_RANGES.find(r => r.label === selectedRange)
      if (range && typeof range.days === 'number') {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - range.days)
        filteredData = sortedData.filter(d => new Date(d.date) >= cutoffDate)
      } else {
        filteredData = sortedData
      }
    }

    // Transform for Recharts - add proper date formatting
    return filteredData.map(item => ({
      ...item,
      value: item.close,
      dateObj: new Date(item.date),
      shortDate: new Date(item.date).toLocaleDateString('de-DE', { 
        month: 'short', 
        day: 'numeric' 
      })
    }))
  }, [data, selectedRange])

  // Calculate performance stats
  const stats = useMemo(() => {
    if (chartData.length < 2) {
      return { currentPrice: 0, change: 0, changePercent: 0 }
    }
    
    const firstPrice = chartData[0].close
    const lastPrice = chartData[chartData.length - 1].close
    const change = lastPrice - firstPrice
    const changePercent = (change / firstPrice) * 100
    
    return {
      currentPrice: lastPrice,
      change,
      changePercent
    }
  }, [chartData])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className={`p-3 rounded-lg border shadow-lg ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700 text-white' 
            : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-medium">{new Date(data.date).toLocaleDateString('de-DE')}</p>
          <p className="text-green-500 font-bold">
            {formatStockPrice(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  // Custom X-axis formatter
  const formatXAxis = (tickItem: string, index: number) => {
    const date = new Date(tickItem)
    if (selectedRange === '5D' || selectedRange === '1M') {
      return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
    } else if (selectedRange === '3M' || selectedRange === '6M' || selectedRange === 'YTD') {
      return date.toLocaleDateString('de-DE', { month: 'short' })
    } else {
      return date.getFullYear().toString()
    }
  }

  return (
    <div className="w-full">
      {/* Header - Fiscal.ai style */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-xl font-bold mb-2 ${colors.textPrimary}`}>
              {ticker}
            </h3>
            <div className="flex items-baseline gap-4">
              <span className={`text-3xl font-bold ${colors.textPrimary}`}>
                {formatStockPrice(stats.currentPrice)}
              </span>
              <span className={`text-lg font-medium ${
                stats.change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {stats.change >= 0 ? '+' : ''}{formatStockPrice(stats.change)}
              </span>
              <span className={`text-lg font-medium ${
                stats.changePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className={`text-sm mt-2 ${colors.textMuted}`}>
              {chartData.length} Datenpunkte für {selectedRange}
            </div>
          </div>
          
          {/* Time range selector - Modern style */}
          <div className={`flex items-center gap-1 rounded-lg p-1`} style={{ backgroundColor: colors.buttonBg }}>
            {TIME_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(range.label)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  selectedRange === range.label
                    ? 'shadow-sm'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: selectedRange === range.label ? colors.buttonActive : 'transparent',
                  color: selectedRange === range.label ? colors.buttonActiveText : colors.textSecondary,
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full rounded-lg border" style={{ 
        backgroundColor: colors.cardBg,
        borderColor: colors.border 
      }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={colors.grid}
                vertical={false}
              />
              <XAxis 
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke={colors.textMuted}
                fontSize={12}
                axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                tickLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                height={30}
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(value) => formatStockPrice(value)}
                stroke={colors.textMuted}
                fontSize={12}
                axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                tickLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke={colors.primary}
                strokeWidth={2}
                fill={`url(#colorGradient-${theme})`}
                dot={false}
                activeDot={{
                  r: 6,
                  stroke: colors.primary,
                  strokeWidth: 2,
                  fill: colors.cardBg
                }}
              />
              <defs>
                <linearGradient id={`colorGradient-${theme}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className={`text-center ${colors.textMuted}`}>
              <p>Keine Daten für {selectedRange} verfügbar</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`mt-4 flex items-center justify-between text-sm ${colors.textMuted}`}>
        <div className="flex items-center gap-4">
          <span>Powered by Financial Modeling Prep</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: colors.primary }}
          ></div>
          <span>{ticker} Price</span>
        </div>
      </div>
    </div>
  )
}

export default FiscalInspiredChart