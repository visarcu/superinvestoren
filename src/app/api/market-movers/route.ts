// app/api/market-movers/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers')
  
  if (!tickers) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  try {
    // FMP Quote API für alle Tickers
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${process.env.FMP_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error('FMP API error')
    }
    
    const quotes = await response.json()
    
    // Formatiere für Market Movers
    const stocks = quotes.map((quote: any) => ({
      ticker: quote.symbol,
      name: quote.name,
      price: quote.price,
      changePct: quote.changesPercentage,
      volume: quote.volume,
      avgVolume: quote.avgVolume,
      volumeRatio: quote.volume / (quote.avgVolume || 1)
    }))
    
    return NextResponse.json({ stocks }, {
      headers: {
        'Cache-Control': 'public, max-age=180, stale-while-revalidate=600' // 3 min cache, 10 min stale
      }
    })
  } catch (error) {
    console.error('Market movers error:', error)
    return NextResponse.json({ error: 'Failed to fetch market movers' }, { status: 500 })
  }
}