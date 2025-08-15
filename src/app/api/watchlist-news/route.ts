// app/api/watchlist-news/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers')
  
  if (!tickers) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  try {
    // Hier verwendest du den API Key OHNE NEXT_PUBLIC_ Prefix
    // Dieser Key ist NUR im Backend verfügbar!
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock_news?tickers=${tickers}&limit=10&apikey=${process.env.FMP_API_KEY}`
    )
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}