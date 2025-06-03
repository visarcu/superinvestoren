'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LockClosedIcon, ChartBarIcon, ClockIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import SearchTickerInput from '@/components/SearchTickerInput'
import Logo from '@/components/Logo'

// — Hilfsfunktionen —
async function fetchQuote(ticker: string) {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
  )
  if (!res.ok) throw new Error('Quote fetch failed')
  const [data] = await res.json()
  return {
    price: data.price as number,
    changePct: parseFloat(data.changesPercentage as string),
  }
}

async function fetchHistorical(
  ticker: string
): Promise<Array<{ date: string; close: number }>> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
  )
  if (!res.ok) throw new Error('History fetch failed')
  const json = await res.json()
  return (json.historical as any[])
    .map(h => ({ date: h.date as string, close: h.close as number }))
    .reverse()
}

function pctChange(newVal: number, oldVal: number) {
  return ((newVal - oldVal) / oldVal) * 100
}

type Quote = {
  price:     number
  changePct: number
  perf1M?:   number
  perfYTD?:  number
}

const ALL_SECTIONS = {
  Beliebt:  ['aapl','msft','googl','amzn','tsla','nvda','META','nflx', 'axp','bac','uber','dpz'],
  Tech:     ['aapl','msft','nvda','googl','meta','orcl','sap','adbe'],
  Finanzen: ['jpm','bac','wfc','c'],
  DAX:      ['sap','sie','dte','air','alv','muv2','shl','mrk','mbg','pah3'],
}

// Nur dieser Tab ist aktiv
const ENABLED_TABS: Array<keyof typeof ALL_SECTIONS> = ['Beliebt']

export default function AnalysisIndexPage() {
  const router = useRouter()
  const [last, setLast]           = useState<string|null>(null)
  const [activeTab, setActiveTab] = useState<keyof typeof ALL_SECTIONS>('Beliebt')
  const [quotes, setQuotes]       = useState<Record<string, Quote>>({})
  const [loading, setLoading]     = useState(false)

  // Last ticker aus localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastTicker')
    if (stored) setLast(stored.toUpperCase())
  }, [])

  // Quotes + History laden, wenn Tab wechselt
  useEffect(() => {
    const syms = ALL_SECTIONS[activeTab]
    setLoading(true)
    
    const loadQuotes = async () => {
      const promises = syms.map(async (t) => {
        try {
          const q    = await fetchQuote(t)
          const hist = await fetchHistorical(t)

          const now         = new Date()
          const oneMonthAgo = new Date(now)
          oneMonthAgo.setMonth(now.getMonth() - 1)
          const h1m    = hist.find(h => new Date(h.date) >= oneMonthAgo)?.close
          const startY = hist.find(h => h.date.startsWith(now.getFullYear().toString()))?.close

          const perf1M  = h1m    != null ? pctChange(q.price, h1m)    : undefined
          const perfYTD = startY != null ? pctChange(q.price, startY) : undefined

          return {
            ticker: t,
            quote: { ...q, perf1M, perfYTD }
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
  }, [activeTab])

  // Tab-Wechsel nur, wenn freigeschaltet
  const handleTabClick = (tab: keyof typeof ALL_SECTIONS) => {
    if (ENABLED_TABS.includes(tab)) setActiveTab(tab)
  }

  // Auswahl merken + navigieren
  const handleSelect = (t: string) => {
    localStorage.setItem('lastTicker', t.toUpperCase())
    router.push(`/analyse/${t.toLowerCase()}`)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section - Clean Supabase Style */}
      <section className="relative overflow-hidden bg-gray-950">
        {/* Subtle Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="text-center">
            {/* Clean Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-8 hover:bg-green-500/20 transition-colors">
              <ChartBarIcon className="w-4 h-4" />
              <span>Aktienanalyse</span>
            </div>
            
            {/* Main Heading - Supabase Style */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
              Professionelle
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                Aktien-Analyse
              </span>
            </h2>
            
            {/* Clean Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              Live-Kurse, historische Charts, Dividenden und Kennzahlen in Sekundenschnelle.
              
            </p>

            {/* Clean Search Bar */}
            <div className="max-w-lg mx-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <div className="pl-12">
                  <SearchTickerInput
                    placeholder="Ticker eingeben (AAPL, TSLA, SAP...)"
                    onSelect={handleSelect}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area - Clean Spacing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Recently Analyzed - Clean Card */}
        {last && (
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-semibold text-white">
                Zuletzt analysiert
              </h2>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 max-w-sm">
              <Link href={`/analyse/${last.toLowerCase()}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-200">
                  <Logo
                    src={`/logos/${last.toLowerCase()}.svg`}
                    alt={`${last} Logo`}
                    className="w-8 h-8"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors duration-200">
                    {last}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Zur Analyse →
                  </p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Category Tabs - Clean Design */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <ArrowTrendingUpIcon className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">
              Aktien-Kategorien
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {Object.keys(ALL_SECTIONS).map(rawTab => {
              const tab     = rawTab as keyof typeof ALL_SECTIONS
              const enabled = ENABLED_TABS.includes(tab)
              const active  = tab === activeTab

              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  disabled={!enabled}
                  className={`
                    inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25'
                      : enabled
                        ? 'bg-gray-900/50 text-gray-300 border border-gray-800 hover:bg-gray-800 hover:text-white hover:border-gray-700'
                        : 'bg-gray-900/30 text-gray-600 border border-gray-800/50 cursor-not-allowed'}
                  `}
                >
                  <span>{tab}</span>
                  {!enabled && <LockClosedIcon className="w-4 h-4" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Stocks Grid - Clean Cards */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">
              {activeTab} Aktien
            </h2>
            {loading && (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                Lade Kursdaten...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ALL_SECTIONS[activeTab].map((ticker) => {
              const quote = quotes[ticker]
              const isLoading = loading && !quote

              return (
                <Link key={ticker} href={`/analyse/${ticker.toLowerCase()}`}>
                  <div className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 cursor-pointer">
                    
                    {/* Company Logo */}
                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-200">
                        <Logo
                          src={`/logos/${ticker.toLowerCase()}.svg`}
                          alt={`${ticker} Logo`}
                          className="w-10 h-10"
                        />
                      </div>
                    </div>

                    {/* Ticker Symbol */}
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-white mb-2">
                        {ticker.toUpperCase()}
                      </h3>
                      
                      {/* Current Price */}
                      {isLoading ? (
                        <div className="space-y-3">
                          <div className="h-6 bg-gray-800 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3 mx-auto"></div>
                        </div>
                      ) : quote ? (
                        <div>
                          <p className="text-2xl font-bold text-white mb-1">
                            {quote.price.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </p>
                          <div className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
                            quote.changePct >= 0 
                              ? 'text-green-400 bg-green-500/10' 
                              : 'text-red-400 bg-red-500/10'
                          }`}>
                            <span>{quote.changePct >= 0 ? '↗' : '↘'}</span>
                            <span>{Math.abs(quote.changePct).toFixed(2)}%</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">–</p>
                      )}
                    </div>

                    {/* Performance Metrics */}
                    {quote && (
                      <div className="space-y-3 pt-4 border-t border-gray-800">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">1M:</span>
                          <span className={`font-medium ${
                            quote.perf1M && quote.perf1M >= 0 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {quote.perf1M != null
                              ? `${quote.perf1M >= 0 ? '+' : ''}${quote.perf1M.toFixed(1)}%`
                              : '–'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">YTD:</span>
                          <span className={`font-medium ${
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
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Call to Action - Clean Supabase Style */}
      <section className="bg-gray-950 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Benötigst du erweiterte Analysen?
          </h3>
          <p className="text-lg text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            Schalte Premium-Features frei: Erweiterte Charts, Dividenden-Tracker, 
            Portfolio-Analyse und exklusive Markt-Insights.
          </p>
          
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-green-500/25">
            Premium upgraden
          </button>
        </div>
      </section>
    </div>
  )
}