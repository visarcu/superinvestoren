// Ultra-fast cached dashboard API for initial page load
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
  'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
]

const MARKET_INDICES: Record<string, string> = {
  'SPX': '^GSPC',
  'IXIC': '^IXIC',
  'DAX': '^GDAXI',
  'DJI': '^DJI'
}

// Cached function for popular stocks only (fastest load)
const getCachedQuotes = unstable_cache(
  async () => {
    const apiKey = process.env.FMP_API_KEY
    if (!apiKey) throw new Error('Missing FMP_API_KEY')

    try {
      const tickersString = POPULAR_STOCKS.join(',')
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${tickersString}?apikey=${apiKey}`
      )
      
      if (!response.ok) throw new Error('FMP API error')
      
      const quotes = await response.json()
      const formattedQuotes: Record<string, any> = {}
      
      quotes.forEach((quote: any) => {
        formattedQuotes[quote.symbol.toLowerCase()] = {
          price: quote.price,
          changePct: parseFloat(quote.changesPercentage) || 0,
          volume: quote.volume
        }
      })
      
      return formattedQuotes
    } catch (error) {
      console.error('Cached quotes error:', error)
      return {}
    }
  },
  ['popular-stocks-quotes'],
  { 
    revalidate: 300, // 5 minutes
    tags: ['dashboard', 'quotes']
  }
)

// Cached function for market indices
const getCachedMarkets = unstable_cache(
  async () => {
    const apiKey = process.env.FMP_API_KEY
    if (!apiKey) throw new Error('Missing FMP_API_KEY')

    try {
      const indexSymbols = Object.values(MARKET_INDICES).join(',')
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${indexSymbols}?apikey=${apiKey}`
      )
      
      if (!response.ok) throw new Error('FMP API error')
      
      const quotes = await response.json()
      const formattedMarkets: Record<string, any> = {}
      
      quotes.forEach((quote: any) => {
        // Map back to our key
        const indexKey = Object.entries(MARKET_INDICES)
          .find(([, symbol]) => symbol === quote.symbol)?.[0]?.toLowerCase()
        
        if (indexKey) {
          formattedMarkets[indexKey] = {
            price: quote.price,
            changePct: parseFloat(quote.changesPercentage) || 0,
            change: quote.change,
            positive: (quote.change || 0) >= 0,
            volume: quote.volume > 1000000000 
              ? `${(quote.volume / 1000000000).toFixed(1)}B`
              : quote.volume > 1000000 
                ? `${(quote.volume / 1000000).toFixed(1)}M`
                : 'N/A'
          }
        }
      })
      
      return formattedMarkets
    } catch (error) {
      console.error('Cached markets error:', error)
      return {}
    }
  },
  ['market-indices'],
  { 
    revalidate: 180, // 3 minutes
    tags: ['dashboard', 'markets']
  }
)

export async function GET() {
  try {
    // Load cached data in parallel - ultra fast
    const [quotes, markets] = await Promise.all([
      getCachedQuotes(),
      getCachedMarkets()
    ])

    return NextResponse.json({
      quotes,
      markets,
      cached: true,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=180, stale-while-revalidate=600' // 3 min cache
      }
    })
    
  } catch (error: any) {
    console.error('Cached Dashboard API failed:', error)
    return NextResponse.json(
      { error: 'Failed to load cached dashboard data' }, 
      { status: 500 }
    )
  }
}