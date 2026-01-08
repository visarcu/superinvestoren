// Dashboard-Component - COMPLETE VERSION WITH FIXES
'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  BookmarkIcon,
  MapIcon,
  CalendarIcon,
  SparklesIcon,
  TrophyIcon,
  StarIcon,
  EyeIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'
import { supabase } from '@/lib/supabaseClient'
// LAZY LOAD COMPONENTS
import dynamic from 'next/dynamic'
import Logo from '@/components/Logo'
const OptimizedWatchlistNews = dynamic(() => import('@/components/OptimizedWatchlistNews'), {
  loading: () => <div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>,
  ssr: false
})
const MarketMovers = dynamic(() => import('@/components/MarketMovers'), {
  loading: () => <div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>,
  ssr: false
})
const MostFollowed = dynamic(() => import('@/components/MostFollowed'), {
  loading: () => <div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>,
  ssr: false
})
const LatestGuruTrades = dynamic(() => import('@/components/LatestGuruTrades'), {
  loading: () => <div className="animate-pulse bg-theme-secondary rounded-lg h-48"></div>,
  ssr: false
})


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
  const [stocksInteractive, setStocksInteractive] = useState(false)
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

  // Two-phase loading: immediate cached data + full data
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      setMarketLoading(true)
      
      try {
        // Phase 1: Load cached popular stocks + markets immediately
        const cachedResponse = await fetch('/api/dashboard-cached')
        if (cachedResponse.ok) {
          const cachedData = await cachedResponse.json()
          if (cachedData.quotes) {
            setQuotes(cachedData.quotes)
            setStocksInteractive(true) // Stocks are now clickable
          }
          if (cachedData.markets) setMarketQuotes(cachedData.markets)
          setMarketLoading(false) // Markets loaded immediately
        }
        
        // Phase 2: Load full data including watchlist stocks
        const allTickers = [...POPULAR_STOCKS, ...watchlistTickers]
        const uniqueTickers = [...new Set(allTickers)]
        
        if (uniqueTickers.length > POPULAR_STOCKS.length) {
          const tickers = uniqueTickers.join(',')
          const fullResponse = await fetch(`/api/dashboard?tickers=${tickers}`)
          
          if (fullResponse.ok) {
            const fullData = await fullResponse.json()
            if (fullData.quotes) setQuotes(fullData.quotes)
            if (fullData.markets) setMarketQuotes(fullData.markets)
          }
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
    // Immediate localStorage update
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastTicker', ticker.toUpperCase())
    }
    
    // Use window.location for immediate navigation (faster than router.push during loading)
    const targetUrl = `/analyse/stocks/${ticker.toLowerCase()}`
    
    if (loading || marketLoading) {
      // During loading state, use direct navigation for better UX
      window.location.href = targetUrl
    } else {
      // Normal state, use router for better transitions
      router.push(targetUrl)
    }
  }, [router, loading, marketLoading])

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


        {/* Professional Grid Layout - Clean Card Flow */}
        <div className="space-y-8">
          
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
                  disabled={!stocksInteractive}
                  className={`group bg-theme-card border border-theme/10 rounded-xl p-5 transition-all duration-200 h-[140px] flex flex-col justify-between ${
                    stocksInteractive 
                      ? 'hover:border-green-500/30 cursor-pointer' 
                      : 'cursor-not-allowed opacity-60'
                  }`}
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

          {/* Section: Dashboard Components - Optimized Layout */}
          <section>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-theme-primary mb-2">Dashboard</h2>
              <p className="text-sm text-theme-muted">Nachrichten, Trends und Marktbewegungen</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recently Analyzed + Quick Actions - Render immediately */}
            <div className="space-y-6">
              {/* Recently Analyzed */}
              {lastTicker && (
                <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[200px] flex flex-col">
                  <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-4">Zuletzt analysiert</h2>
                  
                  <button
                    onClick={() => handleTickerSelect(lastTicker)}
                    disabled={!stocksInteractive}
                    className={`group flex items-center gap-3 p-3 rounded-lg transition-all duration-200 flex-1 ${
                      stocksInteractive 
                        ? 'hover:bg-theme-secondary cursor-pointer' 
                        : 'cursor-not-allowed opacity-60'
                    }`}
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

            {/* Watchlist News - Lazy loaded */}
            <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[416px] flex flex-col">
              <React.Suspense fallback={<div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>}>
                <OptimizedWatchlistNews watchlistTickers={watchlistTickers} />
              </React.Suspense>
            </div>

            {/* Right Column - Market Movers (full height) */}
            <div className="space-y-6">
              {/* Market Movers - Now takes full height */}
              <div className="bg-theme-card border border-theme/10 rounded-xl p-5 h-[416px] flex flex-col">
                <React.Suspense fallback={<div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>}>
                  <MarketMovers 
                    watchlistTickers={watchlistTickers}
                    popularTickers={POPULAR_STOCKS}
                  />
                </React.Suspense>
              </div>
            </div>
          </div>
          </section>

          {/* Section: Super-Investors */}
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-theme-primary mb-2">Super-Investor Trades</h2>
              <p className="text-sm text-theme-muted">Aktuelle Käufe und Verkäufe der erfolgreichsten Investoren</p>
            </div>

            {/* Guru Trades - Full Width */}
            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-theme-primary">Neueste 13F Trades</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <React.Suspense fallback={<div className="animate-pulse bg-theme-secondary rounded-lg h-48"></div>}>
                  <LatestGuruTrades variant="full" />
                </React.Suspense>
              </div>
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