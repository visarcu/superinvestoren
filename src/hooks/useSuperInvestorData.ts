// Hook for super investor analysis data - replaces 38MB client-side holdings processing
import { useState, useEffect } from 'react'

interface SuperInvestorStock {
  ticker: string
  count: number
  totalValue: number
  name: string
}

export interface SuperInvestorData {
  hiddenGems: SuperInvestorStock[]
  recentBuys: SuperInvestorStock[]
}

interface UseSuperInvestorDataResult {
  data: SuperInvestorData | null
  loading: boolean
  error: string | null
}

export function useSuperInvestorData(): UseSuperInvestorDataResult {
  const [data, setData] = useState<SuperInvestorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchSuperInvestorData() {
      try {
        setLoading(true)
        setError(null)

        console.log('📊 Fetching super investor analysis data...')
        
        const response = await fetch('/api/super-investor-analysis', {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=1800' // Client-side caching
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch super investor data: ${response.status}`)
        }

        const result = await response.json()

        if (!mounted) return

        console.log('✅ Super investor data loaded successfully:', result.hiddenGems?.length || 0, 'hidden gems,', result.recentBuys?.length || 0, 'recent buys')
        setData(result)

      } catch (err) {
        if (!mounted) return
        console.error('❌ Error fetching super investor data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load super investor data')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchSuperInvestorData()

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