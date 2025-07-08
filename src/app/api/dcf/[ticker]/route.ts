// src/app/api/dcf/[ticker]/route.ts - FIXED: Direct Cash Flow Statement Access
import { NextResponse } from 'next/server'

// ✅ TypeScript Interfaces
interface DCFAssumptions {
  revenueGrowthY1: number
  revenueGrowthY2: number
  revenueGrowthY3: number
  revenueGrowthY4: number
  revenueGrowthY5: number
  terminalGrowthRate: number
  discountRate: number
  operatingMargin: number
  taxRate: number
  capexAsRevenuePercent: number
  workingCapitalChange: number
  netCash: number
}

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

// ✅ FIXED: Direct FMP Cash Flow Statement Access (Same as FinancialsPage)
async function extractReliableFCF(ticker: string, apiKey: string): Promise<any> {
  console.log(`🔍 [DCF] Extracting FCF for ${ticker} using DIRECT FMP Cash Flow Statement`)
  
  try {
    // ✅ DIRECT FMP API CALL - Same as FinancialsPage
    const cashflowResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=annual&limit=1&apikey=${apiKey}`
    )
    
    if (!cashflowResponse.ok) {
      throw new Error(`FMP Cash Flow Statement failed: ${cashflowResponse.status}`)
    }
    
    const cashflowData = await cashflowResponse.json()
    
    if (!cashflowData || cashflowData.length === 0) {
      console.warn(`⚠️ [DCF] No annual cashflow data for ${ticker}`)
      return await fallbackFCFExtraction(ticker, apiKey)
    }
    
    // Get latest Annual FCF - EXACTLY like FinancialsPage
    const latestCashflow = cashflowData[0] // Most recent annual
    const fcfValue = latestCashflow.freeCashFlow
    
    if (!fcfValue || Math.abs(fcfValue) < 1000000) {
      console.warn(`⚠️ [DCF] Invalid FCF from annual statement for ${ticker}: ${fcfValue}`)
      return await fallbackFCFExtraction(ticker, apiKey)
    }
    
    console.log(`✅ [DCF] Found ANNUAL FCF for ${ticker}: $${(fcfValue / 1_000_000).toFixed(1)}M (${latestCashflow.date})`)
    
    return {
      source: 'annual-cashflow-statement',
      value: fcfValue,
      date: latestCashflow.date,
      description: 'Annual Cash Flow Statement (FMP Premium)',
      isEstimated: false,
      rawData: latestCashflow
    }
    
  } catch (error) {
    console.error(`❌ [DCF] Annual Cash Flow Statement failed for ${ticker}:`, error)
    return await fallbackFCFExtraction(ticker, apiKey)
  }
}

// ✅ FALLBACK FCF EXTRACTION (Unchanged)
async function fallbackFCFExtraction(ticker: string, apiKey: string): Promise<any> {
  console.log(`🔍 [DCF] Using fallback FCF extraction for ${ticker}`)
  
  try {
    // Try TTM Key Metrics as fallback
    const keyMetricsRes = await fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${apiKey}`)
    if (keyMetricsRes.ok) {
      const keyMetricsData = await keyMetricsRes.json()
      const keyMetrics = Array.isArray(keyMetricsData) ? keyMetricsData[0] : keyMetricsData
      
      if (keyMetrics?.freeCashFlowTTM && Math.abs(keyMetrics.freeCashFlowTTM) > 1000000) {
        console.log(`⚠️ [DCF] Using TTM FCF fallback for ${ticker}: $${(keyMetrics.freeCashFlowTTM / 1_000_000).toFixed(1)}M`)
        return {
          source: 'ttm-keymetrics-fallback',
          value: keyMetrics.freeCashFlowTTM,
          date: 'TTM',
          description: 'TTM Key Metrics (Fallback)',
          isEstimated: true // Mark as potentially different from annual
        }
      }
    }
  } catch (e) {
    console.warn('TTM Key Metrics fallback failed:', e)
  }

  // Final fallback - estimate
  try {
    const incomeRes = await fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=1&apikey=${apiKey}`)
    if (incomeRes.ok) {
      const incomeData = await incomeRes.json()
      const latestIncome = Array.isArray(incomeData) ? incomeData[0] : incomeData
      
      if (latestIncome?.revenue) {
        const estimatedFCF = latestIncome.revenue * 0.08
        console.warn(`⚠️ [DCF] Using estimated FCF for ${ticker}: $${(estimatedFCF / 1_000_000).toFixed(1)}M`)
        return {
          source: 'estimated-fallback',
          value: estimatedFCF,
          date: latestIncome.date,
          description: 'Geschätzt (8% vom Umsatz)',
          isEstimated: true
        }
      }
    }
  } catch (e) {
    console.error('Revenue estimation failed:', e)
  }

  return {
    source: 'unavailable',
    value: 0,
    date: 'Unknown',
    description: 'Keine FCF-Daten verfügbar',
    isEstimated: true
  }
}

// ✅ VALIDATION FUNCTIONS (Unchanged)
function validateDCFAssumptions(assumptions: DCFAssumptions): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (assumptions.discountRate <= assumptions.terminalGrowthRate) {
    errors.push({
      field: 'terminalGrowthRate',
      message: 'WACC muss höher sein als Terminal-Wachstumsrate',
      severity: 'error'
    })
  }
  
  if (assumptions.terminalGrowthRate > 4.0) {
    errors.push({
      field: 'terminalGrowthRate',
      message: 'Terminal-Wachstumsrate über 4% ist unrealistisch',
      severity: 'warning'
    })
  }
  
  if (assumptions.discountRate < 5 || assumptions.discountRate > 20) {
    errors.push({
      field: 'discountRate',
      message: 'WACC sollte zwischen 5% und 20% liegen',
      severity: 'warning'
    })
  }
  
  return errors
}

function getSectorSpecificLimits(sector: string) {
  const sectorLimits = {
    'Technology': {
      maxGrowthY1: 25,
      maxTerminalGrowth: 3.5,
      maxOperatingMargin: 35,
      typicalCapexPercent: 3.5
    },
    'Consumer Discretionary': {
      maxGrowthY1: 20,
      maxTerminalGrowth: 3.0,
      maxOperatingMargin: 25,
      typicalCapexPercent: 4.5
    },
    'Healthcare': {
      maxGrowthY1: 15,
      maxTerminalGrowth: 3.0,
      maxOperatingMargin: 30,
      typicalCapexPercent: 4.0
    },
    'Financials': {
      maxGrowthY1: 12,
      maxTerminalGrowth: 2.5,
      maxOperatingMargin: 30,
      typicalCapexPercent: 1.0
    },
    'Utilities': {
      maxGrowthY1: 8,
      maxTerminalGrowth: 2.0,
      maxOperatingMargin: 20,
      typicalCapexPercent: 15.0
    },
    'Energy': {
      maxGrowthY1: 15,
      maxTerminalGrowth: 2.5,
      maxOperatingMargin: 25,
      typicalCapexPercent: 12.0
    }
  }
  
  return sectorLimits[sector as keyof typeof sectorLimits] || {
    maxGrowthY1: 20,
    maxTerminalGrowth: 3.0,
    maxOperatingMargin: 25,
    typicalCapexPercent: 5.0
  }
}

function generateSmartAssumptions(
  historicalGrowth: number,
  historicalMargin: number,
  estimatedWACC: number,
  sector: string,
  marketCap: number
): DCFAssumptions {
  const sectorLimits = getSectorSpecificLimits(sector)
  
  // Size-based adjustments
  const isLargeCap = marketCap > 100_000_000_000 // > 100B
  const isMegaCap = marketCap > 500_000_000_000  // > 500B
  
  // Growth rate calculation with size and sector constraints
  let baseGrowth = Math.max(historicalGrowth, 3.0)
  
  if (isMegaCap) {
    baseGrowth = Math.min(baseGrowth, sectorLimits.maxGrowthY1 * 0.7)
  } else if (isLargeCap) {
    baseGrowth = Math.min(baseGrowth, sectorLimits.maxGrowthY1 * 0.85)
  } else {
    baseGrowth = Math.min(baseGrowth, sectorLimits.maxGrowthY1)
  }
  
  // Declining growth rates
  const year1 = Math.round(baseGrowth * 10) / 10
  const year2 = Math.round(Math.max(baseGrowth * 0.85, 2.0) * 10) / 10
  const year3 = Math.round(Math.max(baseGrowth * 0.7, 1.5) * 10) / 10
  const year4 = Math.round(Math.max(baseGrowth * 0.55, 1.0) * 10) / 10
  const year5 = Math.round(Math.max(baseGrowth * 0.4, 0.5) * 10) / 10
  
  // Terminal growth rate
  const terminalGrowth = Math.min(
    sectorLimits.maxTerminalGrowth,
    Math.max(estimatedWACC - 1.0, 2.0)
  )
  
  // Operating margin (slight improvement over historical)
  const operatingMargin = Math.min(
    historicalMargin * 1.05,
    sectorLimits.maxOperatingMargin
  )
  
  return {
    revenueGrowthY1: year1,
    revenueGrowthY2: year2,
    revenueGrowthY3: year3,
    revenueGrowthY4: year4,
    revenueGrowthY5: year5,
    terminalGrowthRate: Math.round(terminalGrowth * 10) / 10,
    discountRate: Math.round(estimatedWACC * 10) / 10,
    operatingMargin: Math.round(operatingMargin * 10) / 10,
    taxRate: 21.0,
    capexAsRevenuePercent: Math.round(sectorLimits.typicalCapexPercent * 10) / 10,
    workingCapitalChange: 0.5,
    netCash: 0 // Will be set later
  }
}

// ✅ MAIN API ROUTE - FIXED FCF EXTRACTION
export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' }, 
      { status: 500 }
    )
  }

  try {
    console.log(`🚀 [DCF] Loading DCF data for ${ticker} using DIRECT FMP Annual Cash Flow Statement`)

    // ✅ STEP 1: Extract REAL Annual FCF using DIRECT FMP API
    const fcfData = await extractReliableFCF(ticker, apiKey)
    console.log(`📊 [DCF] FCF Source for ${ticker}:`, {
      source: fcfData.source,
      value: fcfData.value,
      isEstimated: fcfData.isEstimated,
      date: fcfData.date
    })

    // ✅ STEP 2: Fetch other company data (Unchanged)
    const [
      incomeResponse,
      balanceResponse,
      quoteResponse,
      profileResponse,
      keyMetricsResponse
    ] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=5&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=1&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${apiKey}`)
    ])

    // Parse responses (Unchanged)
    const data: any = {}

    try {
      if (incomeResponse.status === 'fulfilled' && incomeResponse.value.ok) {
        data.income = await incomeResponse.value.json()
      }
    } catch (e) { console.warn('Income statement failed:', e) }

    try {
      if (balanceResponse.status === 'fulfilled' && balanceResponse.value.ok) {
        data.balance = await balanceResponse.value.json()
      }
    } catch (e) { console.warn('Balance sheet failed:', e) }

    try {
      if (quoteResponse.status === 'fulfilled' && quoteResponse.value.ok) {
        const quoteData = await quoteResponse.value.json()
        data.quote = Array.isArray(quoteData) ? quoteData[0] : quoteData
      }
    } catch (e) { console.warn('Quote failed:', e) }

    try {
      if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
        const profileData = await profileResponse.value.json()
        data.profile = Array.isArray(profileData) ? profileData[0] : profileData
      }
    } catch (e) { console.warn('Profile failed:', e) }

    try {
      if (keyMetricsResponse.status === 'fulfilled' && keyMetricsResponse.value.ok) {
        const keyMetricsData = await keyMetricsResponse.value.json()
        data.keyMetrics = Array.isArray(keyMetricsData) ? keyMetricsData[0] : keyMetricsData
      }
    } catch (e) { console.warn('Key metrics failed:', e) }

    // ✅ STEP 3: Extract and calculate metrics (Unchanged)
    const latestIncome = data.income?.[0] || {}
    const latestBalance = data.balance?.[0] || {}
    const currentQuote = data.quote || {}
    const companyProfile = data.profile || {}
    const keyMetrics = data.keyMetrics || {}

    // Calculate historical metrics
    const revenueHistory = data.income?.slice(0, 5) || []
    let avgRevenueGrowth = 8.0 // default fallback
    
    if (revenueHistory.length >= 4) {
      const growthRates: number[] = []
      for (let i = 1; i < Math.min(revenueHistory.length, 5); i++) {
        const current = revenueHistory[i - 1].revenue
        const previous = revenueHistory[i].revenue
        if (previous > 0) {
          growthRates.push(((current - previous) / previous) * 100)
        }
      }
      if (growthRates.length > 0) {
        avgRevenueGrowth = growthRates.reduce((sum: number, rate: number) => sum + rate, 0) / growthRates.length
      }
    }

    const avgOperatingMargin = latestIncome.operatingIncomeRatio 
      ? latestIncome.operatingIncomeRatio * 100 
      : latestIncome.operatingIncome && latestIncome.revenue 
        ? (latestIncome.operatingIncome / latestIncome.revenue * 100) 
        : 15.0

    // Calculate WACC
    const beta = companyProfile.beta || keyMetrics.beta || 1.0
    const riskFreeRate = 4.5 // Current 10Y Treasury
    const marketRiskPremium = 6.0
    const estimatedWACC = Math.max(riskFreeRate + (beta * marketRiskPremium), 8.0)

    // Calculate net cash position
    const cash = latestBalance.cashAndCashEquivalents || 0
    const totalDebt = latestBalance.totalDebt || 0
    const netCashPosition = cash - totalDebt

    // Company characteristics
    const sector = companyProfile.sector || 'Technology'
    const marketCap = currentQuote.marketCap || (currentQuote.price * currentQuote.sharesOutstanding) || 0
    
    // ✅ STEP 4: Generate smart assumptions (Unchanged)
    const smartAssumptions = generateSmartAssumptions(
      avgRevenueGrowth,
      avgOperatingMargin,
      estimatedWACC,
      sector,
      marketCap
    )

    // Final assumptions with overrides
    const finalAssumptions: DCFAssumptions = {
      ...smartAssumptions,
      taxRate: latestIncome.incomeTaxExpenseRatio ? 
        Math.round(latestIncome.incomeTaxExpenseRatio * 100 * 10) / 10 : 21.0,
      netCash: Math.round(netCashPosition / 1_000_000)
    }

    // ✅ STEP 5: Validate assumptions (Unchanged)
    const validationErrors = validateDCFAssumptions(finalAssumptions)
    const hasErrors = validationErrors.some(error => error.severity === 'error')

    if (hasErrors) {
      console.warn(`⚠️ [DCF] Validation errors for ${ticker}:`, validationErrors)
      
      // Auto-fix critical errors
      if (finalAssumptions.discountRate <= finalAssumptions.terminalGrowthRate) {
        finalAssumptions.terminalGrowthRate = Math.min(
          finalAssumptions.discountRate - 1.0,
          2.5
        )
        console.log(`🔧 [DCF] Auto-fixed terminal growth rate for ${ticker}`)
      }
    }

    // ✅ STEP 6: Build final response with REAL ANNUAL FCF
    const currentFCFMillions = fcfData.value / 1_000_000

    const dcfData = {
      // Current financials (in millions) - USING REAL ANNUAL FCF
      currentRevenue: (latestIncome.revenue || 0) / 1_000_000,
      currentOperatingIncome: (latestIncome.operatingIncome || 0) / 1_000_000,
      currentFreeCashFlow: currentFCFMillions, // ✅ REAL ANNUAL FCF!
      currentShares: (latestBalance.commonStockSharesOutstanding || 
                     currentQuote.sharesOutstanding || 
                     keyMetrics.sharesOutstanding || 0) / 1_000_000,
      
      // Market data
      currentPrice: currentQuote.price || 0,
      marketCap: marketCap,
      
      // Smart assumptions
      assumptions: finalAssumptions,

      // Historical context
      historical: {
        avgRevenueGrowth: Math.round(avgRevenueGrowth * 10) / 10,
        avgOperatingMargin: Math.round(avgOperatingMargin * 10) / 10,
        estimatedWACC: Math.round(estimatedWACC * 10) / 10
      },

      // Company info
      companyInfo: {
        name: companyProfile.companyName || ticker,
        sector: sector,
        industry: companyProfile.industry || 'Unknown'
      },

      // ✅ ENHANCED DATA QUALITY TRACKING - Shows Annual vs TTM
      dataQuality: {
        hasIncomeData: !!data.income && data.income.length > 0,
        hasBalanceData: !!data.balance && data.balance.length > 0,
        hasCurrentQuote: !!currentQuote.price,
        yearsOfData: revenueHistory.length,
        
        // FCF source tracking - CLEAR ANNUAL vs TTM distinction
        fcfDataSource: fcfData.source,
        fcfIsEstimated: fcfData.isEstimated,
        fcfSourceDescription: fcfData.description,
        fcfValue: fcfData.value,
        fcfDate: fcfData.date,
        fcfDataType: fcfData.source.includes('annual') ? 'Annual (like FinancialsPage)' : 
                    fcfData.source.includes('ttm') ? 'TTM (last 12 months)' : 'Other',
        
        validationErrors: validationErrors,
        hasValidationErrors: hasErrors
      },

      // Metadata
      generatedAt: new Date().toISOString(),
      version: '6.0-direct-annual-fcf'
    }

    console.log(`✅ [DCF] Complete DCF data for ${ticker}:`, {
      currentFCF: dcfData.currentFreeCashFlow,
      fcfSource: fcfData.source,
      fcfDataType: dcfData.dataQuality.fcfDataType,
      isEstimated: fcfData.isEstimated,
      revenue: dcfData.currentRevenue,
      assumptions: finalAssumptions
    })

    return NextResponse.json(dcfData)

  } catch (error) {
    console.error(`❌ [DCF] Error loading DCF data for ${ticker}:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to load DCF data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// ✅ POST endpoint for assumptions validation (Unchanged)
export async function POST(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const { assumptions } = await req.json()
    const validationErrors = validateDCFAssumptions(assumptions)
    
    return NextResponse.json({
      isValid: !validationErrors.some(error => error.severity === 'error'),
      errors: validationErrors.filter(error => error.severity === 'error'),
      warnings: validationErrors.filter(error => error.severity === 'warning'),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate assumptions' },
      { status: 400 }
    )
  }
}