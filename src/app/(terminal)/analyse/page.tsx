'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  SparklesIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  ArrowRightIcon,
  BookmarkIcon,
  MapIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { stocks } from '@/data/stocks' // Import the complete stocks database

// ===== TYPES =====
type Quote = {
  price: number
  changePct: number
  perf1M?: number | null
  perfYTD?: number | null
  source?: string
  quality?: 'HIGH' | 'MEDIUM' | 'LOW'
}

// ===== SMART LOGO COMPONENT =====
function StockLogo({ ticker, className = "w-8 h-8" }: { ticker: string; className?: string }) {
  const [logoError, setLogoError] = useState(false)
  
  const HAS_LOGO = new Set([
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 
    'ADBE', 'CRM', 'ORCL', 'INTC', 'SAP', 'ASML'
  ])
  
  const logoUrl = `/logos/${ticker.toLowerCase()}.png`
  const shouldUseLogo = HAS_LOGO.has(ticker.toUpperCase()) && !logoError
  
  if (shouldUseLogo) {
    return (
      <div className={`${className} bg-white rounded-lg overflow-hidden flex items-center justify-center`}>
        <Image
          src={logoUrl}
          alt={`${ticker} Logo`}
          width={32}
          height={32}
          className="object-contain p-1"
          onError={() => setLogoError(true)}
        />
      </div>
    )
  }
  
  return (
    <div className={`${className} bg-theme-tertiary rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors`}>
      <span className="text-theme-primary font-bold text-sm">{ticker[0]}</span>
    </div>
  )
}

// ===== FIXED TERMINAL SEARCH COMPONENT =====
function TerminalSearchInput({ 
  placeholder, 
  onSelect 
}: { 
  placeholder: string
  onSelect: (ticker: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filteredStocks, setFilteredStocks] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Use the same filtering logic as the navbar
  useEffect(() => {
    if (query) {
      const filtered = stocks.filter(stock => 
        stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12) // Show up to 12 results
      setFilteredStocks(filtered)
    } else {
      // Show popular stocks when no query
      const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
      const popularStocks = stocks.filter(stock => 
        popularTickers.includes(stock.ticker)
      )
      setFilteredStocks(popularStocks)
    }
  }, [query])

  const handleSelect = (ticker: string) => {
    onSelect(ticker)
    setQuery('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSelect(query.trim().toUpperCase())
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="bg-theme-secondary border border-theme rounded-lg hover:border-green-500/50 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 transition-all duration-200">
          <div className="flex items-center px-4 py-3">
            <MagnifyingGlassIcon className="w-5 h-5 text-theme-muted mr-3 flex-shrink-0" />
            
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-theme-primary placeholder-theme-muted text-sm focus:outline-none"
            />
            
            <div className="hidden md:flex items-center gap-2 text-theme-muted text-xs ml-3">
              <kbd className="px-2 py-1 bg-theme-tertiary border border-theme rounded text-xs">⌘K</kbd>
            </div>

            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="ml-2 p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-theme-card border border-theme rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
            
            <div className="max-h-80 overflow-y-auto">
              {filteredStocks.length > 0 ? (
                <div className="p-2">
                  {query && (
                    <div className="px-3 py-2 text-xs text-theme-muted font-medium">
                      {filteredStocks.length} Ergebnis{filteredStocks.length !== 1 ? 'se' : ''} für "{query}"
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredStocks.map((stock) => (
                      <button
                        key={stock.ticker}
                        onClick={() => handleSelect(stock.ticker)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-theme-secondary rounded-lg transition-all duration-200 text-left group"
                      >
                        <StockLogo ticker={stock.ticker} className="w-10 h-10" />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-theme-primary font-semibold text-sm">{stock.ticker}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-theme-tertiary text-theme-muted rounded">
                              {stock.market || 'NASDAQ'}
                            </span>
                          </div>
                          <div className="text-xs text-theme-muted truncate">{stock.name}</div>
                        </div>
                        
                        <ArrowRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-theme-muted">
                  <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Keine Ergebnisse für "{query}"</p>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-theme bg-theme-secondary/50">
              <div className="flex items-center justify-between text-xs text-theme-muted">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-theme-tertiary border border-theme rounded text-xs">↵</kbd>
                    <span>Auswählen</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-theme-tertiary border border-theme rounded text-xs">Esc</kbd>
                    <span>Schließen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ===== MARKET OVERVIEW =====
function ProfessionalMarketOverview() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getMarketStatus = (timezone: string, openHour: number, closeHour: number) => {
    const now = new Date()
    const marketTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }))
    const day = marketTime.getDay()
    const hour = marketTime.getHours()
    const minute = marketTime.getMinutes()
    const currentMinutes = hour * 60 + minute
    
    if (day === 0 || day === 6) {
      return { status: 'CLOSED', reason: 'Weekend' }
    }
    
    const marketOpenMinutes = openHour * 60
    const marketCloseMinutes = closeHour * 60
    
    if (currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes) {
      return { status: 'OPEN', reason: '' }
    } else {
      return { status: 'CLOSED', reason: 'After Hours' }
    }
  }

  const marketData = [
    { 
      name: 'S&P 500', 
      flag: '🇺🇸',
      value: '5,968.34', 
      change: '+0.85%', 
      positive: true, 
      volume: '4.2B',
      ...getMarketStatus("America/New_York", 9.5, 16)
    },
    { 
      name: 'NASDAQ', 
      flag: '🇺🇸',
      value: '19,447.41', 
      change: '+1.25%', 
      positive: true, 
      volume: '5.1B',
      ...getMarketStatus("America/New_York", 9.5, 16)
    },
    { 
      name: 'DAX', 
      flag: '🇩🇪',
      value: '8,774.65', 
      change: '-0.32%', 
      positive: false, 
      volume: '2.8B',
      ...getMarketStatus("Europe/Berlin", 9, 17.5)
    },
    { 
      name: 'Dow Jones', 
      flag: '🇺🇸',
      value: '42,208.61', 
      change: '+0.68%', 
      positive: true, 
      volume: '320M',
      ...getMarketStatus("America/New_York", 9.5, 16)
    }
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Marktübersicht</h2>
            <p className="text-theme-muted text-xs">
              Live-Kurse • 
              Deutschland: {currentTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} • 
              USA: {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} EST
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-theme-muted">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {marketData.map((market) => (
          <div key={market.name} className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 transition-colors">
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{market.flag}</span>
                <h3 className="text-theme-primary font-medium text-sm">{market.name}</h3>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                market.status === 'OPEN' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {market.status}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-lg font-bold text-theme-primary">{market.value}</div>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  market.positive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {market.positive ? (
                    <ArrowTrendingUpIcon className="w-3 h-3" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-3 h-3" />
                  )}
                  <span>{market.change}</span>
                </div>
                <div className="text-xs text-theme-muted">Vol: {market.volume}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== STOCK GRID =====
function ProfessionalStockGrid({ 
  quotes, 
  loading, 
  onSelect 
}: { 
  quotes: Record<string, Quote>
  loading: boolean
  onSelect: (ticker: string) => void 
}) {
  const POPULAR_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {POPULAR_STOCKS.map((ticker) => {
        const quote = quotes[ticker.toLowerCase()]
        const isLoading = loading && !quote

        return (
          <button
            key={ticker}
            onClick={() => onSelect(ticker)}
            className="group text-left"
          >
            <div className="bg-theme-secondary border border-theme rounded-lg p-3 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200 hover:scale-[1.02]">
              
              <div className="flex items-center justify-between mb-3">
                <StockLogo ticker={ticker} className="w-8 h-8" />
                {quote && (
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      quote.quality === 'HIGH' ? 'bg-green-400' : 'bg-yellow-400'
                    }`} title={`Data from ${quote.source}`}></div>
                    <div className={`w-2 h-2 rounded-full ${
                      quote.changePct >= 0 ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <h3 className="text-sm font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                  {ticker}
                </h3>
              </div>
                            
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-5 bg-theme-tertiary/50 rounded animate-pulse"></div>
                  <div className="h-4 bg-theme-tertiary/50 rounded w-2/3 animate-pulse"></div>
                </div>
              ) : quote ? (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-theme-primary">
                    ${quote.price.toFixed(2)}
                  </div>
                  
                  <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                    quote.changePct >= 0
                      ? 'text-green-400 bg-green-500/20'
                      : 'text-red-400 bg-red-500/20'
                  }`}>
                    {quote.changePct >= 0 ? (
                      <ArrowTrendingUpIcon className="w-3 h-3" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-3 h-3" />
                    )}
                    <span>{Math.abs(quote.changePct).toFixed(2)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-theme-muted text-sm">Daten nicht verfügbar</div>
              )}

              {quote && (
                <div className="mt-3 pt-3 border-t border-theme/50 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-theme-muted">1M:</span>
                    {quote.perf1M !== null && quote.perf1M !== undefined ? (
                      <span className={`font-medium ${
                        quote.perf1M >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {quote.perf1M >= 0 ? '+' : ''}{quote.perf1M.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-theme-muted">–</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-theme-muted">YTD:</span>
                    {quote.perfYTD !== null && quote.perfYTD !== undefined ? (
                      <span className={`font-medium ${
                        quote.perfYTD >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {quote.perfYTD >= 0 ? '+' : ''}{quote.perfYTD.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-theme-muted">–</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ===== MAIN DASHBOARD COMPONENT =====
export default function DashboardWithAPIRoute() {
  const router = useRouter()
  const [lastTicker, setLastTicker] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(false)
  const [dataSourceInfo, setDataSourceInfo] = useState<Record<string, string>>({})

  const POPULAR_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ]

  // Last ticker from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastTicker')
      if (stored) setLastTicker(stored.toUpperCase())
    }
  }, [])

  // ✅ LOAD QUOTES VIA API ROUTE
  useEffect(() => {
    async function loadQuotesFromAPI() {
      console.log('🚀 Loading quotes from Dashboard API...')
      setLoading(true)
      
      try {
        const tickers = POPULAR_STOCKS.join(',')
        const response = await fetch(`/api/dashboard-quotes?tickers=${tickers}`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.quotes) {
          setQuotes(data.quotes)
          
          // Data source info für debugging
          const sourceInfo: Record<string, string> = {}
          Object.keys(data.quotes).forEach(ticker => {
            sourceInfo[ticker] = data.quotes[ticker].source || 'Unknown'
          })
          setDataSourceInfo(sourceInfo)
          
          console.log(`📊 Loaded ${Object.keys(data.quotes).length} quotes successfully`)
          
          // Debug Sample
          Object.entries(data.quotes).slice(0, 3).forEach(([ticker, quote]: [string, any]) => {
            console.log(`  ${ticker.toUpperCase()}: $${quote.price.toFixed(2)} | 1M: ${quote.perf1M?.toFixed(2)}% | YTD: ${quote.perfYTD?.toFixed(2)}%`)
          })
          
          if (data.errors) {
            console.warn('⚠️ Some quotes failed:', data.errors)
          }
        }
        
      } catch (error: any) {
        console.error('Failed to load quotes from API:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadQuotesFromAPI()
  }, [])

  const handleTickerSelect = (ticker: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastTicker', ticker.toUpperCase())
    }
    router.push(`/analyse/stocks/${ticker.toLowerCase()}`)
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Professional Header */}
      <div className="bg-theme-primary border-b border-theme py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">Dashboard</h1>
  
            </div>
            
       
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Market Overview */}
        <ProfessionalMarketOverview />
        
        {/* Recently Analyzed */}
        {lastTicker && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">Zuletzt analysiert</h2>
                <p className="text-theme-muted text-xs">Setze deine Analyse fort</p>
              </div>
            </div>
                        
            <Link
              href={`/analyse/stocks/${lastTicker.toLowerCase()}`}
              className="group block"
            >
              <div className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <StockLogo ticker={lastTicker} className="w-12 h-12" />
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                      {lastTicker}
                    </h3>
                    <p className="text-theme-muted text-sm">
                      Zur detaillierten Analyse
                    </p>
                  </div>
                  
                  <ArrowRightIcon className="w-5 h-5 text-theme-muted group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Search */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <MagnifyingGlassIcon className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme-primary">Aktie suchen</h2>
              <p className="text-theme-muted text-xs">Analysiere jede Aktie weltweit</p>
            </div>
          </div>
          
          <TerminalSearchInput
            placeholder="Ticker oder Unternehmen suchen (AAPL, Tesla, SAP...)"
            onSelect={handleTickerSelect}
          />
        </div>

        {/* Popular Stocks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">Beliebte Aktien</h2>
               
              </div>
            </div>
            
            {loading && (
              <div className="flex items-center gap-2 text-xs text-theme-muted">
                <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                Lade von API...
              </div>
            )}
          </div>

          <ProfessionalStockGrid 
            quotes={quotes}
            loading={loading}
            onSelect={handleTickerSelect}
          />

          <div className="mt-6 text-center">
            <p className="text-sm text-theme-muted">
              YTD basiert auf letztem Handelstag des Vorjahres • 
              1M basiert auf ~21 Handelstagen
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme-primary">Schnellzugriff</h2>
              <p className="text-theme-muted text-xs">Häufig verwendete Features</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/analyse/watchlist"
              className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <BookmarkIcon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-theme-primary">Watchlist</h3>
                  <p className="text-xs text-theme-muted">Gespeicherte Aktien</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/analyse/heatmap"
              className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <MapIcon className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-theme-primary">Heatmap</h3>
                  <p className="text-xs text-theme-muted">Markt-Übersicht</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/analyse/earnings"
              className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                  <CalendarIcon className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-theme-primary">Earnings</h3>
                  <p className="text-xs text-theme-muted">Termine</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/analyse/ai"
              className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <SparklesIcon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-theme-primary">FinClue AI</h3>
                  <p className="text-xs text-theme-muted">KI-Analyse</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}