// src/components/WorkingStockChart.tsx - CLEAN VERSION mit Währungsformatierung
'use client'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  LineChart,
  Line
} from 'recharts'
import { useTheme } from '@/lib/useTheme'
import { useCurrency } from '@/lib/CurrencyContext' // ✅ HINZUGEFÜGT

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
  { id: 'price', label: 'Preis', icon: '💰' },
  { id: 'total_return', label: 'Performance', icon: '📈' },
  { id: 'market_cap', label: 'Marktkapitalisierung', icon: '🏢' },
  { id: '10k_growth', label: '10.000€ Investment', icon: '💎' },
]

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316']

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'INTC', name: 'Intel Corporation' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.' },
  { symbol: 'ZOOM', name: 'Zoom Video Communications' },
  { symbol: 'SNAP', name: 'Snap Inc.' },
  { symbol: 'SPOT', name: 'Spotify Technology SA' },
  { symbol: 'SQ', name: 'Block Inc.' },
  { symbol: 'SPY', name: 'S&P 500 ETF (USA Index)' },
  { symbol: 'QQQ', name: 'NASDAQ 100 ETF (Tech Index)' },
  { symbol: 'VTI', name: 'Total Stock Market ETF (USA Gesamt)' },
  { symbol: 'IWDA', name: 'MSCI World ETF (Weltindex)' },
  { symbol: 'EUNL', name: 'MSCI World EUR ETF (Weltindex Euro)' },
  { symbol: 'VWRL', name: 'FTSE All-World ETF (Weltindex)' },
  { symbol: 'DIA', name: 'Dow Jones ETF (USA Index)' },
  { symbol: 'IVV', name: 'iShares S&P 500 ETF (USA Index)' },
]

export default function WorkingStockChart({ ticker, data, onAddComparison }: Props) {
  const [selectedRange, setSelectedRange] = useState('1Y')
  const [selectedMode, setSelectedMode] = useState('price')
  const [comparisonStocks, setComparisonStocks] = useState<Array<{ticker: string, data: StockData[], color: string}>>([])
  const [newTicker, setNewTicker] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{symbol: string, name: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMovingAverages, setShowMovingAverages] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
  const { theme } = useTheme()
  
  // ✅ CURRENCY HOOK HINZUGEFÜGT
  const { 
    formatCurrency, 
    formatStockPrice, 
    formatPercentage, 
    formatMarketCap 
  } = useCurrency()

  // Theme-aware colors - IMPROVED
  const getThemeColors = () => {
    const isDark = theme === 'dark'
    return {
      chartBg: isDark ? 'transparent' : 'transparent',
      textPrimary: isDark ? '#ffffff' : '#0f172a',
      textSecondary: isDark ? '#d1d5db' : '#374151',
      textMuted: isDark ? '#9ca3af' : '#64748b',
      buttonBg: isDark ? '#374151' : '#f1f5f9',
      buttonBgActive: isDark ? '#ffffff' : '#ffffff',
      buttonText: isDark ? '#d1d5db' : '#475569',
      buttonTextActive: isDark ? '#111827' : '#111827',
      buttonHover: isDark ? '#4b5563' : '#e2e8f0',
      inputBg: isDark ? '#374151' : '#ffffff',
      inputBorder: isDark ? '#4b5563' : '#d1d5db',
      inputText: isDark ? '#ffffff' : '#111827',
      inputPlaceholder: isDark ? '#9ca3af' : '#9ca3af',
      // IMPROVED: Better contrast for grid and axes
      gridColor: isDark ? '#4b5563' : '#cbd5e1',
      axisColor: isDark ? '#6b7280' : '#64748b',
      tooltipBg: isDark ? '#1f2937' : '#ffffff',
      tooltipBorder: isDark ? '#4b5563' : '#d1d5db',
      tooltipText: isDark ? '#ffffff' : '#111827',
      statsBg: isDark ? 'rgba(31, 41, 55, 0.2)' : 'rgba(241, 245, 249, 0.8)',
      statsCardBg: isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(255, 255, 255, 0.9)',
      suggestionsBg: isDark ? '#1f2937' : '#ffffff',
      suggestionsBorder: isDark ? '#4b5563' : '#d1d5db',
      suggestionsHover: isDark ? '#374151' : '#f8fafc',
    }
  }

  const themeColors = getThemeColors()

  // Moving Averages berechnen
  const calculateMovingAverage = (data: StockData[], period: number) => {
    return data.map((item, index) => {
      if (index < period - 1) return { ...item, ma: null }
      
      const slice = data.slice(index - period + 1, index + 1)
      const average = slice.reduce((sum, d) => sum + d.close, 0) / period
      
      return { ...item, ma: average }
    })
  }

  // Filter data by time range - FIXED
  const getFilteredData = (stockData: StockData[]) => {
    if (!stockData.length) return []
    
    const now = new Date()
    let cutoffDate: Date
    
    if (selectedRange === 'YTD') {
      cutoffDate = new Date(now.getFullYear(), 0, 1) // January 1st of current year
    } else if (selectedRange === 'MAX') {
      return stockData.sort((a, b) => a.date.localeCompare(b.date))
    } else {
      const timeRange = TIME_RANGES.find(r => r.label === selectedRange)
      if (!timeRange || typeof timeRange.days !== 'number') {
        return stockData.sort((a, b) => a.date.localeCompare(b.date))
      }
      
      const days = timeRange.days
      // For very short periods like 1D, ensure we get at least some recent data
      if (days === 1) {
        // Get the most recent trading days (handle weekends)
        const sortedData = stockData.sort((a, b) => b.date.localeCompare(a.date))
        return sortedData.slice(0, Math.min(5, sortedData.length)).reverse()
      }
      
      cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    }

    const filtered = stockData
      .filter(d => new Date(d.date) >= cutoffDate)
      .sort((a, b) => a.date.localeCompare(b.date))
    
    // Fallback: if no data found, return most recent data points
    if (filtered.length === 0 && stockData.length > 0) {
      const sortedData = stockData.sort((a, b) => b.date.localeCompare(a.date))
      return sortedData.slice(0, Math.min(10, sortedData.length)).reverse()
    }
    
    return filtered
  }

  // Chart Data Berechnung
  const calculateChartData = (stockData: StockData[], mode: string, tickerSymbol: string) => {
    const filteredData = getFilteredData(stockData)
    if (!filteredData.length) return []

    const basePrice = filteredData[0].close

    return filteredData.map(d => {
      switch (mode) {
        case 'price':
          return { date: d.date, value: d.close }
        case 'total_return':
          return { 
            date: d.date, 
            value: ((d.close - basePrice) / basePrice) * 100 
          }
        case 'market_cap':
          return { 
            date: d.date, 
            value: d.close * 1000000000
          }
        case '10k_growth':
          return { 
            date: d.date, 
            value: 10000 * (d.close / basePrice)
          }
        default:
          return { date: d.date, value: d.close }
      }
    })
  }

  // Chart Data mit Moving Averages
  const chartData = useMemo(() => {
    const mainData = calculateChartData(data, selectedMode, ticker)
    if (!mainData.length) return []

    let result = mainData.map(d => ({
      date: d.date,
      [ticker]: d.value,
      formattedDate: new Date(d.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
    }))

    comparisonStocks.forEach(stock => {
      const stockData = calculateChartData(stock.data, selectedMode, stock.ticker)
      result.forEach(item => {
        const stockPoint = stockData.find(s => s.date === item.date)
        if (stockPoint) {
          item[stock.ticker] = stockPoint.value
        }
      })
    })

    if (showMovingAverages && selectedMode === 'price') {
      const filteredData = getFilteredData(data)
      const ma20Data = calculateMovingAverage(filteredData, 20)
      const ma50Data = calculateMovingAverage(filteredData, 50)
      
      result.forEach(item => {
        const ma20Point = ma20Data.find(d => d.date === item.date)
        const ma50Point = ma50Data.find(d => d.date === item.date)
        
        if (ma20Point?.ma) item[`${ticker}_MA20`] = ma20Point.ma
        if (ma50Point?.ma) item[`${ticker}_MA50`] = ma50Point.ma
      })
    }

    return result
  }, [data, comparisonStocks, selectedRange, selectedMode, ticker, showMovingAverages])

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!chartContainerRef.current) return

    try {
      if (!isFullscreen) {
        if (chartContainerRef.current.requestFullscreen) {
          await chartContainerRef.current.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Autocomplete Logic
  useEffect(() => {
    if (!newTicker.trim() || newTicker.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const query = newTicker.toLowerCase()
    const matches = POPULAR_STOCKS.filter(stock => 
      stock.symbol.toLowerCase().includes(query) || 
      stock.name.toLowerCase().includes(query)
    ).slice(0, 8)

    setSuggestions(matches)
    setShowSuggestions(matches.length > 0)
  }, [newTicker])

  // FIXED: Current price should always be the latest available price, not from filtered data
  const currentPrice = useMemo(() => {
    if (!data.length) return 0
    // Sort by date descending and get the most recent price
    const sortedData = [...data].sort((a, b) => b.date.localeCompare(a.date))
    return sortedData[0].close
  }, [data])

  // Performance stats calculation - FIXED
  const performanceStats = useMemo(() => {
    if (!chartData.length) return {}
    
    const stats: Record<string, {change: number, changePercent: number, endValue: number}> = {}
    const allStocks = [ticker, ...comparisonStocks.map(s => s.ticker)]
    
    allStocks.forEach(stockTicker => {
      const firstValue = chartData[0][stockTicker] as number
      const lastValue = chartData[chartData.length - 1][stockTicker] as number
      
      if (typeof firstValue === 'number' && typeof lastValue === 'number') {
        if (selectedMode === 'total_return') {
          stats[stockTicker] = { 
            change: lastValue - firstValue, 
            changePercent: lastValue,
            endValue: lastValue
          }
        } else if (firstValue > 0) {
          const change = lastValue - firstValue
          const changePercent = (change / firstValue) * 100
          // For main ticker, use actual current price as endValue, not chart value
          const endValue = stockTicker === ticker ? currentPrice : lastValue
          stats[stockTicker] = { change, changePercent, endValue }
        }
      }
    })
    
    return stats
  }, [chartData, ticker, comparisonStocks, selectedMode, currentPrice])

  // Suggestion selection
  const handleSelectSuggestion = (suggestion: {symbol: string, name: string}) => {
    setNewTicker(suggestion.symbol)
    setShowSuggestions(false)
    setTimeout(() => {
      if (suggestion.symbol !== ticker && !comparisonStocks.some(s => s.ticker === suggestion.symbol)) {
        handleAddStockWithTicker(suggestion.symbol)
      }
    }, 100)
  }

  // Add stock with specific ticker
  const handleAddStockWithTicker = async (tickerToAdd: string) => {
    if (!onAddComparison) return
    
    try {
      setIsLoading(true)
      const newData = await onAddComparison(tickerToAdd)
      
      if (newData.length > 0) {
        const color = COLORS[(comparisonStocks.length + 1) % COLORS.length]
        setComparisonStocks(prev => [...prev, { 
          ticker: tickerToAdd, 
          data: newData, 
          color 
        }])
        setNewTicker('')
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Error loading stock:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Add comparison stock
  const handleAddStock = async () => {
    if (!newTicker.trim() || !onAddComparison) return
    
    const upperTicker = newTicker.toUpperCase()
    if (upperTicker === ticker || comparisonStocks.some(s => s.ticker === upperTicker)) {
      setNewTicker('')
      setShowSuggestions(false)
      return
    }
    
    await handleAddStockWithTicker(upperTicker)
  }

  // Remove stock
  const removeStock = (tickerToRemove: string) => {
    setComparisonStocks(prev => prev.filter(s => s.ticker !== tickerToRemove))
  }

  // ✅ FORMATIERUNGSFUNKTIONEN AKTUALISIERT
  const formatValue = (value: number) => {
    switch (selectedMode) {
      case 'total_return':
        return formatPercentage(value) // ✅ Verwende formatPercentage
      case 'market_cap':
        return formatMarketCap(value) // ✅ Verwende formatMarketCap
      case '10k_growth':
        return formatCurrency(value) // ✅ Verwende formatCurrency
      default:
        return formatStockPrice(value) // ✅ Verwende formatStockPrice
    }
  }

  // Custom Tooltip
  const renderTooltip = (props: any) => {
    const { active, payload } = props
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      return (
        <div 
          className="rounded-lg p-3 shadow-lg border"
          style={{ 
            backgroundColor: themeColors.tooltipBg,
            borderColor: themeColors.tooltipBorder
          }}
        >
          <p className="text-sm mb-2" style={{ color: themeColors.textMuted }}>
            {data.formattedDate}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey.includes('_MA')) return null
            
            return (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span 
                  className="font-medium"
                  style={{ color: themeColors.textPrimary }}
                >
                  {entry.dataKey}: {formatValue(entry.value)}
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  const formatXAxisTick = (value: string) => {
    const date = new Date(value)
    const now = new Date()
    const yearDiff = now.getFullYear() - date.getFullYear()
    
    // Für längere Zeiträume (3Y, 5Y, MAX) - zeige immer Jahr für bessere Orientierung
    if (selectedRange === '3Y' || selectedRange === '5Y' || selectedRange === 'MAX') {
      return date.toLocaleDateString('de-DE', { 
        year: '2-digit',
        month: 'short'
      })
    }
    
    // Für 1Y - zeige immer Monat und Jahr für bessere Orientierung
    if (selectedRange === '1Y') {
      return date.toLocaleDateString('de-DE', { 
        year: '2-digit',
        month: 'short'
      })
    }
    
    // Für sehr kurze Zeiträume (1D) - zeige Zeit wenn möglich, sonst Monat und Tag
    if (selectedRange === '1D') {
      // Prüfe ob wir Intraday-Daten haben (verschiedene Zeiten am selben Tag)
      const time = date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      
      // Wenn es nicht 00:00 ist, zeige die Zeit
      if (time !== '00:00') {
        return time
      }
    }
    
    // Für kurze Zeiträume (5D, 1M, 3M, 6M, YTD) - zeige Monat und Tag
    return date.toLocaleDateString('de-DE', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Intelligentes minTickGap basierend auf Zeitraum
  const getMinTickGap = () => {
    const baseGap = isFullscreen ? 80 : 60
    
    // Für lange Zeiträume mehr Abstand zwischen Labels
    if (selectedRange === '5Y' || selectedRange === 'MAX') {
      return baseGap * 2 // Doppelter Abstand
    }
    if (selectedRange === '3Y') {
      return Math.floor(baseGap * 1.5) // 50% mehr Abstand
    }
    if (selectedRange === '1Y') {
      return Math.floor(baseGap * 1.2) // 20% mehr Abstand
    }
    
    // Für kurze Zeiträume weniger Abstand
    if (selectedRange === '1D' || selectedRange === '5D') {
      return Math.floor(baseGap * 0.8) // 20% weniger Abstand
    }
    
    return baseGap // Standard für 1M, 3M, 6M, YTD
  }

  // ✅ Y-ACHSEN FORMATIERUNG AKTUALISIERT
  const formatYAxisTick = (value: number) => {
    switch (selectedMode) {
      case 'total_return':
        return `${value.toFixed(0)}%`
      case 'market_cap':
        // Vereinfachte Formatierung für Y-Achse
        if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
        if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
        return `${(value / 1e6).toFixed(0)}M`
      case '10k_growth':
        return `${(value / 1000).toFixed(0)}K`
      default:
        // Für Aktienkurse: Einfache Zahlen ohne Währungszeichen
        return value.toFixed(0)
    }
  }

  const mainStats = performanceStats[ticker]
  const chartHeight = isFullscreen ? "h-[calc(100vh-120px)]" : "h-[300px] sm:h-[400px] lg:h-[480px]"

  return (
    <div className="space-y-6" ref={chartContainerRef}>
      
      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200 border"
        style={{ 
          backgroundColor: themeColors.buttonBg,
          borderColor: themeColors.inputBorder,
          color: themeColors.textMuted
        }}
        title={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
          </svg>
        )}
      </button>

      {/* Header with Price & Performance */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 
            className="text-lg font-semibold"
            style={{ color: themeColors.textSecondary }}
          >
            {ticker} • Historischer Kursverlauf
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span 
              className="text-3xl font-bold"
              style={{ color: themeColors.textPrimary }}
            >
              {formatStockPrice(currentPrice)}
            </span>
            {mainStats && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg ${
                  mainStats.changePercent >= 0 ? 'text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-900/20' : 'text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-900/20'
                }`}>
                  {mainStats.changePercent >= 0 ? '↗' : '↘'}
                  {formatPercentage(mainStats.changePercent)}
                </span>
                <span 
                  className="text-sm"
                  style={{ color: themeColors.textMuted }}
                >
                  ({selectedRange})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Modus + Zeiträume */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <span 
              className="text-sm font-medium"
              style={{ color: themeColors.textMuted }}
            >
              Modus:
            </span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{
                backgroundColor: themeColors.inputBg,
                borderColor: themeColors.inputBorder,
                color: themeColors.inputText
              }}
            >
              {CHART_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.icon} {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Buttons - Responsive */}
          <div 
            className="flex items-center gap-0.5 rounded-lg p-1 flex-wrap"
            style={{ backgroundColor: themeColors.buttonBg }}
          >
            {TIME_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(range.label)}
                className={`px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-md transition-all duration-200 whitespace-nowrap font-medium ${
                  selectedRange === range.label ? 'shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: selectedRange === range.label ? themeColors.buttonBgActive : 'transparent',
                  color: selectedRange === range.label ? themeColors.buttonTextActive : themeColors.buttonText
                }}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Moving Averages Toggle */}
          <div className="flex items-center gap-3 ml-auto">
            {selectedMode === 'price' && (
              <button
                onClick={() => setShowMovingAverages(!showMovingAverages)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium ${
                  showMovingAverages 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: showMovingAverages ? undefined : themeColors.buttonBg,
                  color: showMovingAverages ? undefined : themeColors.buttonText
                }}
                title="Gleitende Durchschnitte (20, 50 Tage)"
              >
                MA
              </button>
            )}
          </div>
        </div>

        {/* Aktien vergleichen */}
        {onAddComparison && (
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <span 
              className="text-sm font-medium"
              style={{ color: themeColors.textMuted }}
            >
              Aktien vergleichen:
            </span>
            
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="z.B. SP500, MSCI World, Apple, Tesla..."
                  className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.inputText
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
                  onFocus={() => newTicker && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={isLoading}
                />
                
                {/* Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
                    style={{
                      backgroundColor: themeColors.suggestionsBg,
                      borderColor: themeColors.suggestionsBorder
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full px-4 py-3 text-left transition-colors border-b last:border-b-0"
                        style={{
                          borderColor: themeColors.suggestionsBorder,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = themeColors.suggestionsHover
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="font-medium text-sm"
                            style={{ color: themeColors.textPrimary }}
                          >
                            {suggestion.symbol}
                          </span>
                          {(suggestion.name.includes('ETF') || suggestion.name.includes('Index') || ['SPY', 'QQQ', 'VTI', 'IWDA', 'EUNL', 'VWRL', 'DIA', 'IVV'].includes(suggestion.symbol)) && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Index/ETF</span>
                          )}
                        </div>
                        <div 
                          className="text-xs truncate"
                          style={{ color: themeColors.textMuted }}
                        >
                          {suggestion.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddStock}
                disabled={!newTicker.trim() || isLoading}
                className="px-5 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium whitespace-nowrap"
              >
                {isLoading ? 'Lädt...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        )}

        {/* Aktive Aktien */}
        {comparisonStocks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span 
              className="text-sm font-medium"
              style={{ color: themeColors.textMuted }}
            >
              Aktive Aktien:
            </span>
            
            <div className="flex items-center gap-2 bg-blue-500/10 rounded-full px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-blue-500 font-medium">{ticker}</span>
            </div>
            
            {comparisonStocks.map((stock) => (
              <div 
                key={stock.ticker} 
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ backgroundColor: themeColors.statsCardBg }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stock.color }} />
                <span 
                  className="text-sm font-medium"
                  style={{ color: themeColors.textPrimary }}
                >
                  {stock.ticker}
                </span>
                <button
                  onClick={() => removeStock(stock.ticker)}
                  className="text-sm ml-1 p-0.5 rounded-full hover:bg-red-500/20 transition-all duration-200"
                  style={{ color: themeColors.textMuted }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CHART */}
      <div className={`${chartHeight} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          {comparisonStocks.length > 0 || selectedMode === 'total_return' ? (
            <LineChart data={chartData} margin={{ top: 15, right: 25, left: 15, bottom: 25 }}>
              <CartesianGrid 
                strokeDasharray="2 4" 
                stroke={themeColors.gridColor} 
                opacity={0.6}
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="date"
                axisLine={true}
                tickLine={true}
                stroke={themeColors.axisColor}
                tick={{ fill: themeColors.axisColor, fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatXAxisTick}
                minTickGap={getMinTickGap()}
                height={50}
              />
              <YAxis 
                axisLine={true}
                tickLine={true}
                stroke={themeColors.axisColor}
                tick={{ fill: themeColors.axisColor, fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatYAxisTick}
                width={70}
              />
              <Tooltip 
                content={renderTooltip} 
                cursor={{ 
                  stroke: themeColors.axisColor, 
                  strokeWidth: 1, 
                  strokeDasharray: '3 3' 
                }}
              />
              
              {/* Performance Labels */}
              {Object.entries(performanceStats).map(([stockTicker, stats]) => {
                const color = stockTicker === ticker ? COLORS[0] : 
                  comparisonStocks.find(s => s.ticker === stockTicker)?.color || themeColors.textPrimary
                
                return (
                  <text
                    key={stockTicker}
                    x="95%"
                    y={`${20 + Object.keys(performanceStats).indexOf(stockTicker) * 25}px`}
                    textAnchor="end"
                    fill={color}
                    fontSize={isFullscreen ? "14" : "12"}
                    fontWeight="bold"
                  >
                    {/* ✅ VERWENDE formatPercentage für Labels */}
                    {formatPercentage(stats.changePercent)}
                  </text>
                )
              })}
              
              {/* Main stock line */}
              <Line
                type="monotone"
                dataKey={ticker}
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: COLORS[0] }}
              />

              {/* Moving Averages */}
              {showMovingAverages && selectedMode === 'price' && (
                <>
                  <Line
                    type="monotone"
                    dataKey={`${ticker}_MA20`}
                    stroke="#fbbf24"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${ticker}_MA50`}
                    stroke="#f97316"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                    connectNulls={false}
                  />
                </>
              )}
              
              {/* Comparison stock lines */}
              {comparisonStocks.map((stock) => (
                <Line
                  key={stock.ticker}
                  type="monotone"
                  dataKey={stock.ticker}
                  stroke={stock.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: stock.color }}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 15, right: 25, left: 15, bottom: 25 }}>
              <defs>
                <linearGradient id="priceGradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="priceGradientRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="priceGradientDefault" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="2 4" 
                stroke={themeColors.gridColor} 
                opacity={0.6}
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="date"
                axisLine={true}
                tickLine={true}
                stroke={themeColors.axisColor}
                tick={{ fill: themeColors.axisColor, fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatXAxisTick}
                minTickGap={getMinTickGap()}
                height={50}
              />
              <YAxis 
                axisLine={true}
                tickLine={true}
                stroke={themeColors.axisColor}
                tick={{ fill: themeColors.axisColor, fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatYAxisTick}
                width={70}
              />
              <Tooltip 
                content={renderTooltip} 
                cursor={{ 
                  stroke: themeColors.axisColor, 
                  strokeWidth: 1, 
                  strokeDasharray: '3 3' 
                }}
              />
              
              <Area
                type="monotone"
                dataKey={ticker}
                stroke={mainStats && mainStats.changePercent >= 0 ? "#10B981" : mainStats && mainStats.changePercent < 0 ? "#EF4444" : COLORS[0]}
                strokeWidth={2}
                fill={
                  mainStats && mainStats.changePercent >= 0 ? "url(#priceGradientGreen)" :
                  mainStats && mainStats.changePercent < 0 ? "url(#priceGradientRed)" :
                  "url(#priceGradientDefault)"
                }
                dot={false}
                activeDot={{ 
                  r: 4, 
                  fill: mainStats && mainStats.changePercent >= 0 ? "#10B981" : mainStats && mainStats.changePercent < 0 ? "#EF4444" : COLORS[0]
                }}
              />

              {/* Moving Averages für Area Chart */}
              {showMovingAverages && selectedMode === 'price' && (
                <>
                  <Line
                    type="monotone"
                    dataKey={`${ticker}_MA20`}
                    stroke="#fbbf24"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${ticker}_MA50`}
                    stroke="#f97316"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                    connectNulls={false}
                  />
                </>
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
        style={{ color: themeColors.textMuted }}
      >
        <span>Modus: {CHART_MODES.find(m => m.id === selectedMode)?.label}</span>
        <span>Powered by <span className="text-green-500 font-semibold">FinClue</span></span>
      </div>

      {/* Moving Averages Legende */}
      {showMovingAverages && selectedMode === 'price' && (
        <div 
          className="flex items-center gap-6 text-sm"
          style={{ color: themeColors.textMuted }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-px bg-yellow-400" style={{ backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 2px, currentColor 2px, currentColor 4px)' }}></div>
            <span>MA20 (20-Tage Durchschnitt)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-px bg-orange-500" style={{ backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 1px, currentColor 1px, currentColor 2px)' }}></div>
            <span>MA50 (50-Tage Durchschnitt)</span>
          </div>
        </div>
      )}

      {/* Performance Summary */}
      {Object.keys(performanceStats).length > 0 && (
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: themeColors.statsBg }}
        >
          <h4 
            className="text-base font-medium mb-3"
            style={{ color: themeColors.textSecondary }}
          >
            Performance-Übersicht ({selectedRange})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(performanceStats).map(([stockTicker, stats]) => {
              const color = stockTicker === ticker ? COLORS[0] : 
                comparisonStocks.find(s => s.ticker === stockTicker)?.color || themeColors.textPrimary
              
              return (
                <div 
                  key={stockTicker} 
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: themeColors.statsCardBg }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span 
                      className="font-medium text-sm"
                      style={{ color: themeColors.textPrimary }}
                    >
                      {stockTicker}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-base ${
                      stats.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {/* ✅ VERWENDE formatPercentage für Performance-Karten */}
                      {formatPercentage(stats.changePercent)}
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: themeColors.textMuted }}
                    >
                      {formatValue(stats.endValue)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}