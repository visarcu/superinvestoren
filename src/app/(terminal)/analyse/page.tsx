// Dashboard-Component - PERFORMANCE OPTIMIERT
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

// ECHTE IMPORTS - keine Mock-Daten!
import { stocks } from '@/data/stocks'
// LAZY LOAD HOLDINGS HISTORY
import dynamic from 'next/dynamic'
import Logo from '@/components/Logo'

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
    // FIX: Non-null assertion da wir vorher mit has() prüfen
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
    // FIX: Non-null assertion da wir vorher mit has() prüfen
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

  // MEMOIZED POPULAR STOCKS
  const popularStocks = useMemo(() => {
    const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA']
    return stocks.filter(stock => popularTickers.includes(stock.ticker))
  }, [])

  // OPTIMIZED FILTERING
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
    // Verzögerung damit Klicks auf Ergebnisse noch funktionieren
    setTimeout(() => {
      if (!resultsRef.current?.contains(document.activeElement)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }, 150)
  }, [])

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Search Input - ELEGANTERES DESIGN */}
      <div className={`
  search-input-container
  relative transition-all duration-300 rounded-2xl
  ${showResults 
    ? 'bg-white rounded-b-none shadow-lg' 
    : 'bg-white shadow-md hover:shadow-lg'
  }
`}>
  <div className="flex items-center px-6 py-5">
    <MagnifyingGlassIcon className="w-6 h-6 mr-4 text-theme-muted" />
    
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onFocus={handleInputFocus}
      onBlur={handleInputBlur}
      onKeyDown={handleKeyDown}
      className="flex-1 bg-transparent text-theme-primary placeholder-theme-muted text-lg font-medium focus:outline-none border-none focus:ring-0"
      style={{ border: 'none', boxShadow: 'none' }}
    />    
          <div className="hidden md:flex items-center gap-2 text-theme-muted text-sm ml-4">
            <div className="flex items-center gap-1">
              <kbd className="px-2.5 py-1.5 bg-theme-secondary/50 backdrop-blur border border-theme/10 rounded-lg text-xs font-medium">⌘</kbd>
              <kbd className="px-2.5 py-1.5 bg-theme-secondary/50 backdrop-blur border border-theme/10 rounded-lg text-xs font-medium">K</kbd>
            </div>
          </div>

          {query && (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="ml-4 p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-secondary/50 transition-all duration-200 rounded-xl"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Elegant Focus Indicator */}
 
      </div>

      {/* Search Results - ANGEPASST FÜR NEUES DESIGN */}
      {showResults && (
      <div 
      ref={resultsRef}
      className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-2xl z-50 overflow-hidden border-t border-gray-100"
    >
          <div className="max-h-80 overflow-y-auto">
            {filteredStocks.length > 0 ? (
              <div className="p-2">
                {query && (
                  <div className="px-4 py-3 text-xs text-theme-muted font-semibold uppercase tracking-wide border-b border-theme/5 mb-2">
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
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 ring-1 ring-green-500/30' 
                          : 'hover:bg-theme-secondary/50 hover:backdrop-blur'
                      }`}
                    >
                      <Logo 
                        ticker={stock.ticker} 
                        alt={`${stock.ticker} Logo`}
                        className="w-12 h-12 flex-shrink-0 rounded-xl shadow-sm"
                        padding="small"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold text-sm ${
                            index === selectedIndex ? 'text-green-400' : 'text-theme-primary'
                          }`}>{stock.ticker}</span>
                          <span className="px-2 py-1 bg-theme-secondary/60 text-theme-muted rounded-lg text-xs font-medium backdrop-blur">
                            {stock.market || 'NASDAQ'}
                          </span>
                        </div>
                        <div className="text-xs text-theme-muted truncate">{stock.name}</div>
                      </div>
                      
                      <ArrowRightIcon className={`w-4 h-4 transition-all duration-200 flex-shrink-0 ${
                        index === selectedIndex ? 'text-green-400 translate-x-1' : 'text-theme-muted group-hover:text-green-400 group-hover:translate-x-0.5'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-theme-muted">
            <MagnifyingGlassIcon className={`
  w-6 h-6 mr-4 transition-all duration-300 text-theme-muted
`} />
                <p className="text-sm">Keine Ergebnisse für "{query}"</p>
              </div>
            )}
          </div>
          
          {/* Footer mit Glassmorphism Effect */}
          <div className="p-4 bg-theme-secondary/30 backdrop-blur border-t border-theme/5 rounded-b-2xl">
            <div className="flex items-center gap-4 text-xs text-theme-muted">
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-theme-card/60 backdrop-blur border border-theme/10 rounded-lg text-xs">↑↓</kbd>
                <span>Navigieren</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-theme-card/60 backdrop-blur border border-theme/10 rounded-lg text-xs">↵</kbd>
                <span>Auswählen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-theme-card/60 backdrop-blur border border-theme/10 rounded-lg text-xs">Esc</kbd>
                <span>Schließen</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

// ===== FIXED SUPER-INVESTOR COMPONENT =====
const SuperInvestorStocks = React.memo(({ 
  quotes, 
  onSelect,
  loading
}: { 
  quotes: Record<string, Quote>
  onSelect: (ticker: string) => void 
  loading: boolean
}) => {
  const [view, setView] = useState<'hidden_gems' | 'recent_buys'>('hidden_gems')
  const [holdingsHistory, setHoldingsHistory] = useState<any>(null)

  // LAZY LOAD HOLDINGS DATA
  useEffect(() => {
    import('@/data/holdings').then(module => {
      setHoldingsHistory(module.default)
    })
  }, [])

  const MAINSTREAM_STOCKS = useMemo(() => new Set([
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ]), [])

  const hiddenGems = useMemo(() => {
    if (!holdingsHistory) return []
    
    const ownershipCount = new Map<string, { count: number; totalValue: number; name: string }>()

    Object.values(holdingsHistory).forEach((snaps: any) => {
      if (!snaps || snaps.length === 0) return
      
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return
      
      const seen = new Set<string>()
      latest.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        
        if (ticker && !seen.has(ticker) && !MAINSTREAM_STOCKS.has(ticker)) {
          seen.add(ticker)
          const current = ownershipCount.get(ticker)
          
          if (current) {
            current.count += 1
            current.totalValue += p.value
          } else {
            ownershipCount.set(ticker, {
              count: 1,
              totalValue: p.value,
              name: getStockName(p)
            })
          }
        }
      })
    })

    return Array.from(ownershipCount.entries())
      .filter(([, data]) => data.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6)
      .map(([ticker, data]) => ({
        ticker,
        count: data.count,
        totalValue: data.totalValue,
        name: data.name
      }))
  }, [holdingsHistory, MAINSTREAM_STOCKS])

  const recentBuys = useMemo(() => {
    if (!holdingsHistory) return []
    
    const buyCounts = new Map<string, { count: number; totalValue: number; name: string }>()
    
    Object.values(holdingsHistory).forEach((snaps: any) => {
      if (!snaps || snaps.length < 2) return
      
      const latest = snaps[snaps.length - 1]?.data
      const previous = snaps[snaps.length - 2]?.data
      
      if (!latest?.positions || !previous?.positions) return

      const prevTickers = new Set(
        previous.positions.map((p: any) => getTicker(p)).filter(Boolean)
      )

      const seen = new Set<string>()
      latest.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        if (!ticker || seen.has(ticker)) return
        
        const wasNewOrIncreased = !prevTickers.has(ticker) || 
          (previous.positions.find((prev: any) => getTicker(prev) === ticker)?.shares || 0) < p.shares
        
        if (wasNewOrIncreased) {
          seen.add(ticker)
          const current = buyCounts.get(ticker)
          
          if (current) {
            current.count += 1
            current.totalValue += p.value
          } else {
            buyCounts.set(ticker, {
              count: 1,
              totalValue: p.value,
              name: getStockName(p)
            })
          }
        }
      })
    })

    return Array.from(buyCounts.entries())
      .filter(([, data]) => data.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6)
      .map(([ticker, data]) => ({
        ticker,
        count: data.count,
        totalValue: data.totalValue,
        name: data.name
      }))
  }, [holdingsHistory])

  const currentData = view === 'hidden_gems' ? hiddenGems : recentBuys

  if (!holdingsHistory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">
              💎 Super-Investor Picks
            </h3>
            <p className="text-sm text-theme-muted">
              Lädt Daten...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-theme-card border border-theme/10 rounded-xl p-6 animate-pulse">
              <div className="h-24 bg-theme-secondary rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-theme-primary mb-2">
            {view === 'hidden_gems' ? '💎 Hidden Gems' : '⚡ Recent Buys'}
          </h3>
          <p className="text-sm text-theme-muted">
            {view === 'hidden_gems' 
              ? 'Super-Investor Favoriten abseits des Mainstreams' 
              : 'Neueste Käufe der erfolgreichsten Investoren'}
          </p>
        </div>
        
        <div className="flex bg-theme-secondary border border-theme/10 rounded-xl p-1">
          <button
            onClick={() => setView('hidden_gems')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              view === 'hidden_gems'
                ? 'bg-green-500 text-white shadow-md'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            💎 Hidden Gems
          </button>
          <button
            onClick={() => setView('recent_buys')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              view === 'recent_buys'
                ? 'bg-green-500 text-white shadow-md'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            ⚡ Recent Buys
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {currentData.slice(0, 4).map((item) => {
          const quote = quotes[item.ticker.toLowerCase()]
          const isLoading = loading && !quote

          return (
            <button
              key={item.ticker}
              onClick={() => onSelect(item.ticker)}
              className="text-left bg-theme-card border border-theme/10 rounded-xl p-6 group hover:shadow-lg hover:border-theme/20 transition-all duration-300"
            >
              
              <div className="flex items-center justify-between mb-4">
                <Logo 
                  ticker={item.ticker} 
                  alt={`${item.ticker} Logo`}
                  className="w-10 h-10 rounded-lg"
                  padding="small"
                />
                {quote && (
                  <div className={`w-3 h-3 rounded-full ${
                    quote.changePct >= 0 ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                )}
              </div>

              <h3 className="text-lg font-bold text-theme-primary mb-4 group-hover:text-green-400 transition-colors">
                {item.ticker}
              </h3>
                            
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-6 bg-theme-secondary rounded-lg animate-pulse"></div>
                  <div className="h-5 bg-theme-secondary rounded-lg w-2/3 animate-pulse"></div>
                </div>
              ) : quote ? (
                <div className="space-y-3">
                  <div className="text-xl font-bold text-theme-primary">
                    ${quote.price.toFixed(2)}
                  </div>
                  
                  <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${
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

                  <div className="pt-3 space-y-2 text-xs border-t border-theme/10">
                    <div className="flex justify-between">
                      <span className="text-theme-muted">1M:</span>
                      {quote.perf1M !== null && quote.perf1M !== undefined ? (
                        <span className={`font-bold ${
                          quote.perf1M >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {quote.perf1M >= 0 ? '+' : ''}{quote.perf1M.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-theme-muted">–</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-muted">YTD:</span>
                      {quote.perfYTD !== null && quote.perfYTD !== undefined ? (
                        <span className={`font-bold ${
                          quote.perfYTD >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {quote.perfYTD >= 0 ? '+' : ''}{quote.perfYTD.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-theme-muted">–</span>
                      )}
                    </div>
                    <div className="flex justify-between border-t border-theme/10 pt-2">
                      <span className="text-theme-muted">
                        {view === 'hidden_gems' ? 'Investoren:' : 'Käufer:'}
                      </span>
                      <span className="text-theme-primary font-bold">{item.count}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-theme-muted text-sm">Daten nicht verfügbar</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
})

// ===== OPTIMIZED MARKET STATUS - CACHED =====
const getMarketStatus = (() => {
  let cache: { [key: string]: { timestamp: number; data: any } } = {}
  
  return (timezone: string, openHour: number, closeHour: number) => {
    const cacheKey = `${timezone}-${openHour}-${closeHour}`
    const now = Date.now()
    
    // Cache für 30 Sekunden
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

  // HIDDEN GEMS TICKERS - wird dynamisch geladen
  const [hiddenGemsTickers, setHiddenGemsTickers] = useState<string[]>([])

  const POPULAR_STOCKS = useMemo(() => [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ], [])

  // OPTIMIZED CLOCK - Nur alle 30 Sekunden statt jede Sekunde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // 30 Sekunden statt 1 Sekunde
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastTicker')
      if (stored) setLastTicker(stored.toUpperCase())
    }
  }, [])

  // Load Hidden Gems tickers
  useEffect(() => {
    async function getHiddenGemsTickers() {
      try {
        const holdingsModule = await import('@/data/holdings')
        const holdingsHistory = holdingsModule.default
        
        const MAINSTREAM_STOCKS = new Set([
          'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
          'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
        ])
        
        const ownershipCount = new Map<string, number>()

        Object.values(holdingsHistory).forEach((snaps: any) => {
          if (!snaps || snaps.length === 0) return
          
          const latest = snaps[snaps.length - 1]?.data
          if (!latest?.positions) return
          
          const seen = new Set<string>()
          latest.positions.forEach((p: any) => {
            const ticker = getTicker(p)
            
            if (ticker && !seen.has(ticker) && !MAINSTREAM_STOCKS.has(ticker)) {
              seen.add(ticker)
              ownershipCount.set(ticker, (ownershipCount.get(ticker) || 0) + 1)
            }
          })
        })

        const topTickers = Array.from(ownershipCount.entries())
          .filter(([, count]) => count >= 2)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8) // Top 8 für beide Views
          .map(([ticker]) => ticker)
          
        setHiddenGemsTickers(topTickers)
      } catch (error) {
        console.error('Failed to load hidden gems tickers:', error)
      }
    }
    
    getHiddenGemsTickers()
  }, [])

  // DEBOUNCED API CALLS - Inkludiert Hidden Gems
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    async function loadStockQuotes() {
      setLoading(true)
      
      try {
        // Kombiniere Popular Stocks + Hidden Gems für API Call
        const allTickers = [...POPULAR_STOCKS, ...hiddenGemsTickers]
        const uniqueTickers = [...new Set(allTickers)]
        const tickers = uniqueTickers.join(',')
        
        if (uniqueTickers.length === 0) return
        
        const response = await fetch(`/api/dashboard-quotes?tickers=${tickers}`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.quotes) {
          setQuotes(data.quotes)
          console.log('✅ Stock quotes loaded:', Object.keys(data.quotes).length)
        }
        
      } catch (error: any) {
        console.error('Failed to load stock quotes:', error)
      } finally {
        setLoading(false)
      }
    }
    
    // Debounce API calls
    timeoutId = setTimeout(loadStockQuotes, 100)
    
    return () => clearTimeout(timeoutId)
  }, [POPULAR_STOCKS, hiddenGemsTickers])

  // DEBOUNCED MARKET DATA
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    async function loadMarketData() {
      setMarketLoading(true)
      
      try {
        const response = await fetch('/api/dashboard-quotes?markets=true')
        
        if (!response.ok) {
          throw new Error(`Market API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.markets) {
          setMarketQuotes(data.markets)
          console.log('✅ Market data loaded:', Object.keys(data.markets).length)
        }
        
      } catch (error: any) {
        console.error('Failed to load market data:', error)
      } finally {
        setMarketLoading(false)
      }
    }
    
    timeoutId = setTimeout(loadMarketData, 200)
    
    return () => clearTimeout(timeoutId)
  }, [])

  const handleTickerSelect = useCallback((ticker: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastTicker', ticker.toUpperCase())
    }
    router.push(`/analyse/stocks/${ticker.toLowerCase()}`)
  }, [router])

  // MEMOIZED MARKET DATA
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
          
          {/* Zurück-Link */}
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
            
            {/* Quick Actions */}
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
                        {quote.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          <span>{quote.changePct >= 0 ? '+' : ''}{quote.changePct.toFixed(2)}%</span>
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

        {/* Search Section */}
        <section className="text-center">
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-theme-primary">Aktie suchen</h2>
              <p className="text-lg text-theme-secondary">Analysiere jede Aktie weltweit mit professionellen Tools und Echtzeit-Daten</p>
            </div>
            
            <SmartSearchInput
              placeholder="Ticker oder Unternehmen suchen (AAPL, Tesla, SAP...)"
              onSelect={handleTickerSelect}
            />

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <span className="text-theme-muted text-sm mr-4">Beliebt:</span>
              {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'].map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => handleTickerSelect(ticker)}
                  className="px-4 py-2 bg-theme-card border border-theme/20 hover:bg-theme-hover hover:border-green-500/30 text-theme-primary rounded-lg font-medium transition-all duration-200 text-sm"
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Layout: Sidebar + Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Recently Analyzed */}
            {lastTicker && (
              <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
                <h2 className="text-sm font-bold text-theme-muted uppercase tracking-wide mb-4">Zuletzt analysiert</h2>
                
                <button
                  onClick={() => handleTickerSelect(lastTicker)}
                  className="group flex items-center gap-4 p-4 rounded-xl hover:bg-theme-secondary transition-all duration-200 w-full"
                >
                  <Logo 
                    ticker={lastTicker} 
                    alt={`${lastTicker} Logo`}
                    className="w-12 h-12 rounded-lg"
                    padding="small"
                  />
                  
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                      {lastTicker}
                    </h3>
                    <p className="text-sm text-theme-muted">
                      Zur Analyse
                    </p>
                  </div>
                  
                  <ArrowRightIcon className="w-5 h-5 text-theme-muted group-hover:text-green-400 transition-colors" />
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <h2 className="text-sm font-bold text-theme-muted uppercase tracking-wide mb-4">Schnellzugriff</h2>
              
              <div className="space-y-2">
                {[
                  { icon: BookmarkIcon, label: 'Watchlist', href: '/analyse/watchlist' },
                  { icon: MapIcon, label: 'Heatmap', href: '/analyse/heatmap' },
                  { icon: CalendarIcon, label: 'Earnings', href: '/analyse/earnings' },
                  { icon: SparklesIcon, label: 'FinClue AI', href: '/analyse/ai' }
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-theme-secondary transition-all duration-200"
                  >
                    <item.icon className="w-5 h-5 text-theme-muted group-hover:text-green-400 transition-colors" />
                    <span className="text-sm text-theme-primary group-hover:text-green-400 transition-colors">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Popular Stocks */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-theme-primary mb-2">Beliebte Aktien</h2>
                    <p className="text-sm text-theme-muted">Mit Live-Kursen und Performance-Metriken</p>
                  </div>
                  
                  {loading && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-amber-400 rounded-lg">
                      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold">Lädt...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {POPULAR_STOCKS.slice(0, 4).map((ticker) => {
                    const quote = quotes[ticker.toLowerCase()]
                    const isLoading = loading && !quote

                    return (
                      <button
                        key={ticker}
                        onClick={() => handleTickerSelect(ticker)}
                        className="text-left bg-theme-card border border-theme/10 rounded-xl p-6 group hover:shadow-lg hover:border-theme/20 transition-all duration-300"
                      >
                        
                        <div className="flex items-center justify-between mb-4">
                          <Logo 
                            ticker={ticker} 
                            alt={`${ticker} Logo`}
                            className="w-10 h-10 rounded-lg"
                            padding="small"
                          />
                          {quote && (
                            <div className={`w-3 h-3 rounded-full ${
                              quote.changePct >= 0 ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-theme-primary mb-4 group-hover:text-green-400 transition-colors">
                          {ticker}
                        </h3>
                                      
                        {isLoading ? (
                          <div className="space-y-3">
                            <div className="h-6 bg-theme-secondary rounded-lg animate-pulse"></div>
                            <div className="h-5 bg-theme-secondary rounded-lg w-2/3 animate-pulse"></div>
                          </div>
                        ) : quote ? (
                          <div className="space-y-3">
                            <div className="text-xl font-bold text-theme-primary">
                              ${quote.price.toFixed(2)}
                            </div>
                            
                            <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${
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

                            <div className="pt-3 space-y-2 text-xs border-t border-theme/10">
                              <div className="flex justify-between">
                                <span className="text-theme-muted">1M:</span>
                                {quote.perf1M !== null && quote.perf1M !== undefined ? (
                                  <span className={`font-bold ${
                                    quote.perf1M >= 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {quote.perf1M >= 0 ? '+' : ''}{quote.perf1M.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-theme-muted">–</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <span className="text-theme-muted">YTD:</span>
                                {quote.perfYTD !== null && quote.perfYTD !== undefined ? (
                                  <span className={`font-bold ${
                                    quote.perfYTD >= 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {quote.perfYTD >= 0 ? '+' : ''}{quote.perfYTD.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-theme-muted">–</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-theme-muted text-sm">Daten nicht verfügbar</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Hidden Gems */}
              <div>
                <SuperInvestorStocks 
                  quotes={quotes}
                  onSelect={handleTickerSelect}
                  loading={loading}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-theme/10 text-center">
              <p className="text-xs text-theme-muted flex items-center justify-center gap-2">
                <ClockIcon className="w-4 h-4" />
                YTD basiert auf letztem Handelstag 2024 • 
                1M basiert auf ~30 Kalendertagen • 
                Alle Daten via FMP API • Live-Updates alle 15 Minuten
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}