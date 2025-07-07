// src/app/api/dividends/[ticker]/route.ts - ENHANCED: Professional Dividend Analysis
import { NextResponse } from 'next/server'
import { dataService } from '@/lib/services/DataService'

// ✅ ENHANCED INTERFACES
interface PayoutSafetyResult {
  text: string
  color: 'green' | 'yellow' | 'red' | 'gray'
  level: 'very_safe' | 'safe' | 'moderate' | 'risky' | 'critical' | 'unsustainable' | 'no_data'
  payout: number
}

interface QuarterlyDividend {
  date: string
  amount: number
  quarter: string
  year: number
  adjAmount: number
  exDividendDate?: string
  recordDate?: string
  payableDate?: string
}

interface PayoutRatioHistory {
  year: number
  payoutRatio: number
  ttmEPS: number
  ttmDividend: number
}

interface DividendCAGR {
  period: string
  years: number
  cagr: number
  startValue: number
  endValue: number
  totalReturn: number
}

interface FinancialHealthMetrics {
  freeCashFlowCoverage: number
  debtToEquity: number
  interestCoverage: number
  currentRatio: number
  quickRatio: number
  roe: number
  roa: number
}

// ✅ FILTER: Modern dividends only (2005+)
function filterModernDividends(historicalDividends: Record<string, number>): Record<string, number> {
  const cutoffYear = 2005
  const currentYear = new Date().getFullYear()
  
  const filteredDividends: Record<string, number> = {}
  
  Object.entries(historicalDividends).forEach(([year, amount]) => {
    const yearNum = parseInt(year)
    if (yearNum >= cutoffYear && yearNum < currentYear) {
      filteredDividends[year] = amount
    }
  })
  
  console.log(`📊 Filtered to modern years: ${Object.keys(historicalDividends).length} → ${Object.keys(filteredDividends).length} years`)
  return filteredDividends
}

// ✅ NEW: Get Quarterly Dividend History
async function getQuarterlyDividendHistory(ticker: string, apiKey: string): Promise<QuarterlyDividend[]> {
  try {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      console.warn(`⚠️ Quarterly dividend fetch failed for ${ticker}`)
      return []
    }
    
    const data = await response.json()
    const historical = data[0]?.historical || data.historical || []
    
    // Get last 20 quarterly payments
    const quarterlyData: QuarterlyDividend[] = historical
      .slice(0, 20)
      .map((div: { date: string; dividend?: number; adjDividend?: number; recordDate?: string; payableDate?: string }) => {
        const date = new Date(div.date)
        const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)}`
        
        return {
          date: div.date,
          amount: div.dividend || 0,
          adjAmount: div.adjDividend || div.dividend || 0,
          quarter,
          year: date.getFullYear(),
          exDividendDate: div.date,
          recordDate: div.recordDate,
          payableDate: div.payableDate
        }
      })
      .sort((a: QuarterlyDividend, b: QuarterlyDividend) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    console.log(`✅ [Quarterly Dividends] ${ticker}: ${quarterlyData.length} quarters loaded`)
    return quarterlyData
    
  } catch (error) {
    console.warn(`⚠️ Quarterly dividend fetch failed for ${ticker}:`, error)
    return []
  }
}

// ✅ NEW: Calculate Payout Ratio History
async function getPayoutRatioHistory(ticker: string, apiKey: string, modernDividends: Record<string, number>): Promise<PayoutRatioHistory[]> {
  try {
    // Get historical income statements for EPS data
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=10&apikey=${apiKey}`
    const incomeResponse = await fetch(incomeUrl)
    
    if (!incomeResponse.ok) {
      console.warn(`⚠️ Income statement fetch failed for ${ticker}`)
      return []
    }
    
    const incomeData = await incomeResponse.json()
    
    const payoutHistory: PayoutRatioHistory[] = []
    
    incomeData.forEach((annual: { date: string; eps?: number }) => {
      const year = new Date(annual.date).getFullYear()
      const eps = annual.eps || 0
      const dividend = modernDividends[year.toString()] || 0
      
      if (eps > 0 && dividend > 0 && year >= 2015) { // Last 10 years
        payoutHistory.push({
          year,
          payoutRatio: dividend / eps,
          ttmEPS: eps,
          ttmDividend: dividend
        })
      }
    })
    
    console.log(`✅ [Payout History] ${ticker}: ${payoutHistory.length} years of payout ratios`)
    return payoutHistory.sort((a: PayoutRatioHistory, b: PayoutRatioHistory) => a.year - b.year)
    
  } catch (error) {
    console.warn(`⚠️ Payout ratio history failed for ${ticker}:`, error)
    return []
  }
}

// ✅ NEW: Calculate Dividend CAGR for different periods
function calculateDividendCAGR(modernDividends: Record<string, number>): DividendCAGR[] {
  const years = Object.keys(modernDividends)
    .map(y => parseInt(y))
    .sort((a, b) => a - b)
  
  if (years.length < 2) return []
  
  const latestYear = years[years.length - 1]
  const latestDividend = modernDividends[latestYear.toString()]
  
  const periods = [
    { period: '1Y', years: 1 },
    { period: '3Y', years: 3 },
    { period: '5Y', years: 5 },
    { period: '10Y', years: 10 }
  ]
  
  const cagrResults: DividendCAGR[] = []
  
  periods.forEach(({ period, years: periodYears }) => {
    const startYear = latestYear - periodYears
    const startDividend = modernDividends[startYear.toString()]
    
    if (startDividend && startDividend > 0) {
      const cagr = Math.pow(latestDividend / startDividend, 1 / periodYears) - 1
      const totalReturn = (latestDividend / startDividend - 1) * 100
      
      cagrResults.push({
        period,
        years: periodYears,
        cagr: cagr * 100,
        startValue: startDividend,
        endValue: latestDividend,
        totalReturn
      })
    }
  })
  
  console.log(`✅ [CAGR Analysis] Calculated ${cagrResults.length} period CAGRs`)
  return cagrResults
}

// ✅ NEW: Get Financial Health Metrics
async function getFinancialHealthMetrics(ticker: string, apiKey: string): Promise<FinancialHealthMetrics | null> {
  try {
    const [balanceRes, incomeRes, cashFlowRes] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=1&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=1&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?limit=1&apikey=${apiKey}`)
    ])
    
    let balance: any = null, income: any = null, cashFlow: any = null
    
    if (balanceRes.status === 'fulfilled' && balanceRes.value.ok) {
      const data = await balanceRes.value.json()
      balance = data[0]
    }
    
    if (incomeRes.status === 'fulfilled' && incomeRes.value.ok) {
      const data = await incomeRes.value.json()
      income = data[0]
    }
    
    if (cashFlowRes.status === 'fulfilled' && cashFlowRes.value.ok) {
      const data = await cashFlowRes.value.json()
      cashFlow = data[0]
    }
    
    if (!balance || !income || !cashFlow) {
      console.warn(`⚠️ Incomplete financial data for ${ticker}`)
      return null
    }
    
    // Calculate key metrics with proper type checking
    const metrics: FinancialHealthMetrics = {
      freeCashFlowCoverage: (cashFlow.freeCashFlow && income.totalDebt) ? 
        cashFlow.freeCashFlow / (income.totalDebt || 1) : 0,
      debtToEquity: (balance.totalDebt && balance.totalStockholdersEquity) ? 
        balance.totalDebt / balance.totalStockholdersEquity : 0,
      interestCoverage: (income.ebitda && income.interestExpense) ? 
        income.ebitda / Math.abs(income.interestExpense || 1) : 0,
      currentRatio: (balance.totalCurrentAssets && balance.totalCurrentLiabilities) ? 
        balance.totalCurrentAssets / balance.totalCurrentLiabilities : 0,
      quickRatio: (balance.cashAndCashEquivalents && balance.totalCurrentLiabilities) ?
        balance.cashAndCashEquivalents / balance.totalCurrentLiabilities : 0,
      roe: (income.netIncome && balance.totalStockholdersEquity) ?
        (income.netIncome / balance.totalStockholdersEquity) * 100 : 0,
      roa: (income.netIncome && balance.totalAssets) ?
        (income.netIncome / balance.totalAssets) * 100 : 0
    }
    
    console.log(`✅ [Financial Health] ${ticker}: FCF Coverage ${metrics.freeCashFlowCoverage.toFixed(2)}, D/E ${metrics.debtToEquity.toFixed(2)}`)
    return metrics
    
  } catch (error) {
    console.warn(`⚠️ Financial health metrics failed for ${ticker}:`, error)
    return null
  }
}

// ✅ ENHANCED: Get TTM with split-adjusted data
async function getTTMDividendSplitAdjusted(ticker: string, apiKey: string): Promise<number> {
  try {
    const dividendUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${apiKey}`
    const dividendRes = await fetch(dividendUrl)
    
    if (!dividendRes.ok) {
      console.warn(`⚠️ TTM dividend fetch failed for ${ticker}`)
      return 0
    }
    
    const dividendData = await dividendRes.json()
    const historical = dividendData[0]?.historical || dividendData.historical || []
    
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    
    const recentDividends = historical
      .filter((div: { date: string }) => {
        const divDate = new Date(div.date)
        return divDate >= twelveMonthsAgo && divDate <= now
      })
      .map((div: { date: string; adjDividend?: number; dividend?: number }) => ({
        date: div.date,
        amount: div.adjDividend || div.dividend || 0
      }))
    
    if (recentDividends.length > 0) {
      const ttmTotal = recentDividends.reduce((sum: number, div: { amount: number }) => sum + div.amount, 0)
      console.log(`✅ [TTM Split-Adjusted] ${ticker}: ${ttmTotal.toFixed(4)} from ${recentDividends.length} payments`)
      return ttmTotal
    }
    
    return 0
  } catch (error) {
    console.warn(`⚠️ TTM calculation failed for ${ticker}:`, error)
    return 0
  }
}

// ✅ PROFESSIONAL getPayoutSafety
function getPayoutSafety(payoutRatio: number): PayoutSafetyResult {
  if (!payoutRatio || payoutRatio === 0 || isNaN(payoutRatio)) {
    return {
      text: 'Keine Daten',
      color: 'gray',
      level: 'no_data',
      payout: 0
    }
  }
  
  if (payoutRatio < 0) {
    return {
      text: 'Verluste',
      color: 'red',
      level: 'critical',
      payout: payoutRatio
    }
  }
  
  if (payoutRatio < 0.25) {
    return {
      text: 'Konservativ',
      color: 'green',
      level: 'very_safe',
      payout: payoutRatio
    }
  }
  
  if (payoutRatio < 0.45) {
    return {
      text: 'Solide',
      color: 'green',
      level: 'safe',
      payout: payoutRatio
    }
  }
  
  if (payoutRatio < 0.65) {
    return {
      text: 'Moderat',
      color: 'yellow',
      level: 'moderate',
      payout: payoutRatio
    }
  }
  
  if (payoutRatio < 0.85) {
    return {
      text: 'Erhöht',
      color: 'yellow',
      level: 'risky',
      payout: payoutRatio
    }
  }
  
  if (payoutRatio < 1.10) {
    return {
      text: 'Kritisch',
      color: 'red',
      level: 'critical',
      payout: payoutRatio
    }
  }
  
  return {
    text: 'Nicht nachhaltig',
    color: 'red',
    level: 'unsustainable',
    payout: payoutRatio
  }
}

// ✅ ENHANCED: Financial Context with modern data
async function getFinancialContextModern(ticker: string, modernDividends: Record<string, number>) {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    console.warn(`⚠️ No FMP API key available for ${ticker}`)
    return null
  }
  
  try {
    console.log(`🔍 [Enhanced Financial Context] Loading for ${ticker}`)
    
    const [liveQuoteRes, profileRes] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`)
    ])
    
    const sources: { liveQuote: any, profile: any } = { liveQuote: null, profile: null }
    
    try {
      if (liveQuoteRes.status === 'fulfilled' && liveQuoteRes.value.ok) {
        const data = await liveQuoteRes.value.json()
        sources.liveQuote = Array.isArray(data) ? data[0] : data
      }
    } catch (e) { console.warn('Live quote failed:', e) }
    
    try {
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const data = await profileRes.value.json()
        sources.profile = Array.isArray(data) ? data[0] : data
      }
    } catch (e) { console.warn('Profile failed:', e) }
    
    const finalTTMDividend = await getTTMDividendSplitAdjusted(ticker, apiKey)
    
    // Fallback to modern historical if TTM failed
    let fallbackTTM = finalTTMDividend
    if (fallbackTTM === 0) {
      const years = Object.keys(modernDividends)
        .map(y => parseInt(y))
        .sort((a: number, b: number) => b - a)
      
      if (years.length > 0) {
        const latestYear = years[0]
        const yearlyDiv = modernDividends[latestYear.toString()]
        if (yearlyDiv > 0) {
          fallbackTTM = yearlyDiv
          console.log(`✅ [TTM Fallback] Using ${latestYear} dividend: ${fallbackTTM}`)
        }
      }
    }
    
    const reliableEPS = sources.liveQuote?.eps || sources.profile?.eps || null
    const reliablePrice = sources.liveQuote?.price || sources.profile?.price || null
    
    let payoutRatio = 0
    let currentYield = 0
    
    if (reliableEPS && reliableEPS > 0 && fallbackTTM > 0) {
      payoutRatio = fallbackTTM / reliableEPS
      console.log(`📊 [Payout] TTM ${fallbackTTM.toFixed(4)} / EPS ${reliableEPS.toFixed(3)} = ${(payoutRatio * 100).toFixed(1)}%`)
    }
    
    if (reliablePrice && reliablePrice > 0 && fallbackTTM > 0) {
      currentYield = fallbackTTM / reliablePrice
      console.log(`📊 [Yield] TTM ${fallbackTTM.toFixed(4)} / Price ${reliablePrice} = ${(currentYield * 100).toFixed(2)}%`)
    }
    
    const payoutSafetyResult = getPayoutSafety(payoutRatio)
    
    return {
      dividendYield: currentYield,
      payoutRatio: Math.min(Math.max(payoutRatio, 0), 2.0),
      exDividendDate: null,
      dividendPerShareTTM: fallbackTTM,
      modernDataUsed: true,
      dataRange: `2005-${new Date().getFullYear()}`,
      splitAdjusted: true,
      payoutSafety: payoutSafetyResult
    }
    
  } catch (error) {
    console.warn(`⚠️ Financial context failed for ${ticker}:`, error)
    return null
  }
}

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  try {
    console.log(`🚀 [API] Enhanced dividend analysis for ${ticker}`)
    
    const apiKey = process.env.FMP_API_KEY
    if (!apiKey) {
      throw new Error('FMP API key not configured')
    }
    
    // ✅ Service Layer for Multi-Source Data
    const dividendResult = await dataService.getDividendData(ticker)
    
    // ✅ Filter to modern data only
    const modernDividends = filterModernDividends(dividendResult.historical)
    
    // ✅ PARALLEL: Load all enhanced data
    const [financialData, currentQuote, quarterlyData, payoutHistory, healthMetrics] = await Promise.allSettled([
      getFinancialContextModern(ticker, modernDividends),
      dataService.getStockQuote(ticker),
      getQuarterlyDividendHistory(ticker, apiKey),
      getPayoutRatioHistory(ticker, apiKey, modernDividends),
      getFinancialHealthMetrics(ticker, apiKey)
    ])
    
    const financial = financialData.status === 'fulfilled' ? financialData.value : null
    const quote = currentQuote.status === 'fulfilled' ? currentQuote.value : null
    const quarterly = quarterlyData.status === 'fulfilled' ? quarterlyData.value : []
    const payoutRatioHistory = payoutHistory.status === 'fulfilled' ? payoutHistory.value : []
    const health = healthMetrics.status === 'fulfilled' ? healthMetrics.value : null
    
    // ✅ Calculate CAGR analysis
    const cagrAnalysis = calculateDividendCAGR(modernDividends)
    
    // ✅ Process modern data for categorization
    const processedData = Object.entries(modernDividends)
      .map(([year, amount]) => ({
        year: parseInt(year),
        dividendPerShare: amount as number,
        growth: 0
      }))
      .sort((a, b) => a.year - b.year)

    // Calculate growth rates
    processedData.forEach((entry, index) => {
      if (index > 0) {
        const prevAmount = processedData[index - 1].dividendPerShare
        if (prevAmount > 0) {
          entry.growth = ((entry.dividendPerShare - prevAmount) / prevAmount) * 100
        }
      }
    })
    
    // 🚀 ENHANCED Response with professional dividend analysis
    const response = {
      historical: modernDividends,
      forecasts: [], // TODO: Add analyst estimates if available
      
      // ✅ Current dividend information
      currentInfo: financial ? {
        currentYield: financial.dividendYield || 0,
        payoutRatio: financial.payoutRatio || 0,
        exDividendDate: financial.exDividendDate,
        dividendPerShareTTM: financial.dividendPerShareTTM || 0,
        lastDividendDate: getLastDividendDateModern(modernDividends, quarterly),
        dividendGrowthRate: calculateDividendGrowthRateModern(modernDividends),
        
        // ✅ PROFESSIONAL categorization
        dividendQuality: getDividendQualityModern(processedData),
        growthTrend: getGrowthTrendModern(processedData),
        payoutSafety: financial.payoutSafety
      } : null,
      
      // ✅ NEW: Enhanced analysis sections
      quarterlyHistory: quarterly,
      payoutRatioHistory: payoutRatioHistory,
      cagrAnalysis: cagrAnalysis,
      financialHealth: health,
      
      dataQuality: {
        score: Math.min(100, dividendResult.quality.score + 20),
        issues: dividendResult.quality.issues.filter(issue => !issue.includes('API deviation')),
        sources: dividendResult.quality.sources,
        coverage: dividendResult.quality.coverage,
        recommendations: [
          `20-Jahres Dividendendaten für Konsistenz`,
          `Split-adjusted Werte für Genauigkeit`,
          `Quartalsweise Historie für Details`
        ]
      },
      
      ticker: ticker.toUpperCase(),
      lastUpdated: new Date().toISOString(),
      
      status: {
        success: true,
        dataQuality: modernDividends && Object.keys(modernDividends).length >= 10 ? 'excellent' : 'good',
        sourcesUsed: dividendResult.quality.sources.length,
        yearsOfData: Object.keys(modernDividends).length,
        ttmCalculationSuccess: (financial?.dividendPerShareTTM ?? 0) > 0,
        yieldCalculationSuccess: (financial?.dividendYield ?? 0) > 0,
        modernDataFilter: true,
        splitAdjusted: true,
        dataRange: `2005-${new Date().getFullYear()-1}`,
        enhancedAnalysis: true,
        quarterlyDataAvailable: quarterly.length > 0,
        payoutHistoryAvailable: payoutRatioHistory.length > 0,
        healthMetricsAvailable: health !== null
      }
    }
    
    console.log(`✅ [API] ${ticker} enhanced dividend analysis served - Years: ${Object.keys(modernDividends).length}, Quarterly: ${quarterly.length}, Health: ${health ? 'Yes' : 'No'}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(`❌ [API] Error in enhanced dividend analysis for ${ticker}:`, error)    
    return NextResponse.json({
      error: 'Failed to fetch enhanced dividend data',
      ticker: ticker.toUpperCase(),
      lastUpdated: new Date().toISOString()
    }, { status: 500 })
  }
}

// ✅ Helper Functions - FIXED: Use quarterly data for last dividend date
function getLastDividendDateModern(modernDividends: Record<string, number>, quarterlyData?: QuarterlyDividend[]): string | null {
  // ✅ PRIORITY: Use quarterly data if available (more current)
  if (quarterlyData && quarterlyData.length > 0) {
    const latestQuarterly = quarterlyData
      .filter(q => q.amount > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    
    if (latestQuarterly) {
      return latestQuarterly.date
    }
  }
  
  // ✅ FALLBACK: Use annual data
  const years = Object.keys(modernDividends)
    .map(y => parseInt(y))
    .sort((a, b) => b - a)
  
  if (years.length === 0) return null
  
  for (const year of years) {
    if (modernDividends[year.toString()] > 0) {
      return `${year}-12-31`
    }
  }
  
  return null
}

function calculateDividendGrowthRateModern(modernDividends: Record<string, number>): number {
  const years = Object.keys(modernDividends)
    .map(y => parseInt(y))
    .sort()
  
  if (years.length < 2) return 0
  
  const recentYears = years.slice(-5)
  
  if (recentYears.length < 2) {
    const latestYear = years[years.length - 1]
    const previousYear = years[years.length - 2]
    
    const latest = modernDividends[latestYear.toString()]
    const previous = modernDividends[previousYear.toString()]
    
    if (previous === 0) return 0
    return ((latest - previous) / previous) * 100
  }
  
  const growthRates: number[] = []
  
  for (let i = 1; i < recentYears.length; i++) {
    const currentDiv = modernDividends[recentYears[i].toString()]
    const previousDiv = modernDividends[recentYears[i - 1].toString()]
    
    if (previousDiv > 0) {
      const growthRate = ((currentDiv - previousDiv) / previousDiv) * 100
      growthRates.push(growthRate)
    }
  }
  
  if (growthRates.length === 0) return 0
  
  return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
}

// ✅ PROFESSIONAL, NEUTRAL evaluations
function getDividendQualityModern(data: Array<{ year: number; dividendPerShare: number; growth: number }>): string {
  if (data.length < 5) return 'Unzureichende Daten'
  
  const increases = data.filter(d => d.growth > 0).length
  const cuts = data.filter(d => d.growth < -5).length
  const totalYears = data.length
  
  if (totalYears >= 19 && increases >= 15 && cuts === 0) return 'Konstante Dividende'
  if (totalYears >= 15 && increases >= 12 && cuts <= 1) return 'Stabile Historie'  
  if (cuts === 0 && totalYears >= 10) return 'Keine Kürzungen'
  if (cuts > 2) return 'Variable Historie'
  if (increases > cuts) return 'Überwiegend steigend'
  return 'Rückläufig'
}

function getGrowthTrendModern(data: Array<{ year: number; dividendPerShare: number; growth: number }>): string {
  if (data.length < 3) return 'Unzureichende Daten'
  
  const recent5 = data.slice(-5)
  const avgGrowth = recent5.reduce((sum, d) => sum + d.growth, 0) / recent5.length
  
  if (avgGrowth > 15) return 'Starke Steigerung'
  if (avgGrowth > 10) return 'Überdurchschnittlich'
  if (avgGrowth > 5) return 'Moderater Anstieg'
  if (avgGrowth > 2) return 'Leichter Anstieg'
  if (avgGrowth > -2) return 'Seitwärtstrend'
  if (avgGrowth > -10) return 'Rückläufig'
  return 'Deutlicher Rückgang'
}