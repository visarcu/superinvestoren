'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
import { stocks } from '@/data/stocks'
import holdingsHistory from '@/data/holdings'
import { investors } from '@/data/investors'
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

// ===== SEARCH COMPONENT - Enhanced but keeping functionality =====
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

  useEffect(() => {
    if (query) {
      const filtered = stocks.filter(stock => 
        stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
      setFilteredStocks(filtered)
    } else {
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
      {/* Enhanced search input - subtle professional accents */}
      <div className="bg-theme-secondary/50 rounded-xl hover:bg-theme-secondary/70 focus-within:bg-theme-secondary/70 focus-within:ring-2 focus-within:ring-amber-400/30 transition-all duration-200 border border-theme/10 hover:border-amber-400/30 focus-within:border-amber-400/40">
        <div className="flex items-center px-4 py-4">
          <MagnifyingGlassIcon className="w-5 h-5 text-theme-muted focus-within:text-amber-400 mr-3 flex-shrink-0" />
          
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-theme-primary placeholder-theme-muted text-base focus:outline-none font-medium"
          />
          
          <div className="hidden md:flex items-center gap-1 text-theme-muted text-sm ml-3">
            <kbd className="px-2 py-1 bg-theme-tertiary/50 rounded text-xs">⌘K</kbd>
          </div>

          {query && (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="ml-3 p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-theme-card backdrop-blur-sm border border-theme/20 rounded-lg shadow-2xl z-50 max-h-80 overflow-hidden">
            
            <div className="max-h-72 overflow-y-auto">
              {filteredStocks.length > 0 ? (
                <div className="p-2">
                  {query && (
                    <div className="px-2 py-1.5 text-xs text-theme-muted font-medium">
                      {filteredStocks.length} Ergebnis{filteredStocks.length !== 1 ? 'se' : ''} für "{query}"
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredStocks.map((stock) => (
                      <button
                        key={stock.ticker}
                        onClick={() => handleSelect(stock.ticker)}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-theme-secondary/30 rounded-lg transition-all duration-200 text-left group"
                      >
                        <Logo 
                          ticker={stock.ticker} 
                          alt={`${stock.ticker} Logo`}
                          className="w-8 h-8"
                          padding="small"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-theme-primary font-semibold text-sm">{stock.ticker}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-theme-tertiary/50 text-theme-muted rounded">
                              {stock.market || 'NASDAQ'}
                            </span>
                          </div>
                          <div className="text-xs text-theme-muted truncate">{stock.name}</div>
                        </div>
                        
                        <ArrowRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-400 group-hover:translate-x-0.5 transition-all duration-200" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-theme-muted">
                  <MagnifyingGlassIcon className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine Ergebnisse für "{query}"</p>
                </div>
              )}
            </div>
            
            <div className="p-2.5 border-t border-theme/10 bg-theme-secondary/10">
              <div className="flex items-center justify-between text-xs text-theme-muted">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-theme-tertiary/50 rounded text-xs">↵</kbd>
                    <span>Auswählen</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-theme-tertiary/50 rounded text-xs">Esc</kbd>
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

// ===== SUPER-INVESTOR STOCKS COMPONENT - Keeping original =====
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
    <div className="space-y-3">
      {/* Header mit Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">
            {view === 'hidden_gems' ? '💎 Hidden Gems' : '⚡ Recent Buys'}
          </h3>
          <p className="text-xs text-theme-muted mt-0">
            {view === 'hidden_gems' 
              ? 'Super-Investor Favoriten abseits des Mainstreams' 
              : 'Neueste Käufe der erfolgreichsten Investoren'}
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-theme-tertiary/20 rounded p-0.5">
          <button
            onClick={() => setView('hidden_gems')}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              view === 'hidden_gems'
                ? 'bg-green-500/10 text-green-400'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            💎 Hidden Gems
          </button>
          <button
            onClick={() => setView('recent_buys')}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              view === 'recent_buys'
                ? 'bg-green-500/10 text-green-400'
                : 'text-theme-muted hover:text-theme-primary'
            }`}
          >
            ⚡ Recent Buys
          </button>
        </div>
      </div>

      {/* Stocks Grid - FISCAL STYLE */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {currentData.map((item) => {
          const quote = quotes[item.ticker.toLowerCase()]

          return (
            <button
              key={item.ticker}
              onClick={() => onSelect(item.ticker)}
              className="group text-left p-3 rounded-lg hover:bg-theme-secondary/20 transition-all duration-200"
            >
              
              <div className="flex items-center justify-between mb-2">
                <Logo 
                  ticker={item.ticker} 
                  alt={`${item.ticker} Logo`}
                  className="w-6 h-6"
                  padding="small"
                />
                
                <div className="flex items-center gap-1">
                  <UserGroupIcon className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400 font-semibold">{item.count}</span>
                </div>
              </div>

              <div className="mb-2">
                <h4 className="text-sm font-semibold text-theme-primary group-hover:text-green-400 transition-colors">
                  {item.ticker}
                </h4>
                <p className="text-xs text-theme-muted">
                  {view === 'hidden_gems' ? `${item.count} Investoren` : `${item.count} Käufer`}
                </p>
              </div>
                            
              {quote ? (
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-theme-primary">
                    ${quote.price.toFixed(2)}
                  </div>
                  
                  <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                    quote.changePct >= 0
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-red-400 bg-red-500/10'
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
                <div className="text-theme-muted text-xs">Live-Preis lädt...</div>
              )}

              {/* Value Info */}
              <div className="mt-2 pt-2 border-t border-theme/5">
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

      {/* Footer */}
      <div className="pt-2 border-t border-theme/5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-theme-muted">
            {view === 'hidden_gems' 
              ? 'Basiert auf neuesten 13F-Filings (ohne Mainstream-Aktien)' 
              : 'Neueste Quartal-Käufe'}
          </p>
          <Link
            href="/superinvestor/insights"
            className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
          >
            Mehr Insights
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ===== MAIN DASHBOARD COMPONENT - IMPROVED LAYOUT =====
export default function FiscalTypographyDashboard() {
  const router = useRouter()
  const [lastTicker, setLastTicker] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    async function loadQuotesFromAPI() {
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
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-4 py-4 space-y-4">
        
        {/* Marktübersicht - Original style */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-4 border-b border-theme/5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-theme-primary mb-1">Marktübersicht</h1>
                <p className="text-xs text-theme-muted">
                  Live-Kurse • 
                  Deutschland: {currentTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} • 
                  USA: {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })} EST
                </p>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {marketData.map((market) => (
                <div key={market.name} className="space-y-3">
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{market.flag}</span>
                      <h3 className="text-theme-primary font-semibold text-sm">{market.name}</h3>
                    </div>
                    <div className={`text-xs px-2.5 py-1 rounded-full ${
                      market.status === 'OPEN' 
                        ? 'bg-green-500/10 text-green-400' 
                        : 'bg-theme-tertiary/50 text-theme-muted'
                    }`}>
                      {market.status === 'OPEN' ? 'Offen' : 'Geschlossen'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-theme-primary">{market.value}</div>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1 text-sm font-semibold ${
                        market.positive ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {market.positive ? (
                          <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
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
        </div>

        {/* Enhanced Search Section - More prominent */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div>
                <h2 className="text-xl font-bold text-theme-primary mb-2">Aktie suchen</h2>
                <p className="text-theme-muted">Analysiere jede Aktie weltweit</p>
              </div>
              
              <TerminalSearchInput
                placeholder="Ticker oder Unternehmen suchen (AAPL, Tesla, SAP...)"
                onSelect={handleTickerSelect}
              />

              {/* Quick Access Tags */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-sm text-theme-muted mr-2">Beliebt:</span>
                {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'].map((ticker) => (
                  <button
                    key={ticker}
                    onClick={() => handleTickerSelect(ticker)}
                    className="px-3 py-1.5 bg-theme-tertiary/30 hover:bg-theme-tertiary/50 hover:border-amber-400/30 text-theme-primary rounded-full text-sm font-medium transition-all duration-200 border border-theme/20"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Layout Improvement: Sidebar + Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          
          {/* Sidebar - Recently Analyzed + Quick Actions */}
          <div className="xl:col-span-1 space-y-4">
            
            {/* Recently Analyzed - Compact */}
            {lastTicker && (
              <div className="bg-theme-card rounded-lg">
                <div className="p-4 border-b border-theme/5">
                  <h2 className="text-sm font-semibold text-theme-primary mb-1">Zuletzt analysiert</h2>
                  <p className="text-xs text-theme-muted">Setze deine Analyse fort</p>
                </div>
                
                <div className="p-4">
                  <Link
                    href={`/analyse/stocks/${lastTicker.toLowerCase()}`}
                    className="group block p-3 rounded-lg hover:bg-theme-secondary/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Logo 
                        ticker={lastTicker} 
                        alt={`${lastTicker} Logo`}
                        className="w-10 h-10"
                        padding="small"
                      />
                      
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-theme-primary group-hover:text-green-400 transition-colors">
                          {lastTicker}
                        </h3>
                        <p className="text-xs text-theme-muted">
                          Zur detaillierten Analyse
                        </p>
                      </div>
                      
                      <ArrowRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-theme-card rounded-lg">
              <div className="p-4 border-b border-theme/5">
                <h2 className="text-sm font-semibold text-theme-primary">Schnellzugriff</h2>
              </div>
              
              <div className="p-4 space-y-1">
                {[
                  { icon: BookmarkIcon, label: 'Watchlist', color: 'blue', href: '/analyse/watchlist' },
                  { icon: MapIcon, label: 'Heatmap', color: 'red', href: '/analyse/heatmap' },
                  { icon: CalendarIcon, label: 'Earnings', color: 'green', href: '/analyse/earnings' },
                  { icon: SparklesIcon, label: 'FinClue AI', color: 'purple', href: '/analyse/ai' }
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-theme-secondary/20 transition-all duration-200"
                  >
                    <div className={`w-8 h-8 bg-${item.color}-500/20 rounded-lg flex items-center justify-center group-hover:bg-${item.color}-500/30 transition-colors`}>
                      <item.icon className={`w-4 h-4 text-${item.color}-400`} />
                    </div>
                    <span className={`text-sm font-medium text-theme-primary group-hover:text-${item.color}-400 transition-colors`}>
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Beliebte Aktien + Hidden Gems */}
          <div className="xl:col-span-3">
            <div className="bg-theme-card rounded-lg">
              <div className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  
                  {/* Links: Beliebte Aktien - Clean cards */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-base font-semibold text-theme-primary mb-1">Beliebte Aktien</h2>
                        <p className="text-xs text-theme-muted">Mit Live-Kursen und Performance</p>
                      </div>
                      
                      {loading && (
                        <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                          <div className="w-2.5 h-2.5 border border-green-400 border-t-transparent rounded-full animate-spin"></div>
                          Lade Kurse...
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {POPULAR_STOCKS.slice(0, 4).map((ticker) => {
                        const quote = quotes[ticker.toLowerCase()]
                        const isLoading = loading && !quote

                        return (
                          <div key={ticker} className="bg-theme-card rounded-lg border border-theme/5">
                            <button
                              onClick={() => handleTickerSelect(ticker)}
                              className="group text-left p-4 rounded-lg hover:bg-theme-secondary/20 transition-all duration-200 w-full"
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

                            <div className="mb-3">
                              <h3 className="text-sm font-semibold text-theme-primary group-hover:text-green-400 transition-colors">
                                {ticker}
                              </h3>
                            </div>
                                          
                            {isLoading ? (
                              <div className="space-y-2">
                                <div className="h-4 bg-theme-tertiary/20 rounded animate-pulse"></div>
                                <div className="h-3 bg-theme-tertiary/20 rounded w-2/3 animate-pulse"></div>
                              </div>
                            ) : quote ? (
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-theme-primary">
                                  ${quote.price.toFixed(2)}
                                </div>
                                
                                <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                                  quote.changePct >= 0
                                    ? 'text-green-400 bg-green-500/10'
                                    : 'text-red-400 bg-red-500/10'
                                }`}>
                                  {quote.changePct >= 0 ? (
                                    <ArrowTrendingUpIcon className="w-3 h-3" />
                                  ) : (
                                    <ArrowTrendingDownIcon className="w-3 h-3" />
                                  )}
                                  <span>{Math.abs(quote.changePct).toFixed(2)}%</span>
                                </div>

                                <div className="pt-2 border-t border-theme/5 space-y-1">
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
                              </div>
                            ) : (
                              <div className="text-theme-muted text-xs">Daten nicht verfügbar</div>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  </div>

                  {/* Rechts: Hidden Gems - Original Component */}
                  <div>
                    <SuperInvestorStocks 
                      quotes={quotes}
                      onSelect={handleTickerSelect}
                    />
                  </div>
                </div>

                {/* Footer mit mehr Abstand */}
                <div className="mt-8 pt-4 border-t border-theme/5 text-center">
                  <p className="text-xs text-theme-muted max-w-4xl mx-auto">
                    YTD basiert auf letztem Handelstag des Vorjahres • 
                    1M basiert auf ~21 Handelstagen • 
                    Hidden Gems: Super-Investor Favoriten ohne Mainstream-Aktien
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