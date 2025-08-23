// Holdings API utility with fallback to static imports
import holdingsHistory from '@/data/holdings'

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

interface HoldingsResponse {
  success: boolean
  data: HoldingsSnapshot | HoldingsSnapshot[]
  investor?: string
}

// Get latest holdings for specific investor (performance optimized)
export async function getLatestHoldings(slug: string): Promise<HoldingsSnapshot | null> {
  try {
    // Try API first for better performance
    const response = await fetch(`/api/holdings/latest/${slug}`)
    if (response.ok) {
      const result: HoldingsResponse = await response.json()
      if (result.success && !Array.isArray(result.data)) {
        return result.data
      }
    }
    
    // Fallback to static import
    console.log(`Using fallback for ${slug} latest holdings`)
    const investorHoldings = holdingsHistory[slug as keyof typeof holdingsHistory]
    if (investorHoldings && Array.isArray(investorHoldings) && investorHoldings.length > 0) {
      return investorHoldings[investorHoldings.length - 1]
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching latest holdings for ${slug}:`, error)
    
    // Fallback to static import
    try {
      const investorHoldings = holdingsHistory[slug as keyof typeof holdingsHistory]
      if (investorHoldings && Array.isArray(investorHoldings) && investorHoldings.length > 0) {
        return investorHoldings[investorHoldings.length - 1]
      }
    } catch (fallbackError) {
      console.error(`Fallback also failed for ${slug}:`, fallbackError)
    }
    
    return null
  }
}

// Get all holdings for specific investor
export async function getAllHoldings(slug: string): Promise<HoldingsSnapshot[] | null> {
  try {
    // Try API first
    const response = await fetch(`/api/holdings/${slug}`)
    if (response.ok) {
      const result: HoldingsResponse = await response.json()
      if (result.success && Array.isArray(result.data)) {
        return result.data
      }
    }
    
    // Fallback to static import
    console.log(`Using fallback for ${slug} all holdings`)
    const investorHoldings = holdingsHistory[slug as keyof typeof holdingsHistory]
    if (investorHoldings && Array.isArray(investorHoldings)) {
      return investorHoldings
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching all holdings for ${slug}:`, error)
    
    // Fallback to static import
    try {
      const investorHoldings = holdingsHistory[slug as keyof typeof holdingsHistory]
      if (investorHoldings && Array.isArray(investorHoldings)) {
        return investorHoldings
      }
    } catch (fallbackError) {
      console.error(`Fallback also failed for ${slug}:`, fallbackError)
    }
    
    return null
  }
}

// Export the static holdings as fallback (keeps existing functionality intact)
export { default as staticHoldings } from '@/data/holdings'