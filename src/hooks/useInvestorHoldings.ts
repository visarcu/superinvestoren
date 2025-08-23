// Optimized hook for individual investor holdings
import { useState, useEffect } from 'react'
import { getAllHoldings, getLatestHoldings } from '@/lib/holdingsAPI'

interface HoldingsSnapshot {
  quarter: string
  data: {
    form: string
    date: string
    period: string
    accession: string
    quarterKey: string
    positions: any[]
    totalValue: number
    positionsCount: number
    portfolioSummary: any
  }
}

interface UseInvestorHoldingsResult {
  allHoldings: HoldingsSnapshot[] | null
  latestHoldings: HoldingsSnapshot | null
  loading: boolean
  error: string | null
}

// Hook for individual investor data (performance optimized)
export function useInvestorHoldings(slug: string): UseInvestorHoldingsResult {
  const [allHoldings, setAllHoldings] = useState<HoldingsSnapshot[] | null>(null)
  const [latestHoldings, setLatestHoldings] = useState<HoldingsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchHoldings() {
      if (!slug) return

      try {
        setLoading(true)
        setError(null)

        // Fetch both latest and all holdings concurrently
        const [latest, all] = await Promise.all([
          getLatestHoldings(slug),
          getAllHoldings(slug)
        ])

        if (!mounted) return

        if (latest) {
          setLatestHoldings(latest)
        }

        if (all) {
          setAllHoldings(all)
        }

        if (!latest && !all) {
          setError(`No holdings data found for ${slug}`)
        }

      } catch (err) {
        if (!mounted) return
        console.error(`Error fetching holdings for ${slug}:`, err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchHoldings()

    return () => {
      mounted = false
    }
  }, [slug])

  return {
    allHoldings,
    latestHoldings,
    loading,
    error
  }
}

// Hook for only latest holdings (even more performance optimized)
export function useLatestInvestorHoldings(slug: string) {
  const [latestHoldings, setLatestHoldings] = useState<HoldingsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchLatest() {
      if (!slug) return

      try {
        setLoading(true)
        setError(null)

        const latest = await getLatestHoldings(slug)

        if (!mounted) return

        if (latest) {
          setLatestHoldings(latest)
        } else {
          setError(`No latest holdings found for ${slug}`)
        }

      } catch (err) {
        if (!mounted) return
        console.error(`Error fetching latest holdings for ${slug}:`, err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchLatest()

    return () => {
      mounted = false
    }
  }, [slug])

  return {
    latestHoldings,
    loading,
    error
  }
}