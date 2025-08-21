// app/api/social-sentiment/[ticker]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  
  try {
    // Hole MEHR Daten für 30 Tage
    let allSentimentData: any[] = []
    
    for (let page = 0; page < 3; page++) {
      const sentimentRes = await fetch(
        `https://financialmodelingprep.com/api/v4/historical/social-sentiment?symbol=${ticker}&page=${page}&apikey=${process.env.FMP_API_KEY}`
      )
      const pageData = await sentimentRes.json()
      
      if (Array.isArray(pageData) && pageData.length > 0) {
        allSentimentData = [...allSentimentData, ...pageData]
      } else {
        break
      }
    }
    
    // Trending Stocks
    const trendingRes = await fetch(
      `https://financialmodelingprep.com/api/v4/social-sentiments/trending?type=bullish&source=stocktwits&apikey=${process.env.FMP_API_KEY}`
    )
    
    // Social Sentiment Changes - BEIDE Types fetchen für vollständige Daten
    const bullishChangesRes = await fetch(
      `https://financialmodelingprep.com/api/v4/social-sentiments/change?type=bullish&source=stocktwits&apikey=${process.env.FMP_API_KEY}`
    )
    
    const bearishChangesRes = await fetch(
      `https://financialmodelingprep.com/api/v4/social-sentiments/change?type=bearish&source=stocktwits&apikey=${process.env.FMP_API_KEY}`
    )
    
    const trending = await trendingRes.json()
    const bullishChanges = await bullishChangesRes.json()
    const bearishChanges = await bearishChangesRes.json()
    
    // Kombiniere bullish und bearish changes
    const allChanges = new Map()
    
    if (Array.isArray(bullishChanges)) {
      bullishChanges.forEach((item: any) => {
        allChanges.set(item.symbol, {
          symbol: item.symbol,
          bullishChange: item.change || 0,
          bullishRank: item.rank
        })
      })
    }
    
    if (Array.isArray(bearishChanges)) {
      bearishChanges.forEach((item: any) => {
        const existing = allChanges.get(item.symbol) || { symbol: item.symbol }
        allChanges.set(item.symbol, {
          ...existing,
          bearishChange: item.change || 0,
          bearishRank: item.rank
        })
      })
    }
    
    // Berechne Netto-Sentiment-Change
    let enrichedTrending: any[] = []
    if (Array.isArray(trending)) {
      enrichedTrending = trending.slice(0, 10).map((stock: any) => {
        const changeData = allChanges.get(stock.symbol)
        
        // Berechne Sentiment Score basierend auf verfügbaren Daten
        let sentimentChange = 0
        if (changeData) {
          // Wenn wir beide haben, nimm Durchschnitt
          if (changeData.bullishChange !== undefined && changeData.bearishChange !== undefined) {
            sentimentChange = (changeData.bullishChange - changeData.bearishChange) / 2
          } else if (changeData.bullishChange !== undefined) {
            sentimentChange = changeData.bullishChange
          } else if (changeData.bearishChange !== undefined) {
            sentimentChange = -changeData.bearishChange
          }
        }
        
        return {
          symbol: stock.symbol,
          name: stock.name || stock.companyName,
          sentimentChange: sentimentChange,
          rank: stock.rank,
          mentions: stock.mentions || stock.posts,
          // Zusätzliche Metriken falls verfügbar
          volume: stock.volume,
          previousVolume: stock.previousVolume
        }
      })
    }
    
    // Check ob diese Aktie trending ist
    const isTrending = Array.isArray(trending) && trending.some((item: any) => item.symbol === ticker)
    
    // Get change data für die aktuelle Aktie
    const currentStockChange = allChanges.get(ticker)
    
    console.log(`Fetched ${allSentimentData.length} hours of data for ${ticker}`)
    console.log(`Found ${enrichedTrending.length} trending stocks with sentiment changes`)
    
    return NextResponse.json({
      sentiment: allSentimentData,
      isTrending,
      sentimentChange: currentStockChange,
      trendingStocks: enrichedTrending,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching social sentiment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social sentiment' },
      { status: 500 }
    )
  }
}