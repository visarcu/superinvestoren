import { NextRequest, NextResponse } from 'next/server'
import { 
  getAvailableInvestors
} from '@/lib/holdingsDataLoader'
import {
  analyzeLatestCrossInvestorTrends,
  generateTrendingNewsHeadlines
} from '@/lib/crossInvestorTrending'

interface SuperinvestorNews {
  id: string
  type: 'portfolio_change' | 'trending_stock' | 'major_move'
  investor: {
    slug: string
    name: string
    firm: string
  }
  title: string
  content: string
  summary: string
  relatedStock?: string
  source: '13f_analysis' | 'cross_analysis' | 'fmp_news'
  publishedDate: string
  relevanceScore: number
  metadata: {
    portfolioChange?: {
      action: 'bought' | 'sold' | 'increased' | 'decreased'
      ticker?: string
      value?: number
      percentage?: number
    }
    trendingData?: {
      investorCount: number
      totalValue: number
      averageChange: number
    }
    newsArticle?: {
      url: string
      originalTitle: string
      site: string
      image?: string
    }
  }
}

// Core investor metadata
const investorMetadata: Record<string, { name: string; firm: string; tier: 'legendary' | 'prominent' | 'notable' }> = {
  buffett: { name: 'Warren Buffett', firm: 'Berkshire Hathaway', tier: 'legendary' },
  ackman: { name: 'Bill Ackman', firm: 'Pershing Square Capital', tier: 'prominent' },
  gates: { name: 'Bill Gates', firm: 'Gates Foundation', tier: 'legendary' },
  einhorn: { name: 'David Einhorn', firm: 'Greenlight Capital', tier: 'prominent' },
  burry: { name: 'Michael Burry', firm: 'Scion Asset Management', tier: 'prominent' },
  icahn: { name: 'Carl Icahn', firm: 'Icahn Capital Management', tier: 'legendary' },
  loeb: { name: 'Daniel Loeb', firm: 'Third Point', tier: 'prominent' },
  dalio: { name: 'Ray Dalio', firm: 'Bridgewater Associates', tier: 'legendary' },
  klarman: { name: 'Seth Klarman', firm: 'Baupost Group', tier: 'prominent' },
  soros: { name: 'George Soros', firm: 'Soros Fund Management', tier: 'legendary' },
  coleman: { name: 'Chase Coleman', firm: 'Tiger Global Management', tier: 'notable' },
  mandel: { name: 'Stephen Mandel', firm: 'Lone Pine Capital', tier: 'notable' },
  greenhaven: { name: 'Edgar Wachenheim III', firm: 'Greenhaven Associates', tier: 'notable' },
  akre: { name: 'Chuck Akre', firm: 'Akre Capital Management', tier: 'notable' }
}

// Find trending stocks using real 13F data
async function findTrendingStocks(limit: number = 8): Promise<SuperinvestorNews[]> {
  console.log('📈 Analyzing trending stocks across superinvestors...')
  
  try {
    const analysis = await analyzeLatestCrossInvestorTrends()
    if (!analysis) {
      console.log('❌ No cross-investor analysis available')
      return []
    }
    
    const headlines = generateTrendingNewsHeadlines(analysis)
    
    const trendingNews: SuperinvestorNews[] = headlines.slice(0, limit).map((headline, index) => {
      const stock = headline.stock
      const sentiment = stock.sentiment === 'BULLISH' ? 'Käufe' : 
                       stock.sentiment === 'BEARISH' ? 'Verkäufe' : 'unterschiedliche Bewegungen'
      
      return {
        id: `trending_${stock.cusip}_${analysis.quarter}`,
        type: 'trending_stock',
        investor: {
          slug: 'multiple',
          name: `${stock.totalInvestors} Superinvestoren`,
          firm: 'Cross-Analyse'
        },
        title: headline.headline,
        content: `Mehrere prominente Superinvestoren haben bedeutende Bewegungen bei ${stock.name} (${stock.ticker}) laut den aktuellen 13F-Filings für ${analysis.quarter} getätigt. ${stock.investorsInvolved.slice(0, 3).map(inv => investorMetadata[inv.investor]?.name || inv.investor).join(', ')} gehören zu den ${stock.totalInvestors} Investoren mit ${sentiment}, bei kombinierten Volumenveränderungen von über $${(stock.totalValueChange / 1_000_000_000).toFixed(1)} Milliarden.`,
        summary: headline.summary,
        relatedStock: stock.ticker,
        source: 'cross_analysis',
        publishedDate: new Date().toISOString(),
        relevanceScore: Math.min(0.95, stock.trendingScore / 100),
        metadata: {
          trendingData: {
            investorCount: stock.totalInvestors,
            totalValue: stock.totalValueChange,
            averageChange: stock.netSharesChange / stock.totalInvestors
          }
        }
      }
    })
    
    console.log(`✅ Found ${trendingNews.length} trending stocks from real 13F data`)
    return trendingNews
    
  } catch (error) {
    console.error('Error analyzing trending stocks:', error)
    return []
  }
}

// Find major individual superinvestor moves with external news
async function findMajorIndividualMoves(limit: number = 10): Promise<SuperinvestorNews[]> {
  console.log('🎯 Finding major individual superinvestor moves with external news...')
  
  const majorMoves: SuperinvestorNews[] = []
  
  try {
    const availableInvestors = await getAvailableInvestors()
    const prominentInvestors = availableInvestors
      .filter(inv => investorMetadata[inv.investor]?.tier === 'legendary' || 
                     investorMetadata[inv.investor]?.tier === 'prominent')
      .slice(0, 6) // Top 6 most prominent (reduced for external API calls)
    
    for (const investor of prominentInvestors) {
      // Import the hybrid news generator directly
      const { generateHybridNews } = await import('@/lib/hybridNewsService')
      
      try {
        const hybridResult = await generateHybridNews(investor.investor, {
          maxItems: 4, // Max 4 items per investor to allow for external news
          includeExternal: true,
          generatedRatio: 0.6 // 60% generated, 40% external (2 generated + 2 external)
        })
        
        // Convert to SuperinvestorNews format
        hybridResult.news.forEach(news => {
            const metadata = investorMetadata[investor.investor]
            const convertedNews = {
              id: news.id,
              type: news.type as 'portfolio_change' | 'trending_stock' | 'major_move',
              investor: {
                slug: investor.investor,
                name: metadata?.name || investor.investor,
                firm: metadata?.firm || 'Unknown'
              },
              title: news.title,
              content: news.content,
              summary: news.summary,
              relatedStock: news.ticker,
              source: news.isGenerated ? '13f_analysis' : 'fmp_news' as '13f_analysis' | 'cross_analysis' | 'fmp_news',
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
            }
            
            majorMoves.push(convertedNews)
        })
        
        // Small delay to avoid overwhelming external APIs
        await new Promise(resolve => setTimeout(resolve, 300))
        
      } catch (error) {
        console.error(`Error generating hybrid news for ${investor.investor}:`, error)
      }
    }
    
    const sortedMoves = majorMoves
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
    
    console.log(`✅ Found ${sortedMoves.length} major moves with external news (${sortedMoves.filter(n => n.source === 'fmp_news').length} external)`)
    return sortedMoves
    
  } catch (error) {
    console.error('Error finding major individual moves:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const type = searchParams.get('type') as 'trending' | 'major_moves' | undefined
  
  try {
    console.log('🔍 Generating aggregated superinvestor news...')
    
    const allNews: SuperinvestorNews[] = []
    
    // Generate trending stock news (always included unless specific type requested)
    if (!type || type === 'trending') {
      const trendingNews = await findTrendingStocks(Math.ceil(limit * 0.4))
      allNews.push(...trendingNews)
    }
    
    // Generate major individual move news
    if (!type || type === 'major_moves') {
      const majorMoves = await findMajorIndividualMoves(Math.ceil(limit * 0.6))
      allNews.push(...majorMoves)
    }
    
    // Sort all news by relevance score and date
    const sortedNews = allNews
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore
        }
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      })
      .slice(0, limit)
    
    console.log(`✅ Generated ${sortedNews.length} superinvestor news items`)
    
    const summary = {
      total: sortedNews.length,
      portfolio_changes: sortedNews.filter(n => n.type === 'portfolio_change').length,
      major_moves: sortedNews.filter(n => n.type === 'major_move').length,
      trending_stocks: sortedNews.filter(n => n.type === 'trending_stock').length,
      totalValue: sortedNews.reduce((sum, n) => {
        return sum + (n.metadata.portfolioChange?.value || n.metadata.trendingData?.totalValue || 0)
      }, 0),
      avgRelevanceScore: sortedNews.reduce((sum, n) => sum + n.relevanceScore, 0) / sortedNews.length || 0
    }
    
    return NextResponse.json({
      news: sortedNews,
      summary,
      meta: {
        isRealData: true,
        description: 'Real-time superinvestor news generated from actual 13F filings',
        generatedAt: new Date().toISOString(),
        dataSource: '13F SEC Filings'
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600', // 30 min cache
      }
    })
    
  } catch (error) {
    console.error('Aggregated superinvestor news error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to generate aggregated news'
    }, { status: 500 })
  }
}