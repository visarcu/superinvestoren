'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  NewspaperIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  MinusIcon,
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
  summary: string
  relatedStock?: string
  publishedDate: string
  relevanceScore: number
  metadata: {
    portfolioChange?: {
      action: 'bought' | 'sold' | 'increased' | 'decreased'
      value?: number
    }
    trendingData?: {
      investorCount: number
    }
  }
}

interface NewsResponse {
  news: SuperinvestorNews[]
}

export default function SuperinvestorNewsDashboardWidget() {
  const [news, setNews] = useState<SuperinvestorNews[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true)

        // Try real API first, fallback to demo if no data
        let response = await fetch('/api/superinvestor-news/all?limit=4')
        let data: NewsResponse = await response.json()

        // If no real news, use demo data
        if (!data.news || data.news.length === 0) {
          response = await fetch('/api/superinvestor-news/demo')
          data = await response.json()
        }

        if (response.ok && data.news) {
          setNews(data.news.slice(0, 4)) // Limit to 4 for dashboard
        }
      } catch (err) {
        console.error('Error fetching superinvestor news:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  const getActionIcon = (action?: string) => {
    switch (action) {
      case 'bought':
        return <PlusIcon className="w-3 h-3 text-green-400" />
      case 'sold':
        return <MinusIcon className="w-3 h-3 text-red-400" />
      case 'increased':
        return <ArrowTrendingUpIcon className="w-3 h-3 text-green-400" />
      case 'decreased':
        return <ArrowTrendingDownIcon className="w-3 h-3 text-red-400" />
      default:
        return <NewspaperIcon className="w-3 h-3 text-blue-400" />
    }
  }

  const formatValue = (value?: number) => {
    if (!value) return ''
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`
    }
    return ''
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))

    if (diffDays === 0) {
      if (diffHours === 0) return 'jetzt'
      return `${diffHours}h`
    } else if (diffDays < 7) {
      return `${diffDays}d`
    } else {
      return `${Math.floor(diffDays / 7)}w`
    }
  }

  return (
    <div className="bg-theme-card border border-theme/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-theme/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NewspaperIcon className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-theme-primary">Superinvestor News</h3>
          </div>
          <Link
            href="/superinvestor/news"
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
          >
            Alle <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
      </div>
      
      {/* Content */}
      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-theme-muted">Lädt News...</p>
        </div>
      ) : news.length === 0 ? (
        <div className="p-6 text-center">
          <NewspaperIcon className="w-8 h-8 text-theme-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs text-theme-muted">Keine News verfügbar</p>
        </div>
      ) : (
        <div className="divide-y divide-theme/5">
          {news.map((item) => (
            <div key={item.id} className="p-4 hover:bg-theme-hover transition-colors">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-theme-muted/10 flex-shrink-0 mt-0.5">
                  {getActionIcon(item.metadata.portfolioChange?.action)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Investor & Stock */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-yellow-400 truncate">
                        {item.investor.slug === 'multiple' 
                          ? `${item.metadata.trendingData?.investorCount || 'Multi'} Investoren`
                          : item.investor.name.split(' ')[0] // First name only for space
                        }
                      </span>
                      {item.relatedStock && (
                        <span className="text-xs font-mono text-theme-primary bg-theme-muted/10 px-1.5 py-0.5 rounded">
                          {item.relatedStock}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-theme-muted flex-shrink-0">
                      {formatTimeAgo(item.publishedDate)}
                    </span>
                  </div>
                  
                  {/* Summary */}
                  <p className="text-sm text-theme-primary line-clamp-2 mb-1.5 leading-tight">
                    {item.summary}
                  </p>
                  
                  {/* Value */}
                  {item.metadata.portfolioChange?.value && (
                    <div className="text-xs text-theme-muted">
                      {formatValue(item.metadata.portfolioChange.value)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}