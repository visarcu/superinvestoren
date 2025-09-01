// Dashboard-Component - COMPLETE VERSION WITH FIXES
'use client'

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowTrendingUpIcon, 
  MagnifyingGlassIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  ArrowRightIcon,
  BookmarkIcon,
  MapIcon,
  CalendarIcon,
  SparklesIcon,
  UserGroupIcon,
  TrophyIcon,
  StarIcon,
  ChartBarIcon,
  EyeIcon,
  FireIcon,
  SignalIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'
import { supabase } from '@/lib/supabaseClient'
// ECHTE IMPORTS - keine Mock-Daten!
import { stocks } from '@/data/stocks'
// LAZY LOAD HOLDINGS HISTORY
import dynamic from 'next/dynamic'
import Logo from '@/components/Logo'
import OptimizedWatchlistNews from '@/components/OptimizedWatchlistNews'
import MarketMovers from '@/components/MarketMovers'
import MostFollowed from '@/components/MostFollowed'
import LatestGuruTrades from '@/components/LatestGuruTrades'


// ===== TYPES =====
type Quote = {
  price: number
  changePct: number
  perf1M?: number | null
  perfYTD?: number | null
  source?: string
  quality?: 'HIGH' | 'MEDIUM' | 'LOW'
}

type MarketQuote = {
  price: number
  changePct: number
  change: number
  positive: boolean
  volume: string
  perf1M?: number | null
  perfYTD?: number | null
}

// ===== CACHED HELPER FUNCTIONS =====
const tickerCache = new Map<string, string | null>()
const stockNameCache = new Map<string, string>()

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  
  const cacheKey = position.cusip
  if (tickerCache.has(cacheKey)) {
    return tickerCache.get(cacheKey)!
  }
  
  const stock = stocks.find(s => s.cusip === position.cusip)
  const ticker = stock?.ticker || null
  tickerCache.set(cacheKey, ticker)
  return ticker
}

function getStockName(position: any): string {
  const cacheKey = `${position.cusip}-${position.name}`
  if (stockNameCache.has(cacheKey)) {
    return stockNameCache.get(cacheKey)!
  }
  
  let name: string
  if (position.name && position.ticker) {
    name = position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  } else {
    const stock = stocks.find(s => s.cusip === position.cusip)
    name = stock?.name || position.name || position.cusip
  }
  
  stockNameCache.set(cacheKey, name)
  return name
}

function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

// ===== MEMOIZED SEARCH COMPONENT =====
const SmartSearchInput = React.memo(({ 
  placeholder, 
  onSelect 
}: { 
  placeholder: string
  onSelect: (ticker: string) => void
}) => {
  const [query, setQuery] = useState('')
  const [filteredStocks, setFilteredStocks] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const popularStocks = useMemo(() => {
    const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA']
    return stocks.filter(stock => popularTickers.includes(stock.ticker))
  }, [])

  useEffect(() => {
    if (query.trim()) {
      const queryLower = query.toLowerCase()
      const filtered = stocks.filter(stock => 
        stock.ticker.toLowerCase().includes(queryLower) ||
        stock.name.toLowerCase().includes(queryLower)
      ).slice(0, 8)
      setFilteredStocks(filtered)
    } else {
      setFilteredStocks(popularStocks)
    }
    setSelectedIndex(-1)
  }, [query, popularStocks])

  const handleSelect = useCallback((ticker: string) => {
    onSelect(ticker)
    setQuery('')
    setShowResults(false)
    setSelectedIndex(-1)
  }, [onSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredStocks.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredStocks.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredStocks[selectedIndex]) {
          handleSelect(filteredStocks[selectedIndex].ticker)
        } else if (query.trim()) {
          handleSelect(query.trim().toUpperCase())
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }, [showResults, selectedIndex, filteredStocks, handleSelect, query])

  const handleInputFocus = useCallback(() => {
    setShowResults(true)
  }, [])

  const handleInputBlur = useCallback((e: React.FocusEvent) => {
    setTimeout(() => {
      if (!resultsRef.current?.contains(document.activeElement)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }, 150)
  }, [])

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className={`
        search-input-container
        relative transition-all duration-300 rounded-2xl
        ${showResults 
          ? 'bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-black/20 dark:border-white/20 shadow-2xl' 
          : 'bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-black/20 dark:hover:border-white/20'
        }
      `}>
        <div className="flex items-center px-6 py-5">
          <MagnifyingGlassIcon className="w-6 h-6 mr-4 text-gray-600 dark:text-gray-400" />
          
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg font-medium focus:outline-none border-none focus:ring-0"
            style={{ border: 'none', boxShadow: 'none' }}
          />
          
          <div className="hidden md:flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm ml-4">
            <div className="flex items-center gap-1">
              <kbd className="px-2.5 py-1.5 bg-black/10 dark:bg-white/10 backdrop-blur border border-black/10 dark:border-white/10 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">⌘</kbd>
              <kbd className="px-2.5 py-1.5 bg-black/10 dark:bg-white/10 backdrop-blur border border-black/10 dark:border-white/10 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">K</kbd>
            </div>
          </div>

          {query && (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="ml-4 p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 rounded-xl"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto"
        >
          {filteredStocks.length > 0 ? (
            <div className="p-2">
              {query && (
                <div className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide border-b border-black/10 dark:border-white/10 mb-2">
                  {filteredStocks.length} Ergebnis{filteredStocks.length !== 1 ? 'se' : ''} für "{query}"
                </div>
              )}
              <div className="space-y-1">
                {filteredStocks.map((stock, index) => (
                  <button
                    key={stock.ticker}
                    onClick={() => handleSelect(stock.ticker)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 text-left group ${
                      index === selectedIndex 
                        ? 'bg-green-500 text-white' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      index === selectedIndex 
                        ? 'bg-white/20' 
                        : 'bg-green-500/10'
                    }`}>
                      <span className={`text-sm font-bold ${
                        index === selectedIndex 
                          ? 'text-white' 
                          : 'text-green-500'
                      }`}>
                        {stock.ticker.slice(0, 2)}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-sm ${
                          index === selectedIndex ? 'text-white' : 'text-black dark:text-white'
                        }`}>{stock.ticker}</span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          index === selectedIndex 
                            ? 'bg-white/20 text-white/80' 
                            : 'bg-black/10 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                        }`}>
                          {stock.market || 'NASDAQ'}
                        </span>
                      </div>
                      <div className={`text-xs truncate ${
                        index === selectedIndex ? 'text-white/80' : 'text-gray-500 dark:text-gray-500'
                      }`}>
                        {stock.name}
                      </div>
                    </div>
                    
                    <svg 
                      className={`w-4 h-4 transition-all duration-200 flex-shrink-0 ${
                        index === selectedIndex 
                          ? 'text-white translate-x-1' 
                          : 'text-gray-400 dark:text-gray-600 group-hover:text-green-500 group-hover:translate-x-0.5'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-500">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Keine Ergebnisse für "{query}"</p>
            </div>
          )}
          
          <div className="p-4 bg-black/5 dark:bg-white/5 backdrop-blur border-t border-black/10 dark:border-white/10">
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white/60 dark:bg-black/60 backdrop-blur border border-black/10 dark:border-white/10 rounded-lg text-xs text-gray-600 dark:text-gray-400">↑↓</kbd>
                <span>Navigieren</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white/60 dark:bg-black/60 backdrop-blur border border-black/10 dark:border-white/10 rounded-lg text-xs text-gray-600 dark:text-gray-400">↵</kbd>
                <span>Auswählen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white/60 dark:bg-black/60 backdrop-blur border border-black/10 dark:border-white/10 rounded-lg text-xs text-gray-600 dark:text-gray-400">Esc</kbd>
                <span>Schließen</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})


// ===== MARKET STATUS HELPER =====
const getMarketStatus = (() => {
  let cache: { [key: string]: { timestamp: number; data: any } } = {}
  
  return (timezone: string, openHour: number, closeHour: number) => {
    const cacheKey = `${timezone}-${openHour}-${closeHour}`
    const now = Date.now()
    
    if (cache[cacheKey] && now - cache[cacheKey].timestamp < 30000) {
      return cache[cacheKey].data
    }
    
    const marketTime = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }))
    const day = marketTime.getDay()
    const hour = marketTime.getHours()
    const minute = marketTime.getMinutes()
    const currentMinutes = hour * 60 + minute
    
    let result
    if (day === 0 || day === 6) {
      result = { status: 'CLOSED', reason: 'Weekend' }
    } else {
      const marketOpenMinutes = openHour * 60
      const marketCloseMinutes = closeHour * 60
      
      if (currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes) {
        result = { status: 'OPEN', reason: '' }
      } else {
        result = { status: 'CLOSED', reason: 'After Hours' }
      }
    }
    
    cache[cacheKey] = { timestamp: now, data: result }
    return result
  }
})()

// ===== MAIN DASHBOARD COMPONENT =====
export default function ModernDashboard() {
  const router = useRouter()
  const [lastTicker, setLastTicker] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [marketQuotes, setMarketQuotes] = useState<Record<string, MarketQuote>>({})
  const [loading, setLoading] = useState(false)
  const [marketLoading, setMarketLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([])
  const { formatStockPrice, formatPercentage } = useCurrency()

  const POPULAR_STOCKS = useMemo(() => [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ], [])

  // Load Watchlist
  useEffect(() => {
    async function loadWatchlist() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data } = await supabase
            .from('watchlists')
            .select('ticker')
            .eq('user_id', session.user.id)
          
          if (data) {
            setWatchlistTickers(data.map(item => item.ticker))
          }
        }
      } catch (error) {
        console.error('Error loading watchlist:', error)
      }
    }
    loadWatchlist()
  }, [])

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Last Ticker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastTicker')
      if (stored) setLastTicker(stored.toUpperCase())
    }
  }, [])

  // Load ALL dashboard data in one unified API call
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      setMarketLoading(true)
      
      try {
        const allTickers = [...POPULAR_STOCKS, ...watchlistTickers]
        const uniqueTickers = [...new Set(allTickers)]
        const tickers = uniqueTickers.join(',')
        
        // Single API call for everything
        const response = await fetch(`/api/dashboard?tickers=${tickers}`)
        
        if (!response.ok) {
          throw new Error(`Dashboard API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Set all data at once
        if (data.quotes) {
          setQuotes(data.quotes)
          console.log('✅ Stock quotes loaded:', Object.keys(data.quotes).length)
        }
        
        if (data.markets) {
          setMarketQuotes(data.markets)
          console.log('✅ Market data loaded:', Object.keys(data.markets).length)
        }
        
        
      } catch (error: any) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
        setMarketLoading(false)
      }
    }
    
    loadDashboardData()
  }, [POPULAR_STOCKS, watchlistTickers])

  const handleTickerSelect = useCallback((ticker: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastTicker', ticker.toUpperCase())
    }
    router.push(`/analyse/stocks/${ticker.toLowerCase()}`)
  }, [router])

  const marketData = useMemo(() => [
    { 
      name: 'S&P 500', 
      flag: '🇺🇸',
      key: 'spx',
      ...getMarketStatus("America/New_York", 9.5, 16)
    },
    { 
      name: 'NASDAQ', 
      flag: '🇺🇸',
      key: 'ixic',
      ...getMarketStatus("America/New_York", 9.5, 16)
    },
    { 
      name: 'DAX', 
      flag: '🇩🇪',
      key: 'dax',
      ...getMarketStatus("Europe/Berlin", 9, 17.5)
    },
    { 
      name: 'Dow Jones', 
      flag: '🇺🇸',
      key: 'dji',
      ...getMarketStatus("America/New_York", 9.5, 16)
    }
  ], [currentTime])

  return (
    <div className="min-h-screen bg-theme-primary">
      
      {/* Professional Header */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-8">
          
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Analyse
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-theme-primary mb-2">
                Dashboard
              </h1>
              <div className="flex items-center gap-4 text-theme-secondary">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${marketLoading ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span className="text-sm">Live-Kurse</span>
                </div>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm">Deutschland: {currentTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })}</span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm">USA: {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} EST</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/analyse/ai"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="font-medium">FinClue AI</span>
              </Link>
              <Link
                href="/analyse/watchlist"
                className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme/20 hover:bg-theme-hover text-theme-primary rounded-lg transition-colors duration-200"
              >
                <EyeIcon className="w-4 h-4" />
                <span className="font-medium">Watchlist</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Market Overview */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Marktübersicht</h2>
              <p className="text-theme-secondary text-sm">
                Live-Kurse und Performance-Metriken der wichtigsten Indizes
              </p>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              marketLoading 
                ? 'bg-green-500/20 text-amber-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                marketLoading ? 'bg-amber-400 animate-pulse' : 'bg-green-400'
              }`}></div>
              <span className="text-sm font-bold">
                {marketLoading ? 'Lädt...' : 'Live'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {marketData.map((market) => {
              const quote = marketQuotes[market.key]
              const isLoading = marketLoading && !quote

              return (
                <div key={market.name} className="bg-theme-card border border-theme/10 rounded-xl p-6 hover:border-theme/20 transition-all duration-200">
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{market.flag}</span>
                      <h3 className="text-theme-primary font-bold text-lg">{market.name}</h3>
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full font-bold ${
                      market.status === 'OPEN' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-theme-secondary text-theme-muted'
                    }`}>
                      {market.status === 'OPEN' ? 'Offen' : 'Geschlossen'}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="h-8 bg-theme-secondary rounded-lg animate-pulse"></div>
                    ) : quote ? (
                      <div className="text-2xl font-bold text-theme-primary">
                        {formatStockPrice(quote.price, false)}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-theme-muted">--</div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      {isLoading ? (
                        <div className="h-6 bg-theme-secondary rounded-lg w-20 animate-pulse"></div>
                      ) : quote ? (
                        <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-lg ${
                          quote.positive 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {quote.positive ? (
                            <ArrowTrendingUpIcon className="w-4 h-4" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-4 h-4" />
                          )}
                          <span>{formatPercentage(quote.changePct)}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-theme-muted">--</div>
                      )}
                      
                      <div className="text-xs text-theme-muted">
                        Vol: {quote?.volume || '--'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Search Section - Minimalist */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-theme-primary">Aktie analysieren</h2>
              <p className="text-theme-secondary">Suche und analysiere jede Aktie weltweit</p>
            </div>
            
            <SmartSearchInput
              placeholder="Ticker oder Unternehmen suchen..."
              onSelect={handleTickerSelect}
            />
          </div>
        </section>

        {/* Professional Grid Layout - Quartr/Koyfin inspired */}
        <div className="space-y-16">
          
          {/* Section: Popular Stocks */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-theme-primary">Beliebte Aktien</h2>
                <p className="text-sm text-theme-muted">Live-Kurse der meistgehandelten Aktien</p>
              </div>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs">
                  <div className="w-2 h-2 border border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Lädt...</span>
                </div>
              )}
            </div>
            
            {/* 4x2 Grid - Consistent Heights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {POPULAR_STOCKS.slice(0, 8).map((ticker) => {
              const quote = quotes[ticker.toLowerCase()]
              const isLoading = loading && !quote
              return (
                <button
                  key={ticker}
                  onClick={() => handleTickerSelect(ticker)}
                  className="group bg-theme-card border border-theme/10 rounded-xl p-5 hover:border-green-500/30 transition-all duration-200 h-[140px] flex flex-col justify-between"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <Logo 
                      ticker={ticker} 
                      alt={`${ticker} Logo`}
                      className="w-8 h-8 rounded-lg"
                      padding="small"
                    />
                    {quote && (
                      <div className={`w-2 h-2 rounded-full ${
                        quote.changePct >= 0 ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                    )}
                  </div>

                  {/* Ticker */}
                  <div className="text-left mb-2">
                    <h3 className="text-sm font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                      {ticker}
                    </h3>
                  </div>

                  {/* Data */}
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-theme-secondary rounded animate-pulse"></div>
                      <div className="h-3 bg-theme-secondary rounded w-2/3 animate-pulse"></div>
                    </div>
                  ) : quote ? (
                    <div className="text-left space-y-1">
                      <div className="text-lg font-bold text-theme-primary">
                        {formatStockPrice(quote.price)}
                      </div>
                      <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                        quote.changePct >= 0
                          ? 'text-green-400 bg-green-500/20'
                          : 'text-red-400 bg-red-500/20'
                      }`}>
                        {quote.changePct >= 0 ? (
                          <ArrowTrendingUpIcon className="w-3 h-3" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-3 h-3" />
                        )}
                        <span>{formatPercentage(Math.abs(quote.changePct), false)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-theme-muted text-xs">Daten nicht verfügbar</div>
                  )}
                </button>
              )
            })}
          </div>
          </section>

          {/* Section: Dashboard Components */}
          <section>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-theme-primary mb-2">Dashboard</h2>
              <p className="text-sm text-theme-muted">Nachrichten, Trends und Marktbewegungen</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recently Analyzed + Quick Actions */}
            <div className="space-y-6">
              {/* Recently Analyzed */}
              {lastTicker && (
                <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[200px] flex flex-col">
                  <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-4">Zuletzt analysiert</h2>
                  
                  <button
                    onClick={() => handleTickerSelect(lastTicker)}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-theme-secondary transition-all duration-200 flex-1"
                  >
                    <Logo 
                      ticker={lastTicker} 
                      alt={`${lastTicker} Logo`}
                      className="w-10 h-10 rounded-lg"
                      padding="small"
                    />
                    
                    <div className="flex-1 text-left">
                      <h3 className="text-base font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                        {lastTicker}
                      </h3>
                      <p className="text-sm text-theme-muted">
                        Zur Analyse
                      </p>
                    </div>
                    
                    <ArrowRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-400 transition-colors" />
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[200px] flex flex-col">
                <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-4">Schnellzugriff</h2>
                
                <div className="space-y-2 flex-1">
                  {[
                    { icon: BookmarkIcon, label: 'Watchlist', href: '/analyse/watchlist' },
                    { icon: MapIcon, label: 'Heatmap', href: '/analyse/heatmap' },
                    { icon: CalendarIcon, label: 'Earnings', href: '/analyse/earnings' },
                    { icon: SparklesIcon, label: 'FinClue AI', href: '/analyse/ai' }
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-theme-secondary transition-all duration-200"
                    >
                      <item.icon className="w-4 h-4 text-theme-muted group-hover:text-green-400 transition-colors" />
                      <span className="text-sm text-theme-primary group-hover:text-green-400 transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Watchlist News */}
            <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[416px] flex flex-col">
              <OptimizedWatchlistNews watchlistTickers={watchlistTickers} />
            </div>

            {/* Right Column - Market Movers + Most Followed */}
            <div className="space-y-6">
              {/* Market Movers */}
              <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[200px] flex flex-col">
                <MarketMovers 
                  watchlistTickers={watchlistTickers}
                  popularTickers={POPULAR_STOCKS}
                />
              </div>

              {/* Most Followed */}
              <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[200px] flex flex-col">
                <MostFollowed 
                  onSelect={handleTickerSelect}
                  quotes={quotes}
                />
              </div>
            </div>
          </div>
          </section>

          {/* Section: Guru Trades */}
          <section>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-theme-primary mb-2">Super-Investor Trades</h2>
              <p className="text-sm text-theme-muted">Neueste Käufe und Verkäufe der erfolgreichsten Investoren</p>
            </div>
            
            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <LatestGuruTrades variant="full" />
            </div>
          </section>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-theme-muted flex items-center justify-center gap-2">
              <ClockIcon className="w-4 h-4" />
              YTD basiert auf letztem Handelstag 2024 • 
              1M basiert auf ~30 Kalendertagen • 
              Alle Daten via FMP API • Live-Updates alle 15 Minuten
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}