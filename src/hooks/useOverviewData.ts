// Optimized hook for overview page data
import { useState, useEffect } from 'react'

export interface OverviewData {
  portfolioValue: Record<string, number>
  featuredInvestors: Array<{
    slug: string
    name: string
    imageUrl: string
    peek: Array<{
      ticker: string
      name: string
      value: number
    }>
    portfolioValue: number
  }>
  pulseData: {
    netBuyers: number
    netSellers: number
    totalInvestorsActive: number
    sentimentPercentage: number
    totalPortfolioChanges: number
    averageChanges: number
    hotSectors: Array<[string, number]>
    coldSectors: Array<[string, number]>
  }
  trendingStocks: {
    topBuys: Array<[string, number]>
    topSells: Array<[string, number]>
    maxBuys: number
    maxSells: number
  }
  biggestTrades: Array<{
    ticker: string
    name: string
    action: 'Gekauft' | 'Verkauft' | 'Erhöht' | 'Reduziert'
    change: string
    investor: string
    investorSlug: string
    color: string
    value: number
  }>
  totalInvestors: number
  lastUpdated: string
}

interface UseOverviewDataResult {
  data: OverviewData | null
  loading: boolean
  error: string | null
}

export function useOverviewData(): UseOverviewDataResult {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchOverviewData() {
      try {
        setLoading(true)
        setError(null)

        console.log('📊 Fetching optimized overview data...')
        
        const response = await fetch('/api/overview', {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=3600' // Client-side caching
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch overview data: ${response.status}`)
        }

        const result = await response.json()

        if (!mounted) return

        console.log('✅ Overview data loaded successfully')
        setData(result)

      } catch (err) {
        if (!mounted) return
        console.error('❌ Error fetching overview data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load overview data')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchOverviewData()

    return () => {
      mounted = false
    }
  }, [])

  return {
    data,
    loading,
    error
  }
}

// Hook for fallback data (if API fails)
export function useOverviewFallback(): UseOverviewDataResult {
  // This would import the static data as fallback
  // For now, return empty state
  return {
    data: null,
    loading: false,
    error: 'Fallback data not implemented yet'
  }
}