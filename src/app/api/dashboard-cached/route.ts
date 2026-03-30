// Ultra-fast cached dashboard API for initial page load
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
  'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
]

// US indices use futures (ESUSD, NQUSD, YMUSD) for near-realtime data outside market hours
// DAX uses spot index since it's live during European trading hours
const MARKET_INDICES: Record<string, string> = {
  'SPX': 'ESUSD',      // S&P 500 E-Mini Futures (live 23h/day)
  'IXIC': 'NQUSD',     // NASDAQ 100 Futures (live 23h/day)
  'DAX': '^GDAXI',     // DAX spot index (live during EU hours)
  'STOXX': '^STOXX',   // STOXX Europe 600 (live during EU hours)
  'DJI': 'YMUSD',      // Dow Jones Mini Futures (live 23h/day)
  'BTC': 'BTCUSD',     // Bitcoin (live 24/7)
  'GOLD': 'GCUSD',     // Gold Futures
  'SILVER': 'SIUSD',   // Silver Futures
  'OIL': 'BZUSD',      // Brent Crude Oil Futures
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
      const fmpSymbols = Object.values(MARKET_INDICES)
      const indexSymbols = fmpSymbols.map(s => encodeURIComponent(s)).join(',')
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      // Fetch quotes + historical for all symbols in parallel
      const [quoteRes, ...histResults] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/quote/${indexSymbols}?apikey=${apiKey}`),
        ...fmpSymbols.map(sym =>
          fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(sym)}?from=${sevenDaysAgoStr}&apikey=${apiKey}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      ])

      if (!quoteRes.ok) throw new Error('FMP API error')

      const quotes = await quoteRes.json()

      // Build perf7d map: fmpSymbol -> perf7d
      const perf7dMap: Record<string, number | null> = {}
      histResults.forEach((histData, i) => {
        const sym = fmpSymbols[i]
        if (histData?.historical?.length >= 2) {
          const latest = histData.historical[0]?.close
          const weekAgo = histData.historical[histData.historical.length - 1]?.close
          perf7dMap[sym] = latest && weekAgo ? ((latest - weekAgo) / weekAgo) * 100 : null
        } else {
          perf7dMap[sym] = null
        }
      })

      const formattedMarkets: Record<string, any> = {}

      quotes.forEach((quote: any) => {
        const entry = Object.entries(MARKET_INDICES).find(([, symbol]) => symbol === quote.symbol)
        if (!entry) return
        const [key, fmpSym] = entry
        const indexKey = key.toLowerCase()

        formattedMarkets[indexKey] = {
          price: quote.price,
          changePct: parseFloat(quote.changesPercentage) || 0,
          change: quote.change,
          positive: (quote.change || 0) >= 0,
          dayLow: quote.dayLow,
          dayHigh: quote.dayHigh,
          timestamp: quote.timestamp,
          perf7d: perf7dMap[fmpSym] ?? null,
          volume: quote.volume > 1000000000
            ? `${(quote.volume / 1000000000).toFixed(1)}B`
            : quote.volume > 1000000
              ? `${(quote.volume / 1000000).toFixed(1)}M`
              : 'N/A'
        }
      })

      return formattedMarkets
    } catch (error) {
      console.error('Cached markets error:', error)
      return {}
    }
  },
  ['market-indices-v4'],
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