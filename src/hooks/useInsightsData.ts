// Hook for insights page data
import { useState, useEffect } from 'react'

interface TopBuyItem {
  ticker: string
  count: number
  name: string
}

interface TopOwnedItem {
  ticker: string
  count: number
  name: string
}

interface BiggestInvestmentItem {
  ticker: string
  name: string
  value: number
  investor: string
}

interface SectorAnalysis {
  sector: string
  value: number
  count: number
  percentage: number
}

interface GeographicExposure {
  usValue: number
  internationalValue: number
  usPercentage: number
  intlPercentage: number
}

interface DataSourceStats {
  totalInvestors: number
  investorsWithData: number
  totalFilings: number
  filingsInPeriod: number
  lastUpdated: string
  quarters: string[]
}

export interface InsightsData {
  topBuys: TopBuyItem[]
  topOwned: TopOwnedItem[]
  biggestInvestments: BiggestInvestmentItem[]
  sectorAnalysis: SectorAnalysis[]
  geographicExposure: GeographicExposure
  dataSourceStats: DataSourceStats
  totalPortfolioValue: number
  quartersAnalyzed: string[]
  lastUpdated: string
}

interface UseInsightsDataResult {
  data: InsightsData | null
  loading: boolean
  error: string | null
}

export function useInsightsData(selectedQuarters: string[] = []): UseInsightsDataResult {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchInsightsData() {
      try {
        setLoading(true)
        setError(null)

        console.log('📊 Fetching insights data for quarters:', selectedQuarters)
        
        const params = new URLSearchParams()
        if (selectedQuarters.length > 0) {
          params.set('quarters', selectedQuarters.join(','))
        }
        
        const response = await fetch(`/api/insights?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=1800' // Client-side caching
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch insights data: ${response.status}`)
        }

        const result = await response.json()

        if (!mounted) return

        console.log('✅ Insights data loaded successfully:', {
          topBuys: result.topBuys?.length || 0,
          topOwned: result.topOwned?.length || 0,
          sectors: result.sectorAnalysis?.length || 0
        })
        setData(result)

      } catch (err) {
        if (!mounted) return
        console.error('❌ Error fetching insights data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load insights data')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchInsightsData()

    return () => {
      mounted = false
    }
  }, [selectedQuarters.join(',')])

  return {
    data,
    loading,
    error
  }
}