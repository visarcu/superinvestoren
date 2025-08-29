// src/app/(website)/marktindikatoren/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  InformationCircleIcon
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

// Mock data - wird später durch echte API-Calls ersetzt
const mockIndicators: MarketIndicator[] = [
  {
    id: 'buffett-indicator',
    name: 'Buffett Indikator',
    value: '185%',
    change: '+2.3%',
    changePercent: '+2.3',
    status: 'up',
    description: 'Total Market Cap / GDP - Buffetts bevorzugter Bewertungsindikator für den Gesamtmarkt',
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
    name: 'VIX (Fear Index)',
    value: '16.2',
    change: '-1.8',
    changePercent: '-10.0',
    status: 'down',
    description: 'Volatilitätsindex - Misst die erwartete Marktvolatilität',
    category: 'market',
    lastUpdated: '2024-11-08',
    source: 'CBOE'
  },
  {
    id: '10y-treasury',
    name: '10Y US Treasury',
    value: '4.42%',
    change: '+0.05%',
    changePercent: '+1.1',
    status: 'up',
    description: '10-jährige US-Staatsanleihen Rendite',
    category: 'treasury',
    lastUpdated: '2024-11-29',
    source: 'FMP'
  },
  {
    id: '2y-treasury',
    name: '2Y US Treasury',
    value: '4.28%',
    change: '+0.03%',
    changePercent: '+0.7',
    status: 'up',
    description: '2-jährige US-Staatsanleihen Rendite',
    category: 'treasury',
    lastUpdated: '2024-11-29',
    source: 'FMP'
  },
  {
    id: 'yield-curve',
    name: 'Yield Curve (10Y-2Y)',
    value: '+0.14%',
    change: '+0.02%',
    changePercent: '+16.7',
    status: 'up',
    description: 'Zinsstrukturkurve - Spread zwischen 10Y und 2Y Treasuries',
    category: 'treasury',
    lastUpdated: '2024-11-29',
    source: 'FMP'
  },
  {
    id: 'inflation',
    name: 'US Inflation (CPI)',
    value: '2.6%',
    change: '-0.2%',
    changePercent: '-7.1',
    status: 'down',
    description: 'Consumer Price Index - jährliche Inflationsrate',
    category: 'economy',
    lastUpdated: '2024-11-13',
    source: 'BLS'
  },
  {
    id: 'unemployment',
    name: 'Arbeitslosenquote',
    value: '4.1%',
    change: '+0.1%',
    changePercent: '+2.5',
    status: 'up',
    description: 'US Arbeitslosenquote',
    category: 'economy',
    lastUpdated: '2024-11-01',
    source: 'BLS'
  },
  {
    id: 'dollar-index',
    name: 'Dollar Index (DXY)',
    value: '106.8',
    change: '+0.3',
    changePercent: '+0.3',
    status: 'up',
    description: 'US Dollar Index - Stärke des Dollars gegenüber anderen Währungen',
    category: 'market',
    lastUpdated: '2024-11-29',
    source: 'FMP'
  }
]

const categories = [
  { id: 'all', name: 'Alle Indikatoren' },
  { id: 'market', name: 'Markt' },
  { id: 'valuation', name: 'Bewertung' },
  { id: 'treasury', name: 'Staatsanleihen' },
  { id: 'economy', name: 'Wirtschaft' }
]

export default function MarktindikatoreNPage() {
  const [indicators, setIndicators] = useState<MarketIndicator[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchIndicators() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/market-indicators')
        if (response.ok) {
          const data = await response.json()
          if (data.indicators && Array.isArray(data.indicators)) {
            setIndicators(data.indicators)
            console.log(`✅ Loaded ${data.indicators.length} indicators from API`)
          } else {
            setError('Keine Indikatoren von API erhalten')
          }
        } else {
          setError(`API Fehler: ${response.status}`)
        }
      } catch (error) {
        console.error('Error fetching indicators:', error)
        setError('Fehler beim Laden der Marktdaten')
      } finally {
        setLoading(false)
      }
    }

    fetchIndicators()
  }, [])

  const filteredIndicators = selectedCategory === 'all' 
    ? indicators 
    : indicators.filter(indicator => indicator.category === selectedCategory)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-400'
      case 'down': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <ArrowTrendingUpIcon className="w-4 h-4" />
      case 'down': return <ArrowTrendingDownIcon className="w-4 h-4" />
      default: return <div className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'market': return '📈'
      case 'valuation': return '💰'
      case 'treasury': return '🏛️'
      case 'economy': return '🌍'
      default: return '📊'
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section - Clean & Minimal */}
      <div className="bg-black pt-40 pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div className="space-y-3">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-medium text-white leading-[0.85] tracking-[-0.02em]">
                Markt
                <br />
                <span className="text-gray-300">indikatoren</span>
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Wichtige Kennzahlen für Marktbewertung, Zinsen und Wirtschaftstrends
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                {indicators.length}+
              </div>
              <div className="text-lg text-gray-400">Indikatoren</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                Live
              </div>
              <div className="text-lg text-gray-400">Daten</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                Kostenlos
              </div>
              <div className="text-lg text-gray-400">Verfügbar</div>
            </div>
          </div>

          {/* Category Filter - Clean */}
          <div className="flex flex-wrap gap-3 justify-center mb-16">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  px-6 py-3 rounded-2xl font-medium transition-all
                  ${selectedCategory === category.id
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'
                  }
                `}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Indicators Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Lade echte Marktdaten von APIs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-400 text-xl">⚠️</span>
                </div>
                <p className="text-red-400 mb-2">Fehler beim Laden der Marktdaten</p>
                <p className="text-gray-400 text-sm">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                >
                  Neu laden
                </button>
              </div>
            </div>
          ) : indicators.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <p className="text-gray-400">Keine Marktdaten verfügbar</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredIndicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="bg-white/[0.08] border border-white/20 rounded-2xl p-6 hover:bg-white/[0.12] transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getCategoryIcon(indicator.category)}
                      </div>
                      <div>
                        <h3 className="font-medium text-white text-sm">
                          {indicator.name}
                        </h3>
                        <p className="text-xs text-gray-500 capitalize mt-1">
                          {indicator.category}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-1 ${getStatusColor(indicator.status)}`}>
                      {getStatusIcon(indicator.status)}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="mb-6">
                    <div className="text-3xl font-medium text-white mb-2">
                      {indicator.value}
                    </div>
                    {indicator.change && (
                      <div className={`flex items-center gap-1 text-sm ${getStatusColor(indicator.status)}`}>
                        {getStatusIcon(indicator.status)}
                        <span>{indicator.change}</span>
                        {indicator.changePercent && (
                          <span>({indicator.changePercent}%)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {indicator.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-white/5">
                    <span>
                      {new Date(indicator.lastUpdated).toLocaleDateString('de-DE')}
                    </span>
                    {indicator.source && (
                      <span className="bg-white/5 px-2 py-1 rounded">
                        {indicator.source}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Section - Clean */}
      <div className="bg-black py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-12">
            <div className="flex items-center gap-4 mb-8">
              <InformationCircleIcon className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-medium text-white">Über Marktindikatoren</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h3 className="font-medium text-white mb-4 text-lg">Warum sind diese Indikatoren wichtig?</h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Marktindikatoren geben Investoren wichtige Einblicke in die aktuelle Marktlage, 
                  Bewertungsniveaus und wirtschaftliche Trends.
                </p>
                <ul className="text-gray-300 space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-white">•</span>
                    <span><strong className="text-white">Buffett Indikator:</strong> Warnt vor Über-/Unterbewertung</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white">•</span>
                    <span><strong className="text-white">VIX:</strong> Misst Marktangst und Volatilität</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white">•</span>
                    <span><strong className="text-white">Treasury Yields:</strong> Zeigen Zinserwartungen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white">•</span>
                    <span><strong className="text-white">Wirtschaftsdaten:</strong> Fundamentale Marktbasis</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-white mb-4 text-lg">Datenquellen & Updates</h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Unsere Daten stammen von vertrauenswürdigen Quellen wie der Financial Modeling Prep API, 
                  dem Bureau of Labor Statistics und anderen offiziellen Institutionen.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <InformationCircleIcon className="w-5 h-5 text-white" />
                    <span className="text-white font-medium">Hinweis</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Die angezeigten Daten dienen nur zu Informationszwecken und stellen 
                    keine Anlageberatung dar. Investitionen sind mit Risiken verbunden.
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