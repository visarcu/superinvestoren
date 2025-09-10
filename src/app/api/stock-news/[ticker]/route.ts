import { NextRequest, NextResponse } from 'next/server'

interface NewsArticle {
  title: string
  url: string
  publishedDate: string
  image: string
  site: string
  text: string
  symbol?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const { searchParams } = new URL(request.url)
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 for security
  
  // Validate ticker format (security check)
  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    let articles: NewsArticle[] = []
    
    // Primary: FMP Stock News API - ticker-specific
    console.log(`🔍 Fetching stock news for ${ticker}...`)
    const stockNewsRes = await fetch(
      `https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=${limit}&apikey=${apiKey}`,
      { 
        next: { revalidate: 600 } // Cache for 10 minutes
      }
    )
    
    if (stockNewsRes.ok) {
      const stockNewsJson = await stockNewsRes.json()
      articles = Array.isArray(stockNewsJson) ? stockNewsJson : []
      console.log(`✅ Stock News API successful: ${articles.length} articles for ${ticker}`)
    } else {
      console.warn(`❌ Stock News API failed for ${ticker}:`, stockNewsRes.status)
      
      // Fallback: General News API with ticker filtering
      console.log(`🔄 Trying fallback general news API for ${ticker}...`)
      const generalNewsRes = await fetch(
        `https://financialmodelingprep.com/api/stable/news/stock-latest?page=${page}&limit=${limit}&apikey=${apiKey}`,
        { 
          next: { revalidate: 900 } // Cache longer for fallback
        }
      )
      
      if (generalNewsRes.ok) {
        const generalNews = await generalNewsRes.json()
        // Filter articles that mention the ticker
        articles = Array.isArray(generalNews) 
          ? generalNews.filter((article: any) => 
              article.title?.toLowerCase().includes(ticker.toLowerCase()) ||
              article.text?.toLowerCase().includes(ticker.toLowerCase()) ||
              article.symbol === ticker.toUpperCase()
            ) 
          : []
        console.log(`✅ General News API successful: ${articles.length} filtered articles for ${ticker}`)
      } else {
        console.error(`❌ Both news APIs failed for ${ticker}`)
        return NextResponse.json({ 
          error: 'News service temporarily unavailable',
          articles: [],
          hasMore: false,
          currentPage: page,
          ticker
        }, { status: 503 })
      }
    }

    // Add ticker to articles for consistency
    const articlesWithTicker = articles.map(article => ({
      ...article,
      symbol: ticker.toUpperCase()
    }))

    // Sort by published date (newest first)
    articlesWithTicker.sort((a, b) => 
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    )

    return NextResponse.json({
      articles: articlesWithTicker,
      hasMore: articlesWithTicker.length === limit,
      currentPage: page,
      ticker: ticker.toUpperCase(),
      totalFound: articlesWithTicker.length
    })

  } catch (error) {
    console.error(`Stock news error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Internal server error',
      articles: [],
      hasMore: false,
      currentPage: page,
      ticker
    }, { status: 500 })
  }
}