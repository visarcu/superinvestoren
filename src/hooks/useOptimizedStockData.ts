// Optimized Stock Data Hook - Performance Optimization
// Replaces 13+ individual API calls with 1 combined call + caching
'use client'

import { useState, useEffect, useRef } from 'react'

interface StockOverviewData {
  basic: {
    quote: any
    profile: any
    ticker: string
  }
  financials: {
    keyMetrics: any
    ratios: any
    estimates: any[]
  }
  additional: {
    historical: any[]
    news: any[]
    peers: any[]
  }
  meta: {
    timestamp: string
    dataQuality: {
      hasQuote: boolean
      hasProfile: boolean
      hasFinancials: boolean
      hasEstimates: boolean
    }
  }
}

// Memory cache for recently viewed stocks
const stockCache = new Map<string, { data: StockOverviewData; timestamp: number }>()

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

export function useOptimizedStockData(ticker: string) {
  const [data, setData] = useState<StockOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!ticker) return

    const loadStockData = async () => {
      try {
        setLoading(true)
        setError(null)

        // ✅ CHECK MEMORY CACHE FIRST
        const cached = stockCache.get(ticker.toUpperCase())
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log(`📦 Using cached data for ${ticker}`)
          setData(cached.data)
          setLoading(false)
          return
        }

        // ✅ CHECK SESSION STORAGE CACHE
        const sessionKey = `stock-overview-${ticker.toUpperCase()}`
        const sessionCached = sessionStorage.getItem(sessionKey)
        if (sessionCached) {
          try {
            const parsed = JSON.parse(sessionCached)
            if (Date.now() - parsed.timestamp < CACHE_DURATION) {
              console.log(`💾 Using session cached data for ${ticker}`)
              stockCache.set(ticker.toUpperCase(), { data: parsed.data, timestamp: parsed.timestamp })
              setData(parsed.data)
              setLoading(false)
              return
            }
          } catch (e) {
            // Invalid cache data, continue with fetch
            sessionStorage.removeItem(sessionKey)
          }
        }

        // ✅ ABORT PREVIOUS REQUEST IF EXISTS
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        // ✅ FETCH FRESH DATA - SINGLE API CALL
        console.log(`🚀 Fetching combined stock overview for ${ticker}`)
        const response = await fetch(`/api/stock-overview/${ticker}`, {
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }

        const stockData = await response.json()

        // ✅ UPDATE ALL CACHES
        const timestamp = Date.now()
        const cacheEntry = { data: stockData, timestamp }
        
        // Memory cache
        stockCache.set(ticker.toUpperCase(), cacheEntry)
        
        // Session storage cache
        try {
          sessionStorage.setItem(sessionKey, JSON.stringify(cacheEntry))
        } catch (e) {
          // Storage full or disabled, continue without caching
          console.warn('Session storage failed:', e)
        }

        setData(stockData)
        console.log(`✅ Loaded stock overview for ${ticker} in single request`)

      } catch (error: any) {
        if (error.name === 'AbortError') {
          return // Request was cancelled, ignore
        }
        console.error(`❌ Error loading stock data for ${ticker}:`, error)
        setError(error.message || 'Failed to load stock data')
      } finally {
        setLoading(false)
      }
    }

    loadStockData()

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [ticker])

  // ✅ HELPER FUNCTIONS FOR EASY ACCESS
  const helpers = {
    // Basic stock info
    getPrice: () => data?.basic?.quote?.price || 0,
    getChange: () => data?.basic?.quote?.change || 0,
    getChangePercent: () => data?.basic?.quote?.changesPercentage || 0,
    getMarketCap: () => data?.basic?.quote?.marketCap || 0,
    
    // Company info
    getCompanyName: () => data?.basic?.profile?.companyName || data?.basic?.ticker || '',
    getSector: () => data?.basic?.profile?.sector || '',
    getIndustry: () => data?.basic?.profile?.industry || '',
    getDescription: () => data?.basic?.profile?.description || '',
    
    // Financial ratios
    getPE: () => data?.basic?.quote?.pe || data?.financials?.ratios?.priceEarningsRatio || 0,
    getROE: () => data?.financials?.ratios?.returnOnEquity || 0,
    getDebtToEquity: () => data?.financials?.ratios?.debtToEquity || 0,
    
    // Estimates
    getNextEarningsDate: () => {
      const estimates = data?.financials?.estimates || []
      return estimates[0]?.date || null
    },
    
    // Data quality
    hasEssentialData: () => data?.meta?.dataQuality?.hasQuote && data?.meta?.dataQuality?.hasProfile,
    getCacheAge: () => {
      if (!data?.meta?.timestamp) return null
      return Math.floor((Date.now() - new Date(data.meta.timestamp).getTime()) / 1000)
    }
  }

  return {
    data,
    loading,
    error,
    helpers,
    // Raw sections for specific use cases
    quote: data?.basic?.quote,
    profile: data?.basic?.profile,
    financials: data?.financials,
    additional: data?.additional,
    meta: data?.meta
  }
}

// ✅ UTILITY FUNCTION TO PRELOAD STOCK DATA
export function preloadStockData(ticker: string) {
  if (!ticker) return

  // Don't preload if already cached
  const cached = stockCache.get(ticker.toUpperCase())
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return
  }

  // Preload in background
  fetch(`/api/stock-overview/${ticker}`).catch(() => {
    // Ignore errors for preloading
  })
}

// ✅ UTILITY TO CLEAR CACHE (useful for development)
export function clearStockCache() {
  stockCache.clear()
  // Clear session storage
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('stock-overview-')) {
      sessionStorage.removeItem(key)
    }
  })
}