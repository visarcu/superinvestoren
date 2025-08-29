// src/components/ModernStockChart.tsx - MODERN FISCAL.AI INSPIRED
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts'
import { useTheme } from '@/lib/useTheme'

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

const ModernStockChart: React.FC<Props> = ({ ticker, data, onAddComparison }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null)
  const { theme } = useTheme()
  
  const [selectedRange, setSelectedRange] = useState('1Y')
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState(0)
  const [priceChangePercent, setPriceChangePercent] = useState(0)

  // Get theme colors
  const getThemeColors = () => {
    const isDark = theme === 'dark'
    return {
      background: 'transparent',
      textColor: isDark ? '#ffffff' : '#1f2937',
      gridColor: isDark ? '#2a2e39' : '#e5e7eb',
      crosshairColor: isDark ? '#4ade80' : '#059669',
      borderColor: isDark ? '#485158' : '#d1d5db',
      areaLineColor: isDark ? '#4ade80' : '#059669',
      areaTopColor: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(5, 150, 105, 0.3)',
      areaBottomColor: isDark ? 'rgba(74, 222, 128, 0.04)' : 'rgba(5, 150, 105, 0.05)',
    }
  }

  // Get filtered data based on time range
  const getFilteredData = () => {
    if (!data.length) return []
    
    // Sort all data by date first
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const now = new Date()
    let cutoffDate: Date
    
    if (selectedRange === 'YTD') {
      cutoffDate = new Date(now.getFullYear(), 0, 1)
    } else if (selectedRange === 'MAX') {
      return sortedData
    } else {
      const days = TIME_RANGES.find(r => r.label === selectedRange)?.days as number
      if (!days) return sortedData
      cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    }

    const filtered = sortedData.filter(d => new Date(d.date) >= cutoffDate)
    console.log(`🔄 Filtered data for ${selectedRange}:`, filtered.length, 'items')
    return filtered
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const filteredData = getFilteredData()
    if (!filteredData.length) {
      console.log(`❌ No data for range ${selectedRange}`)
      return
    }

    const colors = getThemeColors()

    // Create chart with theme-aware styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: colors.textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: {
          color: colors.gridColor,
          style: LineStyle.Solid,
          visible: true,
        },
        horzLines: {
          color: colors.gridColor,
          style: LineStyle.Solid,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: colors.crosshairColor,
          style: LineStyle.Dashed,
          labelBackgroundColor: colors.crosshairColor,
        },
        horzLine: {
          width: 1,
          color: colors.crosshairColor,
          style: LineStyle.Dashed,
          labelBackgroundColor: colors.crosshairColor,
        },
      },
      rightPriceScale: {
        borderColor: colors.borderColor,
        textColor: colors.textColor,
        entireTextOnly: true,
        scaleMargins: {
          top: 0.05,
          bottom: 0.05,
        },
      },
      timeScale: {
        borderColor: colors.borderColor,
        textColor: colors.textColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 20,
        barSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart

    // Create area series with theme-aware colors
    const areaSeries = chart.addAreaSeries({
      lineColor: colors.areaLineColor,
      topColor: colors.areaTopColor,
      bottomColor: colors.areaBottomColor,
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    })

    seriesRef.current = areaSeries

    // Convert data to chart format with proper date parsing
    const chartData = filteredData.map(d => ({
      time: d.date as any, // lightweight-charts handles YYYY-MM-DD format automatically
      value: d.close,
    }))

    console.log(`📊 Setting chart data:`, {
      range: selectedRange,
      dataPoints: chartData.length,
      firstDate: chartData[0]?.time,
      lastDate: chartData[chartData.length - 1]?.time,
    })

    areaSeries.setData(chartData)

    // Calculate price stats
    if (chartData.length > 0) {
      const firstPrice = chartData[0].value
      const lastPrice = chartData[chartData.length - 1].value
      const change = lastPrice - firstPrice
      const changePercent = (change / firstPrice) * 100

      setCurrentPrice(lastPrice)
      setPriceChange(change)
      setPriceChangePercent(changePercent)
    }

    // Better fitting strategy
    setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent()
        // Also fit the price scale
        chartRef.current.priceScale('right').applyOptions({
          autoScale: true,
        })
      }
    }, 100)

    // Cleanup function
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [data, selectedRange, theme])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(2)}%`
  }

  const isDark = theme === 'dark'

  return (
    <div className="relative">
      {/* Header with price info - Theme aware */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>{ticker}</h3>
            <div className="flex items-baseline gap-4">
              <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatPrice(currentPrice)}
              </span>
              <span className={`text-lg font-medium ${
                priceChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)}
              </span>
              <span className={`text-lg font-medium ${
                priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                ({formatPercent(priceChangePercent)})
              </span>
            </div>
          </div>
          
          {/* Time range selector - Theme aware */}
          <div className={`flex items-center gap-1 rounded-lg p-1 ${
            isDark ? 'bg-gray-800/50' : 'bg-gray-100'
          }`}>
            {TIME_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(range.label)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  selectedRange === range.label
                    ? isDark 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-white text-gray-900 shadow-sm'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart container - Theme aware */}
      <div 
        ref={chartContainerRef}
        className={`w-full h-[400px] rounded-lg border ${
          isDark 
            ? 'bg-gray-900/20 border-gray-700/50' 
            : 'bg-gray-50/50 border-gray-200'
        }`}
        style={{ minHeight: '400px' }}
      />

      {/* Chart info footer - Theme aware */}
      <div className={`mt-4 flex items-center justify-between text-sm ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className="flex items-center gap-4">
          <span>Powered by Financial Modeling Prep</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            isDark ? 'bg-green-400' : 'bg-green-500'
          }`}></div>
          <span>{ticker} Price</span>
        </div>
      </div>
    </div>
  )
}

export default ModernStockChart