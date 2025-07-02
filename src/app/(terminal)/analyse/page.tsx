'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
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
  StarIcon
} from '@heroicons/react/24/outline'

// ECHTE IMPORTS - keine Mock-Daten!
import { stocks } from '@/data/stocks'
import holdingsHistory from '@/data/holdings'
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

// ===== HELPER FUNCTIONS =====
function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

function getStockName(position: any): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.name || position.name || position.cusip
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

// ===== SEARCH DROPDOWN (Fixed z-index solution) =====
function SearchDropdown({ 
  isOpen, 
  onClose, 
  filteredStocks, 
  query, 
  onSelect 
}: {
  isOpen: boolean
  onClose: () => void
  filteredStocks: any[]
  query: string
  onSelect: (ticker: string) => void
}) {
  if (!isOpen) return null

  return (
    <>
      {/* Fixed backdrop - captures all clicks outside */}
      <div 
        className="fixed inset-0 z-[100]"
        onClick={onClose}
      />
      
      {/* Dropdown - positioned absolutely to parent */}
      <div className="absolute top-full left-0 right-0 mt-2 z-[101] bg-theme-card border border-theme-border rounded-xl shadow-2xl max-h-80 overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          {filteredStocks.length > 0 ? (
            <div className="p-2">
              {query && (
                <div className="px-4 py-3 text-sm text-theme-muted font-medium border-b border-theme-border">
                  {filteredStocks.length} Ergebnis{filteredStocks.length !== 1 ? 'se' : ''} für "{query}"
                </div>
              )}
              <div className="space-y-1 mt-2">
                {filteredStocks.map((stock) => (
                  <button
                    key={stock.ticker}
                    onClick={() => onSelect(stock.ticker)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-theme-secondary/30 rounded-lg transition-all duration-200 text-left group"
                  >
                    <Logo 
                      ticker={stock.ticker} 
                      alt={`${stock.ticker} Logo`}
                      className="w-10 h-10 flex-shrink-0"
                      padding="small"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-theme-primary font-semibold text-base">{stock.ticker}</span>
                        <span className="text-xs px-2 py-0.5 bg-theme-tertiary/50 text-theme-muted rounded">
                          {stock.market || 'NASDAQ'}
                        </span>
                      </div>
                      <div className="text-sm text-theme-muted truncate">{stock.name}</div>
                    </div>
                    
                    <ArrowRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-500 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-theme-muted">
              <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>Keine Ergebnisse für "{query}"</p>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-theme-secondary/5 border-t border-theme-border">
          <div className="flex items-center gap-4 text-xs text-theme-muted">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-theme-tertiary/50 rounded text-xs">↵</kbd>
              <span>Auswählen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-theme-tertiary/50 rounded text-xs">Esc</kbd>
              <span>Schließen</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ===== CLEAN SEARCH COMPONENT =====
function CleanSearchInput({ 
  placeholder, 
  onSelect 
}: { 
  placeholder: string
  onSelect: (ticker: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filteredStocks, setFilteredStocks] = useState<any[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query) {
      const filtered = stocks.filter(stock => 
        stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
      setFilteredStocks(filtered)
    } else {
      const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA']
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
    setIsFocused(false)
  }

  const handleFocus = () => {
    setIsFocused(true)
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSelect(query.trim().toUpperCase())
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
      setIsFocused(false)
    }
  }

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Clean Input - mit Theme Colors */}
      <div className={`
        relative rounded-xl transition-all duration-200 border
        ${isFocused 
          ? 'border-green-500/60 bg-theme-card' 
          : 'border-theme-border bg-theme-card hover:border-theme-border-hover'
        }
      `}>
        <div className="flex items-center px-4 py-4">
          <MagnifyingGlassIcon className={`
            w-5 h-5 mr-3 transition-colors duration-200
            ${isFocused ? 'text-green-500' : 'text-theme-muted'}
          `} />
          
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-theme-primary placeholder-theme-muted text-base focus:outline-none"
          />
          
          <div className="hidden md:flex items-center gap-2 text-theme-muted text-sm ml-4">
            <kbd className="px-2 py-1 bg-theme-tertiary/50 rounded text-xs">⌘K</kbd>
          </div>

          {query && (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="ml-3 p-1 text-theme-muted hover:text-theme-primary transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <SearchDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        filteredStocks={filteredStocks}
        query={query}
        onSelect={handleSelect}
      />
    </div>
  )
}

// ===== SUPER-INVESTOR STOCKS COMPONENT =====
function SuperInvestorStocks({ 
  quotes, 
  onSelect 
}: { 
  quotes: Record<string, Quote>
  onSelect: (ticker: string) => void 
}) {
  const [view, setView] = useState<'hidden_gems' | 'recent_buys'>('hidden_gems')

  const MAINSTREAM_STOCKS = new Set([
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ])

  const hiddenGems = useMemo(() => {
    const ownershipCount = new Map<string, { count: number; totalValue: number; name: string }>()

    Object.values(holdingsHistory).forEach(snaps => {
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
  }, [])

  const recentBuys = useMemo(() => {
    const buyCounts = new Map<string, { count: number; totalValue: number; name: string }>()
    
    Object.values(holdingsHistory).forEach(snaps => {
      if (!snaps || snaps.length < 2) return
      
      const latest = snaps[snaps.length - 1]?.data
      const previous = snaps[snaps.length - 2]?.data
      
      if (!latest?.positions || !previous?.positions) return

      const prevTickers = new Set(
        previous.positions.map(p => getTicker(p)).filter(Boolean)
      )

      const seen = new Set<string>()
      latest.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        if (!ticker || seen.has(ticker)) return
        
        const wasNewOrIncreased = !prevTickers.has(ticker) || 
          (previous.positions.find(prev => getTicker(prev) === ticker)?.shares || 0) < p.shares
        
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
  }, [])

  const currentData = view === 'hidden_gems' ? hiddenGems : recentBuys

  return (
    <div className="space-y-8">
      {/* Clean Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-theme-primary mb-2">
            {view === 'hidden_gems' ? '💎 Hidden Gems' : '⚡ Recent Buys'}
          </h3>
          <p className="text-sm text-theme-muted">
            {view === 'hidden_gems' 
              ? 'Super-Investor Favoriten abseits des Mainstreams' 
              : 'Neueste Käufe der erfolgreichsten Investoren'}
          </p>
        </div>
        
        {/* Clean Toggle */}
        <div className="flex bg-theme-secondary/20 rounded-lg p-1">
          <button
            onClick={() => setView('hidden_gems')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              view === 'hidden_gems'
                ? 'bg-green-500 text-white'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            💎 Hidden Gems
          </button>
          <button
            onClick={() => setView('recent_buys')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              view === 'recent_buys'
                ? 'bg-green-500 text-white'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            ⚡ Recent Buys
          </button>
        </div>
      </div>

      {/* Clean Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {currentData.map((item) => {
          const quote = quotes[item.ticker.toLowerCase()]

          return (
            <button
              key={item.ticker}
              onClick={() => onSelect(item.ticker)}
              className="group w-full text-left p-4 rounded-lg border border-theme-border hover:border-theme-border-hover bg-theme-card hover:bg-theme-secondary/10 transition-all duration-200"
            >
              
              <div className="flex items-center justify-between mb-3">
                <Logo 
                  ticker={item.ticker} 
                  alt={`${item.ticker} Logo`}
                  className="w-8 h-8"
                  padding="small"
                />
                
                <div className="flex items-center gap-1 px-2 py-1 bg-theme-tertiary/30 rounded text-xs text-theme-muted">
                  <UserGroupIcon className="w-3 h-3" />
                  <span className="font-medium">{item.count}</span>
                </div>
              </div>

              <div className="mb-3">
                <h4 className="text-base font-semibold text-theme-primary group-hover:text-green-500 transition-colors">
                  {item.ticker}
                </h4>
                <p className="text-xs text-theme-muted">
                  {view === 'hidden_gems' ? `${item.count} Investoren` : `${item.count} Käufer`}
                </p>
              </div>
                            
              {quote ? (
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-theme-primary">
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
                <div className="text-theme-muted text-sm">Lädt...</div>
              )}

              <div className="mt-3 pt-3 border-t border-theme-border">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-theme-muted">
                    {view === 'hidden_gems' ? 'Gesamt-Wert:' : 'Kauf-Wert:'}
                  </span>
                  <span className="text-theme-primary font-medium">
                    {item.totalValue >= 1_000_000_000 
                      ? `${(item.totalValue / 1_000_000_000).toFixed(1)}B`
                      : `${(item.totalValue / 1_000_000).toFixed(0)}M`
                    }
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ===== MAIN DASHBOARD COMPONENT =====
export default function CleanDashboard() {
  const router = useRouter()
  const [lastTicker, setLastTicker] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [marketQuotes, setMarketQuotes] = useState<Record<string, MarketQuote>>({})
  const [loading, setLoading] = useState(false)
  const [marketLoading, setMarketLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const POPULAR_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastTicker')
      if (stored) setLastTicker(stored.toUpperCase())
    }
  }, [])

  // Load real stock quotes
  useEffect(() => {
    async function loadStockQuotes() {
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
          console.log('✅ Stock quotes loaded:', Object.keys(data.quotes).length)
        }
        
      } catch (error: any) {
        console.error('Failed to load stock quotes:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadStockQuotes()
  }, [])

  // Load real market data
  useEffect(() => {
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
    
    loadMarketData()
  }, [])

  const handleTickerSelect = (ticker: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastTicker', ticker.toUpperCase())
    }
    router.push(`/analyse/stocks/${ticker.toLowerCase()}`)
  }

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
  ]

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 py-8 space-y-10">
        
        {/* Market Overview - Clean mit Theme Colors */}
        <div className="border border-theme-border rounded-xl bg-theme-card">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-theme-primary mb-2">Marktübersicht</h1>
                <p className="text-theme-muted">
                  Live-Kurse • 
                  Deutschland: {currentTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} • 
                  USA: {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} EST
                </p>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${marketLoading ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`}></div>
                <span className="text-sm font-medium text-green-400">{marketLoading ? 'Lädt...' : 'Live'}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {marketData.map((market) => {
                const quote = marketQuotes[market.key]
                const isLoading = marketLoading && !quote

                return (
                  <div key={market.name} className="border border-theme-border rounded-lg p-6 bg-theme-card hover:border-theme-border-hover transition-colors">
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{market.flag}</span>
                        <h3 className="text-theme-primary font-semibold">{market.name}</h3>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded font-medium ${
                        market.status === 'OPEN' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-theme-tertiary/30 text-theme-muted'
                      }`}>
                        {market.status === 'OPEN' ? 'Offen' : 'Geschlossen'}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {isLoading ? (
                        <div className="h-8 bg-theme-tertiary/30 rounded animate-pulse"></div>
                      ) : quote ? (
                        <div className="text-2xl font-semibold text-theme-primary">
                          {quote.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <div className="text-2xl font-semibold text-theme-muted">--</div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        {isLoading ? (
                          <div className="h-5 bg-theme-tertiary/30 rounded w-20 animate-pulse"></div>
                        ) : quote ? (
                          <div className={`flex items-center gap-2 text-sm font-medium px-2 py-1 rounded ${
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
          </div>
        </div>

        {/* Search Section - Clean mit Theme Colors */}
        <div className="border border-theme-border rounded-xl bg-theme-card">
          <div className="p-12 text-center">
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold text-theme-primary">Aktie suchen</h2>
                <p className="text-theme-muted text-lg">Analysiere jede Aktie weltweit mit professionellen Tools und Echtzeit-Daten</p>
              </div>
              
              <CleanSearchInput
                placeholder="Ticker oder Unternehmen suchen (AAPL, Tesla, SAP...)"
                onSelect={handleTickerSelect}
              />

              {/* Clean Quick Access */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <span className="text-theme-muted mr-3">Beliebt:</span>
                {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'].map((ticker) => (
                  <button
                    key={ticker}
                    onClick={() => handleTickerSelect(ticker)}
                    className="px-4 py-2 bg-theme-secondary/30 hover:bg-theme-secondary/50 text-theme-primary rounded-lg font-medium transition-colors"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Layout: Clean Sidebar + Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Clean Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            
            {/* Recently Analyzed */}
            {lastTicker && (
              <div className="border border-theme-border rounded-lg bg-theme-card">
                <div className="p-4">
                  <h2 className="text-sm font-medium text-theme-muted mb-3">Zuletzt analysiert</h2>
                  
                  <button
                    onClick={() => handleTickerSelect(lastTicker)}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-theme-secondary/20 transition-colors w-full"
                  >
                    <Logo 
                      ticker={lastTicker} 
                      alt={`${lastTicker} Logo`}
                      className="w-10 h-10"
                      padding="small"
                    />
                    
                    <div className="flex-1 text-left">
                      <h3 className="text-theme-primary font-semibold group-hover:text-green-500 transition-colors">
                        {lastTicker}
                      </h3>
                      <p className="text-xs text-theme-muted">
                        Zur Analyse
                      </p>
                    </div>
                    
                    <ArrowRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-500 transition-colors" />
                  </button>
                </div>
              </div>
            )}

            {/* Clean Quick Actions */}
            <div className="border border-theme-border rounded-lg bg-theme-card">
              <div className="p-4">
                <h2 className="text-sm font-medium text-theme-muted mb-3">Schnellzugriff</h2>
                
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
                      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-theme-secondary/20 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-theme-muted group-hover:text-green-500 transition-colors" />
                      <span className="text-sm text-theme-primary group-hover:text-green-500 transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Clean */}
          <div className="xl:col-span-3">
            <div className="border border-theme-border rounded-xl bg-theme-card">
              <div className="p-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                  
                  {/* Popular Stocks - Clean Cards mit Theme Colors */}
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-semibold text-theme-primary mb-2">Beliebte Aktien</h2>
                        <p className="text-theme-muted">Mit Live-Kursen und Performance-Metriken</p>
                      </div>
                      
                      {loading && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg">
                          <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs font-medium text-green-400">Lädt...</span>
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
                            className="text-left p-4 rounded-lg border border-theme-border hover:border-theme-border-hover bg-theme-card hover:bg-theme-secondary/10 transition-all duration-200"
                          >
                            
                            <div className="flex items-center justify-between mb-3">
                              <Logo 
                                ticker={ticker} 
                                alt={`${ticker} Logo`}
                                className="w-8 h-8"
                                padding="small"
                              />
                              {quote && (
                                <div className={`w-2 h-2 rounded-full ${
                                  quote.changePct >= 0 ? 'bg-green-400' : 'bg-red-400'
                                }`}></div>
                              )}
                            </div>

                            <h3 className="text-theme-primary font-semibold mb-3 group-hover:text-green-500 transition-colors">
                              {ticker}
                            </h3>
                                          
                            {isLoading ? (
                              <div className="space-y-2">
                                <div className="h-5 bg-theme-tertiary/30 rounded animate-pulse"></div>
                                <div className="h-4 bg-theme-tertiary/30 rounded w-2/3 animate-pulse"></div>
                              </div>
                            ) : quote ? (
                              <div className="space-y-2">
                                <div className="text-lg font-semibold text-theme-primary">
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

                                <div className="pt-2 space-y-1 text-xs">
                                  <div className="flex justify-between">
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
                                  <div className="flex justify-between">
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
                              </div>
                            ) : (
                              <div className="text-theme-muted">Daten nicht verfügbar</div>
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
                    />
                  </div>
                </div>

                {/* Clean Footer */}
                <div className="mt-8 pt-6 border-t border-theme-border text-center">
                  <p className="text-xs text-theme-muted">
                    YTD basiert auf letztem Handelstag 2024 • 
                    1M basiert auf ~30 Kalendertagen • 
                    Alle Daten via FMP API • Live-Updates alle 15 Minuten
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}