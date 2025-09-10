// src/lib/peerComparisonService.ts - SECURE VERSION using API routes only
export interface PeerCompany {
  ticker: string
  name: string
  sector: string
  industry: string
  marketCap: number
  pe: number | null
  pb: number | null
  ps: number | null
  ev: number | null
  evEbitda: number | null
  evSales: number | null
  priceToFreeCashFlow: number | null
  currentRatio: number | null
  debtToEquity: number | null
  roe: number | null
  roic: number | null
  grossMargin: number | null
  operatingMargin: number | null
  netMargin: number | null
}

export interface PeerComparisonData {
  targetCompany: PeerCompany
  peers: PeerCompany[]
  sectorAverages: {
    pe: number | null
    pb: number | null
    ps: number | null
    evEbitda: number | null
    evSales: number | null
    priceToFreeCashFlow: number | null
    roe: number | null
    roic: number | null
    grossMargin: number | null
    operatingMargin: number | null
    netMargin: number | null
  }
}

class PeerComparisonService {
  // SECURE VERSION: Uses API route instead of direct FMP calls
  async getSectorAverages(ticker: string): Promise<{
    sector: string
    industry: string
    sectorAverages: PeerComparisonData['sectorAverages']
  } | null> {
    try {
      console.log(`🔍 [SectorAverages] Loading sector averages for ${ticker} via secure API`)
      
      // Use secure API route instead of direct FMP calls
      const response = await fetch(`/api/peer-comparison/${ticker}`)
      
      if (!response.ok) {
        console.log(`❌ Failed to fetch sector averages for ${ticker}`)
        return null
      }

      const data = await response.json()
      return data

    } catch (error) {
      console.error('[SectorAverages] Error:', error)
      return null
    }
  }

  // All other methods have been removed for security - they used direct FMP API calls
  // Frontend should only use secure API routes via getSectorAverages() method
}

// Export singleton instance
export const peerComparisonService = new PeerComparisonService()