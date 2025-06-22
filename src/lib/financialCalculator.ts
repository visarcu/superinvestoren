// src/lib/financialCalculator.ts - Advanced Financial Calculations
export interface FinancialMetrics {
    // Valuation Ratios
    peRatio: number | null
    pegRatio: number | null
    priceToBook: number | null
    priceToSales: number | null
    enterpriseValueToEbitda: number | null
    
    // Profitability Metrics
    returnOnEquity: number | null
    returnOnAssets: number | null
    netProfitMargin: number | null
    grossMargin: number | null
    operatingMargin: number | null
    
    // Financial Health
    debtToEquity: number | null
    currentRatio: number | null
    quickRatio: number | null
    interestCoverage: number | null
    
    // Growth Metrics
    revenueGrowth: number | null
    earningsGrowth: number | null
    
    // Dividend Metrics
    dividendYield: number | null
    payoutRatio: number | null
    
    // Market Metrics
    marketCap: number | null
    enterpriseValue: number | null
    sharesOutstanding: number | null
  }
  
  export interface DCFParameters {
    // Cash Flow Inputs
    freeCashFlow: number
    terminalGrowthRate: number
    discountRate: number
    projectionYears: number
    
    // Growth Assumptions
    year1Growth: number
    year2Growth: number
    year3Growth: number
    year4Growth: number
    year5Growth: number
  }
  
  export interface DCFResult {
    intrinsicValue: number
    currentPrice: number
    upside: number
    fairValueRange: {
      conservative: number
      moderate: number
      optimistic: number
    }
    sensitivityAnalysis: {
      discountRate: Array<{ rate: number; value: number }>
      terminalGrowth: Array<{ growth: number; value: number }>
    }
  }
  
  export interface PortfolioMetrics {
    totalValue: number
    totalReturn: number
    annualizedReturn: number
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    beta: number
    alpha: number
    correlation: Record<string, number>
  }
  
  // Basic Financial Calculations
  export class FinancialCalculator {
    
    // Valuation Ratios
    static calculatePE(price: number, eps: number): number | null {
      if (eps <= 0) return null
      return price / eps
    }
    
    static calculatePEG(peRatio: number, growthRate: number): number | null {
      if (growthRate <= 0 || !peRatio) return null
      return peRatio / growthRate
    }
    
    static calculatePriceToBook(price: number, bookValuePerShare: number): number | null {
      if (bookValuePerShare <= 0) return null
      return price / bookValuePerShare
    }
    
    static calculatePriceToSales(marketCap: number, revenue: number): number | null {
      if (revenue <= 0) return null
      return marketCap / revenue
    }
    
    // Profitability Metrics
    static calculateROE(netIncome: number, shareholdersEquity: number): number | null {
      if (shareholdersEquity <= 0) return null
      return (netIncome / shareholdersEquity) * 100
    }
    
    static calculateROA(netIncome: number, totalAssets: number): number | null {
      if (totalAssets <= 0) return null
      return (netIncome / totalAssets) * 100
    }
    
    static calculateNetMargin(netIncome: number, revenue: number): number | null {
      if (revenue <= 0) return null
      return (netIncome / revenue) * 100
    }
    
    static calculateGrossMargin(grossProfit: number, revenue: number): number | null {
      if (revenue <= 0) return null
      return (grossProfit / revenue) * 100
    }
    
    // Financial Health
    static calculateDebtToEquity(totalDebt: number, totalEquity: number): number | null {
      if (totalEquity <= 0) return null
      return totalDebt / totalEquity
    }
    
    static calculateCurrentRatio(currentAssets: number, currentLiabilities: number): number | null {
      if (currentLiabilities <= 0) return null
      return currentAssets / currentLiabilities
    }
    
    static calculateQuickRatio(currentAssets: number, inventory: number, currentLiabilities: number): number | null {
      if (currentLiabilities <= 0) return null
      return (currentAssets - inventory) / currentLiabilities
    }
    
    // Growth Calculations
    static calculateGrowthRate(currentValue: number, previousValue: number): number | null {
      if (previousValue <= 0) return null
      return ((currentValue - previousValue) / previousValue) * 100
    }
    
    static calculateCAGR(beginningValue: number, endingValue: number, years: number): number | null {
      if (beginningValue <= 0 || years <= 0) return null
      return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100
    }
    
    // Dividend Metrics
    static calculateDividendYield(annualDividend: number, price: number): number | null {
      if (price <= 0) return null
      return (annualDividend / price) * 100
    }
    
    static calculatePayoutRatio(dividendPerShare: number, earningsPerShare: number): number | null {
      if (earningsPerShare <= 0) return null
      return (dividendPerShare / earningsPerShare) * 100
    }
    
    // DCF Valuation
    static calculateDCF(params: DCFParameters): DCFResult {
      const { 
        freeCashFlow, 
        terminalGrowthRate, 
        discountRate, 
        projectionYears,
        year1Growth,
        year2Growth, 
        year3Growth, 
        year4Growth, 
        year5Growth 
      } = params
      
      const growthRates = [year1Growth, year2Growth, year3Growth, year4Growth, year5Growth]
      
      // Project Cash Flows
      let projectedCashFlows: number[] = []
      let currentCF = freeCashFlow
      
      for (let i = 0; i < projectionYears; i++) {
        const growthRate = growthRates[i] || growthRates[growthRates.length - 1]
        currentCF = currentCF * (1 + growthRate / 100)
        projectedCashFlows.push(currentCF)
      }
      
      // Terminal Value
      const terminalCF = projectedCashFlows[projectedCashFlows.length - 1] * (1 + terminalGrowthRate / 100)
      const terminalValue = terminalCF / (discountRate / 100 - terminalGrowthRate / 100)
      
      // Present Value Calculations
      let presentValueCFs = 0
      for (let i = 0; i < projectedCashFlows.length; i++) {
        presentValueCFs += projectedCashFlows[i] / Math.pow(1 + discountRate / 100, i + 1)
      }
      
      const presentValueTerminal = terminalValue / Math.pow(1 + discountRate / 100, projectionYears)
      const intrinsicValue = presentValueCFs + presentValueTerminal
      
      // Sensitivity Analysis
      const discountRateAnalysis = []
      for (let rate = discountRate - 2; rate <= discountRate + 2; rate += 0.5) {
        let pvCFs = 0
        for (let i = 0; i < projectedCashFlows.length; i++) {
          pvCFs += projectedCashFlows[i] / Math.pow(1 + rate / 100, i + 1)
        }
        const pvTerminal = terminalValue / Math.pow(1 + rate / 100, projectionYears)
        discountRateAnalysis.push({ rate, value: pvCFs + pvTerminal })
      }
      
      const terminalGrowthAnalysis = []
      for (let growth = terminalGrowthRate - 1; growth <= terminalGrowthRate + 1; growth += 0.25) {
        const termCF = projectedCashFlows[projectedCashFlows.length - 1] * (1 + growth / 100)
        const termVal = termCF / (discountRate / 100 - growth / 100)
        const pvTerm = termVal / Math.pow(1 + discountRate / 100, projectionYears)
        terminalGrowthAnalysis.push({ growth, value: presentValueCFs + pvTerm })
      }
      
      return {
        intrinsicValue,
        currentPrice: 0, // To be filled from market data
        upside: 0, // To be calculated
        fairValueRange: {
          conservative: intrinsicValue * 0.85,
          moderate: intrinsicValue,
          optimistic: intrinsicValue * 1.15
        },
        sensitivityAnalysis: {
          discountRate: discountRateAnalysis,
          terminalGrowth: terminalGrowthAnalysis
        }
      }
    }
    
    // Portfolio Analytics
    static calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
      if (returns.length === 0) return 0
      
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      const volatility = Math.sqrt(variance)
      
      if (volatility === 0) return 0
      return (avgReturn - riskFreeRate) / volatility
    }
    
    static calculateBeta(stockReturns: number[], marketReturns: number[]): number | null {
      if (stockReturns.length !== marketReturns.length || stockReturns.length === 0) return null
      
      const stockMean = stockReturns.reduce((sum, r) => sum + r, 0) / stockReturns.length
      const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length
      
      let covariance = 0
      let marketVariance = 0
      
      for (let i = 0; i < stockReturns.length; i++) {
        covariance += (stockReturns[i] - stockMean) * (marketReturns[i] - marketMean)
        marketVariance += Math.pow(marketReturns[i] - marketMean, 2)
      }
      
      if (marketVariance === 0) return null
      return covariance / marketVariance
    }
    
    static calculateMaxDrawdown(values: number[]): number {
      if (values.length === 0) return 0
      
      let maxDrawdown = 0
      let peak = values[0]
      
      for (const value of values) {
        if (value > peak) {
          peak = value
        }
        const drawdown = (peak - value) / peak
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
      }
      
      return maxDrawdown * 100
    }
    
    // Comprehensive Stock Analysis
    static analyzeStock(financialData: any): FinancialMetrics {
      const {
        price,
        eps,
        bookValuePerShare,
        revenue,
        marketCap,
        netIncome,
        totalAssets,
        shareholdersEquity,
        totalDebt,
        currentAssets,
        currentLiabilities,
        inventory,
        grossProfit,
        operatingIncome,
        dividendPerShare,
        growthRate
      } = financialData
      
      return {
        // Valuation
        peRatio: this.calculatePE(price, eps),
        pegRatio: this.calculatePEG(this.calculatePE(price, eps) || 0, growthRate),
        priceToBook: this.calculatePriceToBook(price, bookValuePerShare),
        priceToSales: this.calculatePriceToSales(marketCap, revenue),
        enterpriseValueToEbitda: null, // Would need more data
        
        // Profitability
        returnOnEquity: this.calculateROE(netIncome, shareholdersEquity),
        returnOnAssets: this.calculateROA(netIncome, totalAssets),
        netProfitMargin: this.calculateNetMargin(netIncome, revenue),
        grossMargin: this.calculateGrossMargin(grossProfit, revenue),
        operatingMargin: this.calculateNetMargin(operatingIncome, revenue),
        
        // Financial Health
        debtToEquity: this.calculateDebtToEquity(totalDebt, shareholdersEquity),
        currentRatio: this.calculateCurrentRatio(currentAssets, currentLiabilities),
        quickRatio: this.calculateQuickRatio(currentAssets, inventory, currentLiabilities),
        interestCoverage: null, // Would need interest expense
        
        // Growth
        revenueGrowth: growthRate,
        earningsGrowth: null, // Would need historical EPS
        
        // Dividends
        dividendYield: this.calculateDividendYield(dividendPerShare, price),
        payoutRatio: this.calculatePayoutRatio(dividendPerShare, eps),
        
        // Market
        marketCap,
        enterpriseValue: null, // Would need debt and cash
        sharesOutstanding: marketCap / price
      }
    }
  }
  
  // Utility Functions for AI Integration
  export function formatFinancialMetric(value: number | null, type: 'percentage' | 'ratio' | 'currency' | 'number'): string {
    if (value === null) return 'N/A'
    
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'ratio':
        return value.toFixed(2)
      case 'currency':
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(value)
      case 'number':
        return value.toLocaleString('de-DE')
      default:
        return value.toString()
    }
  }
  
  export function getValuationAssessment(metrics: FinancialMetrics): {
    overall: 'undervalued' | 'fairly_valued' | 'overvalued'
    reasoning: string[]
    score: number // 0-100
  } {
    const signals: Array<{ type: 'positive' | 'negative' | 'neutral', weight: number, reason: string }> = []
    
    // P/E Assessment
    if (metrics.peRatio !== null) {
      if (metrics.peRatio < 15) {
        signals.push({ type: 'positive', weight: 15, reason: `Niedriges P/E-Verhältnis von ${metrics.peRatio.toFixed(1)}` })
      } else if (metrics.peRatio > 25) {
        signals.push({ type: 'negative', weight: 15, reason: `Hohes P/E-Verhältnis von ${metrics.peRatio.toFixed(1)}` })
      }
    }
    
    // PEG Assessment
    if (metrics.pegRatio !== null) {
      if (metrics.pegRatio < 1) {
        signals.push({ type: 'positive', weight: 20, reason: `Attraktives PEG-Verhältnis von ${metrics.pegRatio.toFixed(2)}` })
      } else if (metrics.pegRatio > 2) {
        signals.push({ type: 'negative', weight: 15, reason: `Hohes PEG-Verhältnis von ${metrics.pegRatio.toFixed(2)}` })
      }
    }
    
    // ROE Assessment
    if (metrics.returnOnEquity !== null) {
      if (metrics.returnOnEquity > 15) {
        signals.push({ type: 'positive', weight: 10, reason: `Starke ROE von ${metrics.returnOnEquity.toFixed(1)}%` })
      } else if (metrics.returnOnEquity < 5) {
        signals.push({ type: 'negative', weight: 10, reason: `Schwache ROE von ${metrics.returnOnEquity.toFixed(1)}%` })
      }
    }
    
    // Debt Assessment
    if (metrics.debtToEquity !== null) {
      if (metrics.debtToEquity < 0.3) {
        signals.push({ type: 'positive', weight: 8, reason: `Niedrige Verschuldung (D/E: ${metrics.debtToEquity.toFixed(2)})` })
      } else if (metrics.debtToEquity > 1) {
        signals.push({ type: 'negative', weight: 12, reason: `Hohe Verschuldung (D/E: ${metrics.debtToEquity.toFixed(2)})` })
      }
    }
    
    // Calculate Score
    let totalPositive = signals.filter(s => s.type === 'positive').reduce((sum, s) => sum + s.weight, 0)
    let totalNegative = signals.filter(s => s.type === 'negative').reduce((sum, s) => sum + s.weight, 0)
    let totalWeight = totalPositive + totalNegative
    
    let score = totalWeight > 0 ? (totalPositive / totalWeight) * 100 : 50
    
    // Overall Assessment
    let overall: 'undervalued' | 'fairly_valued' | 'overvalued'
    if (score >= 70) overall = 'undervalued'
    else if (score <= 40) overall = 'overvalued'
    else overall = 'fairly_valued'
    
    return {
      overall,
      score,
      reasoning: signals.map(s => s.reason)
    }
  }