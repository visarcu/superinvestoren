// components/MostFollowed.tsx - KOMPAKTE VERSION
'use client'

import React, { useEffect, useState } from 'react'
import { 
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import { useCurrency } from '@/lib/CurrencyContext'

type MostFollowedStock = {
  ticker: string
  count: number
  quote?: {
    price: number
    changePct: number
  }
}

interface MostFollowedProps {
  onSelect: (ticker: string) => void
  quotes: Record<string, any>
}

export default function MostFollowed({ onSelect, quotes }: MostFollowedProps) {
  const [mostFollowed, setMostFollowed] = useState<MostFollowedStock[]>([])
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const { formatStockPrice, formatPercentage } = useCurrency()

  useEffect(() => {
    async function fetchMostFollowed() {
      try {
        const response = await fetch('/api/watchlist-stats', {
          cache: 'force-cache', // Aggressive caching for better performance
          next: { revalidate: 600 } // 10 minute cache (shorter for faster updates)
        })
        
        if (!response.ok) throw new Error('Failed to fetch')
        
        const data = await response.json()
        
        if (data.mostFollowed && data.mostFollowed.length > 0) {
          const followedWithQuotes = data.mostFollowed.map((item: any) => ({
            ...item,
            quote: quotes[item.ticker.toLowerCase()] || item.quote // Preserve existing quote if no new one
          }))
          setMostFollowed(followedWithQuotes)
          setTotalUsers(data.totalUsers || totalUsers)
        }
      } catch (error) {
        console.error('Error fetching most followed:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMostFollowed()
  }, [quotes])

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FireIcon className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-theme-primary">Most Followed</h3>
        </div>
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-12 bg-theme-secondary rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (mostFollowed.length === 0) {
    return (
      <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FireIcon className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-theme-primary">Most Followed</h3>
        </div>
        <p className="text-sm text-theme-muted text-center py-8">
          Noch keine Daten verfügbar
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-theme-primary">Most Followed</h3>
          <p className="text-xs text-theme-muted">{totalUsers} User</p>
        </div>
      </div>

      {/* Compact List - Flex Container */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {mostFollowed.slice(0, 6).map((stock, index) => (
          <button
            key={stock.ticker}
            onClick={() => onSelect(stock.ticker)}
            className="w-full group hover:bg-theme-secondary/50 rounded-lg p-2 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              {/* Ranking */}
              <div className={`
                flex items-center justify-center w-5 h-5 rounded text-xs font-bold
                ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                ${index === 1 ? 'bg-gray-400/20 text-gray-300' : ''}
                ${index === 2 ? 'bg-orange-600/20 text-orange-400' : ''}
                ${index > 2 ? 'text-theme-muted' : ''}
              `}>
                {index + 1}
              </div>

              {/* Logo */}
              <Logo 
                ticker={stock.ticker} 
                alt={`${stock.ticker} Logo`}
                className="w-6 h-6 rounded"
                padding="small"
              />

              {/* Ticker & Data */}
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-theme-primary group-hover:text-green-400 transition-colors">
                    {stock.ticker}
                  </span>
                  {stock.quote && (
                    <span className={`text-xs font-medium ${
                      stock.quote.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stock.quote.changePct >= 0 ? '+' : ''}{stock.quote.changePct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-theme-muted">{stock.count} Follower</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}