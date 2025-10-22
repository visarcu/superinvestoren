// Optimized client component for super investors page - no 38MB holdings import
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import InvestorAvatar from '@/components/InvestorAvatar'
import { 
  ArrowLeftIcon, 
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  PlusIcon,
  MinusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface SuperInvestorData {
  ticker: string
  stockInfo: {
    name: string
    sector: string
    market: string
  }
  summary: {
    totalInvestors: number
    totalValue: number
    averagePosition: number
    increasingTrends: number
    decreasingTrends: number
    formattedTotalValue: string
    formattedAveragePosition: string
  }
  positions: Array<{
    investor: {
      slug: string
      name: string
      description: string
      avatar: string
      aum: number
    }
    position: {
      ticker: string
      shares: number
      value: number
      portfolioPercentage: number
      trend: 'increasing' | 'decreasing' | 'stable'
      changeValue: number
      lastUpdated: string
      quarter: string
      formattedValue: string
      formattedShares: string
      formattedPortfolioPercentage: string
      formattedChangeValue: string
    }
  }>
}

interface SuperInvestorsClientProps {
  ticker: string
  initialStockName?: string
}

export default function SuperInvestorsClient({ ticker, initialStockName }: SuperInvestorsClientProps) {
  const [data, setData] = useState<SuperInvestorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSuperInvestorData() {
      try {
        setLoading(true)
        console.log(`📊 Fetching super investor data for ${ticker} via API...`)
        
        const response = await fetch(`/api/stocks/${ticker}/super-investors`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Stock nicht gefunden')
          }
          throw new Error(`API Error: ${response.status}`)
        }
        
        const result = await response.json()
        setData(result)
        console.log(`✅ Super investor data loaded for ${ticker}: ${result.summary.totalInvestors} investors`)
        
      } catch (err) {
        console.error('Error fetching super investor data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchSuperInvestorData()
  }, [ticker])

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}`}
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zu {initialStockName || ticker}
          </Link>

          <div className="space-y-8">
            <div className="animate-pulse">
              <div className="h-8 bg-theme-secondary rounded-lg w-64 mb-4"></div>
              <div className="h-4 bg-theme-secondary rounded w-96"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-theme-card border border-theme/10 rounded-xl p-6 animate-pulse">
                  <div className="h-6 bg-theme-secondary rounded w-20 mb-2"></div>
                  <div className="h-8 bg-theme-secondary rounded w-32"></div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-theme-card border border-theme/10 rounded-xl p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-theme-secondary rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-6 bg-theme-secondary rounded w-48 mb-2"></div>
                      <div className="h-4 bg-theme-secondary rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-theme-secondary rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}`}
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zu {initialStockName || ticker}
          </Link>

          <div className="text-center py-12">
            <div className="mb-4">
              <UserGroupIcon className="w-16 h-16 mx-auto text-theme-muted" />
            </div>
            <h2 className="text-xl font-bold text-theme-primary mb-2">
              {error || 'Keine Super-Investor-Daten verfügbar'}
            </h2>
            <p className="text-theme-muted">
              Für {ticker} konnten keine Super-Investor-Positionen gefunden werden.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
      case 'decreasing': return <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
      case 'new': return <PlusIcon className="w-4 h-4 text-blue-400" />
      default: return <div className="w-4 h-4 rounded-full bg-theme-muted" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-green-400'
      case 'decreasing': return 'text-red-400'
      case 'new': return 'text-blue-400'
      default: return 'text-theme-muted'
    }
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}`}
          className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-8 group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Zurück zu {data.stockInfo.name}
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2">
              Super-Investoren Positionen
            </h1>
            <p className="text-theme-secondary">
              Alle bekannten Positionen der erfolgreichsten Investoren in <span className="font-semibold">{data.stockInfo.name}</span> ({ticker})
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserGroupIcon className="w-5 h-5 text-theme-muted" />
                <span className="text-sm text-theme-muted font-medium">Investoren</span>
              </div>
              <div className="text-2xl font-bold text-theme-primary">
                {data.summary.totalInvestors}
              </div>
            </div>

            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="w-5 h-5 text-theme-muted" />
                <span className="text-sm text-theme-muted font-medium">Gesamtwert</span>
              </div>
              <div className="text-2xl font-bold text-theme-primary">
                {data.summary.formattedTotalValue}
              </div>
            </div>

            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <ArrowUpIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm text-theme-muted font-medium">Aufstockend</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {data.summary.increasingTrends}
              </div>
            </div>

            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <ArrowDownIcon className="w-5 h-5 text-red-400" />
                <span className="text-sm text-theme-muted font-medium">Reduzierend</span>
              </div>
              <div className="text-2xl font-bold text-red-400">
                {data.summary.decreasingTrends}
              </div>
            </div>
          </div>

          {/* Positions List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-theme-primary">Alle Positionen</h2>
            
            {data.positions.map((position, index) => (
              <div key={position.investor.slug} className="bg-theme-card border border-theme/10 rounded-xl p-6 hover:border-theme/20 transition-colors">
                <div className="flex items-start gap-4">
                  <Link href={`/superinvestor/${position.investor.slug}`}>
                    <InvestorAvatar 
                      name={position.investor.name}
                      imageUrl={position.investor.avatar}
                      size="lg"
                      className="hover:ring-2 hover:ring-green-400 transition-all duration-200 cursor-pointer"
                    />
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link 
                          href={`/superinvestor/${position.investor.slug}`}
                          className="text-lg font-bold text-theme-primary hover:text-green-400 transition-colors duration-200"
                        >
                          {position.investor.name}
                        </Link>
                        <p className="text-sm text-theme-muted line-clamp-2">
                          {position.investor.description}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xl font-bold text-theme-primary">
                          {position.position.formattedValue}
                        </div>
                        <div className="text-sm text-theme-muted">
                          {position.position.formattedPortfolioPercentage} des Portfolios
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-theme/10">
                      <div>
                        <div className="text-xs text-theme-muted mb-1">Aktien</div>
                        <div className="font-semibold text-theme-primary">
                          {position.position.formattedShares}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-theme-muted mb-1">Trend</div>
                        <div className={`flex items-center gap-1 font-semibold ${getTrendColor(position.position.trend)}`}>
                          {getTrendIcon(position.position.trend)}
                          {position.position.formattedChangeValue}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-theme-muted mb-1">Quartal</div>
                        <div className="font-semibold text-theme-primary">
                          {position.position.quarter}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-theme-muted mb-1">Position</div>
                        <div className="font-semibold text-theme-primary">
                          #{index + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.positions.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 mx-auto text-theme-muted mb-4" />
              <h3 className="text-lg font-bold text-theme-primary mb-2">
                Keine Positionen gefunden
              </h3>
              <p className="text-theme-muted">
                Für {ticker} wurden keine Super-Investor-Positionen in unserer Datenbank gefunden.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}