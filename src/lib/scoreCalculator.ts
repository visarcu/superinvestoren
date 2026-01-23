// src/lib/scoreCalculator.ts
export async function calculateAdvancedFinclueScore(
    ticker: string,
    financials: any,
    quote: any,
    ratios: any
  ): Promise<number> {
    let score = 50 // Basis
    
    // 1. Profitabilität (25%)
    if (ratios.roe > 15) score += 10
    if (ratios.netProfitMargin > 10) score += 10
    if (ratios.currentRatio > 1.5) score += 5
    
    // 2. Wachstum (20%)
    if (financials.revenueGrowth > 10) score += 10
    if (financials.epsGrowth > 10) score += 10
    
    // 3. Bewertung (20%)
    const sectorAvgPE = 20 // Aus DB oder API
    if (quote.pe < sectorAvgPE * 0.8) score += 10
    if (ratios.priceToBook < 3) score += 10
    
    // 4. Momentum (15%)
    const performance = quote.changesPercentage
    if (performance > 0) score += 7
    if (quote.price > quote.priceAvg50) score += 8
    
    // 5. Stabilität (20%)
    if (ratios.debtToEquity < 0.5) score += 10
    if (quote.volume > quote.avgVolume) score += 5
    
    return Math.min(100, Math.max(0, Math.round(score)))
  }