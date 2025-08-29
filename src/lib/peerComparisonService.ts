// src/lib/peerComparisonService.ts - Peer Comparison Service
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
  private fmpKey: string

  constructor() {
    this.fmpKey = process.env.NEXT_PUBLIC_FMP_API_KEY || ''
  }

  // Neue Methode: Nur Sektor-Durchschnitte für Valuation Table
  async getSectorAverages(ticker: string): Promise<{
    sector: string
    industry: string
    sectorAverages: PeerComparisonData['sectorAverages']
  } | null> {
    try {
      console.log(`🔍 [SectorAverages] Loading sector averages for ${ticker}`)
      
      // 1. Lade Company Profile für Sektor/Industrie Info
      const companyProfile = await this.getCompanyProfile(ticker)
      if (!companyProfile) {
        throw new Error('Could not fetch company profile')
      }

      // 2. Finde Peer Companies basierend auf Sektor
      const peerTickers = await this.findPeerCompanies(companyProfile.sector, companyProfile.industry, ticker)
      
      // 3. Lade Financial Data für Peers (ohne Target Company)
      const peerData = await Promise.all(
        peerTickers.map(peerTicker => this.getCompanyFinancialData(peerTicker))
      )

      // 4. Filtere gültige Peer-Daten
      const validPeers = peerData.filter((data): data is PeerCompany => data !== null)
      
      console.log(`📊 [SectorAverages] Data quality for ${ticker}:`, {
        totalPeersRequested: peerTickers.length,
        validPeersReceived: validPeers.length,
        successRate: `${((validPeers.length / peerTickers.length) * 100).toFixed(1)}%`,
        samplePeers: peerTickers.slice(0, 5),
        sampleValidData: validPeers.slice(0, 2).map(p => ({ 
          ticker: p.ticker, 
          pe: p.pe, 
          evEbitda: p.evEbitda,
          priceToFreeCashFlow: p.priceToFreeCashFlow 
        }))
      })
      
      // 5. Berechne Sektor-Durchschnitte
      const sectorAverages = this.calculateSectorAverages(validPeers)

      // Log welche Metriken Daten haben
      const metricsWithData = Object.entries(sectorAverages)
        .filter(([key, value]) => value !== null)
        .map(([key]) => key)
      
      console.log(`✅ [SectorAverages] Calculated averages from ${validPeers.length} peers for ${ticker}. Metrics with data: ${metricsWithData.join(', ')}`)

      return {
        sector: companyProfile.sector,
        industry: companyProfile.industry,
        sectorAverages
      }

    } catch (error) {
      console.error('[SectorAverages] Error:', error)
      return null
    }
  }

  // Hauptmethode für Peer Comparison
  async getPeerComparison(ticker: string): Promise<PeerComparisonData | null> {
    try {
      console.log(`🔍 [PeerComparison] Loading peer comparison for ${ticker}`)
      
      // 1. Lade Company Profile für Sektor/Industrie Info
      const companyProfile = await this.getCompanyProfile(ticker)
      if (!companyProfile) {
        throw new Error('Could not fetch company profile')
      }

      // 2. Finde Peer Companies basierend auf Sektor
      const peerTickers = await this.findPeerCompanies(companyProfile.sector, companyProfile.industry, ticker)
      
      // 3. Lade Financial Data für Target + Peers
      const [targetData, ...peerData] = await Promise.all([
        this.getCompanyFinancialData(ticker),
        ...peerTickers.map(peerTicker => this.getCompanyFinancialData(peerTicker))
      ])

      if (!targetData) {
        throw new Error('Could not fetch target company data')
      }

      // 4. Filtere gültige Peer-Daten
      const validPeers = peerData.filter((data): data is PeerCompany => data !== null)
      
      // 5. Berechne Sektor-Durchschnitte
      const sectorAverages = this.calculateSectorAverages([targetData, ...validPeers])

      console.log(`✅ [PeerComparison] Found ${validPeers.length} valid peers for ${ticker}`)

      return {
        targetCompany: targetData,
        peers: validPeers,
        sectorAverages
      }

    } catch (error) {
      console.error('[PeerComparison] Error:', error)
      return null
    }
  }

  // Company Profile von FMP API
  private async getCompanyProfile(ticker: string) {
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${this.fmpKey}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch company profile')
      
      const data = await response.json()
      if (!Array.isArray(data) || data.length === 0) return null
      
      const profile = data[0]
      return {
        sector: profile.sector || 'Unknown',
        industry: profile.industry || 'Unknown',
        marketCap: profile.mktCap || 0,
        name: profile.companyName || ticker
      }
    } catch (error) {
      console.error(`[PeerComparison] Error fetching profile for ${ticker}:`, error)
      return null
    }
  }

  // Finde Peer Companies basierend auf Sektor aus stocks.ts data
  private async findPeerCompanies(sector: string, industry: string, excludeTicker: string): Promise<string[]> {
    try {
      // Verwende gemeinsame Sektor-Logik
      const { getSectorStocks } = await import('@/lib/sectorStocks')
      const sectorPeers = getSectorStocks(sector, excludeTicker)
      
      console.log(`🔍 [PeerComparison] Found ${sectorPeers.length} potential peers for ${sector}`)
      
      // Nehme die ersten 50 um konsistent mit Screener zu sein
      return sectorPeers.slice(0, 50)
      
    } catch (error) {
      console.error('[PeerComparison] Error loading stocks data:', error)
      
      // Fallback zu hardcoded peers bei Fehlern
      const fallbackPeers: Record<string, string[]> = {
        'Technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'ORCL', 'ADBE', 'AMD', 'INTC', 'QCOM'],
        'Healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'ABT', 'DHR', 'BMY', 'MDT', 'GILD'],
        'Financial Services': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK', 'USB', 'TFC'],
        'Consumer Cyclical': ['AMZN', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'LOW', 'MAR', 'YUM', 'TGT'],
        'Consumer Defensive': ['PG', 'KO', 'PEP', 'WMT', 'CL', 'MDLZ', 'KHC', 'GIS', 'KMB', 'CHD'],
        'Industrials': ['BA', 'CAT', 'GE', 'MMM', 'LMT', 'RTX', 'UPS', 'FDX', 'HON', 'ITW'],
        'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'KMI', 'OKE'],
        'Basic Materials': ['LIN', 'SHW', 'APD', 'ECL', 'DD', 'DOW', 'FCX', 'NEM', 'PPG', 'IFF'],
        'Communication Services': ['META', 'GOOGL', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'ROKU'],
        'Utilities': ['NEE', 'DUK', 'SO', 'AEP', 'EXC', 'XEL', 'SRE', 'D', 'PEG', 'PCG'],
        'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'SPG', 'O', 'DLR', 'EXR', 'AVB']
      }
      
      const peers = fallbackPeers[sector] || []
      return peers.filter(peer => peer !== excludeTicker.toUpperCase())
    }
  }

  // Lade Financial Data für ein Unternehmen
  private async getCompanyFinancialData(ticker: string): Promise<PeerCompany | null> {
    try {
      // Hole Company Profile, Quote, Key Metrics und Ratios parallel
      const [profileRes, quoteRes, metricsRes, ratiosRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${this.fmpKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${this.fmpKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=1&apikey=${this.fmpKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=annual&limit=1&apikey=${this.fmpKey}`)
      ])

      if (!profileRes.ok || !quoteRes.ok || !metricsRes.ok) {
        console.log(`⚠️ [PeerComparison] HTTP error for ${ticker}: ${profileRes.status}, ${quoteRes.status}, ${metricsRes.status}`)
        throw new Error('Failed to fetch financial data')
      }

      const [profileData, quoteData, metricsData, ratiosData] = await Promise.all([
        profileRes.json(),
        quoteRes.json(),
        metricsRes.json(),
        ratiosRes.json()
      ])

      if (!Array.isArray(profileData) || profileData.length === 0 ||
          !Array.isArray(quoteData) || quoteData.length === 0) {
        console.log(`⚠️ [PeerComparison] No data for ${ticker}: profile=${profileData?.length}, quote=${quoteData?.length}`)
        return null
      }

      const profile = profileData[0]
      const quote = quoteData[0] 
      const metrics = metricsData[0] || {}
      const ratios = ratiosData[0] || {}
      
      // Debug output for first few companies to see what data we're getting
      if (ticker === 'AAPL' || ticker === 'MSFT' || Math.random() < 0.05) { // Always log for AAPL/MSFT + 5% sample
        console.log(`🔍 [PeerComparison] Raw API data for ${ticker}:`, {
          quote: { pe: quote.pe },
          metricsKeys: Object.keys(metrics).slice(0, 10), // First 10 keys
          sampleMetrics: {
            pbRatio: metrics.pbRatio,
            psRatio: metrics.psRatio, 
            priceToSalesRatio: metrics.priceToSalesRatio,
            priceSalesRatio: metrics.priceSalesRatio,
            evToEbitda: metrics.evToEbitda,
            evToSales: metrics.evToSales,
            enterpriseValueToEbitda: metrics.enterpriseValueToEbitda,
            priceToFreeCashFlowsRatio: metrics.priceToFreeCashFlowsRatio,
            priceToFreeCashFlow: metrics.priceToFreeCashFlow
          }
        })
      }

      const result = {
        ticker: ticker.toUpperCase(),
        name: profile.companyName || ticker,
        sector: profile.sector || 'Unknown',
        industry: profile.industry || 'Unknown',
        marketCap: profile.mktCap || 0,
        pe: quote.pe || metrics.peRatio || null,
        pb: metrics.pbRatio || null,
        ps: metrics.psRatio || metrics.priceToSalesRatio || null,
        ev: metrics.enterpriseValue || null,
        evEbitda: metrics.evToEbitda || metrics.enterpriseValueOverEBITDA || null,
        evSales: metrics.evToSales || null,
        priceToFreeCashFlow: metrics.priceToFreeCashFlowsRatio || metrics.pfcfRatio || null,
        currentRatio: metrics.currentRatio || null,
        debtToEquity: metrics.debtToEquity || null,
        roe: metrics.roe || null,
        roic: metrics.roic || null,
        grossMargin: ratios.grossProfitMargin || null,
        operatingMargin: ratios.operatingProfitMargin || null,
        netMargin: ratios.netProfitMargin || null,
      }

      // Only return companies that have at least some meaningful financial data
      const hasBasicData = result.pe || result.pb || result.ps || result.evEbitda || result.evSales
      const hasValidMarketCap = result.marketCap && result.marketCap > 10000000 // > 10M market cap
      
      if (!hasBasicData || !hasValidMarketCap) {
        return null
      }

      return result

    } catch (error) {
      console.error(`[PeerComparison] Error fetching data for ${ticker}:`, error)
      return null
    }
  }

  // Berechne Sektor-Durchschnitte mit Outlier-Filterung
  private calculateSectorAverages(companies: PeerCompany[]) {
    const validCompanies = companies.filter(c => c !== null)
    if (validCompanies.length === 0) {
      return {
        pe: null, pb: null, ps: null, evEbitda: null, evSales: null,
        priceToFreeCashFlow: null, roe: null, roic: null,
        grossMargin: null, operatingMargin: null, netMargin: null
      }
    }

    const calculateRobustAverage = (key: keyof PeerCompany, minValue?: number, maxValue?: number) => {
      let values = validCompanies
        .map(c => c[key] as number)
        .filter(v => v !== null && v !== undefined && !isNaN(v) && isFinite(v))

      // Apply reasonable bounds for each metric
      if (minValue !== undefined) {
        values = values.filter(v => v >= minValue)
      }
      if (maxValue !== undefined) {
        values = values.filter(v => v <= maxValue)
      }

      if (values.length === 0) return null

      // Remove statistical outliers using IQR method
      values.sort((a, b) => a - b)
      const q1 = values[Math.floor(values.length * 0.25)]
      const q3 = values[Math.floor(values.length * 0.75)]
      const iqr = q3 - q1
      const lowerBound = q1 - 1.5 * iqr
      const upperBound = q3 + 1.5 * iqr
      
      const filteredValues = values.filter(v => v >= lowerBound && v <= upperBound)
      
      if (filteredValues.length < 3) {
        // If too few values after filtering, use median of original values
        return values[Math.floor(values.length / 2)]
      }

      return filteredValues.reduce((sum, v) => sum + v, 0) / filteredValues.length
    }

    return {
      pe: calculateRobustAverage('pe', 0.5, 200),  // P/E between 0.5x and 200x
      pb: calculateRobustAverage('pb', 0.1, 50),   // P/B between 0.1x and 50x  
      ps: calculateRobustAverage('ps', 0.1, 100),  // P/S between 0.1x and 100x
      evEbitda: calculateRobustAverage('evEbitda', 0, 500), // EV/EBITDA between 0 and 500x
      evSales: calculateRobustAverage('evSales', 0, 100),   // EV/Sales between 0 and 100x
      priceToFreeCashFlow: calculateRobustAverage('priceToFreeCashFlow', 0, 1000), // P/FCF positive values only
      roe: calculateRobustAverage('roe', -2, 3),     // ROE between -200% and 300%
      roic: calculateRobustAverage('roic', -2, 3),   // ROIC between -200% and 300%  
      grossMargin: calculateRobustAverage('grossMargin', -2, 1), // Gross margin between -200% and 100%
      operatingMargin: calculateRobustAverage('operatingMargin', -2, 1), // Op margin between -200% and 100%
      netMargin: calculateRobustAverage('netMargin', -2, 1), // Net margin between -200% and 100%
    }
  }
}

export const peerComparisonService = new PeerComparisonService()