// src/components/WorkingStockChart.tsx - PROFESSIONAL FINCHAT CLONE
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
  { label: '10Y', days: 3650 },
  { label: 'MAX', days: 'max' as const },
]

const CHART_MODES = [
  { id: 'price', label: 'Preis', icon: '💰' },
  { id: 'total_return', label: 'Performance', icon: '📈' },
  { id: 'market_cap', label: 'Marktkapitalisierung', icon: '🏢' },
  { id: '10k_growth', label: '10.000€ Investment', icon: '💎' },
]

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316']

// ✅ ERWEITERTE AKTIEN LISTE - Mit deutschen Suchbegriffen
const POPULAR_STOCKS = [
  // Große Tech-Aktien
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
  
  // Weitere beliebte Aktien
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.' },
  { symbol: 'ZOOM', name: 'Zoom Video Communications' },
  { symbol: 'SNAP', name: 'Snap Inc.' },
  { symbol: 'SPOT', name: 'Spotify Technology SA' },
  { symbol: 'SQ', name: 'Block Inc.' },
  
  // ✅ INDIZES - Mit deutschen Suchbegriffen
  { symbol: 'SPY', name: 'S&P 500 ETF (USA Index)' },
  { symbol: 'QQQ', name: 'NASDAQ 100 ETF (Tech Index)' },
  { symbol: 'VTI', name: 'Total Stock Market ETF (USA Gesamt)' },
  { symbol: 'IWDA', name: 'MSCI World ETF (Weltindex)' },
  { symbol: 'EUNL', name: 'MSCI World EUR ETF (Weltindex Euro)' },
  { symbol: 'VWRL', name: 'FTSE All-World ETF (Weltindex)' },
  { symbol: 'DIA', name: 'Dow Jones ETF (USA Index)' },
  { symbol: 'IVV', name: 'iShares S&P 500 ETF (USA Index)' },
  
  // ✅ DEUTSCHE SUCHBEGRIFFE
  { symbol: 'SPY', name: 'SP500 - S&P 500 Index' },
  { symbol: 'SPY', name: 'S&P500 - USA Index' },
  { symbol: 'IWDA', name: 'MSCI World - Weltindex' },
  { symbol: 'IWDA', name: 'Weltindex - MSCI World' },
  { symbol: 'QQQ', name: 'NASDAQ - Tech Index' },
  { symbol: 'QQQ', name: 'Nasdaq 100 - Technologie' },
]

export default function WorkingStockChart({ ticker, data, onAddComparison }: Props) {
  const [selectedRange, setSelectedRange] = useState('1Y')
  const [selectedMode, setSelectedMode] = useState('total_return')
  const [comparisonStocks, setComparisonStocks] = useState<Array<{ticker: string, data: StockData[], color: string}>>([])
  const [newTicker, setNewTicker] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{symbol: string, name: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // ✅ FULLSCREEN STATE
  const [isFullscreen, setIsFullscreen] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
  // ✅ Moving Averages
  const [showMovingAverages, setShowMovingAverages] = useState(false)

  // ✅ Moving Averages berechnen
  const calculateMovingAverage = (data: StockData[], period: number) => {
    return data.map((item, index) => {
      if (index < period - 1) return { ...item, ma: null }
      
      const slice = data.slice(index - period + 1, index + 1)
      const average = slice.reduce((sum, d) => sum + d.close, 0) / period
      
      return { ...item, ma: average }
    })
  }

  // Filter data by time range
  const getFilteredData = (stockData: StockData[]) => {
    if (!stockData.length) return []
    
    const now = new Date()
    let cutoffDate: Date
    
    if (selectedRange === 'ytd') {
      cutoffDate = new Date(now.getFullYear(), 0, 1)
    } else if (selectedRange === 'MAX') {
      return stockData.sort((a, b) => a.date.localeCompare(b.date))
    } else {
      const days = TIME_RANGES.find(r => r.label === selectedRange)?.days as number
      cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    }

    return stockData
      .filter(d => new Date(d.date) >= cutoffDate)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // ✅ Chart Data Berechnung ohne Mock-Daten
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
          // TODO: Echte Market Cap aus API laden
          return { 
            date: d.date, 
            value: d.close * 1000000000 // Platzhalter
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

  // ✅ Chart Data mit Moving Averages
  const chartData = useMemo(() => {
    const mainData = calculateChartData(data, selectedMode, ticker)
    if (!mainData.length) return []

    // Create base data structure
    let result = mainData.map(d => ({
      date: d.date,
      [ticker]: d.value,
      formattedDate: new Date(d.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
    }))

    // Add comparison stocks
    comparisonStocks.forEach(stock => {
      const stockData = calculateChartData(stock.data, selectedMode, stock.ticker)
      result.forEach(item => {
        const stockPoint = stockData.find(s => s.date === item.date)
        if (stockPoint) {
          item[stock.ticker] = stockPoint.value
        }
      })
    })

    // Add Moving Averages wenn aktiviert und im Preis-Modus
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

  // ✅ NATIVER FULLSCREEN Toggle
  const toggleFullscreen = async () => {
    if (!chartContainerRef.current) return

    try {
      if (!isFullscreen) {
        if (chartContainerRef.current.requestFullscreen) {
          await chartContainerRef.current.requestFullscreen()
        } else if ((chartContainerRef.current as any).webkitRequestFullscreen) {
          await (chartContainerRef.current as any).webkitRequestFullscreen()
        } else if ((chartContainerRef.current as any).msRequestFullscreen) {
          await (chartContainerRef.current as any).msRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // ✅ Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // ✅ Autocomplete Logic mit deutschen Begriffen
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

  // Calculate performance stats
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
          stats[stockTicker] = { change, changePercent, endValue: lastValue }
        }
      }
    })
    
    return stats
  }, [chartData, ticker, comparisonStocks, selectedMode])

  // Handle suggestion selection
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

  // Format value based on chart mode
  const formatValue = (value: number) => {
    switch (selectedMode) {
      case 'total_return':
        return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
      case 'market_cap':
        if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
        return `$${value.toFixed(2)}`
      case '10k_growth':
        return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      default:
        return `$${value.toFixed(2)}`
    }
  }

  // ✅ SAUBERE Custom Tooltip
  const renderTooltip = (props: any) => {
    const { active, payload } = props
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{data.formattedDate}</p>
          {payload.map((entry: any, index: number) => {
            // Skip Moving Average entries in tooltip
            if (entry.dataKey.includes('_MA')) return null
            
            return (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-white font-medium">
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
    return date.toLocaleDateString('de-DE', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatYAxisTick = (value: number) => {
    switch (selectedMode) {
      case 'total_return':
        return `${value.toFixed(0)}%`
      case 'market_cap':
        if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
        return `$${(value / 1e6).toFixed(0)}M`
      case '10k_growth':
        return `$${(value / 1000).toFixed(0)}K`
      default:
        return `$${value.toFixed(0)}`
    }
  }

  // ✅ Calculated values
  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0
  const mainStats = performanceStats[ticker]
  const chartHeight = isFullscreen ? "h-[calc(100vh-120px)]" : "h-[480px]"

  return (
    <div className="relative space-y-4" ref={chartContainerRef}>
      {/* ✅ SUBTILER FULLSCREEN BUTTON */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 w-9 h-9 bg-gray-800/60 hover:bg-gray-700/80 rounded-md flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
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

      {/* Header with Price */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-white">
            ${currentPrice.toFixed(2)}
          </span>
          {mainStats && (
            <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
              mainStats.changePercent >= 0 ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
            }`}>
              {mainStats.changePercent >= 0 ? '+' : ''}
              {mainStats.changePercent.toFixed(2)}% ({selectedRange})
            </span>
          )}
        </div>
      </div>

      {/* ✅ CONTROLS LAYOUT */}
      <div className="space-y-4 mb-6">
        
        {/* Erste Reihe: Modus + Zeiträume */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Chart Mode */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 font-medium">Modus:</span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-4 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CHART_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.icon} {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Buttons */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 flex-wrap">
            {TIME_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(range.label)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 whitespace-nowrap ${
                  selectedRange === range.label
                    ? 'bg-white text-gray-900 font-medium'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Tools */}
          <div className="flex items-center gap-3 ml-auto">
            {selectedMode === 'price' && (
              <button
                onClick={() => setShowMovingAverages(!showMovingAverages)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium ${
                  showMovingAverages 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
                title="Gleitende Durchschnitte (20, 50 Tage)"
              >
                MA
              </button>
            )}
          </div>
        </div>

        {/* Zweite Reihe: Aktien vergleichen */}
        {onAddComparison && (
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <span className="text-sm text-gray-400 font-medium">Aktien vergleichen:</span>
            
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="z.B. SP500, MSCI World, Apple, Tesla..."
                  className="w-full px-4 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
                  onFocus={() => newTicker && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={isLoading}
                />
                
                {/* ✅ ERWEITERTE Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium text-sm">{suggestion.symbol}</span>
                          {/* ✅ ETF/Index Kennzeichnung */}
                          {(suggestion.name.includes('ETF') || suggestion.name.includes('Index') || ['SPY', 'QQQ', 'VTI', 'IWDA', 'EUNL', 'VWRL', 'DIA', 'IVV'].includes(suggestion.symbol)) && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Index/ETF</span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs truncate">{suggestion.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddStock}
                disabled={!newTicker.trim() || isLoading}
                className="px-5 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium whitespace-nowrap"
              >
                {isLoading ? 'Lädt...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        )}

        {/* Dritte Reihe: Aktive Aktien */}
        {comparisonStocks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-400 font-medium">Aktive Aktien:</span>
            
            <div className="flex items-center gap-2 bg-blue-900/10 rounded-full px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-blue-400 font-medium">{ticker}</span>
            </div>
            
            {comparisonStocks.map((stock) => (
              <div key={stock.ticker} className="flex items-center gap-2 bg-gray-700/20 rounded-full px-4 py-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stock.color }} />
                <span className="text-sm text-white font-medium">{stock.ticker}</span>
                <button
                  onClick={() => removeStock(stock.ticker)}
                  className="text-gray-400 hover:text-red-400 text-sm ml-1 p-0.5 rounded-full hover:bg-red-900/20 transition-all duration-200"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className={`${chartHeight} w-full bg-gray-900/10 rounded-lg p-6 mb-6`}>
        <ResponsiveContainer width="100%" height="100%">
          {comparisonStocks.length > 0 || selectedMode === 'total_return' ? (
            <LineChart data={chartData} margin={{ top: 15, right: 25, left: 15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatXAxisTick}
                minTickGap={isFullscreen ? 80 : 60}
                height={50}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatYAxisTick}
                width={70}
              />
              <Tooltip content={renderTooltip} />
              
              {/* Performance Labels */}
              {Object.entries(performanceStats).map(([stockTicker, stats]) => {
                const color = stockTicker === ticker ? COLORS[0] : 
                  comparisonStocks.find(s => s.ticker === stockTicker)?.color || '#ffffff'
                
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
                    {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
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

              {/* Moving Averages Lines */}
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
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatXAxisTick}
                minTickGap={isFullscreen ? 80 : 60}
                height={50}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: isFullscreen ? 12 : 11 }}
                tickFormatter={formatYAxisTick}
                width={70}
              />
              <Tooltip content={renderTooltip} />
              
              <Area
                type="monotone"
                dataKey={ticker}
                stroke={COLORS[0]}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: COLORS[0] }}
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

      {/* Footer direkt unter Chart */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500 mb-6">
        <span>Modus: {CHART_MODES.find(m => m.id === selectedMode)?.label}</span>
        <span>Powered by <span className="text-green-400 font-semibold">FinClue</span></span>
      </div>

      {/* Moving Averages Legende - SUBTIL */}
      {showMovingAverages && selectedMode === 'price' && (
        <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
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

      {/* Performance Summary - KOMPAKTER */}
      {Object.keys(performanceStats).length > 0 && (
        <div className="bg-gray-800/10 rounded-lg p-4 mb-4">
          <h4 className="text-base font-medium text-gray-300 mb-3">
            Performance-Übersicht ({selectedRange})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(performanceStats).map(([stockTicker, stats]) => {
              const color = stockTicker === ticker ? COLORS[0] : 
                comparisonStocks.find(s => s.ticker === stockTicker)?.color || '#ffffff'
              
              return (
                <div key={stockTicker} className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-white font-medium text-sm">{stockTicker}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-base ${
                      stats.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">
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