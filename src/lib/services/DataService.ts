// src/lib/services/DataService.ts - SECURE VERSION using API routes only

export interface DividendDataPoint {
  date: string
  amount: number
  source: 'fmp' | 'finnhub' | 'alpha_vantage' | 'yahoo' | 'reference' | 'merged'
  confidence: number // 0-100
}

export interface DataQuality {
  score: number // 0-100
  issues: string[]
  sources: string[]
  coverage: number // percentage of expected data points
}

export interface StockQuote {
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  source: string
  timestamp: number
}

// ─── SECURE DataService - All API calls moved to secure backend routes ─────────
export class DataService {
  // SECURE VERSION: All methods now use API routes instead of direct API calls

  // Use secure dividend API route
  async getDividendData(ticker: string): Promise<{
    historical: Record<string, number>
    rawData: {
      fmp: DividendDataPoint[]
      finnhub: DividendDataPoint[]
      alphaVantage: DividendDataPoint[]
      yahoo?: DividendDataPoint[]
    }
    quality: DataQuality
    recommendations: string[]
  } | null> {
    try {
      const response = await fetch(`/api/dividends/${ticker}`)
      
      if (!response.ok) {
        console.log(`❌ Failed to fetch dividend data for ${ticker}`)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('[DataService] Error fetching dividend data:', error)
      return null
    }
  }

  // Use secure quote API route  
  async getStockQuote(ticker: string): Promise<StockQuote | null> {
    try {
      const response = await fetch(`/api/quote/${ticker}`)
      
      if (!response.ok) {
        console.log(`❌ Failed to fetch stock quote for ${ticker}`)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('[DataService] Error fetching stock quote:', error)
      return null
    }
  }

  // All direct API calls have been removed for security
  // Frontend should only use secure API routes
}

// Export singleton instance
export const dataService = new DataService()