// Hook for investors list data
import { useState, useEffect } from 'react'

interface InvestorListItem {
  slug: string
  name: string
  subtitle: string
  type: 'investor' | 'fund'
  totalValue: number
  positionsCount: number
  lastUpdate: string | null
}

interface InvestorsStats {
  total: number
  investors: number
  funds: number
}

export interface InvestorsData {
  investors: InvestorListItem[]
  stats: InvestorsStats
  lastUpdated: string
}

interface UseInvestorsDataResult {
  data: InvestorsData | null
  loading: boolean
  error: string | null
}

export function useInvestorsData(): UseInvestorsDataResult {
  const [data, setData] = useState<InvestorsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchInvestorsData() {
      try {
        setLoading(true)
        setError(null)

        console.log('📊 Fetching optimized investors data...')
        
        const response = await fetch('/api/investors', {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=3600' // Client-side caching
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch investors data: ${response.status}`)
        }

        const result = await response.json()

        if (!mounted) return

        console.log('✅ Investors data loaded successfully:', result.investors.length, 'investors')
        setData(result)

      } catch (err) {
        if (!mounted) return
        console.error('❌ Error fetching investors data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load investors data')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchInvestorsData()

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