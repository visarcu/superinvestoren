// Hook for homepage portfolio data
import { useState, useEffect } from 'react'

interface PortfolioData {
  name: string
  investor: string
  date: string
  filingId: string
  totalValue: string
  tickers: string
  holdings: Array<{
    ticker: string
    value: string
    percentage: string
  }>
}

export function useHomepagePortfolios() {
  const [data, setData] = useState<PortfolioData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchPortfolios() {
      try {
        const response = await fetch('/api/homepage-portfolios', {
          headers: {
            'Cache-Control': 'max-age=1800'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data')
        }

        const portfolios = await response.json()

        if (!mounted) return

        setData(portfolios)
        setError(null)
      } catch (err) {
        if (!mounted) return
        console.error('Homepage portfolios error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        
        // Fallback data
        setData([
          {
            name: 'Berkshire Hathaway Inc',
            investor: 'Warren Buffett',
            date: '29.09.2024',
            filingId: '1067983',
            totalValue: '266 Mrd. $',
            tickers: 'AAPL, BAC, AXP, KO',
            holdings: [
              { ticker: 'AAPL', value: '69.9B', percentage: '26.0' },
              { ticker: 'BAC', value: '31.7B', percentage: '12.0' },
              { ticker: 'AXP', value: '25.1B', percentage: '9.5' }
            ]
          }
        ])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchPortfolios()

    return () => {
      mounted = false
    }
  }, [])

  return { data, loading, error }
}