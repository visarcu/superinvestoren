// Hook for homepage portfolio showcase data
import { useState, useEffect } from 'react'

interface PortfolioHolding {
  ticker: string
  value: string
  percentage: string
}

interface PortfolioShowcase {
  name: string
  investor: string
  date: string
  filingId: string
  totalValue: string
  tickers: string
  holdings: PortfolioHolding[]
}

export interface HomepagePortfolioData {
  portfolios: PortfolioShowcase[]
}

interface UseHomepagePortfolioDataResult {
  data: HomepagePortfolioData | null
  loading: boolean
  error: string | null
}

export function useHomepagePortfolioData(): UseHomepagePortfolioDataResult {
  const [data, setData] = useState<HomepagePortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchPortfolioData() {
      try {
        setLoading(true)
        setError(null)

        console.log('📊 Fetching homepage portfolio data...')
        
        const response = await fetch('/api/homepage/portfolio-data', {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=3600' // Client-side caching
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch homepage portfolio data: ${response.status}`)
        }

        const result = await response.json()

        if (!mounted) return

        console.log('✅ Homepage portfolio data loaded successfully:', result.portfolios?.length || 0, 'portfolios')
        setData(result)

      } catch (err) {
        if (!mounted) return
        console.error('❌ Error fetching homepage portfolio data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load homepage portfolio data')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchPortfolioData()

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