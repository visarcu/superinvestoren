// Unified dashboard API - loads ALL data in one request
import { NextResponse } from 'next/server'

// US indices use futures (ESUSD, NQUSD, YMUSD) for near-realtime data outside market hours
// DAX uses spot index since it's live during European trading hours
const MARKET_INDICES: Record<string, string> = {
  'SPX': 'ESUSD',    // S&P 500 E-Mini Futures (live 23h/day)
  'IXIC': 'NQUSD',   // NASDAQ 100 Futures (live 23h/day)
  'DAX': '^GDAXI',   // DAX spot index (live during EU hours)
  'DJI': 'YMUSD'     // Dow Jones Mini Futures (live 23h/day)
}

export async function GET(req: Request) {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  const url = new URL(req.url)
  const extraTickers = url.searchParams.get('tickers')?.split(',') || []
  
  // Default stocks + user tickers
  const defaultTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ]
  
  const allStockTickers = [...new Set([...defaultTickers, ...extraTickers])]
  
  console.log(`🚀 Unified Dashboard API: Loading ${allStockTickers.length} stocks + ${Object.keys(MARKET_INDICES).length} markets`)

  async function fetchQuoteWithPerformance(ticker: string, isMarketIndex: boolean = false) {
    try {
      const fmpTicker = isMarketIndex ? MARKET_INDICES[ticker] || ticker : ticker
      
      // Get current quote and historical data in parallel
      const [quoteRes, histRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/quote/${fmpTicker}?apikey=${apiKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${fmpTicker}?apikey=${apiKey}`)
      ])
      
      if (!quoteRes.ok) throw new Error(`Quote API error: ${quoteRes.status}`)
      
      const [quoteData] = await quoteRes.json()
      if (!quoteData?.price) throw new Error('No quote data')
      
      let perf1M = null
      let perfYTD = null
      let volume = 'N/A'
      let avgVolume = null
      
      // Calculate volume for market indices
      if (isMarketIndex && quoteData.volume) {
        if (quoteData.volume > 1000000000) {
          volume = `${(quoteData.volume / 1000000000).toFixed(1)}B`
        } else if (quoteData.volume > 1000000) {
          volume = `${(quoteData.volume / 1000000).toFixed(1)}M`
        }
      } else {
        volume = quoteData.volume
        avgVolume = quoteData.avgVolume
      }
      
      // Calculate performance metrics if historical data available
      if (histRes.ok) {
        const histData = await histRes.json()
        const historical = histData.historical
        
        if (historical && historical.length > 0) {
          const currentPrice = quoteData.price
          
          // YTD Performance
          const ytdDataPoint = historical.find((day: any) => day.date === '2024-12-30') ||
                              historical.find((day: any) => day.date === '2024-12-31') ||
                              historical.find((day: any) => day.date === '2024-12-27')
          
          if (ytdDataPoint) {
            perfYTD = ((currentPrice - ytdDataPoint.close) / ytdDataPoint.close) * 100
          }
          
          // 1M Performance
          const oneMonthAgo = new Date()
          oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
          const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0]
          
          const oneMonthDataPoint = historical.find((day: any) => day.date <= oneMonthAgoStr)
          if (oneMonthDataPoint) {
            perf1M = ((currentPrice - oneMonthDataPoint.close) / oneMonthDataPoint.close) * 100
          }
        }
      }
      
      return {
        ticker: ticker.toLowerCase(),
        price: quoteData.price,
        changePct: parseFloat(quoteData.changesPercentage) || 0,
        change: quoteData.change,
        perf1M,
        perfYTD,
        volume,
        avgVolume,
        positive: (quoteData.change || 0) >= 0,
        source: 'FMP',
        quality: 'HIGH',
        isMarketIndex
      }
    } catch (error: any) {
      console.warn(`⚠️ ${ticker} failed:`, error.message)
      return {
        ticker: ticker.toLowerCase(),
        error: error.message,
        isMarketIndex
      }
    }
  }

  try {
    // Load super investor data, quotes, and market data in parallel
    const [superInvestorRes, ...quoteResults] = await Promise.all([
      // Super investor analysis
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/super-investor-analysis`),
      
      // All stock quotes in parallel
      ...allStockTickers.map(ticker => fetchQuoteWithPerformance(ticker, false)),
      
      // All market indices in parallel
      ...Object.keys(MARKET_INDICES).map(indexKey => fetchQuoteWithPerformance(indexKey, true))
    ])

    // Process results
    const quotes: Record<string, any> = {}
    const markets: Record<string, any> = {}
    const errors: string[] = []
    
    quoteResults.forEach(result => {
      if (result.error) {
        errors.push(`${result.ticker}: ${result.error}`)
      } else if (result.isMarketIndex) {
        markets[result.ticker] = {
          price: result.price,
          changePct: result.changePct,
          change: result.change,
          positive: result.positive,
          volume: result.volume,
          perf1M: result.perf1M,
          perfYTD: result.perfYTD
        }
      } else {
        quotes[result.ticker] = {
          price: result.price,
          changePct: result.changePct,
          perf1M: result.perf1M,
          perfYTD: result.perfYTD,
          volume: result.volume,
          avgVolume: result.avgVolume
        }
      }
    })

    // Process super investor data
    let superInvestorData = null
    if (superInvestorRes.ok) {
      superInvestorData = await superInvestorRes.json()
    }

    console.log(`📊 Unified Dashboard API Complete: ${Object.keys(quotes).length} stocks, ${Object.keys(markets).length} markets`)
    
    return NextResponse.json({
      quotes,
      markets,
      superInvestorData,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800' // 10 min cache, 30 min stale
      }
    })
    
  } catch (error: any) {
    console.error('Unified Dashboard API failed:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard data' }, 
      { status: 500 }
    )
  }
}