'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  SparklesIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  ArrowRightIcon,
  FireIcon,
  EyeIcon,
  CalendarIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline'

// Clean Search Component (only improved search, rest stays same)
function CleanSearchTickerInput({ 
  placeholder, 
  onSelect, 
  className 
}: { 
  placeholder: string
  onSelect: (ticker: string) => void
  className?: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filteredStocks, setFilteredStocks] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock popular stocks for search suggestions
  const POPULAR_STOCKS = [
    { ticker: 'AAPL', name: 'Apple Inc.', price: 185.25, change: 2.15 },
    { ticker: 'MSFT', name: 'Microsoft Corp.', price: 377.40, change: 0.89 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 166.64, change: 3.85 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 209.88, change: -1.23 },
    { ticker: 'TSLA', name: 'Tesla Inc.', price: 242.18, change: -2.45 },
    { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 142.95, change: 4.12 },
    { ticker: 'META', name: 'Meta Platforms', price: 532.35, change: -0.78 },
    { ticker: 'NFLX', name: 'Netflix Inc.', price: 691.41, change: 1.67 },
    { ticker: 'SAP', name: 'SAP SE', price: 178.20, change: 1.25 }
  ]

  const RECENT_SEARCHES = ['AAPL', 'TSLA', 'NVDA', 'SAP']

  useEffect(() => {
    if (query) {
      const filtered = POPULAR_STOCKS.filter(stock => 
        stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredStocks(filtered)
    } else {
      setFilteredStocks(POPULAR_STOCKS.slice(0, 6))
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
      {/* Clean Search Input */}
      <div className="relative group">
        {/* Subtle glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-green-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500"></div>
        
        {/* Search Container */}
        <div className={`relative bg-theme-card/80 backdrop-blur-sm border border-theme rounded-2xl group-hover:border-purple-500/30 group-focus-within:border-green-500/50 group-focus-within:shadow-lg group-focus-within:shadow-green-500/5 transition-all duration-300 ${className}`}>
          <div className="flex items-center px-8 py-6">
            <MagnifyingGlassIcon className="w-7 h-7 text-theme-muted group-focus-within:text-green-400 transition-colors mr-6 flex-shrink-0" />
            
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-theme-primary placeholder-theme-muted text-xl focus:outline-none"
            />
            
            {/* Command Hint */}
            <div className="hidden md:flex items-center gap-3 text-theme-muted text-sm ml-4">
              <kbd className="px-3 py-1.5 bg-theme-secondary border border-theme rounded-lg text-xs font-mono">⌘K</kbd>
              <span>Erweiterte Suche</span>
            </div>

            {/* Clear Button */}
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="ml-3 p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-secondary rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clean Search Overlay */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-3 bg-theme-card/95 backdrop-blur-xl border border-theme rounded-2xl shadow-2xl z-50 max-h-[500px] overflow-hidden">
            
            {/* Recent Searches */}
            {!query && (
              <div className="p-6 border-b border-theme">
                <div className="flex items-center gap-2 mb-4">
                  <ClockIcon className="w-4 h-4 text-theme-muted" />
                  <h3 className="text-sm font-medium text-theme-muted">Zuletzt gesucht</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RECENT_SEARCHES.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => handleSelect(ticker)}
                      className="px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary border border-theme rounded-lg text-theme-primary text-sm font-medium transition-colors"
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="max-h-80 overflow-y-auto">
              {filteredStocks.length > 0 ? (
                <div className="p-3">
                  {query && (
                    <div className="px-3 py-2 text-xs text-theme-muted font-medium mb-2">
                      {filteredStocks.length} Ergebnis{filteredStocks.length !== 1 ? 'se' : ''} für "{query}"
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredStocks.map((stock) => (
                      <button
                        key={stock.ticker}
                        onClick={() => handleSelect(stock.ticker)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-theme-secondary rounded-xl transition-all duration-200 text-left group"
                      >
                        {/* Logo Placeholder */}
                        <div className="w-12 h-12 bg-theme-tertiary rounded-xl flex items-center justify-center group-hover:bg-theme-tertiary/70 transition-colors">
                          <span className="text-theme-primary font-bold text-sm">{stock.ticker[0]}</span>
                        </div>
                        
                        {/* Stock Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-theme-primary font-bold text-lg">{stock.ticker}</span>
                            <span className="text-theme-muted text-sm">{stock.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-theme-muted">
                            <span>${stock.price.toFixed(2)}</span>
                            <span className={stock.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <ArrowRightIcon className="w-5 h-5 text-theme-muted group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-theme-muted">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Keine Ergebnisse für "{query}"</p>
                  <p className="text-sm mt-1">Versuche es mit einem Ticker-Symbol wie AAPL oder Tesla</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-theme bg-theme-secondary/30">
              <div className="flex items-center justify-between text-xs text-theme-muted">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-theme-tertiary border border-theme rounded text-xs">↵</kbd>
                    <span>Auswählen</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-theme-tertiary border border-theme rounded text-xs">Esc</kbd>
                    <span>Schließen</span>
                  </div>
                </div>
                <span className="flex items-center gap-1">
                  Powered by FinClue
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Quick Market Stats Component (same as before)
function MarketOverview() {
  const marketData = [
    { name: 'S&P 500', value: '5,968.34', change: '+0.85%', positive: true },
    { name: 'NASDAQ', value: '19,447.41', change: '+1.25%', positive: true },
    { name: 'DAX', value: '8,774.65', change: '-0.32%', positive: false },
    { name: 'Dow Jones', value: '42,208.61', change: '+0.68%', positive: true }
  ]

  return (
    <div className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <ChartBarIcon className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Marktübersicht</h2>
          <p className="text-theme-secondary text-sm">Aktuelle Indizes in Echtzeit</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {marketData.map((market) => (
          <div key={market.name} className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm">
            <div className="text-center">
              <h3 className="text-theme-primary font-semibold text-sm mb-2">{market.name}</h3>
              <div className="text-lg font-bold text-theme-primary mb-1">{market.value}</div>
              <div className={`text-sm font-medium ${market.positive ? 'text-green-400' : 'text-red-400'}`}>
                {market.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// — Hilfsfunktionen — (gleich wie vorher)
async function fetchQuote(ticker: string) {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    )
    if (!res.ok) throw new Error('Quote fetch failed')
    const [data] = await res.json()
    return {
      price: data.price as number,
      changePct: parseFloat(data.changesPercentage as string),
    }
  } catch {
    return null
  }
}

async function fetchHistorical(ticker: string): Promise<Array<{ date: string; close: number }> | null> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    )
    if (!res.ok) throw new Error('History fetch failed')
    const json = await res.json()
    return (json.historical as any[])
      .map(h => ({ date: h.date as string, close: h.close as number }))
      .reverse()
  } catch {
    return null
  }
}

function pctChange(newVal: number, oldVal: number) {
  return ((newVal - oldVal) / oldVal) * 100
}

type Quote = {
  price: number
  changePct: number
  perf1M?: number
  perfYTD?: number
}

// ✨ ERWEITERT: 12 statt 8 Aktien
const POPULAR_STOCKS = [
  'aapl', 'msft', 'googl', 'amzn', 'tsla', 'nvda', 'meta', 'nflx',
  'adbe', 'crm', 'orcl', 'intc' // 4 neue hinzugefügt
]

export default function AnalyseDashboard() {
  const router = useRouter()
  const [lastTicker, setLastTicker] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(false)

  // Last ticker aus localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastTicker')
    if (stored) setLastTicker(stored.toUpperCase())
  }, [])

  // Quotes laden
  useEffect(() => {
    setLoading(true)
        
    const loadQuotes = async () => {
      const promises = POPULAR_STOCKS.map(async (ticker) => {
        try {
          const quote = await fetchQuote(ticker)
          if (!quote) return null

          const hist = await fetchHistorical(ticker)
          if (!hist) return { ticker, quote }

          const now = new Date()
          const oneMonthAgo = new Date(now)
          oneMonthAgo.setMonth(now.getMonth() - 1)
          const h1m = hist.find(h => new Date(h.date) >= oneMonthAgo)?.close
          const startY = hist.find(h => h.date.startsWith(now.getFullYear().toString()))?.close

          const perf1M = h1m != null ? pctChange(quote.price, h1m) : undefined
          const perfYTD = startY != null ? pctChange(quote.price, startY) : undefined

          return {
            ticker,
            quote: { ...quote, perf1M, perfYTD }
          }
        } catch {
          return null
        }
      })

      const results = await Promise.all(promises)
      const newQuotes: Record<string, Quote> = {}
            
      results.forEach(result => {
        if (result) {
          newQuotes[result.ticker] = result.quote
        }
      })

      setQuotes(newQuotes)
      setLoading(false)
    }

    loadQuotes()
  }, [])

  // Aktie auswählen und weiterleitung
  const handleTickerSelect = (ticker: string) => {
    localStorage.setItem('lastTicker', ticker.toUpperCase())
    router.push(`/analyse/stocks/${ticker.toLowerCase()}`)
  }

  return (
    <div className="min-h-screen bg-theme noise-bg">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-theme noise-bg pt-24 pb-16">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/8 via-theme to-theme"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/4 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-blue-500/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm mb-6">
              <ChartBarIcon className="w-4 h-4" />
              Professionelle Investment-Analyse
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-theme-primary tracking-tight leading-tight">
              Aktien-Dashboard
            </h1>
            
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto leading-relaxed">
              Analysiere deine Lieblingsaktien mit professionellen Tools, gestützt durch eigene KI – und 
              inspiriert von den Portfolios der besten Investoren der Welt.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Market Overview */}
        <MarketOverview />
        
        {/* Recently Analyzed */}
        {lastTicker && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-theme-primary">Zuletzt analysiert</h2>
                <p className="text-theme-secondary text-sm">Setze deine Analyse fort</p>
              </div>
            </div>
                        
            <Link
              href={`/analyse/stocks/${lastTicker.toLowerCase()}`}
              className="group block"
            >
              <div className="bg-theme-card/80 border border-theme rounded-2xl p-6 backdrop-blur-sm hover:bg-theme-card hover:border-border-hover transition-all duration-200 hover:scale-[1.02]">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-theme-secondary/50 rounded-full flex items-center justify-center">
                    <span className="text-theme-primary font-bold text-xl">{lastTicker[0]}</span>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-theme-primary group-hover:text-green-400 transition-colors duration-200 mb-1">
                      {lastTicker}
                    </h3>
                    <p className="text-theme-secondary group-hover:text-theme-primary transition-colors">
                      Zur detaillierten Analyse →
                    </p>
                  </div>
                  
                  <div className="text-green-400 group-hover:translate-x-1 transition-transform duration-200">
                    <ArrowTrendingUpIcon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Enhanced Search Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <MagnifyingGlassIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-theme-primary">Aktie suchen</h2>
              <p className="text-theme-secondary text-sm">Finde und analysiere jede Aktie weltweit</p>
            </div>
          </div>
          
          {/* Clean search container */}
          <div className="max-w-4xl mx-auto">
            <CleanSearchTickerInput
              placeholder="Nach Unternehmen oder Ticker suchen (AAPL, Tesla, SAP...)"
              onSelect={handleTickerSelect}
            />
          </div>
          
          {/* Trending hint */}
          <div className="max-w-4xl mx-auto mt-4">
            <div className="flex items-center justify-center gap-2 text-theme-muted text-sm">
              <FireIcon className="w-4 h-4" />
              <span>Trending heute: NVDA (+4.2%), TSLA (-2.1%), AAPL (+1.8%)</span>
            </div>
          </div>
        </div>

        {/* Popular Stocks - KOMPAKTER GRID mit 12 Aktien */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-theme-primary">Beliebte Aktien</h2>
                <p className="text-theme-secondary text-sm">Marktführer und Wachstumswerte • 12 Top-Unternehmen</p>
              </div>
            </div>
            
            {loading && (
              <div className="flex items-center gap-3 text-sm text-theme-secondary">
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                Lade Kursdaten...
              </div>
            )}
          </div>

          {/* ✨ KOMPAKTERES GRID: 3 auf Desktop, 2 auf Tablet, 1 auf Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {POPULAR_STOCKS.map((ticker) => {
              const quote = quotes[ticker]
              const isLoading = loading && !quote

              return (
                <button
                  key={ticker}
                  onClick={() => handleTickerSelect(ticker)}
                  className="group text-left"
                >
                  {/* KOMPAKTE Card */}
                  <div className="bg-theme-card/70 border border-theme rounded-xl p-4 backdrop-blur-sm hover:bg-theme-card hover:border-border-hover transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                    
                    {/* Company Logo - KLEINER */}
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-theme-secondary/50 rounded-lg flex items-center justify-center group-hover:bg-theme-tertiary/50 transition-colors duration-200">
                        <span className="text-theme-primary font-bold text-sm">{ticker[0].toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Ticker Symbol - KOMPAKTER */}
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-theme-primary mb-2 group-hover:text-green-400 transition-colors">
                        {ticker.toUpperCase()}
                      </h3>
                                        
                      {/* Current Price - KOMPAKTER */}
                      {isLoading ? (
                        <div className="space-y-2">
                          <div className="h-6 bg-theme-secondary/50 rounded-lg animate-pulse"></div>
                          <div className="h-5 bg-theme-secondary/50 rounded-lg animate-pulse w-2/3 mx-auto"></div>
                        </div>
                      ) : quote ? (
                        <div className="space-y-2">
                          <p className="text-lg font-bold text-theme-primary">
                            {quote.price.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </p>
                          
                          <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                            quote.changePct >= 0
                              ? 'text-green-400 bg-green-500/20 border border-green-500/30'
                              : 'text-red-400 bg-red-500/20 border border-red-500/30'
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
                        <div className="text-theme-muted text-lg">–</div>
                      )}
                    </div>

                    {/* Performance Metrics - KOMPAKTER */}
                    {quote && (
                      <div className="space-y-2 pt-3 border-t border-theme/50">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-theme-secondary font-medium">1M:</span>
                          <span className={`font-semibold ${
                            quote.perf1M && quote.perf1M >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {quote.perf1M != null
                              ? `${quote.perf1M >= 0 ? '+' : ''}${quote.perf1M.toFixed(1)}%`
                              : '–'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-theme-secondary font-medium">YTD:</span>
                          <span className={`font-semibold ${
                            quote.perfYTD && quote.perfYTD >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {quote.perfYTD != null
                              ? `${quote.perfYTD >= 0 ? '+' : ''}${quote.perfYTD.toFixed(1)}%`
                              : '–'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Info Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-theme-muted">
              Alle Kurse in Echtzeit • Klicke auf eine Aktie für die detaillierte Analyse
            </p>
          </div>
        </div>

        {/* Premium CTA */}
        <div>
          <div className="bg-theme-card/80 border border-theme rounded-3xl p-12 backdrop-blur-sm text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <SparklesIcon className="w-10 h-10 text-green-400" />
            </div>
            
            <h3 className="text-3xl font-bold text-theme-primary mb-4">
              Professionelle Aktienanalyse
            </h3>
            
            <p className="text-theme-secondary mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
              Nutze erweiterte Charts, Fundamentaldaten, Dividenden-Tracking und 
              KI-gestützte Analysen für bessere Investment-Entscheidungen.
            </p>
                        
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
            >
              <SparklesIcon className="w-5 h-5" />
              Premium Features entdecken
            </Link>
            
            <div className="mt-6 text-sm text-theme-muted">
              Erste 14 Tage kostenlos • Dann 9€/Monat • Jederzeit kündbar
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}