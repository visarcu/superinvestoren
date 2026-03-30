// src/app/(website)/marktindikatoren/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

interface MarketIndicator {
  id: string
  name: string
  value: string
  change?: string
  changePercent?: string
  status: 'up' | 'down' | 'neutral'
  description: string
  category: 'market' | 'treasury' | 'economy' | 'valuation'
  lastUpdated: string
  source?: string
}

const mockIndicators: MarketIndicator[] = [
  {
    id: 'buffett-indicator',
    name: 'Buffett Indikator',
    value: '185%',
    change: '+2.3%',
    changePercent: '+2.3',
    status: 'up',
    description: 'Total Market Cap / GDP — Buffetts bevorzugter Bewertungsindikator für den Gesamtmarkt',
    category: 'valuation',
    lastUpdated: '2024-11-08',
    source: 'FMP'
  },
  {
    id: 'sp500-pe',
    name: 'S&P 500 KGV',
    value: '24.8',
    change: '-0.5',
    changePercent: '-2.0',
    status: 'down',
    description: 'Kurs-Gewinn-Verhältnis des S&P 500 Index',
    category: 'valuation',
    lastUpdated: '2024-11-08',
    source: 'FMP'
  },
  {
    id: 'vix',
    name: 'VIX',
    value: '16.2',
    change: '-1.8',
    changePercent: '-10.0',
    status: 'down',
    description: 'Volatilitätsindex — misst die erwartete Marktvolatilität (Fear Index)',
    category: 'market',
    lastUpdated: '2024-11-08',
    source: 'CBOE'
  },
  {
    id: '10y-treasury',
    name: '10Y US Treasury',
    value: '4.32%',
    change: '+0.12%',
    changePercent: '+2.9',
    status: 'up',
    description: '10-jährige US-Staatsanleihen Rendite',
    category: 'treasury',
    lastUpdated: '2024-11-08',
    source: 'FMP'
  },
  {
    id: '2y-treasury',
    name: '2Y US Treasury',
    value: '4.18%',
    change: '+0.08%',
    changePercent: '+2.0',
    status: 'up',
    description: '2-jährige US-Staatsanleihen Rendite',
    category: 'treasury',
    lastUpdated: '2024-11-08',
    source: 'FMP'
  },
  {
    id: 'yield-curve',
    name: 'Yield Curve (10Y-2Y)',
    value: '+0.14%',
    change: '+0.04%',
    changePercent: '+40.0',
    status: 'up',
    description: 'Spread zwischen 10Y und 2Y Treasuries — Rezessionsindikator',
    category: 'treasury',
    lastUpdated: '2024-11-08',
    source: 'FMP'
  },
  {
    id: 'inflation',
    name: 'US Inflation (CPI)',
    value: '3.2%',
    change: '-0.1%',
    changePercent: '-3.0',
    status: 'down',
    description: 'Consumer Price Index — jährliche Inflationsrate',
    category: 'economy',
    lastUpdated: '2024-10-12',
    source: 'BLS'
  },
  {
    id: 'unemployment',
    name: 'Arbeitslosenquote',
    value: '3.9%',
    change: '+0.1%',
    changePercent: '+2.6',
    status: 'up',
    description: 'US Arbeitslosenquote',
    category: 'economy',
    lastUpdated: '2024-11-01',
    source: 'BLS'
  }
]

const categories = [
  { id: 'all', name: 'Alle' },
  { id: 'market', name: 'Markt' },
  { id: 'valuation', name: 'Bewertung' },
  { id: 'treasury', name: 'Anleihen' },
  { id: 'economy', name: 'Wirtschaft' }
]

const categoryEmoji: Record<string, string> = {
  market: '📈',
  valuation: '💰',
  treasury: '🏛️',
  economy: '🌍',
}

export default function MarktindikatorenPage() {
  const [indicators, setIndicators] = useState<MarketIndicator[]>(mockIndicators)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchIndicators() {
      try {
        const response = await fetch('/api/market-indicators')
        if (response.ok) {
          const data = await response.json()
          if (data.indicators && Array.isArray(data.indicators)) {
            setIndicators(data.indicators)
          }
        }
      } catch {
        // keep mock data
      } finally {
        setLoading(false)
      }
    }
    fetchIndicators()
  }, [])

  const filtered = selectedCategory === 'all'
    ? indicators
    : indicators.filter(i => i.category === selectedCategory)

  return (
    <div className="min-h-screen bg-dark">

      {/* Compact header */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                Marktindikatoren
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                Wichtige Kennzahlen für Marktbewertung, Zinsen und Wirtschaftstrends
              </p>
            </div>
            {!loading && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                <span>{indicators.length} Indikatoren</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-8 pb-4 border-b border-neutral-800 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-white text-black font-medium'
                  : 'text-neutral-500 hover:text-neutral-300 border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Indicators grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-neutral-800 p-5 animate-pulse">
                <div className="h-3 bg-neutral-800 rounded w-2/3 mb-4" />
                <div className="h-7 bg-neutral-800 rounded w-1/3 mb-2" />
                <div className="h-3 bg-neutral-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(indicator => (
              <div
                key={indicator.id}
                className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 transition-all"
              >
                {/* Top row: category + source */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryEmoji[indicator.category] ?? '📊'}</span>
                    <span className="text-xs text-neutral-500 font-medium">{indicator.name}</span>
                  </div>
                  {indicator.source && (
                    <span className="text-xs text-neutral-700 bg-neutral-800 px-2 py-0.5 rounded">
                      {indicator.source}
                    </span>
                  )}
                </div>

                {/* Value */}
                <div className="mb-3">
                  <span className="text-2xl font-semibold text-white">{indicator.value}</span>
                  {indicator.change && (
                    <div className={`flex items-center gap-1 mt-1 text-sm ${
                      indicator.status === 'up' ? 'text-emerald-400'
                      : indicator.status === 'down' ? 'text-red-400'
                      : 'text-neutral-400'
                    }`}>
                      {indicator.status === 'up'
                        ? <ArrowTrendingUpIcon className="w-4 h-4" />
                        : indicator.status === 'down'
                        ? <ArrowTrendingDownIcon className="w-4 h-4" />
                        : null
                      }
                      <span>{indicator.change}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                  {indicator.description}
                </p>

                {/* Footer */}
                <div className="flex items-center gap-1 text-xs text-neutral-700 pt-3 border-t border-neutral-800">
                  <InformationCircleIcon className="w-3 h-3" />
                  <span>{new Date(indicator.lastUpdated).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
