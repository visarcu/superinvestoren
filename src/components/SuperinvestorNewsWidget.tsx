'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  NewspaperIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  MinusIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface SuperinvestorNews {
  id: string
  type: 'portfolio_change' | 'trending_stock' | 'major_move' | 'market_insight'
  investor: {
    slug: string
    name: string
    firm: string
  }
  title: string
  content: string
  summary: string
  relatedStock?: string
  source: string
  publishedDate: string
  relevanceScore: number
  metadata: {
    portfolioChange?: {
      action: 'bought' | 'sold' | 'increased' | 'decreased'
      ticker?: string
      value?: number
      percentage?: number
    }
    trendingData?: {
      investorCount: number
      totalValue: number
    }
    newsArticle?: {
      url: string
      originalTitle: string
      site: string
      image?: string
    }
  }
}

interface NewsResponse {
  news: SuperinvestorNews[]
  summary?: {
    total: number
    portfolio_changes: number
    major_moves: number
    trending_stocks: number
    totalValue: number
  }
  meta?: {
    isDemo?: boolean
    isRealData?: boolean
    description: string
    dataSource?: string
  }
}

interface SuperinvestorNewsWidgetProps {
  variant?: 'compact' | 'full'
  limit?: number
  showDemo?: boolean
}

export default function SuperinvestorNewsWidget({ 
  variant = 'full', 
  limit = 10,
  showDemo = true 
}: SuperinvestorNewsWidgetProps) {
  const [news, setNews] = useState<SuperinvestorNews[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<NewsResponse['summary'] | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true)
        setError(null)

        // Make both API calls in parallel for faster loading
        const [realResponse, demoResponse] = await Promise.allSettled([
          fetch(`/api/superinvestor-news/all?limit=${limit}`),
          showDemo ? fetch('/api/superinvestor-news/demo') : Promise.reject('Demo disabled')
        ])

        // Process real data first
        if (realResponse.status === 'fulfilled' && realResponse.value.ok) {
          const realData: NewsResponse = await realResponse.value.json()
          const hasRealData = realData.news && realData.news.length > 0 && (realData.meta?.isRealData === true || !realData.meta?.isDemo)
          
          if (hasRealData) {
            console.log('✅ Real superinvestor news loaded:', realData.news?.length, 'items')
            setNews(realData.news || [])
            setSummary(realData.summary || null)
            setIsDemo(false)
            return
          }
        }

        // Fallback to demo data if available
        if (demoResponse.status === 'fulfilled' && demoResponse.value.ok) {
          console.log('📰 No real superinvestor news found, using demo data...')
          const demoData: NewsResponse = await demoResponse.value.json()
          setNews(demoData.news || [])
          setSummary(demoData.summary || null)
          setIsDemo(true)
          return
        }

        // If neither worked, show error
        throw new Error('No data available')
      } catch (err) {
        console.error('Error fetching superinvestor news:', err)
        setError('Failed to load news')
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [limit, showDemo])

  const getActionIcon = (action?: string) => {
    switch (action) {
      case 'bought':
        return <PlusIcon className="w-3 h-3" />
      case 'sold':
        return <MinusIcon className="w-3 h-3" />
      case 'increased':
        return <ArrowTrendingUpIcon className="w-3 h-3" />
      case 'decreased':
        return <ArrowTrendingDownIcon className="w-3 h-3" />
      default:
        return <NewspaperIcon className="w-3 h-3" />
    }
  }

  const getActionColor = (action?: string) => {
    switch (action) {
      case 'bought':
      case 'increased':
        return 'text-brand-light bg-brand/20'
      case 'sold':
      case 'decreased':
        return 'text-red-400 bg-red-500/20'
      default:
        return 'text-blue-400 bg-blue-500/20'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'portfolio_change':
        return 'Portfolio'
      case 'major_move':
        return 'Major Move'
      case 'trending_stock':
        return 'Trending'
      case 'market_insight':
        return 'Insight'
      default:
        return 'News'
    }
  }

  const formatValue = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`
    } else {
      return `$${(value / 1000).toFixed(0)}K`
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))

    if (diffDays === 0) {
      if (diffHours === 0) return 'gerade'
      return diffHours === 1 ? '1 Stunde' : `${diffHours} Stunden`
    } else if (diffDays === 1) {
      return 'gestern'
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tagen`
    } else {
      return `vor ${Math.floor(diffDays / 7)} Wochen`
    }
  }

  // Compact version for sidebar/dashboard
  if (variant === 'compact') {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NewspaperIcon className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-white">Superinvestor News</h3>
              {isDemo && (
                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                  Demo
                </span>
              )}
            </div>
            <Link
              href="/superinvestor/news"
              className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Alle →
            </Link>
          </div>
        </div>
        
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-gray-400 mt-2">Loading...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <div className="divide-y divide-gray-800/30">
            {news.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-6 h-6 rounded ${getActionColor(item.metadata.portfolioChange?.action)}`}>
                    {getActionIcon(item.metadata.portfolioChange?.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-300 truncate">
                        {item.investor.name}
                      </span>
                      <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-white line-clamp-2 mb-2">
                      {item.summary}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>{formatTimeAgo(item.publishedDate)}</span>
                        {item.source === 'fmp_news' && (
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" title="External News"></span>
                        )}
                      </div>
                      {item.relatedStock && (
                        <span className="font-mono text-yellow-400">
                          {item.relatedStock}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full version for dedicated news page
  return (
    <div className="bg-theme-card border border-theme/10 rounded-xl">
      {/* Header */}
      <div className="p-6 border-b border-theme/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/20 rounded-xl flex items-center justify-center">
              <NewspaperIcon className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">Superinvestor News</h2>
              <p className="text-sm text-theme-secondary">
                Aktuelle Moves der Top-Investoren
                {isDemo && " (Demo Daten)"}
              </p>
            </div>
          </div>
          
          {summary && (
            <div className="text-right">
              <div className="text-sm text-theme-secondary">
                <span className="font-semibold text-theme-primary">{summary.total}</span> Updates
              </div>
              <div className="text-xs text-theme-muted">
                {formatValue(summary.totalValue)} Gesamtvolumen
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-theme-secondary">Lädt Superinvestor News...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <NewspaperIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
          <p className="text-red-400 mb-2">Fehler beim Laden</p>
          <p className="text-theme-muted text-sm">{error}</p>
        </div>
      ) : news.length === 0 ? (
        <div className="p-8 text-center">
          <NewspaperIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
          <p className="text-theme-secondary mb-2">Keine News verfügbar</p>
          <p className="text-theme-muted text-sm">Schaue später wieder vorbei</p>
        </div>
      ) : (
        <div className="divide-y divide-theme/10">
          {news.map((item) => (
            <article key={item.id} className="p-6 hover:bg-theme-hover transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${getActionColor(item.metadata.portfolioChange?.action)}`}>
                    {getActionIcon(item.metadata.portfolioChange?.action)}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-theme-primary line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-brand-light font-medium">
                        {item.investor.name}
                      </span>
                      <span className="text-xs text-theme-muted">
                        • {item.investor.firm}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-theme-muted/10 text-theme-secondary rounded">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {item.relatedStock && (
                  <div className="text-right">
                    <div className="px-3 py-1 bg-theme-muted/10 text-brand-light rounded-lg font-mono text-sm">
                      {item.relatedStock}
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-4">
                <p className="text-theme-secondary text-sm leading-relaxed line-clamp-3">
                  {item.content}
                </p>
                {item.metadata.newsArticle && (
                  <a 
                    href={item.metadata.newsArticle.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    <span>Artikel lesen</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-theme-muted">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {formatTimeAgo(item.publishedDate)}
                  </div>
                  
                  {item.metadata.portfolioChange?.value && (
                    <div className="flex items-center gap-1">
                      <span>Volumen:</span>
                      <span className="text-theme-primary font-medium">
                        {formatValue(item.metadata.portfolioChange.value)}
                      </span>
                    </div>
                  )}
                  
                  {item.metadata.trendingData && (
                    <div className="flex items-center gap-1">
                      <UserGroupIcon className="w-3 h-3" />
                      <span>{item.metadata.trendingData.investorCount} Investoren</span>
                    </div>
                  )}

                  {item.metadata.newsArticle && (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span className="text-blue-400">
                        {item.metadata.newsArticle.site}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-theme-muted">
                  {item.source === 'fmp_news' && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                      External
                    </span>
                  )}
                  <span>Score: {(item.relevanceScore * 100).toFixed(0)}%</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}