// Dashboard-Component - FEY/LINEAR STYLE
'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  SparklesIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'
import { supabase } from '@/lib/supabaseClient'
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
const LatestGuruTrades = dynamic(() => import('@/components/LatestGuruTrades'), {
  loading: () => <div className="animate-pulse bg-theme-secondary rounded-lg h-48"></div>,
  ssr: false
})
const SectorPerformance = dynamic(() => import('@/components/SectorPerformance'), {
  loading: () => <div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>,
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
  dayLow?: number
  dayHigh?: number
  timestamp?: number
  perf7d?: number | null
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

// ===== MARKET ROW COMPONENT =====
function MarketRow({ market, quote, isLoading, formatStockPrice, formatPercentage }: {
  market: { name: string; flag: string; key: string; status: string }
  quote: MarketQuote | undefined
  isLoading: boolean
  formatStockPrice: (price: number, showCurrency: boolean) => string
  formatPercentage: (pct: number) => string
}) {
  const pctCell = (val: number | null | undefined, loading: boolean) => {
    if (loading) return <div className="h-4 w-10 bg-theme-secondary rounded animate-pulse ml-auto" />
    if (val == null) return <span className="text-theme-muted text-xs">—</span>
    const pos = val >= 0
    return (
      <span className={`font-medium text-sm ${pos ? 'text-green-400' : 'text-red-400'}`}>
        {formatPercentage(val)}
      </span>
    )
  }

  return (
    <tr className="hover:bg-theme-hover transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span>{market.flag}</span>
          <span className="font-medium text-theme-primary text-sm">{market.name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-theme-primary text-sm">
        {isLoading ? (
          <div className="h-4 w-16 bg-theme-secondary rounded animate-pulse ml-auto" />
        ) : quote ? formatStockPrice(quote.price, false) : '--'}
      </td>
      {/* 24h% */}
      <td className="px-4 py-2.5 text-right">
        {pctCell(quote?.changePct, isLoading)}
      </td>
      {/* 7d% */}
      <td className="px-4 py-2.5 text-right hidden sm:table-cell">
        {pctCell(quote?.perf7d, isLoading)}
      </td>
      {/* Tagesrange */}
      <td className="px-4 py-2.5 hidden lg:table-cell">
        {quote?.dayLow && quote?.dayHigh && quote?.price ? (() => {
          const range = quote.dayHigh - quote.dayLow
          const pos = range > 0 ? ((quote.price - quote.dayLow) / range) * 100 : 50
          return (
            <div className="flex items-center gap-1.5 min-w-[110px]">
              <span className="text-[10px] text-theme-muted font-mono">{formatStockPrice(quote.dayLow, false)}</span>
              <div className="flex-1 h-1 bg-theme-secondary rounded-full relative">
                <div
                  className={`absolute top-0 h-full w-1.5 rounded-full ${quote.positive ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ left: `calc(${Math.min(Math.max(pos, 0), 96)}% - 2px)` }}
                />
              </div>
              <span className="text-[10px] text-theme-muted font-mono">{formatStockPrice(quote.dayHigh, false)}</span>
            </div>
          )
        })() : null}
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className={`text-xs px-2 py-0.5 rounded ${
          market.status === 'OPEN' ? 'bg-green-500/10 text-green-400' : 'bg-theme-secondary text-theme-muted'
        }`}>
          {market.status === 'OPEN' ? 'Open' : 'Closed'}
        </span>
      </td>
    </tr>
  )
}

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
  const [userName, setUserName] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [lastMarketUpdate, setLastMarketUpdate] = useState<Date | null>(null)
  const { formatStockPrice, formatPercentage } = useCurrency()

  const POPULAR_STOCKS = useMemo(() => [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA',
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ], [])

  // Load Watchlist & User Profile
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Load watchlist
          const { data: watchlistData } = await supabase
            .from('watchlists')
            .select('ticker')
            .eq('user_id', session.user.id)

          if (watchlistData) {
            setWatchlistTickers(watchlistData.map(item => item.ticker))
          }

          // Load user profile for name
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (profile?.first_name) {
            setUserName(profile.first_name)
          } else if (session.user.email) {
            // Fallback: Extract name from email (part before @)
            const emailName = session.user.email.split('@')[0]
            // Capitalize first letter
            const capitalizedName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
            setUserName(capitalizedName)
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }
    loadUserData()
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

  // Load dashboard data (markets, quotes, sectors)
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      setMarketLoading(true)

      try {
        // Load cached data and sector data in parallel
        const [cachedResponse] = await Promise.all([
          fetch('/api/dashboard-cached'),
          fetch('/api/sector-performance') // Preload for sector component
        ])

        if (cachedResponse.ok) {
          const cachedData = await cachedResponse.json()
          if (cachedData.quotes) {
            setQuotes(cachedData.quotes)
            setStocksInteractive(true)
          }
          if (cachedData.markets && Object.keys(cachedData.markets).length > 0) {
            setMarketQuotes(cachedData.markets)
          }
          setLastMarketUpdate(new Date())
          setMarketLoading(false)
        }

        // Load additional watchlist tickers if needed
        const allTickers = [...POPULAR_STOCKS, ...watchlistTickers]
        const uniqueTickers = [...new Set(allTickers)]

        if (uniqueTickers.length > POPULAR_STOCKS.length) {
          const tickers = uniqueTickers.join(',')
          const fullResponse = await fetch(`/api/dashboard?tickers=${tickers}`)

          if (fullResponse.ok) {
            const fullData = await fullResponse.json()
            if (fullData.quotes) setQuotes(fullData.quotes)
            if (fullData.markets && Object.keys(fullData.markets).length > 0) {
              setMarketQuotes(fullData.markets)
              setLastMarketUpdate(new Date())
            }
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

  // Auto-refresh markets every 60 seconds
  useEffect(() => {
    const refreshMarkets = async () => {
      try {
        const res = await fetch('/api/dashboard-cached')
        if (res.ok) {
          const data = await res.json()
          if (data.markets) {
            setMarketQuotes(data.markets)
            setLastMarketUpdate(new Date())
          }
        }
      } catch {
        // Silent fail – kein UI-Fehler bei Netzwerkproblem
      }
    }

    const interval = setInterval(refreshMarkets, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleTickerSelect = useCallback((ticker: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastTicker', ticker.toUpperCase())
    }

    const targetUrl = `/analyse/stocks/${ticker.toLowerCase()}`

    if (loading || marketLoading) {
      window.location.href = targetUrl
    } else {
      router.push(targetUrl)
    }
  }, [router, loading, marketLoading])

  const indicesData = useMemo(() => [
    { name: 'S&P 500',           flag: '🇺🇸', key: 'spx',   ...getMarketStatus("America/New_York", 9.5, 16) },
    { name: 'NASDAQ 100',        flag: '🇺🇸', key: 'ixic',  ...getMarketStatus("America/New_York", 9.5, 16) },
    { name: 'Dow Jones',         flag: '🇺🇸', key: 'dji',   ...getMarketStatus("America/New_York", 9.5, 16) },
    { name: 'DAX',               flag: '🇩🇪', key: 'dax',   ...getMarketStatus("Europe/Berlin", 9, 17.5) },
    { name: 'STOXX Europe 600',  flag: '🇪🇺', key: 'stoxx', ...getMarketStatus("Europe/Berlin", 9, 17.5) },
  ], [currentTime])

  const commoditiesData = useMemo(() => [
    { name: 'Bitcoin', flag: '₿',  key: 'btc',    status: 'OPEN' as const },
    { name: 'Gold',    flag: '🥇', key: 'gold',   status: 'OPEN' as const },
    { name: 'Silber',  flag: '🥈', key: 'silver', status: 'OPEN' as const },
    { name: 'Öl (Brent)', flag: '🛢️', key: 'oil', status: 'OPEN' as const },
  ], [])

  // Legacy alias für market sentiment
  const marketData = useMemo(() => [...indicesData, ...commoditiesData], [indicesData, commoditiesData])

  // Calculate market sentiment
  const marketSentiment = useMemo(() => {
    const quotes = Object.values(marketQuotes)
    if (quotes.length === 0) return null
    const positiveCount = quotes.filter(q => q.positive).length
    const isBullish = positiveCount >= quotes.length / 2
    return {
      isBullish,
      text: isBullish ? 'Die Märkte sind bullisch' : 'Die Märkte sind bearisch',
      description: isBullish
        ? 'Die wichtigsten Indizes zeigen positive Entwicklungen.'
        : 'Die wichtigsten Indizes zeigen negative Entwicklungen.'
    }
  }, [marketQuotes])

  // Load AI Market Summary once when market data becomes available
  const aiSummaryLoadedRef = React.useRef(false)
  useEffect(() => {
    // Only load once, when market data is available and no summary yet
    if (aiSummaryLoadedRef.current || Object.keys(marketQuotes).length === 0) return
    aiSummaryLoadedRef.current = true

    async function loadAiSummary() {
      setAiSummaryLoading(true)
      try {
        const sectorRes = await fetch('/api/sector-performance')
        const sectorData = sectorRes.ok ? await sectorRes.json() : { sectors: [] }

        const response = await fetch('/api/market-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markets: marketQuotes,
            sectors: sectorData.sectors || []
          })
        })

        if (response.ok) {
          const data = await response.json()
          setAiSummary(data.summary)
        }
      } catch (error) {
        console.error('Failed to load AI summary:', error)
      } finally {
        setAiSummaryLoading(false)
      }
    }

    loadAiSummary()
  }, [marketQuotes])

  return (
    <div className="min-h-screen bg-theme-primary">

      {/* Hero - Persönliche Begrüßung */}
      <div className="px-6 lg:px-8 py-6 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-theme-primary">
              Hallo{userName ? ` ${userName}` : ''} 👋
            </h1>
            <p className="text-theme-muted text-sm">
              {currentTime.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/analyse/finclue-ai"
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-green-400 text-black font-medium rounded-lg text-sm transition-all"
            >
              <SparklesIcon className="w-4 h-4" />
              Finclue AI
            </Link>
            <Link
              href="/analyse/watchlist"
              className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-white/[0.06] hover:bg-theme-hover text-theme-primary rounded-lg text-sm transition-all"
            >
              <EyeIcon className="w-4 h-4" />
              Watchlist
            </Link>
            {/* Live Badge */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-theme-card border border-white/[0.06]">
              <div className={`w-1.5 h-1.5 rounded-full ${marketLoading ? 'bg-amber-400' : 'bg-green-400'} animate-pulse`}></div>
              <span className="text-xs text-theme-muted">{marketLoading ? 'Lädt...' : 'Live'}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="px-6 lg:px-8 py-6 space-y-6">

        {/* Market Intelligence Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Market Sentiment Card */}
          <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              {marketSentiment ? (
                <>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    marketSentiment.isBullish
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {marketSentiment.text}
                  </span>
                  {marketSentiment.isBullish ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
                  )}
                </>
              ) : (
                <span className="px-2 py-1 bg-theme-secondary text-theme-muted text-xs font-medium rounded">
                  Marktdaten werden geladen...
                </span>
              )}
            </div>
            <p className="text-sm text-theme-secondary leading-relaxed">
              {aiSummaryLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border border-theme-muted border-t-transparent rounded-full animate-spin"></span>
                  Analysiere Marktbewegungen...
                </span>
              ) : aiSummary ? (
                aiSummary
              ) : (
                marketSentiment?.description || 'Analysiere aktuelle Marktbewegungen...'
              )}
            </p>
          </div>

          {/* Sector Performance Card */}
          <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5">
            <React.Suspense fallback={<div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>}>
              <SectorPerformance />
            </React.Suspense>
          </div>

        </div>

        {/* Markets Section */}
        <section>
          <h2 className="text-lg font-semibold text-theme-primary mb-4">
            Märkte
            {Object.keys(marketQuotes).length > 0 && (
              <span className="text-xs font-normal text-theme-muted ml-2">
                Stand: {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
              </span>
            )}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Markets Table */}
            <div className="bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-theme-muted">Name</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-theme-muted">Kurs</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-theme-muted">24h %</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-theme-muted hidden sm:table-cell">7d %</th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-theme-muted hidden lg:table-cell">Tagesrange</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-theme-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Indizes */}
                  <tr>
                    <td colSpan={6} className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-theme-muted">Indizes</span>
                    </td>
                  </tr>
                  {indicesData.map((market) => {
                    const quote = marketQuotes[market.key]
                    const isLoading = marketLoading && !quote
                    return (
                      <MarketRow key={market.key} market={market} quote={quote} isLoading={isLoading} formatStockPrice={formatStockPrice} formatPercentage={formatPercentage} />
                    )
                  })}

                  {/* Rohstoffe & Crypto */}
                  <tr>
                    <td colSpan={5} className="px-4 pt-4 pb-1 border-t border-white/[0.04]">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-theme-muted">Rohstoffe & Crypto</span>
                    </td>
                  </tr>
                  {commoditiesData.map((market) => {
                    const quote = marketQuotes[market.key]
                    const isLoading = marketLoading && !quote
                    return (
                      <MarketRow key={market.key} market={market} quote={quote} isLoading={isLoading} formatStockPrice={formatStockPrice} formatPercentage={formatPercentage} />
                    )
                  })}
                  <tr><td colSpan={6} className="pb-1" /></tr>
                </tbody>
              </table>
            </div>

            {/* Recently Analyzed */}
            <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5">
              <h3 className="text-sm font-medium text-theme-primary mb-4">Zuletzt analysiert</h3>

              {lastTicker ? (
                <button
                  onClick={() => handleTickerSelect(lastTicker)}
                  disabled={!stocksInteractive}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    stocksInteractive
                      ? 'hover:bg-theme-hover cursor-pointer'
                      : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <Logo
                    ticker={lastTicker}
                    alt={`${lastTicker} Logo`}
                    className="w-10 h-10 rounded-lg"
                  />
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-theme-primary">{lastTicker}</h4>
                    <p className="text-xs text-theme-muted">Klicken zum Analysieren</p>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-theme-muted" />
                </button>
              ) : (
                <p className="text-sm text-theme-muted text-center py-4">
                  Noch keine Aktie analysiert
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Beliebte Aktien - Kompakter */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-theme-primary">Beliebte Aktien</h2>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-theme-muted">
                <div className="w-2 h-2 border border-theme-muted border-t-transparent rounded-full animate-spin"></div>
                Aktualisiere...
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {POPULAR_STOCKS.slice(0, 8).map((ticker) => {
              const quote = quotes[ticker.toLowerCase()]
              const isLoading = loading && !quote

              return (
                <button
                  key={ticker}
                  onClick={() => handleTickerSelect(ticker)}
                  disabled={!stocksInteractive}
                  className={`group bg-theme-card border border-white/[0.04] rounded-xl p-3 transition-all h-[100px] flex flex-col justify-between ${
                    stocksInteractive
                      ? 'hover:border-brand/30 hover:bg-theme-hover cursor-pointer'
                      : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Logo
                      ticker={ticker}
                      alt={`${ticker} Logo`}
                      className="w-7 h-7 rounded-md"
                    />
                    {quote && (
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        quote.changePct >= 0 ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                    )}
                  </div>

                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-theme-primary group-hover:text-brand transition-colors">
                      {ticker}
                    </h3>
                    {isLoading ? (
                      <div className="h-3 bg-theme-secondary rounded w-16 animate-pulse mt-1"></div>
                    ) : quote ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-theme-secondary">{formatStockPrice(quote.price)}</span>
                        <span className={quote.changePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatPercentage(quote.changePct)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-theme-muted">--</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Watchlist News */}
          <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5 min-h-[350px]">
            <React.Suspense fallback={<div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>}>
              <OptimizedWatchlistNews watchlistTickers={watchlistTickers} />
            </React.Suspense>
          </div>

          {/* Market Movers */}
          <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5 min-h-[350px]">
            <React.Suspense fallback={<div className="animate-pulse bg-theme-secondary rounded-lg h-32"></div>}>
              <MarketMovers
                watchlistTickers={watchlistTickers}
                popularTickers={POPULAR_STOCKS}
              />
            </React.Suspense>
          </div>
        </div>

        {/* Super-Investor Trades */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-medium text-theme-muted uppercase tracking-wide">Super-Investor Trades</h2>
            <p className="text-xs text-theme-muted mt-1">Aktuelle Käufe und Verkäufe der erfolgreichsten Investoren</p>
          </div>

          <div className="bg-theme-card border border-white/[0.04] rounded-xl p-5">
            <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
              <React.Suspense fallback={<div className="animate-pulse bg-theme-secondary rounded-lg h-48"></div>}>
                <LatestGuruTrades variant="full" />
              </React.Suspense>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
