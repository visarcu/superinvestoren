import { NextRequest, NextResponse } from 'next/server'
import { 
  generateHybridNews,
  HybridNewsResult 
} from '@/lib/hybridNewsService'

interface SuperinvestorNews {
  id: string
  type: 'portfolio_change' | 'new_filing' | 'market_news' | 'holdings_update' | 'portfolio_summary'
  investor: {
    slug: string
    name: string
    firm: string
  }
  title: string
  content: string
  summary: string
  relatedStock?: string
  source: 'fmp_news' | '13f_analysis' | 'holdings_change' | '13F_FILING'
  publishedDate: string
  relevanceScore: number
  metadata: {
    portfolioChange?: {
      action: 'bought' | 'sold' | 'increased' | 'decreased'
      ticker?: string
      value?: number
      percentage?: number
      shares?: number
    }
    newsArticle?: {
      url: string
      originalTitle: string
      site: string
      image?: string
    }
  }
}

// Expanded investor metadata
const investorMetadata: Record<string, { name: string; firm: string; description: string }> = {
  buffett: { 
    name: 'Warren Buffett', 
    firm: 'Berkshire Hathaway', 
    description: 'The Oracle of Omaha and legendary value investor' 
  },
  ackman: { 
    name: 'Bill Ackman', 
    firm: 'Pershing Square Capital', 
    description: 'Activist investor known for concentrated positions' 
  },
  gates: { 
    name: 'Bill Gates', 
    firm: 'Gates Foundation', 
    description: 'Microsoft co-founder and philanthropist' 
  },
  einhorn: { 
    name: 'David Einhorn', 
    firm: 'Greenlight Capital', 
    description: 'Value investor and short-seller' 
  },
  burry: { 
    name: 'Michael Burry', 
    firm: 'Scion Asset Management', 
    description: 'Famous for predicting the 2008 financial crisis' 
  },
  icahn: { 
    name: 'Carl Icahn', 
    firm: 'Icahn Capital Management', 
    description: 'Activist investor and corporate raider' 
  },
  loeb: { 
    name: 'Daniel Loeb', 
    firm: 'Third Point', 
    description: 'Activist hedge fund manager' 
  },
  tepper: { 
    name: 'David Tepper', 
    firm: 'Appaloosa Management', 
    description: 'Distressed debt and equity investor' 
  },
  dalio: { 
    name: 'Ray Dalio', 
    firm: 'Bridgewater Associates', 
    description: 'Founder of the world\'s largest hedge fund' 
  },
  klarman: { 
    name: 'Seth Klarman', 
    firm: 'Baupost Group', 
    description: 'Value investor focused on margin of safety' 
  },
  soros: { 
    name: 'George Soros', 
    firm: 'Soros Fund Management', 
    description: 'The man who broke the Bank of England' 
  },
  coleman: { 
    name: 'Chase Coleman', 
    firm: 'Tiger Global Management', 
    description: 'Growth investor focused on technology' 
  },
  mandel: { 
    name: 'Stephen Mandel', 
    firm: 'Lone Pine Capital', 
    description: 'Long-only equity investor' 
  },
  greenhaven: { 
    name: 'Edgar Wachenheim III', 
    firm: 'Greenhaven Associates', 
    description: 'Value investor with long-term approach' 
  },
  akre: { 
    name: 'Chuck Akre', 
    firm: 'Akre Capital Management', 
    description: 'Focused on quality businesses with pricing power' 
  }
}

// Helper function to get ticker from holdings position
function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  // Could add CUSIP lookup here if needed
  return null
}

// Generate hybrid news (13F + external) for investor
async function generateInvestorNews(
  investorSlug: string, 
  limit: number = 10,
  includeExternal: boolean = true
): Promise<SuperinvestorNews[]> {
  const metadata = investorMetadata[investorSlug]
  if (!metadata) return []
  
  console.log(`🔄 Generating hybrid news for ${metadata.name}...`)
  
  try {
    const hybridResult = await generateHybridNews(investorSlug, {
      maxItems: limit,
      includeExternal,
      generatedRatio: 0.6 // 60% generated, 40% external
    })
    
    // Convert HybridNewsItem to SuperinvestorNews format
    const convertedNews: SuperinvestorNews[] = hybridResult.news.map(news => ({
      id: news.id,
      type: news.type as 'portfolio_change' | 'new_filing' | 'market_news' | 'holdings_update',
      investor: {
        slug: investorSlug,
        name: metadata.name,
        firm: metadata.firm
      },
      title: news.title,
      content: news.content,
      summary: news.summary,
      relatedStock: news.ticker,
      source: news.isGenerated ? '13f_analysis' : 'fmp_news',
      publishedDate: news.publishedDate,
      relevanceScore: news.relevanceScore,
      metadata: {
        portfolioChange: news.metadata.portfolioChange,
        newsArticle: news.metadata.externalNews ? {
          url: news.url || '',
          originalTitle: news.metadata.externalNews.originalTitle,
          site: news.site || 'Unknown',
          image: news.image
        } : undefined
      }
    }))
    
    console.log(`✅ Generated ${convertedNews.length} hybrid news items (${hybridResult.summary.generated} generated, ${hybridResult.summary.external} external)`)
    
    return convertedNews
    
  } catch (error) {
    console.error(`Error generating hybrid news for ${investorSlug}:`, error)
    return []
  }
}


export async function GET(
  request: NextRequest,
  { params }: { params: { investor: string } }
) {
  const { investor: investorSlug } = params
  const { searchParams } = new URL(request.url)
  
  const includeMarketNews = searchParams.get('includeMarketNews') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const type = searchParams.get('type') as 'portfolio_change' | 'market_news' | undefined
  
  // Validate investor slug
  if (!investorMetadata[investorSlug]) {
    return NextResponse.json({ 
      error: 'Investor not found',
      availableInvestors: Object.keys(investorMetadata)
    }, { status: 404 })
  }
  
  try {
    console.log(`🔍 Fetching superinvestor news for ${investorSlug}...`)
    
    const allNews: SuperinvestorNews[] = []
    
    // Generate hybrid news (13F + external)
    const includeExternal = includeMarketNews || type === 'market_news'
    const hybridNews = await generateInvestorNews(investorSlug, limit, includeExternal)
    allNews.push(...hybridNews)
    
    // Sort by relevance and date
    const sortedNews = allNews
      .sort((a, b) => {
        // First by relevance score, then by date
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore
        }
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      })
      .slice(0, limit)
    
    const metadata = investorMetadata[investorSlug]
    console.log(`✅ Found ${sortedNews.length} news items for ${metadata.name}`)
    
    return NextResponse.json({
      investor: {
        slug: investorSlug,
        name: metadata.name,
        firm: metadata.firm,
        description: metadata.description
      },
      news: sortedNews,
      totalFound: sortedNews.length,
      types: {
        portfolio_changes: sortedNews.filter(n => n.type === 'portfolio_change').length,
        market_news: sortedNews.filter(n => n.type === 'market_news').length
      },
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600', // 30 min cache
      }
    })
    
  } catch (error) {
    console.error(`Superinvestor news error for ${investorSlug}:`, error)
    return NextResponse.json({ 
      error: 'Internal server error',
      investor: investorSlug
    }, { status: 500 })
  }
}