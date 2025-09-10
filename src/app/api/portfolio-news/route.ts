import { NextRequest, NextResponse } from 'next/server'

interface NewsArticle {
  symbol: string
  title: string
  url: string
  publishedDate: string
  image: string
  site: string
  text: string
}

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Symbols array required' }, { status: 400 })
    }

    // Validate symbols (security check)
    for (const symbol of symbols) {
      if (typeof symbol !== 'string' || !/^[A-Z0-9.-]{1,10}$/i.test(symbol)) {
        return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 })
      }
    }

    const apiKey = process.env.FMP_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const allNews: NewsArticle[] = []
    
    // Limit to max 5 symbols for performance
    const limitedSymbols = symbols.slice(0, 5)
    
    // Load news for each symbol
    for (const symbol of limitedSymbols) {
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=3&apikey=${apiKey}`,
          { 
            next: { revalidate: 300 } // Cache for 5 minutes
          }
        )
        
        if (response.ok) {
          const news = await response.json()
          if (Array.isArray(news)) {
            allNews.push(...news.map((item: any) => ({
              ...item,
              symbol: symbol
            })))
          }
        }
      } catch (err) {
        console.error(`Error loading news for ${symbol}:`, err)
        // Continue with other symbols on error
      }
    }

    // Sort by date and limit total results
    const sortedNews = allNews
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, 12) // Max 12 articles total

    return NextResponse.json({ 
      news: sortedNews,
      totalSymbols: limitedSymbols.length,
      totalArticles: sortedNews.length
    })

  } catch (error) {
    console.error('Portfolio news error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}