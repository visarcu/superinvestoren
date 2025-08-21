// components/SocialPulse.tsx
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
  ChartBarIcon,
  ClockIcon,
  TrophyIcon,
  CalendarIcon,
  EyeIcon,
  HeartIcon
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
    mentions?: number  // Jetzt optional mit ?
    posts?: number     // Alternative zu mentions
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
      
      console.log(`Loaded ${json.sentiment?.length || 0} hours of data`)
    } catch (error) {
      console.error('Error fetching social data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Aggregiere Daten basierend auf Zeitraum
  const getStatsForRange = (range: '24h' | '7d' | '30d') => {
    if (!data || data.length === 0) return null
    
    const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720
    const rangeData = data.slice(0, Math.min(hours, data.length))
    
    if (rangeData.length === 0) return null
    
    const totalStocktwitsPosts = rangeData.reduce((sum, h) => sum + h.stocktwitsPosts, 0)
    const totalTwitterPosts = rangeData.reduce((sum, h) => sum + h.twitterPosts, 0)
    const totalStocktwitsComments = rangeData.reduce((sum, h) => sum + h.stocktwitsComments, 0)
    const totalTwitterComments = rangeData.reduce((sum, h) => sum + h.twitterComments, 0)
    const totalStocktwitsLikes = rangeData.reduce((sum, h) => sum + h.stocktwitsLikes, 0)
    const totalTwitterLikes = rangeData.reduce((sum, h) => sum + h.twitterLikes, 0)
    const totalStocktwitsImpressions = rangeData.reduce((sum, h) => sum + h.stocktwitsImpressions, 0)
    const totalTwitterImpressions = rangeData.reduce((sum, h) => sum + h.twitterImpressions, 0)
    
    // Gewichteter Durchschnitt für Sentiment
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
      totalComments: totalStocktwitsComments + totalTwitterComments,
      totalStocktwitsComments,
      totalTwitterComments,
      totalLikes: totalStocktwitsLikes + totalTwitterLikes,
      totalStocktwitsLikes,
      totalTwitterLikes,
      totalImpressions: totalStocktwitsImpressions + totalTwitterImpressions,
      totalStocktwitsImpressions,
      totalTwitterImpressions,
      avgSentiment: (avgStocktwitsSentiment + avgTwitterSentiment) / 2,
      avgStocktwitsSentiment,
      avgTwitterSentiment,
      hoursOfData: rangeData.length
    }
  }

  const stats = useMemo(() => getStatsForRange(timeRange), [data, timeRange])

  // Berechne Trend
  const trend = useMemo(() => {
    if (!data || data.length < 48) return null
    
    const current24h = data.slice(0, 24)
    const prev24h = data.slice(24, 48)
    
    const currentTotal = current24h.reduce((sum, h) => sum + h.stocktwitsPosts + h.twitterPosts, 0)
    const prevTotal = prev24h.reduce((sum, h) => sum + h.stocktwitsPosts + h.twitterPosts, 0)
    
    if (prevTotal === 0) return null
    
    return ((currentTotal - prevTotal) / prevTotal) * 100
  }, [data])

  // Berechne erweiterte Metriken
  const trendMetrics = useMemo(() => {
    if (!data || data.length < 168) return null
    
    const now24h = data.slice(0, 24)
    const week1 = data.slice(0, Math.min(168, data.length))
    
    // Momentum Score
    const avgPostsPerHour = week1.reduce((sum, h) => 
      sum + h.stocktwitsPosts + h.twitterPosts, 0) / week1.length
    
    const currentAvg = now24h.reduce((sum, h) => 
      sum + h.stocktwitsPosts + h.twitterPosts, 0) / 24
    
    const momentum = avgPostsPerHour > 0 ? ((currentAvg - avgPostsPerHour) / avgPostsPerHour) * 100 : 0
    
    // Sentiment Trend
    const recentSentiment = now24h.reduce((sum, h) => 
      sum + (h.stocktwitsSentiment + h.twitterSentiment) / 2, 0) / now24h.length
    
    const weekSentiment = week1.reduce((sum, h) => 
      sum + (h.stocktwitsSentiment + h.twitterSentiment) / 2, 0) / week1.length
    
    const sentimentTrend = recentSentiment - weekSentiment
    
    return {
      momentum,
      sentimentTrend
    }
  }, [data])

  // Helper für Tage
  const getDayLabel = (daysAgo: number) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    return date.toLocaleDateString('de-DE', { weekday: 'short' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <SignalIcon className="w-8 h-8 text-green-400 animate-pulse mx-auto mb-3" />
          <p className="text-theme-secondary">Lade Social Media Daten...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-theme-muted">
        Keine Social Media Daten verfügbar
      </div>
    )
  }

  const sentimentScore = Math.round((stats.avgSentiment + 1) * 50)

  return (
    <div className="max-w-7xl mx-auto space-y-6"> {/* Container mit max-width für besseres Layout */}
      
      {/* Header mit Zeitraum Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-theme-primary">Social Media Pulse</h2>
        
        <div className="flex bg-theme-secondary border border-theme/10 rounded-xl p-1">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-theme-muted hover:text-theme-primary'
              }`}
            >
              {range === '24h' ? '24 Stunden' : range === '7d' ? '7 Tage' : '30 Tage'}
            </button>
          ))}
        </div>
      </div>

      {/* Data Info Badge */}
      <div className="flex items-center gap-2 text-xs text-theme-muted bg-theme-secondary/50 rounded-lg px-3 py-2 w-fit">
        <CalendarIcon className="w-3 h-3" />
        <span>
          Zeige Daten für {timeRange} • {stats.hoursOfData} Stunden verfügbar
        </span>
      </div>

      {/* Status Banner wenn Trending */}
      {isTrending && (
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FireIcon className="w-5 h-5 text-orange-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-400">Diese Aktie ist gerade Trending!</p>
              <p className="text-xs text-theme-secondary mt-1">
                Erhöhte Aktivität auf Social Media Plattformen
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Metrics Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Sentiment Score */}
        <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-theme-muted uppercase">Sentiment Score</h3>
            <SignalIcon className="w-4 h-4 text-theme-muted" />
          </div>
          
          <div className="flex items-end gap-3">
            <div className={`text-3xl font-bold ${
              sentimentScore >= 70 ? 'text-green-400' :
              sentimentScore >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {sentimentScore}
            </div>
            <div className="text-sm text-theme-secondary pb-1">/100</div>
          </div>
          
          <div className="mt-4">
            <div className="h-2 bg-theme-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  sentimentScore >= 70 ? 'bg-green-400' :
                  sentimentScore >= 30 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${sentimentScore}%` }}
              />
            </div>
          </div>
          
          <p className="text-xs text-theme-muted mt-3">
            {sentimentScore >= 70 ? 'Sehr Bullish' :
             sentimentScore >= 50 ? 'Leicht Bullish' :
             sentimentScore >= 30 ? 'Neutral' : 'Bearish'}
          </p>
        </div>

        {/* Social Activity */}
        <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-theme-muted uppercase">
              Aktivität ({timeRange})
            </h3>
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-theme-muted" />
          </div>
          
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-theme-primary">
              {stats.totalPosts >= 10000 
                ? `${(stats.totalPosts / 1000).toFixed(1)}K`
                : stats.totalPosts.toLocaleString()}
            </div>
            {trend !== null && timeRange === '24h' && (
              <div className={`flex items-center gap-1 text-sm pb-1 ${
                trend > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {trend > 0 ? (
                  <ArrowTrendingUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3 h-3" />
                )}
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-theme-muted">StockTwits</span>
              <span className="text-theme-secondary">{stats.totalStocktwitsPosts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-theme-muted">Twitter</span>
              <span className="text-theme-secondary">{stats.totalTwitterPosts.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Reach */}
        <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-theme-muted uppercase">Reichweite</h3>
            <UsersIcon className="w-4 h-4 text-theme-muted" />
          </div>
          
          <div className="text-3xl font-bold text-theme-primary">
            {stats.totalImpressions >= 1000000 
              ? `${(stats.totalImpressions / 1000000).toFixed(1)}M`
              : stats.totalImpressions >= 1000
              ? `${(stats.totalImpressions / 1000).toFixed(1)}K`
              : stats.totalImpressions.toLocaleString()
            }
          </div>
          
          <p className="text-xs text-theme-muted mt-2">Impressions</p>
          
          <div className="mt-4">
            <div className="text-xs text-theme-secondary">
              Engagement Rate
            </div>
            <div className="text-lg font-bold text-theme-primary">
              {stats.totalImpressions > 0 
                ? ((stats.totalLikes / stats.totalImpressions) * 100).toFixed(2)
                : '0.00'}%
            </div>
          </div>
        </div>
      </div>

      {/* Momentum Indicator */}
      {trendMetrics && (
        <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
          <h3 className="text-lg font-bold text-theme-primary mb-4">
            Social Momentum
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-theme-muted uppercase mb-2">Aktivitäts-Momentum</div>
              <div className={`text-2xl font-bold ${
                trendMetrics.momentum > 20 ? 'text-green-400' :
                trendMetrics.momentum < -20 ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {trendMetrics.momentum > 0 ? '+' : ''}{trendMetrics.momentum.toFixed(1)}%
              </div>
              <div className="text-xs text-theme-muted mt-1">
                vs. 7-Tage Durchschnitt
              </div>
            </div>
            
            <div>
              <div className="text-xs text-theme-muted uppercase mb-2">Sentiment Trend</div>
              <div className="flex items-center gap-2">
                {trendMetrics.sentimentTrend > 0 ? (
                  <>
                    <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-bold">Steigend</span>
                  </>
                ) : trendMetrics.sentimentTrend < 0 ? (
                  <>
                    <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-bold">Fallend</span>
                  </>
                ) : (
                  <span className="text-yellow-400 font-bold">Stabil</span>
                )}
              </div>
              <div className="text-xs text-theme-muted mt-1">
                Stimmungsentwicklung
              </div>
            </div>
          </div>
        </div>
      )}
{/* Stündlicher Verlauf für 24h */}
{timeRange === '24h' && data.length >= 24 && (
  <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-theme-primary">Aktivität Verlauf (24h)</h3>
      <ClockIcon className="w-4 h-4 text-theme-muted" />
    </div>
    
    <div className="h-32 flex items-end gap-0.5">
      {data.slice(0, 24).reverse().map((hour, idx) => {
        const total = hour.stocktwitsPosts + hour.twitterPosts
        const maxInPeriod = Math.max(...data.slice(0, 24).map(h => h.stocktwitsPosts + h.twitterPosts))
        const height = maxInPeriod > 0 ? (total / maxInPeriod) * 100 : 0
        
        // Konvertiere UTC zu lokaler Zeit
        const hourDate = new Date(hour.date)
        const localHour = hourDate.getHours()
        
        return (
          <div
            key={idx}
            className="flex-1 bg-green-500/20 hover:bg-green-500/40 rounded-t transition-all cursor-pointer group relative"
            style={{ height: `${Math.max(height, 2)}%` }}
          >
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-theme-card border border-theme/20 rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                <div className="font-bold text-theme-primary">{total} Posts</div>
                <div className="text-theme-muted">
                  {hourDate.toLocaleTimeString('de-DE', { 
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
    
    <div className="flex justify-between mt-2 text-xs text-theme-muted">
      <span>{new Date(data[23]?.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
      <span>{new Date(data[11]?.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
      <span>{new Date(data[0]?.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  </div>
)}

      {/* 7-Tage Heatmap */}
      {timeRange === '7d' && data.length >= 168 && (
        <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
          <h3 className="text-lg font-bold text-theme-primary mb-4">
            Sentiment Heatmap (7 Tage)
          </h3>
          
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, dayIndex) => {
              const dayData = data.slice(dayIndex * 24, Math.min((dayIndex + 1) * 24, data.length))
              
              if (dayData.length === 0) return null
              
              const dayAvgSentiment = dayData.reduce((sum, h) => 
                sum + (h.stocktwitsSentiment + h.twitterSentiment) / 2, 0
              ) / dayData.length
              
              const daySentimentScore = Math.round((dayAvgSentiment + 1) * 50)
              
              return (
                <div key={dayIndex} className="text-center">
                  <div className="text-xs text-theme-muted mb-2">
                    {getDayLabel(6 - dayIndex)}
                  </div>
                  <div
                    className={`h-14 rounded-lg flex items-center justify-center font-bold text-sm ${
                      daySentimentScore >= 70 ? 'bg-green-500/30 text-green-400' :
                      daySentimentScore >= 30 ? 'bg-yellow-500/30 text-yellow-400' :
                      'bg-red-500/30 text-red-400'
                    }`}
                  >
                    {daySentimentScore}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Platform Breakdown - Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
          <h3 className="text-lg font-bold text-theme-primary mb-4">StockTwits</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Sentiment</span>
              <span className={`text-sm font-bold ${
                stats.avgStocktwitsSentiment > 0.5 ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats.avgStocktwitsSentiment > 0.5 ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Posts</span>
              <span className="text-sm font-medium text-theme-secondary">
                {stats.totalStocktwitsPosts.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Kommentare</span>
              <span className="text-sm font-medium text-theme-secondary">
                {stats.totalStocktwitsComments.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Likes</span>
              <span className="text-sm font-medium text-theme-secondary">
                {stats.totalStocktwitsLikes.toLocaleString()}
              </span>
            </div>
            
            <div className="pt-3 border-t border-theme/10">
              <div className="flex justify-between items-center">
                <span className="text-xs text-theme-muted">Impressions</span>
                <span className="text-xs font-bold text-theme-primary">
                  {stats.totalStocktwitsImpressions >= 1000000 
                    ? `${(stats.totalStocktwitsImpressions / 1000000).toFixed(1)}M`
                    : `${(stats.totalStocktwitsImpressions / 1000).toFixed(1)}K`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
          <h3 className="text-lg font-bold text-theme-primary mb-4">Twitter / X</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Sentiment</span>
              <span className={`text-sm font-bold ${
                stats.avgTwitterSentiment > 0.5 ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats.avgTwitterSentiment > 0.5 ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Posts</span>
              <span className="text-sm font-medium text-theme-secondary">
                {stats.totalTwitterPosts.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Kommentare</span>
              <span className="text-sm font-medium text-theme-secondary">
                {stats.totalTwitterComments.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-muted">Likes</span>
              <span className="text-sm font-medium text-theme-secondary">
                {stats.totalTwitterLikes.toLocaleString()}
              </span>
            </div>
            
            <div className="pt-3 border-t border-theme/10">
              <div className="flex justify-between items-center">
                <span className="text-xs text-theme-muted">Impressions</span>
                <span className="text-xs font-bold text-theme-primary">
                  {stats.totalTwitterImpressions >= 1000000 
                    ? `${(stats.totalTwitterImpressions / 1000000).toFixed(1)}M`
                    : `${(stats.totalTwitterImpressions / 1000).toFixed(1)}K`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

{/* Erweiterte Trending Stocks mit mehr Context */}
{trendingStocks.length > 0 && (
  <div className="bg-theme-card border border-theme/10 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-4">
      <TrophyIcon className="w-5 h-5 text-yellow-400" />
      <h3 className="text-lg font-bold text-theme-primary">Top Trending Stocks</h3>
      <span className="text-xs text-theme-muted ml-auto">
        StockTwits Aktivität • Letzte 24h
      </span>
    </div>
    
    <div className="space-y-3">
      {trendingStocks.slice(0, 5).map((stock, idx) => {
        // Verwende mentions oder posts, je nachdem was verfügbar ist
        const activityCount = stock.mentions || stock.posts || stock.volume
        
        return (
          <div key={stock.symbol} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-theme-secondary/30 transition-colors border-b border-theme/10 last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                idx === 2 ? 'bg-orange-600/20 text-orange-600' :
                stock.symbol === ticker ? 'bg-green-500/20 text-green-400' : 
                'bg-theme-secondary text-theme-secondary'
              }`}>
                {idx + 1}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${
                    stock.symbol === ticker ? 'text-green-400' : 'text-theme-primary'
                  }`}>
                    {stock.symbol}
                  </span>
                  {stock.symbol === ticker && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      Diese Aktie
                    </span>
                  )}
                </div>
                {stock.name && (
                  <div className="text-xs text-theme-muted mt-0.5">{stock.name}</div>
                )}
                {activityCount && (
                  <div className="text-xs text-theme-muted mt-0.5">
                    {activityCount.toLocaleString()} Erwähnungen
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              {stock.sentimentChange !== undefined && stock.sentimentChange !== 0 ? (
                <>
                  <div className={`text-sm font-bold ${
                    stock.sentimentChange > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stock.sentimentChange > 0 ? '+' : ''}{stock.sentimentChange.toFixed(1)}%
                  </div>
                  <div className="text-xs text-theme-muted">Sentiment Δ</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-yellow-400">
                    Trending
                  </div>
                  <div className="text-xs text-theme-muted">Hohe Aktivität</div>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
    
    <div className="mt-4 pt-3 border-t border-theme/10 text-xs text-theme-muted">
      <div className="flex items-center gap-2">
        <EyeIcon className="w-3 h-3" />
        <span>
          Rankings basieren auf Aktivität und Sentiment-Veränderungen der letzten 24 Stunden
        </span>
      </div>
    </div>
  </div>
)}

      {/* Contrarian Warnings */}
      {sentimentScore > 85 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-400">Extreme Euphorie erkannt</p>
              <p className="text-xs text-theme-secondary mt-1">
                Ein Sentiment Score über 85 kann ein Kontraindikator sein. 
                Wenn alle bullish sind, wer kauft dann noch?
              </p>
            </div>
          </div>
        </div>
      )}
      
      {sentimentScore < 15 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-400">Extreme Pessimismus erkannt</p>
              <p className="text-xs text-theme-secondary mt-1">
                Ein Sentiment Score unter 15 könnte eine Kaufgelegenheit signalisieren.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center pt-6 border-t border-theme/10">
        <p className="text-xs text-theme-muted">
          Daten aggregiert über {timeRange === '24h' ? 'die letzten 24 Stunden' : 
                                 timeRange === '7d' ? 'die letzten 7 Tage' : 
                                 'die letzten 30 Tage'} • 
          {stats.hoursOfData} Stunden Daten verfügbar • 
          Basierend auf {stats.totalPosts.toLocaleString()} Posts
        </p>
      </div>
    </div>
  )
}