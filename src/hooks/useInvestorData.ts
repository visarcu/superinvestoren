// Optimized hook for individual investor data - replaces 38MB client-side imports
import { useState, useEffect } from 'react'

export interface InvestorHolding {
  cusip: string
  ticker: string
  name: string
  shares: number
  value: number
  percentage: number
  formatted: {
    value: string
    shares: string
    percentage: string
  }
}

export interface SectorBreakdown {
  sector: string
  value: number
  count: number
  percentage: number
}

export interface PortfolioChange {
  ticker: string
  name: string
  action: string
  change: {
    shares: number
    value: number
    formatted: {
      shares: string
      value: string
    }
  }
  color: string
  sortValue: number
}

export interface SnapshotData {
  date: string
  totalValue: number
  positionsCount: number
  formatted: {
    date: string
    totalValue: string
  }
}

export interface InvestorData {
  investor: {
    name: string
    slug: string
    imageUrl: string
    updatedAt: string
  }
  holdings: InvestorHolding[]
  totalValue: number
  cashPosition: number
  sectorBreakdown: SectorBreakdown[]
  portfolioChanges: PortfolioChange[]
  snapshots: SnapshotData[]
  lastUpdated: string
  getOwnershipHistory: (ticker: string) => any[]
  formatted: {
    totalValue: string
    cashPosition: string
  }
}

interface UseInvestorDataResult {
  data: InvestorData | null
  loading: boolean
  error: string | null
  // Legacy compatibility
  isLoading: boolean
}

export function useInvestorData(slug: string): UseInvestorDataResult {
  const [data, setData] = useState<InvestorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchInvestorData() {
      if (!slug) return
      
      try {
        setLoading(true)
        setError(null)

        console.log(`📊 Fetching optimized investor data for: ${slug}`)
        
        const response = await fetch(`/api/investors/${slug}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=1800' // Client-side caching
          }
        })

        console.log(`🔍 API Response Status: ${response.status}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Investor nicht gefunden')
          }
          throw new Error(`Failed to fetch investor data: ${response.status}`)
        }

        const result = await response.json()
        console.log(`🔍 API Response Data:`, { 
          hasInvestor: !!result.investor, 
          holdingsCount: result.holdings?.length || 0,
          totalValue: result.totalValue,
          hasSectorBreakdown: !!result.sectorBreakdown 
        })

        if (!mounted) return

        console.log(`✅ Investor data loaded for ${slug}: ${result.holdings?.length || 0} holdings`)
        setData(result)

      } catch (err) {
        if (!mounted) return
        console.error(`❌ Error fetching investor data for ${slug}:`, err)
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchInvestorData()

    return () => {
      mounted = false
    }
  }, [slug])

  return {
    data,
    loading,
    error,
    isLoading: loading // Legacy compatibility
  }
}

// Hook for getting ownership history of specific ticker
export function useOwnershipHistory(slug: string, ticker: string) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchOwnershipHistory() {
      if (!slug || !ticker) return
      
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/investors/${slug}/ownership-history?ticker=${ticker}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ownership history: ${response.status}`)
        }

        const result = await response.json()

        if (!mounted) return
        setData(result)

      } catch (err) {
        if (!mounted) return
        console.error('❌ Error fetching ownership history:', err)
        setError(err instanceof Error ? err.message : 'Failed to load ownership history')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchOwnershipHistory()

    return () => {
      mounted = false
    }
  }, [slug, ticker])

  return { data, loading, error }
}