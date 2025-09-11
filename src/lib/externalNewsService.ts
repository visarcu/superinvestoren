/**
 * External News Service - sammelt echte News-Artikel über Investoren und ihre Holdings
 */

import { HoldingsData } from './portfolioChangeDetection'

export interface ExternalNewsItem {
  id: string
  title: string
  summary: string
  content: string
  url: string
  publishedDate: string
  source: string
  site: string
  image?: string
  ticker?: string
  relevanceScore: number
  newsType: 'STOCK_NEWS' | 'INVESTOR_NEWS' | 'MARKET_NEWS'
}

export interface NewsAggregationResult {
  investorNews: ExternalNewsItem[]
  holdingsNews: ExternalNewsItem[]
  marketNews: ExternalNewsItem[]
  totalFound: number
}

/**
 * Ticker-Mapping für bessere News-Suche
 */
const TICKER_MAPPING: Record<string, string> = {
  'APPLE INC': 'AAPL',
  'AMERICAN EXPRESS CO': 'AXP',
  'COCA COLA CO': 'KO',
  'BANK AMER CORP': 'BAC',
  'OCCIDENTAL PETE CORP': 'OXY',
  'CHEVRON CORP NEW': 'CVX',
  'KRAFT HEINZ CO': 'KHC',
  'CHUBB LIMITED': 'CB',
  'MOODYS CORP': 'MCO',
  'VISA INC': 'V',
  'AMAZON COM INC': 'AMZN',
  'TESLA INC': 'TSLA',
  'META PLATFORMS INC': 'META',
  'MICROSOFT CORP': 'MSFT',
  'ALPHABET INC': 'GOOGL',
  'NETFLIX INC': 'NFLX',
  'NVIDIA CORP': 'NVDA',
  'MASTERCARD INC': 'MA',
  'JPMORGAN CHASE & CO': 'JPM',
  'UNITEDHEALTH GROUP INC': 'UNH'
}

/**
 * Extrahiert Ticker aus Company-Name
 */
function extractTicker(companyName: string): string | null {
  const ticker = TICKER_MAPPING[companyName.toUpperCase()];
  if (ticker) return ticker;
  
  // Fallback: ersten Teil des Namens als Ticker verwenden
  const words = companyName.split(' ');
  if (words.length > 0) {
    const firstWord = words[0].replace(/[^A-Z]/g, '');
    return firstWord.length >= 2 ? firstWord : null;
  }
  
  return null;
}

/**
 * Berechnet Relevanz-Score für News-Artikel
 */
function calculateRelevanceScore(
  article: any,
  investorName: string,
  ticker?: string,
  holdingValue?: number
): number {
  let score = 0.1; // Base score
  
  const title = article.title?.toLowerCase() || '';
  const content = article.text?.toLowerCase() || '';
  const combinedText = `${title} ${content}`;
  
  // Investor Name Matching (highest priority)
  const investorKeywords = investorName.toLowerCase().split(' ');
  for (const keyword of investorKeywords) {
    if (keyword.length > 2) { // Skip short words like "of", "the"
      if (title.includes(keyword)) score += 0.4;
      if (content.includes(keyword)) score += 0.2;
    }
  }
  
  // Holdings relevance
  if (ticker && holdingValue) {
    const portfolioWeight = Math.min(holdingValue / 10_000_000_000, 1); // Max 1 for $10B+
    score += portfolioWeight * 0.3;
  }
  
  // Ticker mentions
  if (ticker && combinedText.includes(ticker.toLowerCase())) {
    score += 0.3;
  }
  
  // Investment-related keywords
  const investmentKeywords = [
    'portfolio', 'position', 'stake', 'shares', 'holding', 'investment',
    'bought', 'sold', 'acquired', 'divested', 'increased', 'decreased',
    '13f', 'filing', 'sec', 'quarterly', 'berkshire', 'fund', 'hedge'
  ];
  
  for (const keyword of investmentKeywords) {
    if (combinedText.includes(keyword)) {
      score += 0.1;
    }
  }
  
  // Recency bonus (newer articles get higher scores)
  const publishedDate = new Date(article.publishedDate);
  const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublished < 1) score += 0.2;      // Same day
  else if (daysSincePublished < 7) score += 0.1;  // This week
  else if (daysSincePublished < 30) score += 0.05; // This month
  
  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Sammelt Stock News für Top Holdings eines Investors
 */
export async function fetchStockNewsForHoldings(
  holdings: HoldingsData,
  investorName: string,
  limit = 10
): Promise<ExternalNewsItem[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn('FMP_API_KEY not available for stock news');
    return [];
  }
  
  const newsItems: ExternalNewsItem[] = [];
  
  // Get top 8 holdings by value
  const topHoldings = holdings.positions
    .map(pos => ({ ...pos, ticker: extractTicker(pos.name) }))
    .filter(pos => pos.ticker)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 8);
  
  console.log(`📰 Fetching FMP stock news for ${topHoldings.length} top holdings...`);
  
  // Batch requests to avoid rate limits
  for (const position of topHoldings) {
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/stock_news?tickers=${position.ticker}&limit=3&apikey=${apiKey}`,
        { 
          next: { revalidate: 1800 }, // 30 min cache
          signal: AbortSignal.timeout(10000) // 10s timeout
        }
      );
      
      if (!response.ok) continue;
      
      const articles = await response.json();
      if (!Array.isArray(articles)) continue;
      
      articles.forEach((article, index) => {
        const relevanceScore = calculateRelevanceScore(
          article,
          investorName,
          position.ticker!,
          position.value
        );
        
        // Only include articles with any relevance (debugging)
        if (relevanceScore > 0.1) {
          newsItems.push({
            id: `fmp_${position.ticker}_${Date.now()}_${index}`,
            title: article.title,
            summary: article.title,
            content: article.text || '',
            url: article.url,
            publishedDate: article.publishedDate,
            source: 'FMP_NEWS',
            site: article.site || 'Financial Modeling Prep',
            image: article.image,
            ticker: position.ticker!,
            relevanceScore,
            newsType: 'STOCK_NEWS'
          });
        }
      });
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error fetching news for ${position.ticker}:`, error);
    }
  }
  
  // Sort by relevance and date, return top items
  return newsItems
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
    })
    .slice(0, limit);
}

/**
 * Sammelt investor-spezifische News (experimentell mit Google News)
 */
export async function fetchInvestorSpecificNews(
  investorName: string,
  firmName: string,
  limit = 5
): Promise<ExternalNewsItem[]> {
  // For now, we'll use a simple approach - could be enhanced with Google News API
  // or other news aggregation services in the future
  
  console.log(`🔍 Searching for investor-specific news for ${investorName}...`);
  
  // Placeholder for future implementation
  // Could integrate with:
  // - Google News API
  // - NewsAPI.org  
  // - Reuters/Bloomberg APIs
  // - Web scraping (carefully, respecting robots.txt)
  
  return [];
}

/**
 * Aggregiert alle externen News für einen Investor
 */
export async function aggregateExternalNews(
  holdings: HoldingsData,
  investorName: string,
  firmName: string,
  options: {
    includeStockNews?: boolean
    includeInvestorNews?: boolean
    includeMarketNews?: boolean
    maxItems?: number
  } = {}
): Promise<NewsAggregationResult> {
  const {
    includeStockNews = true,
    includeInvestorNews = true,
    includeMarketNews = false,
    maxItems = 15
  } = options;
  
  console.log(`🔄 Aggregating external news for ${investorName}...`);
  
  const results: NewsAggregationResult = {
    investorNews: [],
    holdingsNews: [],
    marketNews: [],
    totalFound: 0
  };
  
  try {
    // Fetch stock news for holdings
    if (includeStockNews) {
      const stockNews = await fetchStockNewsForHoldings(
        holdings,
        investorName,
        Math.ceil(maxItems * 0.7) // 70% stock news
      );
      results.holdingsNews = stockNews;
    }
    
    // Fetch investor-specific news  
    if (includeInvestorNews) {
      const investorNews = await fetchInvestorSpecificNews(
        investorName,
        firmName,
        Math.ceil(maxItems * 0.3) // 30% investor news
      );
      results.investorNews = investorNews;
    }
    
    results.totalFound = results.holdingsNews.length + results.investorNews.length + results.marketNews.length;
    
    console.log(`✅ External news aggregation complete: ${results.totalFound} articles found`);
    
  } catch (error) {
    console.error('Error aggregating external news:', error);
  }
  
  return results;
}