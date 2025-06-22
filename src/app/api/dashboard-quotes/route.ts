// src/app/api/dashboard-quotes/route.ts
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  const url = new URL(req.url)
  const tickers = url.searchParams.get('tickers')?.split(',') || [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 
    'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC'
  ]

  console.log(`🚀 Dashboard API: Loading quotes for ${tickers.length} tickers...`)

  async function fetchQuoteWithPerformance(ticker: string) {
    try {
      console.log(`🔄 Fetching ${ticker}...`)
      
      // 1. Aktueller Kurs
      const quoteRes = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`
      )
      
      if (!quoteRes.ok) {
        throw new Error(`Quote API error: ${quoteRes.status}`)
      }
      
      const [quoteData] = await quoteRes.json()
      
      if (!quoteData?.price) {
        throw new Error('No quote data')
      }
      
      // 2. Historische Daten für Performance
      const histRes = await fetch(
        `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?apikey=${apiKey}`
      )
      
      let perf1M = null
      let perfYTD = null
      
      if (histRes.ok) {
        const histData = await histRes.json()
        const historical = histData.historical
        
        if (historical && historical.length > 0) {
          const currentPrice = quoteData.price
          
          // ✅ KORREKTE YTD Performance (letzter Handelstag 2024 = 30. Dezember)
          const ytdStartDate = '2024-12-30' // Letzter Handelstag 2024
          const ytdDataPoint = historical.find((day: any) => day.date === ytdStartDate) ||
                              historical.find((day: any) => day.date === '2024-12-31') || // Fallback
                              historical.find((day: any) => day.date === '2024-12-27') || // Fallback Fr.
                              historical.find((day: any) => {
                                const date = new Date(day.date)
                                return date.getFullYear() === 2024 && date.getMonth() === 11 // Dez 2024
                              })
          
          if (ytdDataPoint) {
            const ytdStartPrice = ytdDataPoint.close
            perfYTD = ((currentPrice - ytdStartPrice) / ytdStartPrice) * 100
            console.log(`📅 YTD for ${ticker}: ${ytdStartPrice} -> ${currentPrice} = ${perfYTD?.toFixed(2)}%`)
          }
          
          // ✅ KORREKTE 1M Performance (ungefähr 30 Kalendertage zurück)
          const oneMonthAgo = new Date()
          oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
          const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0]
          
          // Finde den nächstbesten Handelstag um das Datum herum
          const oneMonthDataPoint = historical.find((day: any) => day.date <= oneMonthAgoStr) ||
                                   historical.find((day: any) => {
                                     const dayDate = new Date(day.date)
                                     const targetDate = new Date(oneMonthAgoStr)
                                     const diffDays = Math.abs((dayDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
                                     return diffDays <= 5 // Innerhalb 5 Tage
                                   })
          
          if (oneMonthDataPoint) {
            const oneMonthStartPrice = oneMonthDataPoint.close
            perf1M = ((currentPrice - oneMonthStartPrice) / oneMonthStartPrice) * 100
            console.log(`📅 1M for ${ticker}: ${oneMonthStartPrice} -> ${currentPrice} = ${perf1M?.toFixed(2)}%`)
          }
        }
      }
      
      console.log(`✅ ${ticker}: $${quoteData.price.toFixed(2)} | 1M: ${perf1M?.toFixed(2)}% | YTD: ${perfYTD?.toFixed(2)}%`)
      
      return {
        ticker: ticker.toLowerCase(),
        price: quoteData.price,
        changePct: parseFloat(quoteData.changesPercentage) || 0,
        perf1M,
        perfYTD,
        source: 'FMP Enhanced API',
        quality: 'HIGH'
      }
    } catch (error: any) {
      console.warn(`⚠️ ${ticker} failed:`, error.message)
      return {
        ticker: ticker.toLowerCase(),
        error: error.message
      }
    }
  }

  try {
    // Parallel laden für bessere Performance
    const results = await Promise.all(
      tickers.map(ticker => fetchQuoteWithPerformance(ticker))
    )
    
    const quotes: Record<string, any> = {}
    const errors: string[] = []
    
    results.forEach(result => {
      if (result.error) {
        errors.push(`${result.ticker}: ${result.error}`)
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
    
    console.log(`📊 Dashboard API: ${Object.keys(quotes).length} success, ${errors.length} failed`)
    
    return NextResponse.json({
      quotes,
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