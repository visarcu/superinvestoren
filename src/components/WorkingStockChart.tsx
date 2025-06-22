// src/components/WorkingStockChart.tsx - CLEANER VERSION
'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  ticker: string
  data: { date: string; close: number }[]
}

const TIME_RANGES = [
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: 'YTD', days: 'ytd' as const },
  { label: '1J', days: 365 },
  { label: '3J', days: 1095 },
  { label: '5J', days: 1825 },
  { label: 'MAX', days: 'max' as const },
]

export default function WorkingStockChart({ ticker, data }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const [selectedRange, setSelectedRange] = useState('1J')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)
  
  // Moving Averages Controls
  const [showMA50, setShowMA50] = useState(true)
  const [showMA200, setShowMA200] = useState(false)

  // Cleanup function
  const cleanupChart = useCallback(() => {
    if (chartRef.current?.chart) {
      try {
        chartRef.current.chart.remove()
      } catch (e) {
        console.warn('Chart cleanup warning:', e)
      }
      chartRef.current = null
    }
    setIsChartReady(false)
  }, [])

  // Moving Average calculation
  const calculateMovingAverage = useCallback((data: any[], period: number) => {
    const result = []
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: null })
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, item) => acc + item.value, 0)
        const avg = sum / period
        result.push({ time: data[i].time, value: avg })
      }
    }
    return result.filter(item => item.value !== null)
  }, [])

  // Get filtered data
  const getFilteredData = useCallback(() => {
    if (!data.length) return []
    
    const now = new Date()
    let cutoffDate: Date
    const selectedRangeData = TIME_RANGES.find(r => r.label === selectedRange)
    
    if (selectedRangeData?.days === 'ytd') {
      cutoffDate = new Date(now.getFullYear(), 0, 1)
    } else if (selectedRangeData?.days === 'max') {
      return data
        .map(d => ({
          time: d.date,
          value: d.close
        }))
        .sort((a, b) => a.time.localeCompare(b.time))
    } else {
      cutoffDate = new Date(now.getTime() - (selectedRangeData?.days || 365) * 24 * 60 * 60 * 1000)
    }

    return data
      .filter(d => new Date(d.date) >= cutoffDate)
      .map(d => ({
        time: d.date,
        value: d.close
      }))
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [data, selectedRange])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !data.length) return
    
    cleanupChart()
    
    let mounted = true

    const initChart = async () => {
      try {
        const { createChart, ColorType } = await import('lightweight-charts')
        
        if (!mounted || !chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#9CA3AF',
          },
          grid: {
            vertLines: { color: '#374151' },
            horzLines: { color: '#374151' },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: '#374151',
          },
          timeScale: {
            borderColor: '#374151',
            timeVisible: true,
            secondsVisible: false,
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        })

        // Create main price series
        const priceSeries = chart.addAreaSeries({
          lineColor: '#3b82f6',
          topColor: '#3b82f633',
          bottomColor: '#3b82f600',
          lineWidth: 2,
        })

        // Moving Average Series
        const ma50Series = chart.addLineSeries({
          color: '#f97316',
          lineWidth: 1,
          visible: showMA50,
        })

        const ma200Series = chart.addLineSeries({
          color: '#ef4444',
          lineWidth: 2,
          visible: showMA200,
        })

        if (!mounted) {
          chart.remove()
          return
        }

        chartRef.current = { 
          chart, 
          priceSeries,
          ma50Series, 
          ma200Series
        }
        
        // Set initial data
        const chartData = getFilteredData()
        if (chartData.length > 0) {
          priceSeries.setData(chartData)
          
          if (showMA50) {
            const ma50Data = calculateMovingAverage(chartData, 50)
            ma50Series.setData(ma50Data)
          }
          
          if (showMA200) {
            const ma200Data = calculateMovingAverage(chartData, 200)
            ma200Series.setData(ma200Data)
          }
          
          chart.timeScale().fitContent()
        }

        // Responsive handling
        const handleResize = () => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: chartContainerRef.current.clientHeight,
            })
          }
        }

        window.addEventListener('resize', handleResize)
        setIsChartReady(true)
        setError(null)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (chart) {
            try {
              chart.remove()
            } catch (e) {
              console.warn('Chart removal warning:', e)
            }
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Chart konnte nicht initialisiert werden')
          console.error('Chart initialization error:', err)
        }
      }
    }

    initChart()

    return () => {
      mounted = false
      cleanupChart()
    }
  }, [data, cleanupChart, getFilteredData, calculateMovingAverage, showMA50, showMA200])

  // Update data when range changes
  useEffect(() => {
    if (!chartRef.current || !isChartReady || !data.length) return

    setIsLoading(true)
    
    try {
      const chartData = getFilteredData()
      if (chartRef.current.priceSeries && chartData.length > 0) {
        chartRef.current.priceSeries.setData(chartData)
        
        if (showMA50 && chartRef.current.ma50Series) {
          const ma50Data = calculateMovingAverage(chartData, 50)
          chartRef.current.ma50Series.setData(ma50Data)
        }
        
        if (showMA200 && chartRef.current.ma200Series) {
          const ma200Data = calculateMovingAverage(chartData, 200)
          chartRef.current.ma200Series.setData(ma200Data)
        }
        
        chartRef.current.chart.timeScale().fitContent()
      }
    } catch (err) {
      console.error('Data update error:', err)
    }

    setTimeout(() => setIsLoading(false), 100)
  }, [selectedRange, getFilteredData, calculateMovingAverage, isChartReady, showMA50, showMA200])

  // Moving Average Visibility Toggle
  useEffect(() => {
    if (!chartRef.current || !isChartReady) return
    
    chartRef.current.ma50Series?.applyOptions({ visible: showMA50 })
    chartRef.current.ma200Series?.applyOptions({ visible: showMA200 })
  }, [showMA50, showMA200, isChartReady])

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-400">
        <div className="text-center">
          <p className="mb-2">⚠️ {error}</p>
          <p className="text-sm text-gray-400">
            Versuche: npm install lightweight-charts@3.8.0
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* CLEANER Controls - eine einzige Zeile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        {/* Time Range Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 mr-2">Zeitraum:</span>
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedRange(range.label)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedRange === range.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        
        {/* Moving Averages */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">MA:</span>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMA50}
              onChange={(e) => setShowMA50(e.target.checked)}
              className="w-3 h-3 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-orange-400">50</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMA200}
              onChange={(e) => setShowMA200(e.target.checked)}
              className="w-3 h-3 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
            />
            <span className="text-sm text-red-400">200</span>
          </label>
        </div>
      </div>

      {/* Chart Container - CLEANER */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center gap-3 text-white">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Chart wird aktualisiert...</span>
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full h-96 rounded-lg bg-gray-900/30"
        />
      </div>

      {/* Minimale Chart Info */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <span>Aktuell: {data.length > 0 && `$${data[data.length - 1].close.toFixed(2)}`}</span>
          <span>•</span>
          <span>{getFilteredData().length} Datenpunkte</span>
        </div>
        <span className="text-xs">Powered by TradingView</span>
      </div>
    </div>
  )
}