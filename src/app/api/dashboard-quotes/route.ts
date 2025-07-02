// src/app/api/dashboard-quotes/route.ts - ERWEITERT mit Marktindizes
import { NextResponse } from 'next/server'

// Marktindex-Mapping für FMP
const MARKET_INDICES: Record<string, string> = {
  'SPX': '^GSPC',    // S&P 500
  'IXIC': '^IXIC',   // NASDAQ
  'DAX': '^GDAXI',   // DAX
  'DJI': '^DJI'      // Dow Jones
}

export async function GET(req: Request) {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  const url = new URL(req.url)
  const tickersParam = url.searchParams.get('tickers')
  const includeMarkets = url.searchParams.get('markets') === 'true'
  
  // Standard Aktien
  const defaultTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ]
  
  const stockTickers = tickersParam?.split(',') || defaultTickers
  
  console.log(`🚀 Dashboard API: Loading ${stockTickers.length} stocks + ${includeMarkets ? Object.keys(MARKET_INDICES).length : 0} markets`)

  async function fetchQuoteWithPerformance(ticker: string, isMarketIndex: boolean = false) {
    try {
      console.log(`🔄 Fetching ${ticker}${isMarketIndex ? ' (Market Index)' : ''}...`)
      
      // Für Marktindizes verwende den gemappten Ticker
      const fmpTicker = isMarketIndex ? MARKET_INDICES[ticker] || ticker : ticker
      
      // 1. Aktueller Kurs
      const quoteRes = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${fmpTicker}?apikey=${apiKey}`
      )
      
      if (!quoteRes.ok) {
        throw new Error(`Quote API error: ${quoteRes.status}`)
      }
      
      const [quoteData] = await quoteRes.json()
      
      if (!quoteData?.price) {
        throw new Error('No quote data')
      }
      
      // 2. Für Marktindizes: Volume anders berechnen
      let volume = 'N/A'
      if (isMarketIndex) {
        // Marktindizes haben oft sehr hohe Volumen-Zahlen
        if (quoteData.volume && quoteData.volume > 1000000000) {
          volume = `${(quoteData.volume / 1000000000).toFixed(1)}B`
        } else if (quoteData.volume && quoteData.volume > 1000000) {
          volume = `${(quoteData.volume / 1000000).toFixed(1)}M`
        } else {
          volume = 'N/A'
        }
      }
      
      // 3. Historische Daten für Performance
      const histRes = await fetch(
        `https://financialmodelingprep.com/api/v3/historical-price-full/${fmpTicker}?apikey=${apiKey}`
      )
      
      let perf1M = null
      let perfYTD = null
      
      if (histRes.ok) {
        const histData = await histRes.json()
        const historical = histData.historical
        
        if (historical && historical.length > 0) {
          const currentPrice = quoteData.price
          
          // YTD Performance (letzter Handelstag 2024)
          const ytdStartDate = '2024-12-30'
          const ytdDataPoint = historical.find((day: any) => day.date === ytdStartDate) ||
                              historical.find((day: any) => day.date === '2024-12-31') ||
                              historical.find((day: any) => day.date === '2024-12-27') ||
                              historical.find((day: any) => {
                                const date = new Date(day.date)
                                return date.getFullYear() === 2024 && date.getMonth() === 11
                              })
          
          if (ytdDataPoint) {
            const ytdStartPrice = ytdDataPoint.close
            perfYTD = ((currentPrice - ytdStartPrice) / ytdStartPrice) * 100
          }
          
          // 1M Performance
          const oneMonthAgo = new Date()
          oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
          const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0]
          
          const oneMonthDataPoint = historical.find((day: any) => day.date <= oneMonthAgoStr) ||
                                   historical.find((day: any) => {
                                     const dayDate = new Date(day.date)
                                     const targetDate = new Date(oneMonthAgoStr)
                                     const diffDays = Math.abs((dayDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
                                     return diffDays <= 5
                                   })
          
          if (oneMonthDataPoint) {
            const oneMonthStartPrice = oneMonthDataPoint.close
            perf1M = ((currentPrice - oneMonthStartPrice) / oneMonthStartPrice) * 100
          }
        }
      }
      
      console.log(`✅ ${ticker}: $${quoteData.price.toFixed(2)} | 1M: ${perf1M?.toFixed(2)}% | YTD: ${perfYTD?.toFixed(2)}%`)
      
      return {
        ticker: ticker.toLowerCase(),
        price: quoteData.price,
        changePct: parseFloat(quoteData.changesPercentage) || 0,
        change: quoteData.change,
        perf1M,
        perfYTD,
        volume: isMarketIndex ? volume : quoteData.volume,
        positive: (quoteData.change || 0) >= 0,
        source: 'FMP Enhanced API',
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
    const allRequests: Promise<any>[] = []
    
    // Aktien laden
    stockTickers.forEach(ticker => {
      allRequests.push(fetchQuoteWithPerformance(ticker, false))
    })
    
    // Marktindizes laden (wenn angefordert)
    if (includeMarkets) {
      Object.keys(MARKET_INDICES).forEach(indexKey => {
        allRequests.push(fetchQuoteWithPerformance(indexKey, true))
      })
    }
    
    const results = await Promise.all(allRequests)
    
    const quotes: Record<string, any> = {}
    const markets: Record<string, any> = {}
    const errors: string[] = []
    
    results.forEach(result => {
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
          perfYTD: result.perfYTD,
          source: result.source,
          quality: result.quality
        }
      } else {
        quotes[result.ticker] = {
          price: result.price,
          changePct: result.changePct,
          perf1M: result.perf1M,
          perfYTD: result.perfYTD,
          source: result.source,
          quality: result.quality
        }
      }
    })
    
    console.log(`📊 Dashboard API Complete: ${Object.keys(quotes).length} stocks, ${Object.keys(markets).length} markets, ${errors.length} failed`)
    
    return NextResponse.json({
      quotes,
      markets: includeMarkets ? markets : undefined,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Dashboard API failed:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard quotes' }, 
      { status: 500 }
    )
  }
}