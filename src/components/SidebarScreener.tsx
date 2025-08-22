// src/components/SidebarScreener.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  FireIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface QuickScreenerProps {
  onClose?: () => void
}

interface PresetFilter {
  id: string
  name: string
  icon: React.ComponentType<any>
  color: string
  params: URLSearchParams
}

const QUICK_FILTERS: PresetFilter[] = [
  {
    id: 'trending',
    name: 'Trending',
    icon: FireIcon,
    color: 'orange',
    params: new URLSearchParams({
      volumeMoreThan: '10000000',
      priceMoreThan: '5',
      isActivelyTrading: 'true',
      limit: '20'
    })
  },
  {
    id: 'high-dividend',
    name: 'High Dividend',
    icon: BanknotesIcon,
    color: 'green',
    params: new URLSearchParams({
      dividendMoreThan: '3',
      marketCapMoreThan: '1000000000',
      isActivelyTrading: 'true',
      limit: '20'
    })
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: ArrowTrendingUpIcon,
    color: 'purple',
    params: new URLSearchParams({
      betaMoreThan: '1.2',
      marketCapMoreThan: '10000000000',
      isActivelyTrading: 'true',
      limit: '20'
    })
  },
  {
    id: 'mega-caps',
    name: 'Mega Caps',
    icon: BuildingOfficeIcon,
    color: 'blue',
    params: new URLSearchParams({
      marketCapMoreThan: '200000000000',
      isActivelyTrading: 'true',
      limit: '20'
    })
  },
  {
    id: 'penny',
    name: 'Penny Stocks',
    icon: CurrencyDollarIcon,
    color: 'red',
    params: new URLSearchParams({
      priceLowerThan: '5',
      priceMoreThan: '0.1',
      volumeMoreThan: '1000000',
      isActivelyTrading: 'true',
      limit: '20'
    })
  }
]

export default function SidebarScreener({ onClose }: QuickScreenerProps) {
  const router = useRouter()
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minMarketCap, setMinMarketCap] = useState('')
  const [sector, setSector] = useState('')

  const runQuickScreen = async (params: URLSearchParams) => {
    setLoading(true)
    setResults([])

    try {
      params.append('apikey', process.env.NEXT_PUBLIC_FMP_API_KEY || 'KYadX7pZnaaP034Rb4GvLtWhoKvCNuaw')
      
      const response = await fetch(`/api/screener?${params.toString()}`)
      if (!response.ok) throw new Error('API error')
      
      const data = await response.json()
      setResults(data.slice(0, 10)) // Nur Top 10 für Sidebar
    } catch (error) {
      console.error('Screener error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterClick = (filter: PresetFilter) => {
    setSelectedFilter(filter.id)
    runQuickScreen(filter.params)
  }

  const handleCustomScreen = () => {
    const params = new URLSearchParams()
    
    if (minPrice) params.append('priceMoreThan', minPrice)
    if (maxPrice) params.append('priceLowerThan', maxPrice)
    if (minMarketCap) {
      const mcValue = parseFloat(minMarketCap) * 1000000000 // Convert to billions
      params.append('marketCapMoreThan', mcValue.toString())
    }
    if (sector) params.append('sector', sector)
    
    params.append('isActivelyTrading', 'true')
    params.append('limit', '20')
    
    runQuickScreen(params)
  }

  const handleStockClick = (symbol: string) => {
    router.push(`/analyse/stocks/${symbol.toLowerCase()}`)
    if (onClose) onClose()
  }

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toFixed(0)
  }

  return (
    <div className="w-full h-full flex flex-col bg-theme-secondary">
      
      {/* Header */}
      <div className="p-4 border-b border-theme/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-theme-primary flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-green-400" />
            Quick Screener
          </h2>
          <Link
            href="/analyse/screener"
            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            Erweitert
            <ChevronRightIcon className="w-3 h-3" />
          </Link>
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {QUICK_FILTERS.slice(0, 3).map((filter) => {
            const Icon = filter.icon
            const isActive = selectedFilter === filter.id
            
            return (
              <button
                key={filter.id}
                onClick={() => handleFilterClick(filter)}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
                }`}
                title={filter.name}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                <div className="truncate">{filter.name}</div>
              </button>
            )
          })}
        </div>

        {/* Mini Custom Filters */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min $"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="px-2 py-1.5 bg-theme-tertiary border border-theme/20 rounded text-xs"
            />
            <input
              type="number"
              placeholder="Max $"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="px-2 py-1.5 bg-theme-tertiary border border-theme/20 rounded text-xs"
            />
          </div>
          
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full px-2 py-1.5 bg-theme-tertiary border border-theme/20 rounded text-xs"
          >
            <option value="">Alle Sektoren</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Financial Services">Finance</option>
            <option value="Consumer Cyclical">Consumer</option>
            <option value="Energy">Energy</option>
          </select>

          <button
            onClick={handleCustomScreen}
            className="w-full py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors"
          >
            Screen ausführen
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="p-2 space-y-1">
            {results.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => handleStockClick(stock.symbol)}
                className="w-full p-3 bg-theme-card border border-theme/10 rounded-lg hover:border-green-500/30 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-theme-primary">{stock.symbol}</span>
                  <span className={`text-xs font-bold ${
                    stock.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stock.changesPercentage >= 0 ? '+' : ''}{stock.changesPercentage?.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-theme-secondary">
                  <span>${stock.price?.toFixed(2)}</span>
                  <span>{formatNumber(stock.marketCap)}</span>
                </div>
              </button>
            ))}
            
            <Link
              href="/analyse/screener"
              className="block w-full p-3 bg-theme-tertiary/50 border border-theme/10 rounded-lg hover:bg-theme-hover transition-all text-center text-xs text-theme-secondary hover:text-green-400"
            >
              Alle Ergebnisse anzeigen →
            </Link>
          </div>
        ) : (
          <div className="p-4 text-center text-theme-secondary">
            <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Wähle einen Filter oder gib eigene Kriterien ein</p>
          </div>
        )}
      </div>

      {/* Footer Quick Links */}
      <div className="p-3 border-t border-theme/20">
        <div className="flex items-center justify-between text-xs">
          <Link
            href="/analyse/screener"
            className="text-theme-secondary hover:text-green-400 transition-colors"
          >
            Vollansicht
          </Link>
          <Link
            href="/analyse/screener?tab=saved"
            className="text-theme-secondary hover:text-green-400 transition-colors"
          >
            Gespeicherte
          </Link>
        </div>
      </div>
    </div>
  )
}