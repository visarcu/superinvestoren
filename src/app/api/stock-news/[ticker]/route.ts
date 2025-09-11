import { NextRequest, NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'

interface NewsArticle {
  title: string
  url: string
  publishedDate: string
  image: string
  site: string
  text: string
  symbol?: string
  relatedInvestors?: RelatedInvestor[]
}

interface RelatedInvestor {
  slug: string
  name: string
  firm: string
  confidence: number
  context: 'holdings' | 'mentioned' | 'filing'
}

// Investor metadata for context detection
const investorMetadata: Record<string, { name: string; firm: string }> = {
  buffett: { name: 'Warren Buffett', firm: 'Berkshire Hathaway' },
  ackman: { name: 'Bill Ackman', firm: 'Pershing Square Capital' },
  gates: { name: 'Bill Gates', firm: 'Gates Foundation' },
  einhorn: { name: 'David Einhorn', firm: 'Greenlight Capital' },
  burry: { name: 'Michael Burry', firm: 'Scion Asset Management' },
  icahn: { name: 'Carl Icahn', firm: 'Icahn Capital Management' },
  loeb: { name: 'Daniel Loeb', firm: 'Third Point' },
  tepper: { name: 'David Tepper', firm: 'Appaloosa Management' },
  dalio: { name: 'Ray Dalio', firm: 'Bridgewater Associates' },
  klarman: { name: 'Seth Klarman', firm: 'Baupost Group' },
  soros: { name: 'George Soros', firm: 'Soros Fund Management' }
}

function detectInvestorsInNews(ticker: string, article: NewsArticle): RelatedInvestor[] {
  const relatedInvestors: RelatedInvestor[] = []
  const text = `${article.title} ${article.text}`.toLowerCase()
  
  // 1. Check if any superinvestor holds this stock
  Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
    if (!snapshots || snapshots.length === 0) return
    
    const latestSnapshot = snapshots[snapshots.length - 1]
    const hasHolding = latestSnapshot.data?.positions?.some((pos: any) => 
      pos.ticker === ticker || 
      (pos.cusip && pos.ticker && pos.ticker.toUpperCase() === ticker.toUpperCase())
    )
    
    if (hasHolding) {
      const metadata = investorMetadata[slug]
      if (metadata) {
        relatedInvestors.push({
          slug,
          name: metadata.name,
          firm: metadata.firm,
          confidence: 0.8,
          context: 'holdings'
        })
      }
    }
  })
  
  // 2. Check if investor names are mentioned in article text
  Object.entries(investorMetadata).forEach(([slug, metadata]) => {
    const nameVariants = [
      metadata.name.toLowerCase(),
      metadata.firm.toLowerCase(),
      slug
    ]
    
    const isAlreadyAdded = relatedInvestors.some(inv => inv.slug === slug)
    if (isAlreadyAdded) return
    
    const mentioned = nameVariants.some(variant => text.includes(variant))
    if (mentioned) {
      relatedInvestors.push({
        slug,
        name: metadata.name,
        firm: metadata.firm,
        confidence: 0.6,
        context: 'mentioned'
      })
    }
  })
  
  return relatedInvestors.sort((a, b) => b.confidence - a.confidence)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const { searchParams } = new URL(request.url)
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 for security
  const includeInvestors = searchParams.get('includeInvestors') === 'true'
  
  // Validate ticker format (security check)
  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  
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

    // Add ticker to articles for consistency and optionally detect investors
    const articlesWithEnhancement = articles.map(article => {
      const enhancedArticle = {
        ...article,
        symbol: ticker.toUpperCase()
      }

      // Add investor context if requested
      if (includeInvestors) {
        enhancedArticle.relatedInvestors = detectInvestorsInNews(ticker.toUpperCase(), article)
      }

      return enhancedArticle
    })

    // Sort by published date (newest first)
    articlesWithEnhancement.sort((a, b) => 
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    )

    // Count articles with investor context for analytics
    const articlesWithInvestors = includeInvestors 
      ? articlesWithEnhancement.filter(a => a.relatedInvestors && a.relatedInvestors.length > 0).length
      : 0

    return NextResponse.json({
      articles: articlesWithEnhancement,
      hasMore: articlesWithEnhancement.length === limit,
      currentPage: page,
      ticker: ticker.toUpperCase(),
      totalFound: articlesWithEnhancement.length,
      ...(includeInvestors && {
        investorContext: {
          enabled: true,
          articlesWithInvestors,
          totalInvestorsFound: new Set(
            articlesWithEnhancement.flatMap(a => a.relatedInvestors?.map(inv => inv.slug) || [])
          ).size
        }
      })
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