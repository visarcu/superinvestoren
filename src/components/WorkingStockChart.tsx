// Datei: src/components/WorkingStockChart.tsx
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
  { label: 'MAX', days: 'max' as const }, // ✅ MAX hinzugefügt
]

export default function WorkingStockChart({ ticker, data }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const [selectedRange, setSelectedRange] = useState('1J')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)
  
  // ✅ NEU: Moving Averages Controls
  const [showMA20, setShowMA20] = useState(false)
  const [showMA50, setShowMA50] = useState(true)
  const [showMA200, setShowMA200] = useState(false) // Standardmäßig aus für bessere Performance

  // Cleanup function to properly remove chart
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

  // ✅ NEU: Moving Average Berechnung
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

  // Get filtered data based on selected range
  const getFilteredData = useCallback(() => {
    if (!data.length) return []
    
    const now = new Date()
    let cutoffDate: Date
    const selectedRangeData = TIME_RANGES.find(r => r.label === selectedRange)
    
    if (selectedRangeData?.days === 'ytd') {
      cutoffDate = new Date(now.getFullYear(), 0, 1)
    } else if (selectedRangeData?.days === 'max') {
      // ✅ MAX: Alle verfügbaren Daten zurückgeben
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
    
    // Clean up any existing chart first
    cleanupChart()
    
    let mounted = true

    const initChart = async () => {
      try {
        const { createChart, ColorType } = await import('lightweight-charts')
        
        // Double check we're still mounted and have a container
        if (!mounted || !chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#d1d5db',
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

        // ✅ NEU: Moving Average Series erstellen
        const ma20Series = chart.addLineSeries({
          color: '#fbbf24', // Yellow
          lineWidth: 1,
          visible: showMA20,
        })

        const ma50Series = chart.addLineSeries({
          color: '#f97316', // Orange  
          lineWidth: 1,
          visible: showMA50,
        })

        const ma200Series = chart.addLineSeries({
          color: '#ef4444', // Red
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
          ma20Series,
          ma50Series, 
          ma200Series
        }
        
        // Set initial data
        const chartData = getFilteredData()
        if (chartData.length > 0) {
          priceSeries.setData(chartData)
          
          // ✅ NEU: Moving Averages berechnen und setzen
          if (showMA20) {
            const ma20Data = calculateMovingAverage(chartData, 20)
            ma20Series.setData(ma20Data)
          }
          
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

        // Cleanup function
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
  }, [data, cleanupChart, getFilteredData, calculateMovingAverage, showMA20, showMA50, showMA200])

  // Update data when range changes
  useEffect(() => {
    if (!chartRef.current || !isChartReady || !data.length) return

    setIsLoading(true)
    
    try {
      const chartData = getFilteredData()
      if (chartRef.current.priceSeries && chartData.length > 0) {
        chartRef.current.priceSeries.setData(chartData)
        
        // ✅ Update Moving Averages
        if (showMA20 && chartRef.current.ma20Series) {
          const ma20Data = calculateMovingAverage(chartData, 20)
          chartRef.current.ma20Series.setData(ma20Data)
        }
        
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
  }, [selectedRange, getFilteredData, calculateMovingAverage, isChartReady, showMA20, showMA50, showMA200])

  // ✅ NEU: Moving Average Visibility Toggle
  useEffect(() => {
    if (!chartRef.current || !isChartReady) return
    
    chartRef.current.ma20Series?.applyOptions({ visible: showMA20 })
    chartRef.current.ma50Series?.applyOptions({ visible: showMA50 })
    chartRef.current.ma200Series?.applyOptions({ visible: showMA200 })
  }, [showMA20, showMA50, showMA200, isChartReady])

  if (error) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-white mb-4">Historischer Kursverlauf</h3>
        <div className="flex items-center justify-center h-96 text-red-400">
          <div className="text-center">
            <p className="mb-2">⚠️ {error}</p>
            <p className="text-sm text-gray-500">
              Versuche: npm install lightweight-charts@3.8.0
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
      <div className="flex flex-col gap-4 mb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Historischer Kursverlauf
            </h3>
            <p className="text-gray-400">
              Aktienkurs für {ticker}
            </p>
          </div>
          
          {/* Zeitraum Buttons */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(range.label)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  selectedRange === range.label
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ NEU: Moving Averages Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-gray-300">Moving Averages:</span>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA20}
                onChange={(e) => setShowMA20(e.target.checked)}
                className="w-4 h-4 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500"
              />
              <span className="text-sm text-yellow-400 font-medium">MA20</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA50}
                onChange={(e) => setShowMA50(e.target.checked)}
                className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-orange-400 font-medium">MA50</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA200}
                onChange={(e) => setShowMA200(e.target.checked)}
                className="w-4 h-4 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
              />
              <span className="text-sm text-red-400 font-medium">MA200</span>
            </label>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>Kurs</span>
            </div>
            {showMA20 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-yellow-400"></div>
                <span>MA20</span>
              </div>
            )}
            {showMA50 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-orange-400"></div>
                <span>MA50</span>
              </div>
            )}
            {showMA200 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-400"></div>
                <span>MA200</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center gap-3 text-white">
              <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Chart wird aktualisiert...</span>
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full h-96 rounded-lg"
          style={{ background: 'transparent' }}
        />
        {/* Powered by Badge */}
        <div className="flex justify-end mt-2">
          <span className="text-xs text-gray-500">
            Powered by TradingView Lightweight Charts
          </span>
        </div>
      </div>

      {/* Chart Info */}
      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Aktueller Kurs</span>
            <div className="text-white font-medium">
              {data.length > 0 && `$${data[data.length - 1].close.toFixed(2)}`}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Zeitraum</span>
            <div className="text-white font-medium">{selectedRange}</div>
          </div>
          <div>
            <span className="text-gray-400">Datenpunkte</span>
            <div className="text-white font-medium">
              {getFilteredData().length}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Letztes Update</span>
            <div className="text-white font-medium">Live</div>
          </div>
        </div>

        {/* ✅ NEU: Moving Average Values */}
        {(showMA20 || showMA50 || showMA200) && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {showMA20 && (
                <div>
                  <span className="text-yellow-400">MA20</span>
                  <div className="text-white font-medium">
                    {(() => {
                      const chartData = getFilteredData()
                      if (chartData.length >= 20) {
                        const ma20Data = calculateMovingAverage(chartData, 20)
                        const latest = ma20Data[ma20Data.length - 1]
                        return latest ? `$${latest.value.toFixed(2)}` : '–'
                      }
                      return '–'
                    })()}
                  </div>
                </div>
              )}
              {showMA50 && (
                <div>
                  <span className="text-orange-400">MA50</span>
                  <div className="text-white font-medium">
                    {(() => {
                      const chartData = getFilteredData()
                      if (chartData.length >= 50) {
                        const ma50Data = calculateMovingAverage(chartData, 50)
                        const latest = ma50Data[ma50Data.length - 1]
                        return latest ? `$${latest.value.toFixed(2)}` : '–'
                      }
                      return '–'
                    })()}
                  </div>
                </div>
              )}
              {showMA200 && (
                <div>
                  <span className="text-red-400">MA200</span>
                  <div className="text-white font-medium">
                    {(() => {
                      const chartData = getFilteredData()
                      if (chartData.length >= 200) {
                        const ma200Data = calculateMovingAverage(chartData, 200)
                        const latest = ma200Data[ma200Data.length - 1]
                        return latest ? `$${latest.value.toFixed(2)}` : '–'
                      }
                      return '–'
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}