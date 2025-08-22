// src/components/DashboardScreenerWidget.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FunnelIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

interface ScreenerWidgetProps {
  variant?: 'compact' | 'full'
}

export default function DashboardScreenerWidget({ variant = 'full' }: ScreenerWidgetProps) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState('gainers')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const filters = {
    gainers: {
      name: 'Top Gainers',
      params: {
        isActivelyTrading: 'true',
        marketCapMoreThan: '1000000000',
        limit: '100'
      },
      sort: 'changesPercentage',
      order: 'desc'
    },
    losers: {
      name: 'Top Losers',
      params: {
        isActivelyTrading: 'true',
        marketCapMoreThan: '1000000000',
        limit: '100'
      },
      sort: 'changesPercentage',
      order: 'asc'
    },
    volume: {
      name: 'Most Active',
      params: {
        isActivelyTrading: 'true',
        volumeMoreThan: '10000000',
        limit: '100'
      },
      sort: 'volume',
      order: 'desc'
    }
  }

  useEffect(() => {
    loadScreenerData(activeFilter)
  }, [activeFilter])

  const loadScreenerData = async (filterType: string) => {
    setLoading(true)
    
    try {
      const filter = filters[filterType as keyof typeof filters]
      const params = new URLSearchParams(filter.params)
      
      const response = await fetch(`/api/screener?${params.toString()}`)
      
      if (!response.ok) throw new Error('API error')
      
      const data = await response.json()
      
      // Sort and limit results
      const sorted = data.sort((a: any, b: any) => {
        const aVal = a[filter.sort] || 0
        const bVal = b[filter.sort] || 0
        return filter.order === 'desc' ? bVal - aVal : aVal - bVal
      })
      
      setResults(sorted.slice(0, variant === 'compact' ? 5 : 10))
      
    } catch (error) {
      console.error('Screener widget error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleStockClick = (symbol: string) => {
    router.push(`/analyse/stocks/${symbol.toLowerCase()}`)
  }

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
    return num.toLocaleString()
  }

  if (variant === 'compact') {
    return (
      <div className="bg-theme-card border border-theme/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-green-400" />
            Market Movers
          </h3>
          <Link
            href="/analyse/screener"
            className="text-xs text-green-400 hover:text-green-300"
          >
            Mehr →
          </Link>
        </div>

        <div className="flex gap-1 mb-3 p-1 bg-theme-secondary rounded-lg">
          {Object.entries(filters).map(([key, filter]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                activeFilter === key
                  ? 'bg-green-500 text-white'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              {filter.name.split(' ')[1]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((stock, index) => (
              <button
                key={stock.symbol}
                onClick={() => handleStockClick(stock.symbol)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-theme-hover transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-theme-muted font-bold w-4">
                    {index + 1}
                  </span>
                  <span className="font-bold text-sm text-theme-primary">
                    {stock.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-theme-secondary">
                    ${stock.price?.toFixed(2)}
                  </span>
                  <span className={`text-xs font-bold ${
                    stock.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stock.changesPercentage >= 0 ? '+' : ''}
                    {stock.changesPercentage?.toFixed(2)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-theme-card border border-theme/10 rounded-xl overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-theme/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-green-400" />
            Stock Screener
          </h2>
          <Link
            href="/analyse/screener"
            className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            Vollansicht
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {Object.entries(filters).map(([key, filter]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFilter === key
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-theme-secondary text-theme-secondary hover:text-theme-primary'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-theme-secondary">Lade Daten...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-secondary/50 border-b border-theme/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-theme-muted uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-theme-muted uppercase">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-theme-muted uppercase">Name</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-theme-muted uppercase">Preis</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-theme-muted uppercase">% Heute</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-theme-muted uppercase">Volumen</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-theme-muted uppercase">Market Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme/10">
              {results.map((stock, index) => (
                <tr
                  key={stock.symbol}
                  onClick={() => handleStockClick(stock.symbol)}
                  className="hover:bg-theme-hover cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-theme-muted font-bold">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Logo 
                        ticker={stock.symbol}
                        alt={stock.symbol}
                        className="w-6 h-6 rounded"
                        padding="none"
                      />
                      <span className="font-bold text-theme-primary">
                        {stock.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-theme-secondary truncate max-w-[200px]">
                    {stock.companyName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-theme-primary">
                    ${stock.price?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                      stock.changesPercentage >= 0
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {stock.changesPercentage >= 0 ? (
                        <ArrowTrendingUpIcon className="w-3 h-3" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-3 h-3" />
                      )}
                      {Math.abs(stock.changesPercentage)?.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-theme-secondary">
                    {formatNumber(stock.volume)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-theme-primary font-medium">
                    ${formatNumber(stock.marketCap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-theme-secondary/30 border-t border-theme/10">
        <div className="flex items-center justify-between">
          <p className="text-xs text-theme-muted">
            Live-Daten • Aktualisiert alle 5 Minuten
          </p>
          <Link
            href="/analyse/screener"
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium"
          >
            <SparklesIcon className="w-3 h-3" />
            Erweiterte Filter
          </Link>
        </div>
      </div>
    </div>
  )
}