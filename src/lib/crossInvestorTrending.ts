/**
 * Cross-Investor Trending Detection - findet Aktien die von mehreren Superinvestors gekauft werden
 */

import { 
  loadAllInvestorsForQuarter, 
  getAvailableInvestors, 
  sortQuartersChronologically 
} from './holdingsDataLoader';
import { 
  detectPortfolioChanges, 
  PortfolioChange, 
  HoldingsData 
} from './portfolioChangeDetection';

export interface TrendingStock {
  cusip: string;
  name: string;
  ticker?: string;
  investorsInvolved: {
    investor: string;
    changeType: 'NEW_POSITION' | 'INCREASED' | 'DECREASED' | 'SOLD';
    sharesChange: number;
    valueChange: number;
    percentChange: number;
    currentValue: number;
  }[];
  totalInvestors: number;
  totalValueChange: number;
  netSharesChange: number;
  trendingScore: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'MIXED';
}

export interface CrossInvestorAnalysis {
  quarter: string;
  previousQuarter: string;
  trendingStocks: TrendingStock[];
  summary: {
    totalTrendingStocks: number;
    bullishTrends: number;
    bearishTrends: number;
    mixedTrends: number;
    topInvestorsActive: string[];
  };
}

/**
 * Extrahiert vereinfachte Ticker-Symbole aus Company-Namen
 */
function extractTickerFromName(companyName: string): string {
  const tickerMap: Record<string, string> = {
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
    'NVIDIA CORP': 'NVDA'
  };
  
  return tickerMap[companyName] || companyName.split(' ')[0];
}

/**
 * Analysiert Cross-Investor Trends für ein spezifisches Quartal
 */
export async function analyzeCrossInvestorTrends(
  currentQuarter: string,
  previousQuarter: string,
  minInvestors = 2,
  minValueChange = 100_000_000 // $100M
): Promise<CrossInvestorAnalysis> {
  
  console.log(`🔍 Analyzing cross-investor trends between ${previousQuarter} and ${currentQuarter}...`);
  
  // Lade Holdings für beide Quartale
  const [currentData, previousData] = await Promise.all([
    loadAllInvestorsForQuarter(currentQuarter),
    loadAllInvestorsForQuarter(previousQuarter)
  ]);
  
  const stockChanges = new Map<string, TrendingStock>();
  const investorActivities = new Set<string>();
  
  // Analysiere jeden Investor
  for (const [investor, currentHoldings] of currentData.entries()) {
    const previousHoldings = previousData.get(investor);
    
    if (!previousHoldings) continue;
    
    // Erkenne Portfolio-Änderungen
    const analysis = detectPortfolioChanges(previousHoldings, currentHoldings, investor);
    
    if (analysis.changes.length > 0) {
      investorActivities.add(investor);
    }
    
    // Verarbeite jede Änderung
    analysis.changes.forEach((change: PortfolioChange) => {
      const cusip = change.cusip;
      
      if (!stockChanges.has(cusip)) {
        stockChanges.set(cusip, {
          cusip,
          name: change.name,
          ticker: extractTickerFromName(change.name),
          investorsInvolved: [],
          totalInvestors: 0,
          totalValueChange: 0,
          netSharesChange: 0,
          trendingScore: 0,
          sentiment: 'MIXED'
        });
      }
      
      const trending = stockChanges.get(cusip)!;
      
      trending.investorsInvolved.push({
        investor,
        changeType: change.type,
        sharesChange: change.shareChange,
        valueChange: change.valueChange,
        percentChange: change.percentChange,
        currentValue: change.currentValue
      });
      
      trending.totalValueChange += Math.abs(change.valueChange);
      trending.netSharesChange += change.shareChange;
    });
  }
  
  // Filtere und bewerte Trending Stocks
  const trendingStocks: TrendingStock[] = [];
  
  stockChanges.forEach((stock, cusip) => {
    stock.totalInvestors = stock.investorsInvolved.length;
    
    // Filtere nach Mindest-Kriterien
    if (stock.totalInvestors < minInvestors || stock.totalValueChange < minValueChange) {
      return;
    }
    
    // Berechne Trending Score
    const majorMoves = stock.investorsInvolved.filter(inv => Math.abs(inv.valueChange) > 1_000_000_000).length;
    const newPositions = stock.investorsInvolved.filter(inv => inv.changeType === 'NEW_POSITION').length;
    const increases = stock.investorsInvolved.filter(inv => inv.changeType === 'INCREASED' || inv.changeType === 'NEW_POSITION').length;
    const decreases = stock.investorsInvolved.filter(inv => inv.changeType === 'DECREASED' || inv.changeType === 'SOLD').length;
    
    stock.trendingScore = 
      (stock.totalInvestors * 10) +
      (majorMoves * 20) +
      (newPositions * 15) +
      (stock.totalValueChange / 1_000_000_000 * 5); // Value in billions
    
    // Bestimme Sentiment
    if (increases > decreases * 2) {
      stock.sentiment = 'BULLISH';
    } else if (decreases > increases * 2) {
      stock.sentiment = 'BEARISH';
    } else {
      stock.sentiment = 'MIXED';
    }
    
    trendingStocks.push(stock);
  });
  
  // Sortiere nach Trending Score
  trendingStocks.sort((a, b) => b.trendingScore - a.trendingScore);
  
  const summary = {
    totalTrendingStocks: trendingStocks.length,
    bullishTrends: trendingStocks.filter(s => s.sentiment === 'BULLISH').length,
    bearishTrends: trendingStocks.filter(s => s.sentiment === 'BEARISH').length,
    mixedTrends: trendingStocks.filter(s => s.sentiment === 'MIXED').length,
    topInvestorsActive: Array.from(investorActivities).slice(0, 10)
  };
  
  console.log(`✅ Found ${trendingStocks.length} trending stocks with ${summary.bullishTrends} bullish, ${summary.bearishTrends} bearish trends`);
  
  return {
    quarter: currentQuarter,
    previousQuarter,
    trendingStocks,
    summary
  };
}

/**
 * Analysiert die neuesten verfügbaren Quartale für Cross-Investor Trends
 */
export async function analyzeLatestCrossInvestorTrends(): Promise<CrossInvestorAnalysis | null> {
  const availableInvestors = await getAvailableInvestors();
  
  if (availableInvestors.length === 0) {
    return null;
  }
  
  // Finde die beiden neuesten Quartale mit den meisten verfügbaren Investoren
  const quarterCounts = new Map<string, number>();
  
  availableInvestors.forEach(investor => {
    investor.quarters.forEach(quarter => {
      quarterCounts.set(quarter, (quarterCounts.get(quarter) || 0) + 1);
    });
  });
  
  const sortedQuarters = sortQuartersChronologically(Array.from(quarterCounts.keys()), true);
  
  if (sortedQuarters.length < 2) {
    return null;
  }
  
  const currentQuarter = sortedQuarters[0];
  const previousQuarter = sortedQuarters[1];
  
  return analyzeCrossInvestorTrends(currentQuarter, previousQuarter);
}

/**
 * Generiert News-Headlines für Trending Stocks
 */
export function generateTrendingNewsHeadlines(analysis: CrossInvestorAnalysis): Array<{
  headline: string;
  summary: string;
  stock: TrendingStock;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}> {
  const headlines = analysis.trendingStocks.map(stock => {
    const investorNames = stock.investorsInvolved.map(inv => inv.investor).join(', ');
    const sentiment = stock.sentiment;
    const totalInvestors = stock.totalInvestors;
    
    let headline: string;
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    
    if (stock.trendingScore > 100) {
      priority = 'HIGH';
      if (sentiment === 'BULLISH') {
        headline = `🔥 ${totalInvestors} Superinvestoren steigen massiv in ${stock.ticker || stock.name} ein`;
      } else if (sentiment === 'BEARISH') {
        headline = `⚠️ ${totalInvestors} Superinvestoren verkaufen ${stock.ticker || stock.name}`;
      } else {
        headline = `🤔 ${totalInvestors} Superinvestoren mit unterschiedlichen Moves bei ${stock.ticker || stock.name}`;
      }
    } else if (stock.trendingScore > 50) {
      priority = 'MEDIUM';
      if (sentiment === 'BULLISH') {
        headline = `📈 Mehrere Investoren zeigen Interesse an ${stock.ticker || stock.name}`;
      } else {
        headline = `📉 Mehrere Investoren reduzieren ${stock.ticker || stock.name} Positionen`;
      }
    } else {
      if (sentiment === 'BULLISH') {
        headline = `${stock.ticker || stock.name} zieht mehrere Superinvestoren an`;
      } else {
        headline = `${stock.ticker || stock.name} mit gemischten Superinvestor-Bewegungen`;
      }
    }
    
    const summary = `${totalInvestors} Superinvestoren tätigten bedeutende Bewegungen bei ${stock.ticker || stock.name} während ${analysis.quarter}, mit kombinierten Volumenveränderungen von $${(stock.totalValueChange / 1_000_000_000).toFixed(1)}B.`;
    
    return {
      headline,
      summary,
      stock,
      priority
    };
  });
  
  // Sortiere nach Priorität und Score
  return headlines.sort((a, b) => {
    if (a.priority !== b.priority) {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.stock.trendingScore - a.stock.trendingScore;
  });
}