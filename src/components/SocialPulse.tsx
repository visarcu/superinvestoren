// components/SocialPulse.tsx - FEY/QUARTR CLEAN STYLE
'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  SignalIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface SocialData {
  date: string
  symbol: string
  stocktwitsPosts: number
  twitterPosts: number
  stocktwitsComments: number
  twitterComments: number
  stocktwitsLikes: number
  twitterLikes: number
  stocktwitsImpressions: number
  twitterImpressions: number
  stocktwitsSentiment: number
  twitterSentiment: number
}

interface TrendingStock {
  symbol: string
  name?: string
  sentimentChange?: number
  rank?: number
  mentions?: number
  posts?: number
  volume?: number
  previousVolume?: number
  impressions?: number
}

export default function SocialPulse({ ticker }: { ticker: string }) {
  const [data, setData] = useState<SocialData[]>([])
  const [loading, setLoading] = useState(true)
  const [isTrending, setIsTrending] = useState(false)
  const [sentimentChange, setSentimentChange] = useState<any>(null)
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([])
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    fetchSocialData()
  }, [ticker])

  const fetchSocialData = async () => {
    try {
      const res = await fetch(`/api/social-sentiment/${ticker}`)
      const json = await res.json()

      setData(json.sentiment || [])
      setIsTrending(json.isTrending || false)
      setSentimentChange(json.sentimentChange || null)
      setTrendingStocks(json.trendingStocks || [])
    } catch (error) {
      console.error('Error fetching social data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatsForRange = (range: '24h' | '7d' | '30d') => {
    if (!data || data.length === 0) return null

    const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720
    const rangeData = data.slice(0, Math.min(hours, data.length))

    if (rangeData.length === 0) return null

    const totalStocktwitsPosts = rangeData.reduce((sum, h) => sum + h.stocktwitsPosts, 0)
    const totalTwitterPosts = rangeData.reduce((sum, h) => sum + h.twitterPosts, 0)
    const totalStocktwitsLikes = rangeData.reduce((sum, h) => sum + h.stocktwitsLikes, 0)
    const totalTwitterLikes = rangeData.reduce((sum, h) => sum + h.twitterLikes, 0)
    const totalStocktwitsImpressions = rangeData.reduce((sum, h) => sum + h.stocktwitsImpressions, 0)
    const totalTwitterImpressions = rangeData.reduce((sum, h) => sum + h.twitterImpressions, 0)

    let weightedStocktwitsSentiment = 0
    let weightedTwitterSentiment = 0
    let stocktwitsWeight = 0
    let twitterWeight = 0

    rangeData.forEach(h => {
      if (h.stocktwitsPosts > 0) {
        weightedStocktwitsSentiment += h.stocktwitsSentiment * h.stocktwitsPosts
        stocktwitsWeight += h.stocktwitsPosts
      }
      if (h.twitterPosts > 0) {
        weightedTwitterSentiment += h.twitterSentiment * h.twitterPosts
        twitterWeight += h.twitterPosts
      }
    })

    const avgStocktwitsSentiment = stocktwitsWeight > 0 ? weightedStocktwitsSentiment / stocktwitsWeight : 0.5
    const avgTwitterSentiment = twitterWeight > 0 ? weightedTwitterSentiment / twitterWeight : 0.5

    return {
      totalPosts: totalStocktwitsPosts + totalTwitterPosts,
      totalStocktwitsPosts,
      totalTwitterPosts,
      totalLikes: totalStocktwitsLikes + totalTwitterLikes,
      totalImpressions: totalStocktwitsImpressions + totalTwitterImpressions,
      avgSentiment: (avgStocktwitsSentiment + avgTwitterSentiment) / 2,
      avgStocktwitsSentiment,
      avgTwitterSentiment,
      hoursOfData: rangeData.length
    }
  }

  const stats = useMemo(() => getStatsForRange(timeRange), [data, timeRange])

  const trend = useMemo(() => {
    if (!data || data.length < 48) return null

    const current24h = data.slice(0, 24)
    const prev24h = data.slice(24, 48)

    const currentTotal = current24h.reduce((sum, h) => sum + h.stocktwitsPosts + h.twitterPosts, 0)
    const prevTotal = prev24h.reduce((sum, h) => sum + h.stocktwitsPosts + h.twitterPosts, 0)

    if (prevTotal === 0) return null

    return ((currentTotal - prevTotal) / prevTotal) * 100
  }, [data])

  // Loading State - Clean Style
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-muted text-sm">Lade Social Media Daten...</p>
        </div>
      </div>
    )
  }

  // No Data State
  if (!stats) {
    return (
      <div className="bg-theme-card rounded-xl border border-theme-light p-8 text-center">
        <div className="w-12 h-12 bg-theme-secondary/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <SignalIcon className="w-6 h-6 text-theme-muted" />
        </div>
        <p className="text-theme-muted text-sm">Keine Social Media Daten verfügbar</p>
      </div>
    )
  }

  const sentimentScore = Math.round((stats.avgSentiment + 1) * 50)

  return (
    <div className="space-y-6">

      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-theme-primary">Social Media Pulse</h2>
          <p className="text-xs text-theme-muted mt-0.5">{stats.hoursOfData} Stunden Daten</p>
        </div>

        {/* Time Range Selector - Pill Style */}
        <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg w-fit">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeRange === range
                  ? 'bg-theme-card text-theme-primary shadow-sm'
                  : 'text-theme-muted hover:text-theme-secondary'
              }`}
            >
              {range === '24h' ? '24h' : range === '7d' ? '7 Tage' : '30 Tage'}
            </button>
          ))}
        </div>
      </div>

      {/* Trending Banner */}
      {isTrending && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FireIcon className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-400">Trending</p>
              <p className="text-xs text-theme-muted">Erhöhte Aktivität auf Social Media</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid - Clean Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Sentiment Score */}
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-theme-muted">Sentiment</span>
            <SignalIcon className="w-4 h-4 text-theme-muted" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-semibold ${
              sentimentScore >= 70 ? 'text-emerald-400' :
              sentimentScore >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {sentimentScore}
            </span>
            <span className="text-xs text-theme-muted pb-1">/100</span>
          </div>
          <div className="mt-3 h-1.5 bg-theme-secondary/30 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                sentimentScore >= 70 ? 'bg-emerald-400' :
                sentimentScore >= 30 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${sentimentScore}%` }}
            />
          </div>
          <p className="text-xs text-theme-muted mt-2">
            {sentimentScore >= 70 ? 'Bullish' :
             sentimentScore >= 50 ? 'Leicht Bullish' :
             sentimentScore >= 30 ? 'Neutral' : 'Bearish'}
          </p>
        </div>

        {/* Activity */}
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-theme-muted">Aktivität</span>
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-theme-muted" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-semibold text-theme-primary">
              {stats.totalPosts >= 10000
                ? `${(stats.totalPosts / 1000).toFixed(1)}K`
                : stats.totalPosts.toLocaleString()}
            </span>
            {trend !== null && timeRange === '24h' && (
              <span className={`flex items-center gap-0.5 text-xs pb-1 ${
                trend > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {trend > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                {Math.abs(trend).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-xs text-theme-muted mt-2">Posts gesamt</p>
          <div className="mt-3 pt-3 border-t border-theme-light space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-theme-muted">StockTwits</span>
              <span className="text-theme-secondary">{stats.totalStocktwitsPosts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-theme-muted">Twitter/X</span>
              <span className="text-theme-secondary">{stats.totalTwitterPosts.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Reach */}
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-theme-muted">Reichweite</span>
            <UsersIcon className="w-4 h-4 text-theme-muted" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-semibold text-theme-primary">
              {stats.totalImpressions >= 1000000
                ? `${(stats.totalImpressions / 1000000).toFixed(1)}M`
                : stats.totalImpressions >= 1000
                ? `${(stats.totalImpressions / 1000).toFixed(0)}K`
                : stats.totalImpressions.toLocaleString()
              }
            </span>
          </div>
          <p className="text-xs text-theme-muted mt-2">Impressions</p>
          <div className="mt-3 pt-3 border-t border-theme-light">
            <div className="flex justify-between items-center">
              <span className="text-xs text-theme-muted">Engagement</span>
              <span className="text-sm font-medium text-theme-primary">
                {stats.totalImpressions > 0
                  ? ((stats.totalLikes / stats.totalImpressions) * 100).toFixed(2)
                  : '0.00'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart - 24h Only */}
      {timeRange === '24h' && data.length >= 24 && (
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-theme-primary">Aktivität (24h)</span>
            <ClockIcon className="w-4 h-4 text-theme-muted" />
          </div>

          <div className="h-24 flex items-end gap-0.5">
            {data.slice(0, 24).reverse().map((hour, idx) => {
              const total = hour.stocktwitsPosts + hour.twitterPosts
              const maxInPeriod = Math.max(...data.slice(0, 24).map(h => h.stocktwitsPosts + h.twitterPosts))
              const height = maxInPeriod > 0 ? (total / maxInPeriod) * 100 : 0
              const hourDate = new Date(hour.date)

              return (
                <div
                  key={idx}
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-t transition-all cursor-pointer group relative"
                  style={{ height: `${Math.max(height, 4)}%` }}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-theme-card border border-theme-light rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                      <p className="font-medium text-theme-primary">{total} Posts</p>
                      <p className="text-theme-muted">
                        {hourDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between mt-2 text-xs text-theme-muted">
            <span>{new Date(data[23]?.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Jetzt</span>
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* StockTwits */}
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <h3 className="text-sm font-medium text-theme-primary mb-4">StockTwits</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-theme-muted">Sentiment</span>
              <span className={`text-xs font-medium ${
                stats.avgStocktwitsSentiment > 0.5 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {stats.avgStocktwitsSentiment > 0.5 ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-theme-muted">Posts</span>
              <span className="text-xs text-theme-secondary">{stats.totalStocktwitsPosts.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Twitter */}
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <h3 className="text-sm font-medium text-theme-primary mb-4">Twitter / X</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-theme-muted">Sentiment</span>
              <span className={`text-xs font-medium ${
                stats.avgTwitterSentiment > 0.5 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {stats.avgTwitterSentiment > 0.5 ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-theme-muted">Posts</span>
              <span className="text-xs text-theme-secondary">{stats.totalTwitterPosts.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contrarian Warning */}
      {sentimentScore > 85 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-400">Extreme Euphorie</p>
              <p className="text-xs text-theme-muted mt-1">
                Ein Sentiment Score über 85 kann ein Kontraindikator sein.
              </p>
            </div>
          </div>
        </div>
      )}

      {sentimentScore < 15 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Extreme Pessimismus</p>
              <p className="text-xs text-theme-muted mt-1">
                Ein Sentiment Score unter 15 könnte eine Kaufgelegenheit signalisieren.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-theme-muted text-center pt-4 border-t border-theme-light">
        Daten basierend auf {stats.totalPosts.toLocaleString()} Posts •
        {timeRange === '24h' ? ' Letzte 24 Stunden' : timeRange === '7d' ? ' Letzte 7 Tage' : ' Letzte 30 Tage'}
      </p>
    </div>
  )
}
