/**
 * Hybrid News Service - kombiniert generierte 13F News mit echten externen News
 */

import { 
  loadLatestTwoQuarters 
} from './holdingsDataLoader'
import { 
  detectPortfolioChanges, 
  PortfolioAnalysis 
} from './portfolioChangeDetection'
import { 
  generateNewsFromPortfolioAnalysis,
  GeneratedNewsItem 
} from './portfolioNewsGenerator'
import { 
  aggregateExternalNews,
  ExternalNewsItem,
  NewsAggregationResult
} from './externalNewsService'

export interface HybridNewsItem {
  id: string
  title: string
  summary: string
  content: string
  publishedDate: string
  source: 'GENERATED_13F' | 'EXTERNAL_FMP' | 'EXTERNAL_NEWS' | 'MIXED'
  type: 'portfolio_change' | 'market_news' | 'trending_stock' | 'major_move'
  investor: {
    slug: string
    name: string
    firm: string
  }
  relatedStock?: string
  ticker?: string
  url?: string
  image?: string
  site?: string
  relevanceScore: number
  significance: 'HIGH' | 'MEDIUM' | 'LOW'
  isGenerated: boolean
  metadata: {
    portfolioChange?: {
      action: 'bought' | 'sold' | 'increased' | 'decreased'
      value?: number
      percentage?: number
    }
    externalNews?: {
      originalTitle: string
      originalSource: string
      newsType: 'STOCK_NEWS' | 'INVESTOR_NEWS' | 'MARKET_NEWS'
    }
  }
}

export interface HybridNewsResult {
  news: HybridNewsItem[]
  summary: {
    total: number
    generated: number
    external: number
    highRelevance: number
    mediumRelevance: number
    lowRelevance: number
  }
  meta: {
    isHybrid: true
    generatedFrom: '13F_FILINGS'
    externalFrom: 'FMP_API'
    processingTime: number
    dataQuality: 'HIGH' | 'MEDIUM' | 'LOW'
  }
}

// Investor metadata für Konvertierung
const INVESTOR_METADATA: Record<string, { name: string; firm: string }> = {
  buffett: { name: 'Warren Buffett', firm: 'Berkshire Hathaway' },
  ackman: { name: 'Bill Ackman', firm: 'Pershing Square Capital' },
  gates: { name: 'Bill Gates', firm: 'Gates Foundation' },
  einhorn: { name: 'David Einhorn', firm: 'Greenlight Capital' },
  burry: { name: 'Michael Burry', firm: 'Scion Asset Management' },
  icahn: { name: 'Carl Icahn', firm: 'Icahn Capital Management' },
  loeb: { name: 'Daniel Loeb', firm: 'Third Point' },
  dalio: { name: 'Ray Dalio', firm: 'Bridgewater Associates' },
  klarman: { name: 'Seth Klarman', firm: 'Baupost Group' },
  soros: { name: 'George Soros', firm: 'Soros Fund Management' }
};

/**
 * Konvertiert GeneratedNewsItem zu HybridNewsItem
 */
function convertGeneratedToHybrid(
  generated: GeneratedNewsItem,
  investorSlug: string
): HybridNewsItem {
  const investor = INVESTOR_METADATA[investorSlug] || { name: investorSlug, firm: 'Unknown' };
  
  return {
    id: generated.id,
    title: generated.title,
    summary: generated.summary,
    content: generated.content,
    publishedDate: generated.timestamp,
    source: 'GENERATED_13F',
    type: generated.type === 'PORTFOLIO_SUMMARY' ? 'portfolio_change' :
          generated.type === 'NEW_POSITION' || generated.type === 'INCREASED' || 
          generated.type === 'DECREASED' || generated.type === 'SOLD' ? 'portfolio_change' : 'portfolio_change',
    investor: {
      slug: investorSlug,
      name: investor.name,
      firm: investor.firm
    },
    relatedStock: generated.ticker,
    ticker: generated.ticker,
    relevanceScore: generated.significance === 'MAJOR' ? 0.9 : 
                   generated.significance === 'SIGNIFICANT' ? 0.7 : 0.5,
    significance: generated.significance === 'MAJOR' ? 'HIGH' :
                  generated.significance === 'SIGNIFICANT' ? 'MEDIUM' : 'LOW',
    isGenerated: true,
    metadata: {
      portfolioChange: {
        action: generated.type === 'NEW_POSITION' ? 'bought' :
               generated.type === 'INCREASED' ? 'increased' :
               generated.type === 'DECREASED' ? 'decreased' :
               generated.type === 'SOLD' ? 'sold' : 'increased',
        value: generated.value,
        percentage: Math.abs(generated.change / generated.value * 100)
      }
    }
  };
}

/**
 * Konvertiert ExternalNewsItem zu HybridNewsItem  
 */
function convertExternalToHybrid(
  external: ExternalNewsItem,
  investorSlug: string
): HybridNewsItem {
  const investor = INVESTOR_METADATA[investorSlug] || { name: investorSlug, firm: 'Unknown' };
  
  return {
    id: external.id,
    title: external.title,
    summary: external.summary,
    content: external.content,
    publishedDate: external.publishedDate,
    source: 'EXTERNAL_FMP',
    type: 'market_news',
    investor: {
      slug: investorSlug,
      name: investor.name,
      firm: investor.firm
    },
    relatedStock: external.ticker,
    ticker: external.ticker,
    url: external.url,
    image: external.image,
    site: external.site,
    relevanceScore: external.relevanceScore,
    significance: external.relevanceScore > 0.7 ? 'HIGH' :
                  external.relevanceScore > 0.4 ? 'MEDIUM' : 'LOW',
    isGenerated: false,
    metadata: {
      externalNews: {
        originalTitle: external.title,
        originalSource: external.source,
        newsType: external.newsType
      }
    }
  };
}

/**
 * Intelligente Mischung von generierten und externen News
 */
function smartMixNews(
  generatedNews: HybridNewsItem[],
  externalNews: HybridNewsItem[],
  maxItems: number
): HybridNewsItem[] {
  const allNews = [...generatedNews, ...externalNews];
  
  // Sortiere nach Relevanz und Datum
  const sortedNews = allNews.sort((a, b) => {
    // Erst nach Relevanz-Score
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    
    // Dann nach Datum (neuere zuerst)
    const dateA = new Date(a.publishedDate).getTime();
    const dateB = new Date(b.publishedDate).getTime();
    return dateB - dateA;
  });
  
  // Intelligente Auswahl: Mix aus generierten und externen News
  const result: HybridNewsItem[] = [];
  const generatedItems = sortedNews.filter(item => item.isGenerated);
  const externalItems = sortedNews.filter(item => !item.isGenerated);
  
  // Verhältnis: 60% generierte News (13F), 40% externe News
  const targetGenerated = Math.ceil(maxItems * 0.6);
  const targetExternal = Math.floor(maxItems * 0.4);
  
  // Füge die besten generierten News hinzu
  result.push(...generatedItems.slice(0, targetGenerated));
  
  // Füge die besten externen News hinzu
  result.push(...externalItems.slice(0, targetExternal));
  
  // Falls wir noch Platz haben, fülle mit den besten verbleibenden auf
  const remainingSlots = maxItems - result.length;
  if (remainingSlots > 0) {
    const remaining = sortedNews.filter(item => !result.includes(item));
    result.push(...remaining.slice(0, remainingSlots));
  }
  
  // Final sort by relevance
  return result
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxItems);
}

/**
 * Generiert Hybrid News für einen Investor
 */
export async function generateHybridNews(
  investorSlug: string,
  options: {
    maxItems?: number
    includeExternal?: boolean
    generatedRatio?: number // 0.0 - 1.0, how much should be generated vs external
  } = {}
): Promise<HybridNewsResult> {
  const startTime = Date.now();
  const {
    maxItems = 20,
    includeExternal = true,
    generatedRatio = 0.6
  } = options;
  
  const investor = INVESTOR_METADATA[investorSlug];
  if (!investor) {
    throw new Error(`Unknown investor: ${investorSlug}`);
  }
  
  console.log(`🔄 Generating hybrid news for ${investor.name}...`);
  
  const hybridNews: HybridNewsItem[] = [];
  
  try {
    // 1. Generate 13F-based news
    const { current, previous } = await loadLatestTwoQuarters(investorSlug);
    
    if (current && previous) {
      const analysis: PortfolioAnalysis = detectPortfolioChanges(previous, current, investorSlug);
      const generatedItems = generateNewsFromPortfolioAnalysis(analysis, Math.ceil(maxItems * generatedRatio));
      
      // Convert to hybrid format
      const hybridGenerated = generatedItems.map(item => 
        convertGeneratedToHybrid(item, investorSlug)
      );
      
      hybridNews.push(...hybridGenerated);
      console.log(`✅ Generated ${hybridGenerated.length} 13F-based news items`);
    }
    
    // 2. Fetch external news (if enabled and current holdings available)
    if (includeExternal && current) {
      const externalResults = await aggregateExternalNews(
        current,
        investor.name,
        investor.firm,
        {
          includeStockNews: true,
          includeInvestorNews: false, // Not implemented yet
          maxItems: Math.ceil(maxItems * (1 - generatedRatio))
        }
      );
      
      // Convert external news to hybrid format
      const externalNews = [
        ...externalResults.holdingsNews,
        ...externalResults.investorNews,
        ...externalResults.marketNews
      ];
      
      const hybridExternal = externalNews.map(item =>
        convertExternalToHybrid(item, investorSlug)
      );
      
      hybridNews.push(...hybridExternal);
      console.log(`✅ Fetched ${hybridExternal.length} external news items`);
    }
    
    // 3. Smart mixing and ranking
    const generatedItems = hybridNews.filter(item => item.isGenerated);
    const externalItems = hybridNews.filter(item => !item.isGenerated);
    
    const finalNews = smartMixNews(generatedItems, externalItems, maxItems);
    
    // 4. Calculate summary statistics
    const summary = {
      total: finalNews.length,
      generated: finalNews.filter(item => item.isGenerated).length,
      external: finalNews.filter(item => !item.isGenerated).length,
      highRelevance: finalNews.filter(item => item.significance === 'HIGH').length,
      mediumRelevance: finalNews.filter(item => item.significance === 'MEDIUM').length,
      lowRelevance: finalNews.filter(item => item.significance === 'LOW').length
    };
    
    const processingTime = Date.now() - startTime;
    const dataQuality = summary.total > maxItems * 0.8 ? 'HIGH' :
                       summary.total > maxItems * 0.5 ? 'MEDIUM' : 'LOW';
    
    console.log(`✅ Hybrid news generation complete: ${summary.total} items (${summary.generated} generated, ${summary.external} external) in ${processingTime}ms`);
    
    return {
      news: finalNews,
      summary,
      meta: {
        isHybrid: true,
        generatedFrom: '13F_FILINGS',
        externalFrom: 'FMP_API',
        processingTime,
        dataQuality
      }
    };
    
  } catch (error) {
    console.error('Error generating hybrid news:', error);
    
    // Return generated news only as fallback
    return {
      news: hybridNews.filter(item => item.isGenerated),
      summary: {
        total: hybridNews.length,
        generated: hybridNews.length,
        external: 0,
        highRelevance: hybridNews.filter(item => item.significance === 'HIGH').length,
        mediumRelevance: hybridNews.filter(item => item.significance === 'MEDIUM').length,
        lowRelevance: hybridNews.filter(item => item.significance === 'LOW').length
      },
      meta: {
        isHybrid: true,
        generatedFrom: '13F_FILINGS',
        externalFrom: 'FMP_API',
        processingTime: Date.now() - startTime,
        dataQuality: 'LOW'
      }
    };
  }
}