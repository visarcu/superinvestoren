// src/lib/fmp.ts
export interface StockQuote {
    symbol: string
    name: string
    price: number
    changesPercentage: number
    change: number
    dayLow: number
    dayHigh: number
    yearHigh: number
    yearLow: number
    marketCap: number
    priceAvg50: number
    priceAvg200: number
    exchange: string
    volume: number
    avgVolume: number
    open: number
    previousClose: number
    eps: number
    pe: number
    earningsAnnouncement: string
    sharesOutstanding: number
    timestamp: number
  }
  
  // Nutzt deine bestehende API Route statt direkt FMP
  export async function getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`/api/quotes?symbols=${symbol}`)
      const data = await response.json()
      return data[0]?.price || 0
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
      return 0
    }
  }
  
  // Nutzt deine bestehende API Route für mehrere Symbole
  export async function getBulkQuotes(symbols: string[]): Promise<Record<string, number>> {
    try {
      if (symbols.length === 0) return {}
      
      const symbolsString = symbols.join(',')
      const response = await fetch(`/api/quotes?symbols=${symbolsString}`)
      
      if (!response.ok) {
        console.error('Failed to fetch quotes:', response.status)
        return {}
      }
      
      const data = await response.json()
      
      const prices: Record<string, number> = {}
      if (Array.isArray(data)) {
        data.forEach((quote: StockQuote) => {
          if (quote && quote.symbol && quote.price) {
            prices[quote.symbol] = quote.price
          }
        })
      }
      
      return prices
    } catch (error) {
      console.error('Error fetching bulk quotes:', error)
      return {}
    }
  }
  
  // Nutzt deine bestehende API Route für Details
  export async function getStockDetails(symbol: string): Promise<StockQuote | null> {
    try {
      const response = await fetch(`/api/quotes?symbols=${symbol}`)
      const data = await response.json()
      return data[0] || null
    } catch (error) {
      console.error(`Error fetching details for ${symbol}:`, error)
      return null
    }
  }
  
  // Zusätzliche Helper-Funktion für Company Profile (falls du sie brauchst)
  export async function getCompanyProfile(symbol: string) {
    try {
      const response = await fetch(`/api/company-profile?symbol=${symbol}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error(`Error fetching company profile for ${symbol}:`, error)
      return null
    }
  }