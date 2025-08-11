export interface StockQuote {
    symbol: string
    name: string
    price: number
    changesPercentage: number
    change: number
    marketCap?: number
    pe?: number
  }
  
  export async function getStockQuotes(symbols: string[]): Promise<StockQuote[]> {
    if (symbols.length === 0) {
      return []
    }
  
    try {
      // ✅ SICHER: API Call an eigenes Backend
      const response = await fetch('/api/portfolio/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols })
      })
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
  
      const data = await response.json()
      return data.quotes || []
  
    } catch (error) {
      console.error('Error fetching stock quotes:', error)
      return []
    }
  }