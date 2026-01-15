// Stock Comparison - FEY GRAPHS STYLE
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts'
import {
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { stocks as availableStocks } from '@/data/stocks'
import { useCurrency } from '@/lib/CurrencyContext'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import Logo from '@/components/Logo'

// Chart Colors - Fey Style
const CHART_COLORS = [
  '#2962FF', // Blue
  '#FF6B35', // Orange
  '#00C853', // Green
  '#FF9800', // Amber
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#607D8B', // Blue Grey
]

// Zeiträume für tägliche Aktienkurse
const PRICE_PERIODS = [
  { value: '3M', label: '3M', days: 90 },
  { value: '6M', label: '6M', days: 180 },
  { value: '1Y', label: '1Y', days: 365 },
  { value: '3Y', label: '3Y', days: 1095 },
  { value: '5Y', label: '5Y', days: 1825 },
]

// Zeiträume für jährliche Finanzdaten (KGV, Umsatz)
const FINANCIAL_PERIODS = [
  { value: '3Y', label: '3J', years: 3 },
  { value: '5Y', label: '5J', years: 5 },
  { value: '10Y', label: '10J', years: 10 },
]

// Verfügbare Metriken
const METRICS = [
  { value: 'price', label: 'Aktienkurs', unit: 'currency' },
  { value: 'pe', label: 'KGV', unit: 'ratio' },
  { value: 'revenue', label: 'Umsatz', unit: 'large_currency' },
  { value: 'shares', label: 'Aktien im Umlauf', unit: 'large_number' },
]

// Popular stocks for suggestions
const SUGGESTION_STOCKS = [
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'META', name: 'Meta Platforms Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway' },
  { ticker: 'JPM', name: 'JPMorgan Chase' },
  { ticker: 'V', name: 'Visa Inc.' },
]

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface StockData {
  ticker: string
  name: string
  data: { date: string; value: number; change: number }[]
  currentValue: number
  performance: number
  min: number
  max: number
  avg: number
}

export default function StockComparisonPage() {
  const { formatCurrency } = useCurrency()

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [selectedStocks, setSelectedStocks] = useState<StockData[]>([])
  const [pricePeriod, setPricePeriod] = useState('1Y')
  const [financialPeriod, setFinancialPeriod] = useState('5Y')
  const [selectedMetric, setSelectedMetric] = useState('price')
  const [loading, setLoading] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarSearch, setSidebarSearch] = useState('')

  // Formatierung je nach Metrik
  const formatValue = useCallback((value: number) => {
    if (selectedMetric === 'pe') {
      return value.toFixed(1) + 'x'
    }
    if (selectedMetric === 'revenue') {
      if (value >= 1e12) return `${(value / 1e12).toFixed(1)} Bio $`
      if (value >= 1e9) return `${(value / 1e9).toFixed(1)} Mrd $`
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Mio $`
      return formatCurrency(value)
    }
    if (selectedMetric === 'shares') {
      if (value >= 1e12) return `${(value / 1e12).toFixed(2)} Bio`
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)} Mrd`
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Mio`
      if (value >= 1e3) return `${(value / 1e3).toFixed(0)} Tsd`
      return value.toFixed(0)
    }
    return formatCurrency(value)
  }, [selectedMetric, formatCurrency])

  // Aktuelles Metrik-Label
  const currentMetricLabel = METRICS.find(m => m.value === selectedMetric)?.label || 'Aktienkurs'

  // Load User
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys to cycle timeframes
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (selectedMetric === 'price') {
          const currentIndex = PRICE_PERIODS.findIndex(p => p.value === pricePeriod)
          if (e.key === 'ArrowLeft' && currentIndex > 0) {
            setPricePeriod(PRICE_PERIODS[currentIndex - 1].value)
          } else if (e.key === 'ArrowRight' && currentIndex < PRICE_PERIODS.length - 1) {
            setPricePeriod(PRICE_PERIODS[currentIndex + 1].value)
          }
        } else {
          const currentIndex = FINANCIAL_PERIODS.findIndex(p => p.value === financialPeriod)
          if (e.key === 'ArrowLeft' && currentIndex > 0) {
            setFinancialPeriod(FINANCIAL_PERIODS[currentIndex - 1].value)
          } else if (e.key === 'ArrowRight' && currentIndex < FINANCIAL_PERIODS.length - 1) {
            setFinancialPeriod(FINANCIAL_PERIODS[currentIndex + 1].value)
          }
        }
      }
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
      }
      // Escape to close modal
      if (e.key === 'Escape') {
        setShowSearchModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMetric, pricePeriod, financialPeriod])

  // Load stock data based on selected metric
  const loadStockData = useCallback(async (ticker: string): Promise<StockData | null> => {
    try {
      const stockInfo = availableStocks.find(s => s.ticker === ticker)
      const name = stockInfo?.name || ticker

      if (selectedMetric === 'price') {
        // ===== AKTIENKURS - Historical Price API =====
        const response = await fetch(`/api/historical/${ticker}`)
        const data = await response.json()

        if (!data.historical || data.historical.length === 0) return null

        const period = PRICE_PERIODS.find(p => p.value === pricePeriod)
        const daysToShow = period?.days || 365
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysToShow)

        const filteredHistorical = data.historical.filter((d: any) =>
          new Date(d.date) >= cutoffDate
        )

        if (filteredHistorical.length === 0) return null

        // Ältester Wert zuerst (für korrekte Prozent-Berechnung)
        const sortedData = filteredHistorical.slice().reverse()
        const firstValue = sortedData[0].close

        const processedData = sortedData.map((d: any) => ({
          date: d.date,
          value: d.close,
          change: ((d.close - firstValue) / firstValue) * 100
        }))

        const values = processedData.map((d: any) => d.value)
        return {
          ticker,
          name,
          data: processedData,
          currentValue: processedData[processedData.length - 1]?.value || 0,
          performance: processedData[processedData.length - 1]?.change || 0,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a: number, b: number) => a + b, 0) / values.length
        }

      } else {
        // ===== KGV oder UMSATZ - Financial Data API =====
        const period = FINANCIAL_PERIODS.find(p => p.value === financialPeriod)
        const yearsToLoad = period?.years || 5

        const response = await fetch(`/api/financial-data/${ticker}?years=${yearsToLoad}&period=annual`)
        const data = await response.json()

        if (!data.incomeStatements || data.incomeStatements.length === 0) return null

        // Daten sind neueste zuerst - umkehren für chronologische Reihenfolge
        const incomeStatements = [...data.incomeStatements].reverse()
        const keyMetrics = [...(data.keyMetrics || [])].reverse()

        // Alle geladenen Daten nutzen (nicht filtern für jährliche Daten)
        const limitedIncome = incomeStatements
        const limitedMetrics = keyMetrics

        if (limitedIncome.length === 0) return null

        let processedData: { date: string; value: number; change: number }[] = []

        if (selectedMetric === 'revenue') {
          // ===== UMSATZ =====
          const firstRevenue = limitedIncome[0]?.revenue || 0

          processedData = limitedIncome.map((income: any) => {
            const revenue = income.revenue || 0
            return {
              date: income.calendarYear || income.date?.slice(0, 4) || '',
              value: revenue,
              change: firstRevenue !== 0 ? ((revenue - firstRevenue) / firstRevenue) * 100 : 0
            }
          })

        } else if (selectedMetric === 'shares') {
          // ===== AKTIEN IM UMLAUF =====
          const firstShares = limitedIncome[0]?.weightedAverageShsOut || 0

          processedData = limitedIncome.map((income: any) => {
            const shares = income.weightedAverageShsOut || 0
            return {
              date: income.calendarYear || income.date?.slice(0, 4) || '',
              value: shares,
              change: firstShares !== 0 ? ((shares - firstShares) / firstShares) * 100 : 0
            }
          }).filter((d: any) => d.value !== 0)

        } else if (selectedMetric === 'pe') {
          // ===== KGV (P/E Ratio) =====
          const firstPE = limitedMetrics[0]?.peRatio || 0

          processedData = limitedMetrics.map((metric: any, index: number) => {
            const pe = metric.peRatio || 0
            const income = limitedIncome[index]
            return {
              date: income?.calendarYear || metric.date?.slice(0, 4) || '',
              value: pe,
              change: firstPE !== 0 ? ((pe - firstPE) / firstPE) * 100 : 0
            }
          }).filter((d: any) => d.value !== 0) // Filtere Jahre ohne KGV
        }

        if (processedData.length === 0) return null

        const values = processedData.map((d: any) => d.value).filter((v: number) => v !== 0)
        if (values.length === 0) return null

        return {
          ticker,
          name,
          data: processedData,
          currentValue: processedData[processedData.length - 1]?.value || 0,
          performance: processedData[processedData.length - 1]?.change || 0,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a: number, b: number) => a + b, 0) / values.length
        }
      }
    } catch (error) {
      console.error(`Error loading data for ${ticker}:`, error)
      return null
    }
  }, [selectedMetric, pricePeriod, financialPeriod])

  // Add stock
  const addStock = useCallback(async (ticker: string) => {
    if (selectedStocks.find(s => s.ticker === ticker)) return
    if (selectedStocks.length >= (user?.isPremium ? 8 : 4)) return

    setLoading(true)
    const stockData = await loadStockData(ticker)
    if (stockData) {
      setSelectedStocks(prev => [...prev, stockData])
    }
    setLoading(false)
    setShowSearchModal(false)
    setSearchQuery('')
    setSidebarSearch('')
  }, [selectedStocks, user, loadStockData])

  // Remove stock
  const removeStock = useCallback((ticker: string) => {
    setSelectedStocks(prev => prev.filter(s => s.ticker !== ticker))
  }, [])

  // Reload all stocks when period or metric changes
  useEffect(() => {
    if (selectedStocks.length === 0) return

    const reloadStocks = async () => {
      setLoading(true)
      const tickers = selectedStocks.map(s => s.ticker)
      const newData = await Promise.all(tickers.map(loadStockData))
      setSelectedStocks(newData.filter(Boolean) as StockData[])
      setLoading(false)
    }

    reloadStocks()
  }, [selectedMetric, pricePeriod, financialPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chart data - percentage for price, absolute values for KGV/Umsatz
  const chartData = useMemo(() => {
    if (selectedStocks.length === 0) return []

    // Find common dates across all stocks
    const allDates = new Set<string>()
    selectedStocks.forEach(stock => {
      stock.data.forEach(d => allDates.add(d.date))
    })

    return Array.from(allDates).sort().map(date => {
      const point: any = { date }
      selectedStocks.forEach(stock => {
        const dataPoint = stock.data.find(d => d.date === date)
        if (dataPoint) {
          // Für Aktienkurs: Prozent, für KGV/Umsatz: Absolute Werte
          point[stock.ticker] = selectedMetric === 'price'
            ? dataPoint.change
            : dataPoint.value
        }
      })
      return point
    })
  }, [selectedStocks, selectedMetric])

  // Filtered stocks for search
  const filteredStocks = useMemo(() => {
    const query = (searchQuery || sidebarSearch).toLowerCase()
    if (!query) return []
    return availableStocks
      .filter(stock =>
        stock.ticker.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
      )
      .filter(stock => !selectedStocks.find(s => s.ticker === stock.ticker))
      .slice(0, 8)
  }, [searchQuery, sidebarSearch, selectedStocks])

  // Suggestions (exclude already selected)
  const suggestions = useMemo(() => {
    return SUGGESTION_STOCKS.filter(s => !selectedStocks.find(ss => ss.ticker === s.ticker))
  }, [selectedStocks])

  const maxStocks = user?.isPremium ? 8 : 4

  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-primary">
        <div className="w-8 h-8 border-2 border-white/20 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-theme-primary">

      {/* ===== HEADER - Minimal Fey Style ===== */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
        <div>
          <h1 className="text-xl font-semibold text-white">Graphen</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!user?.isPremium && (
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-green-400 text-black text-sm font-medium rounded-lg transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              Pro
            </Link>
          )}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT - Split Layout ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR - Graph Selection */}
        <div className="w-[320px] border-r border-white/[0.04] flex flex-col bg-[#0a0a0b]">

          {/* Section: Graph Selection */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-white mb-3">Graph-Auswahl</h3>

            {/* Metrik-Auswahl */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2 font-medium">Metrik</div>
              <div className="flex gap-1">
                {METRICS.map((metric) => (
                  <button
                    key={metric.value}
                    onClick={() => setSelectedMetric(metric.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      selectedMetric === metric.value
                        ? 'bg-brand text-black'
                        : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Stock Input */}
            <div className="relative mb-3">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:border-white/[0.1] transition-colors">
                <PlusIcon className="w-4 h-4 text-gray-500" />
                <input
                  placeholder="Graphen vergleichen"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
                />
                <button
                  onClick={() => {
                    // Reload all data
                    if (selectedStocks.length > 0) {
                      const reloadStocks = async () => {
                        setLoading(true)
                        const tickers = selectedStocks.map(s => s.ticker)
                        const newData = await Promise.all(tickers.map(loadStockData))
                        setSelectedStocks(newData.filter(Boolean) as StockData[])
                        setLoading(false)
                      }
                      reloadStocks()
                    }
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <ArrowPathIcon className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Search Dropdown */}
              {sidebarSearch && filteredStocks.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1d] border border-white/[0.1] rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {filteredStocks.map(stock => (
                    <button
                      key={stock.ticker}
                      onClick={() => addStock(stock.ticker)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Logo ticker={stock.ticker} alt={stock.ticker} className="w-6 h-6 rounded" padding="none" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">{stock.ticker}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">{stock.name}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
                        {currentMetricLabel}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Stocks List */}
            <div className="space-y-1">
              {selectedStocks.map((stock, index) => (
                <div
                  key={stock.ticker}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <div>
                      <span className="text-sm font-medium text-white">{stock.ticker}</span>
                      <span className="text-sm text-gray-500 ml-2">{currentMetricLabel}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeStock(stock.ticker)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>

            {selectedStocks.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                Füge Aktien hinzu um sie zu vergleichen
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mx-4" />

          {/* Section: Comparison Suggestions */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Vergleichsvorschläge</h3>

            <div className="space-y-1">
              {suggestions.slice(0, 6).map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => addStock(stock.ticker)}
                  disabled={selectedStocks.length >= maxStocks}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-1 h-6 rounded-full bg-gray-700" />
                  <div>
                    <span className="text-sm text-gray-400">{stock.ticker}</span>
                    <span className="text-sm text-gray-600 ml-2">{currentMetricLabel}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Limit Info */}
            {!user?.isPremium && (
              <div className="mt-4 p-3 bg-brand/5 border border-brand/20 rounded-lg">
                <p className="text-xs text-gray-400">
                  {selectedStocks.length}/{maxStocks} Aktien •
                  <Link href="/pricing" className="text-brand ml-1 hover:underline">
                    Upgrade für mehr
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Chart Area */}
        <div className="flex-1 flex flex-col bg-theme-primary">

          {/* Chart Container */}
          <div className="flex-1 p-6">
            {selectedStocks.length === 0 ? (
              /* Empty State */
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/[0.03] rounded-2xl flex items-center justify-center">
                    <MagnifyingGlassIcon className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Wähle Aktien zum Vergleichen</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-sm">
                    Nutze die Sidebar links oder drücke <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-400 text-xs">⌘K</kbd> um Aktien hinzuzufügen
                  </p>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="px-4 py-2 bg-brand hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
                  >
                    Aktie hinzufügen
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full relative">

                {/* Time Period Selector - Dynamisch je nach Metrik */}
                <div className="absolute top-0 right-0 z-10 flex items-center gap-1 bg-white/[0.03] rounded-lg p-1">
                  {selectedMetric === 'price' ? (
                    // Aktienkurs: Tägliche Zeiträume
                    PRICE_PERIODS.map((period) => (
                      <button
                        key={period.value}
                        onClick={() => setPricePeriod(period.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          pricePeriod === period.value
                            ? 'bg-white/10 text-white'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))
                  ) : (
                    // KGV/Umsatz: Jährliche Zeiträume
                    FINANCIAL_PERIODS.map((period) => (
                      <button
                        key={period.value}
                        onClick={() => setFinancialPeriod(period.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          financialPeriod === period.value
                            ? 'bg-white/10 text-white'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))
                  )}
                  <button className="p-1.5 text-gray-500 hover:text-white transition-colors">
                    <Cog6ToothIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-theme-primary/80 flex items-center justify-center z-20">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-brand rounded-full animate-spin" />
                  </div>
                )}

                {/* Chart */}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 40, right: 80, left: 20, bottom: 20 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.03)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.1)"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => {
                        // Für Jahreszahlen (KGV/Umsatz) nur das Jahr zeigen
                        if (selectedMetric !== 'price') {
                          return value
                        }
                        const date = new Date(value)
                        return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                      }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.1)"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                      tickFormatter={(value) => {
                        if (selectedMetric === 'price') {
                          return `${value > 0 ? '+' : ''}${value.toFixed(0)}%`
                        }
                        if (selectedMetric === 'pe') {
                          return `${value.toFixed(0)}x`
                        }
                        if (selectedMetric === 'revenue') {
                          if (value >= 1e12) return `${(value / 1e12).toFixed(0)} Bio`
                          if (value >= 1e9) return `${(value / 1e9).toFixed(0)} Mrd`
                          if (value >= 1e6) return `${(value / 1e6).toFixed(0)} Mio`
                          return value.toFixed(0)
                        }
                        if (selectedMetric === 'shares') {
                          if (value >= 1e12) return `${(value / 1e12).toFixed(1)} Bio`
                          if (value >= 1e9) return `${(value / 1e9).toFixed(1)} Mrd`
                          if (value >= 1e6) return `${(value / 1e6).toFixed(0)} Mio`
                          return value.toFixed(0)
                        }
                        return value.toFixed(0)
                      }}
                      domain={['auto', 'auto']}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1d',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      labelStyle={{ color: '#9ca3af', marginBottom: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (selectedMetric === 'price') {
                          return [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, name]
                        }
                        if (selectedMetric === 'pe') {
                          return [`${value.toFixed(1)}x`, name]
                        }
                        if (selectedMetric === 'revenue') {
                          if (value >= 1e12) return [`${(value / 1e12).toFixed(2)} Bio $`, name]
                          if (value >= 1e9) return [`${(value / 1e9).toFixed(2)} Mrd $`, name]
                          if (value >= 1e6) return [`${(value / 1e6).toFixed(2)} Mio $`, name]
                          return [`${value.toFixed(0)} $`, name]
                        }
                        if (selectedMetric === 'shares') {
                          if (value >= 1e12) return [`${(value / 1e12).toFixed(2)} Bio Aktien`, name]
                          if (value >= 1e9) return [`${(value / 1e9).toFixed(2)} Mrd Aktien`, name]
                          if (value >= 1e6) return [`${(value / 1e6).toFixed(2)} Mio Aktien`, name]
                          return [`${value.toFixed(0)} Aktien`, name]
                        }
                        return [value.toFixed(2), name]
                      }}
                      labelFormatter={(label) => {
                        // Für Jahreszahlen kein Datum formatieren
                        if (selectedMetric !== 'price') {
                          return `Jahr: ${label}`
                        }
                        return new Date(label).toLocaleDateString('de-DE', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      }}
                    />

                    {selectedStocks.map((stock, index) => (
                      <Line
                        key={stock.ticker}
                        type="monotone"
                        dataKey={stock.ticker}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {/* Performance Labels (am rechten Rand des Charts) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-2">
                  {selectedStocks.map((stock, index) => (
                    <div
                      key={stock.ticker}
                      className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
                    >
                      <span style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                        {stock.ticker}{' '}
                        {selectedMetric === 'price'
                          ? `${stock.performance > 0 ? '+' : ''}${stock.performance.toFixed(1)}%`
                          : selectedMetric === 'pe'
                            ? `${stock.currentValue.toFixed(1)}x`
                            : formatValue(stock.currentValue)
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== FOOTER - Graph Series ===== */}
      {selectedStocks.length > 0 && (
        <div className="border-t border-white/[0.04] bg-[#0a0a0b]">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">Graph-Serien</h3>
              <div className="text-xs text-gray-600">
                Drücke <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-400">←</kbd>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-400 ml-1">→</kbd>
                <span className="ml-1">für Zeiträume</span>
              </div>
            </div>

            {/* Series Table */}
            <div className="space-y-1">
              {selectedStocks.map((stock, index) => (
                <div
                  key={stock.ticker}
                  className="flex items-center py-2.5 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors"
                >
                  {/* Stock Info */}
                  <div className="flex items-center gap-3 w-56">
                    <div
                      className="w-0.5 h-6 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <Logo ticker={stock.ticker} alt={stock.ticker} className="w-6 h-6 rounded" padding="none" />
                    <div>
                      <span className="text-sm font-medium text-white">{stock.ticker}</span>
                      <span className="text-sm text-gray-500 ml-2 truncate max-w-[120px] inline-block align-bottom">
                        {stock.name.length > 15 ? stock.name.slice(0, 15) + '...' : stock.name}
                      </span>
                    </div>
                  </div>

                  {/* Metric Badge */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] rounded-lg mr-6">
                    <div className="w-3 h-0.5 bg-gray-500 rounded" />
                    <span className="text-xs text-gray-400">{currentMetricLabel}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-8 text-xs flex-1">
                    <div>
                      <span className="text-gray-500">Minimum</span>
                      <span className="text-red-400 ml-2 font-medium">{formatValue(stock.min)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Durchschnitt</span>
                      <span className="text-gray-300 ml-2 font-medium">{formatValue(stock.avg)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Maximum</span>
                      <span className="text-green-400 ml-2 font-medium">{formatValue(stock.max)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Aktuell</span>
                      <span className="text-white ml-2 font-medium">{formatValue(stock.currentValue)}</span>
                    </div>
                    {selectedMetric === 'price' && (
                      <div>
                        <span className="text-gray-500">{pricePeriod} Veränderung</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                          stock.performance > 0
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {stock.performance > 0 ? '+' : ''}{stock.performance.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeStock(stock.ticker)}
                    className="p-1 text-gray-600 hover:text-gray-400 transition-colors ml-2"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== SEARCH MODAL - Fey Style ===== */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="bg-[#141416] border border-white/[0.08] rounded-2xl w-[480px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input - Clean */}
            <div className="p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <input
                  placeholder="Aktie suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-white placeholder-gray-500 outline-none flex-1 text-base"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-3">
                Bis zu {maxStocks} Aktien vergleichen
              </div>
            </div>

            {/* Search Results - Clean List */}
            <div className="max-h-[360px] overflow-y-auto">
              {searchQuery ? (
                filteredStocks.length > 0 ? (
                  <div className="p-2">
                    {filteredStocks.map((stock) => (
                      <button
                        key={stock.ticker}
                        onClick={() => addStock(stock.ticker)}
                        disabled={selectedStocks.length >= maxStocks}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
                      >
                        <Logo ticker={stock.ticker} alt={stock.ticker} className="w-9 h-9 rounded-lg" padding="none" />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white">{stock.ticker}</div>
                          <div className="text-xs text-gray-500 truncate">{stock.name}</div>
                        </div>
                        <PlusIcon className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    Keine Ergebnisse für "{searchQuery}"
                  </div>
                )
              ) : (
                /* Vorschläge wenn keine Suche */
                <div className="p-2">
                  <div className="px-3 py-2 text-xs text-gray-600 font-medium">Vorschläge</div>
                  {SUGGESTION_STOCKS
                    .filter(s => !selectedStocks.find(ss => ss.ticker === s.ticker))
                    .slice(0, 6)
                    .map((stock) => (
                      <button
                        key={stock.ticker}
                        onClick={() => addStock(stock.ticker)}
                        disabled={selectedStocks.length >= maxStocks}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
                      >
                        <Logo ticker={stock.ticker} alt={stock.ticker} className="w-9 h-9 rounded-lg" padding="none" />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white">{stock.ticker}</div>
                          <div className="text-xs text-gray-500">{stock.name}</div>
                        </div>
                        <PlusIcon className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Footer mit Keyboard Hint */}
            <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Drücke <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded text-gray-500 font-mono">ESC</kbd> zum Schließen</span>
                <span>{selectedStocks.length}/{maxStocks} ausgewählt</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
