import { NextResponse } from 'next/server'

// Demo News Generator für Superinvestor News API
interface SuperinvestorNews {
  id: string
  type: 'portfolio_change' | 'trending_stock' | 'major_move' | 'market_insight'
  investor: {
    slug: string
    name: string
    firm: string
  }
  title: string
  content: string
  summary: string
  relatedStock?: string
  source: 'demo_data' | '13f_analysis' | 'market_analysis'
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
    }
  }
}

// Demo data für verschiedene Superinvestor Scenarios
const demoNews: SuperinvestorNews[] = [
  {
    id: 'demo_buffett_apple_1',
    type: 'major_move',
    investor: {
      slug: 'buffett',
      name: 'Warren Buffett',
      firm: 'Berkshire Hathaway'
    },
    title: 'Warren Buffett increases Apple position by 15% amid tech sector concerns',
    content: 'Warren Buffett has surprised the investment community by increasing Berkshire Hathaway\'s position in Apple Inc. by 15%, adding approximately $8.6 billion worth of shares during the latest quarter. This move comes despite widespread concerns about tech sector valuations and represents one of Buffett\'s largest single-stock purchases this year. The Oracle of Omaha\'s decision to double down on Apple reinforces his confidence in the company\'s ecosystem and recurring revenue streams, particularly from services. Apple now represents approximately 45% of Berkshire\'s public equity portfolio.',
    summary: '15% increase in AAPL position (+$8.6B)',
    relatedStock: 'AAPL',
    source: 'demo_data',
    publishedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    relevanceScore: 0.95,
    metadata: {
      portfolioChange: {
        action: 'increased',
        ticker: 'AAPL',
        value: 8600000000,
        percentage: 15
      }
    }
  },
  {
    id: 'demo_ackman_netflix_1',
    type: 'portfolio_change',
    investor: {
      slug: 'ackman',
      name: 'Bill Ackman',
      firm: 'Pershing Square Capital'
    },
    title: 'Bill Ackman initiates new $2.1B position in Netflix',
    content: 'Activist investor Bill Ackman has disclosed a massive new $2.1 billion position in Netflix, representing approximately 8% of Pershing Square\'s portfolio. This marks Ackman\'s first major streaming bet and comes as Netflix has successfully addressed password sharing concerns while expanding into live sports and gaming. The position consists of 4.2 million shares acquired at an average price of around $500 per share. Ackman praised Netflix\'s "unassailable moat" in content creation and global distribution infrastructure.',
    summary: 'New $2.1B position in Netflix',
    relatedStock: 'NFLX',
    source: 'demo_data',
    publishedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    relevanceScore: 0.88,
    metadata: {
      portfolioChange: {
        action: 'bought',
        ticker: 'NFLX',
        value: 2100000000,
        percentage: 100
      }
    }
  },
  {
    id: 'demo_trending_nvidia_1',
    type: 'trending_stock',
    investor: {
      slug: 'multiple',
      name: '7 Superinvestors',
      firm: 'Cross-Analysis'
    },
    title: '7 superinvestors are buying NVIDIA amid AI chip demand',
    content: 'A coordinated buying spree has emerged among top-tier investors, with seven prominent fund managers increasing their NVIDIA positions during the latest filing period. Ray Dalio\'s Bridgewater added $890M, while Chase Coleman\'s Tiger Global increased their stake by 23%. The collective buying represents over $4.2 billion in new capital flowing into NVIDIA shares. This institutional support comes as the company continues to dominate the AI infrastructure market, with data center revenue growing 427% year-over-year.',
    summary: '7 buying moves totaling $4.2B',
    relatedStock: 'NVDA',
    source: 'demo_data',
    publishedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    relevanceScore: 0.92,
    metadata: {
      trendingData: {
        investorCount: 7,
        totalValue: 4200000000
      }
    }
  },
  {
    id: 'demo_icahn_meta_1',
    type: 'major_move',
    investor: {
      slug: 'icahn',
      name: 'Carl Icahn',
      firm: 'Icahn Capital Management'
    },
    title: 'Carl Icahn completely exits Meta position, cites "metaverse concerns"',
    content: 'Activist investor Carl Icahn has completely liquidated his $1.8 billion Meta position, citing concerns over the company\'s massive metaverse investments and their impact on near-term profitability. The sale represents a significant reversal for Icahn, who had been building the position over the past 18 months. In a rare public statement, Icahn criticized Meta\'s "Reality Labs" division, calling the $13+ billion annual losses "shareholder value destruction." The exit comes despite Meta\'s strong advertising revenue and cost-cutting initiatives.',
    summary: 'Complete exit of $1.8B Meta position',
    relatedStock: 'META',
    source: 'demo_data',
    publishedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    relevanceScore: 0.85,
    metadata: {
      portfolioChange: {
        action: 'sold',
        ticker: 'META',
        value: 1800000000,
        percentage: 100
      }
    }
  },
  {
    id: 'demo_burry_tesla_1',
    type: 'portfolio_change',
    investor: {
      slug: 'burry',
      name: 'Michael Burry',
      firm: 'Scion Asset Management'
    },
    title: 'Michael Burry builds significant Tesla short position',
    content: 'Michael Burry, famous for predicting the 2008 financial crisis, has disclosed a significant short position against Tesla worth approximately $731 million. This represents roughly 18% of Scion Asset Management\'s total assets under management. The position comes amid concerns about Tesla\'s valuation relative to traditional automakers and increased competition in the EV space. Burry\'s bet against Tesla echoes his contrarian investment approach, targeting what he perceives as market inefficiencies.',
    summary: '$731M short position against Tesla',
    relatedStock: 'TSLA',
    source: 'demo_data',
    publishedDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    relevanceScore: 0.89,
    metadata: {
      portfolioChange: {
        action: 'sold',
        ticker: 'TSLA',
        value: 731000000,
        percentage: 100
      }
    }
  },
  {
    id: 'demo_dalio_bonds_1',
    type: 'market_insight',
    investor: {
      slug: 'dalio',
      name: 'Ray Dalio',
      firm: 'Bridgewater Associates'
    },
    title: 'Ray Dalio shifts strategy: Massive rotation from bonds to equities',
    content: 'Ray Dalio\'s Bridgewater Associates has executed one of the largest portfolio rotations in its history, reducing bond holdings by $12 billion while simultaneously increasing equity exposure across technology and healthcare sectors. This strategic shift represents a fundamental change in Dalio\'s market outlook, moving away from his traditional "All Weather" approach. The reallocation comes amid expectations of sustained higher interest rates and concerns about bond duration risk.',
    summary: '$12B rotation from bonds to equities',
    relatedStock: undefined,
    source: 'demo_data',
    publishedDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    relevanceScore: 0.87,
    metadata: {
      portfolioChange: {
        action: 'decreased',
        value: 12000000000,
        percentage: 25
      }
    }
  },
  {
    id: 'demo_klarman_opportunity_1',
    type: 'portfolio_change',
    investor: {
      slug: 'klarman',
      name: 'Seth Klarman',
      firm: 'Baupost Group'
    },
    title: 'Seth Klarman emerges from cash to deploy $3.2B in "generational opportunity"',
    content: 'Value investing legend Seth Klarman has broken his two-year cash hoarding strategy, deploying $3.2 billion across 14 new positions in what he describes as a "generational buying opportunity." Baupost Group\'s cash position, which peaked at 47% earlier this year, has been reduced to 23% as Klarman finds attractively priced assets across financial services, energy, and consumer discretionary sectors. This marks the most aggressive capital deployment for Klarman since the 2008 financial crisis.',
    summary: '$3.2B deployed across 14 new positions',
    relatedStock: undefined,
    source: 'demo_data',
    publishedDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    relevanceScore: 0.93,
    metadata: {
      portfolioChange: {
        action: 'bought',
        value: 3200000000,
        percentage: 24
      }
    }
  }
]

export async function GET() {
  try {
    console.log('🎭 Serving demo superinvestor news data...')
    
    // Sort by relevance score and date
    const sortedNews = demoNews.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    })
    
    // Generate summary statistics
    const summary = {
      total: sortedNews.length,
      portfolio_changes: sortedNews.filter(n => n.type === 'portfolio_change').length,
      major_moves: sortedNews.filter(n => n.type === 'major_move').length,
      trending_stocks: sortedNews.filter(n => n.type === 'trending_stock').length,
      market_insights: sortedNews.filter(n => n.type === 'market_insight').length,
      totalValue: sortedNews.reduce((sum, news) => {
        return sum + (news.metadata.portfolioChange?.value || news.metadata.trendingData?.totalValue || 0)
      }, 0),
      avgRelevanceScore: sortedNews.reduce((sum, news) => sum + news.relevanceScore, 0) / sortedNews.length
    }
    
    console.log(`✅ Demo data served: ${sortedNews.length} news items, $${(summary.totalValue / 1000000000).toFixed(1)}B total value`)
    
    return NextResponse.json({
      news: sortedNews,
      summary,
      meta: {
        isDemo: true,
        description: 'Demo data showcasing Superinvestor News API capabilities',
        realDataNote: 'Real data will be generated from actual 13F filings and market analysis',
        generatedAt: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 min cache for demo
      }
    })
    
  } catch (error) {
    console.error('Demo superinvestor news error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      isDemo: true
    }, { status: 500 })
  }
}