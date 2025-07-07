// src/app/api/growth/[ticker]/route.ts
import { NextResponse } from 'next/server'

interface GrowthData {
  revenueGrowth1Y?: number | null
  revenueGrowth3Y?: number | null  
  revenueGrowth5Y?: number | null
  revenueGrowth10Y?: number | null
  epsGrowth1Y?: number | null
  epsGrowth3Y?: number | null
  epsGrowth5Y?: number | null
  epsGrowth10Y?: number | null
  ebitdaGrowth1Y?: number | null
  ebitdaGrowth3Y?: number | null
  fcfGrowth1Y?: number | null
  fcfGrowth3Y?: number | null
  revenueGrowthForward2Y?: number | null
  epsGrowthForward2Y?: number | null
  epsGrowthLongTerm?: number | null
}

// Berechnet CAGR (Compound Annual Growth Rate)
function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
}

// Berechnet YoY Growth Rate
function calculateYoY(current: number, previous: number): number {
  if (previous <= 0) return 0
  return ((current - previous) / Math.abs(previous)) * 100
}

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
    console.log(`🚀 [Growth] Loading growth data for ${ticker}`)

    // Parallel API calls für bessere Performance
    const [incomeRes, growthRes, estimatesRes] = await Promise.allSettled([
      // Income Statements für manuelle CAGR Berechnung
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=10&apikey=${apiKey}`),
      // Financial Growth Ratios (wenn verfügbar)
      fetch(`https://financialmodelingprep.com/api/v3/financial-growth/${ticker}?limit=5&apikey=${apiKey}`),
      // Analyst Estimates für Forward Growth
      fetch(`https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?limit=5&apikey=${apiKey}`)
    ])

    let incomeData: any[] = []
    let growthData: any[] = []
    let estimatesData: any[] = []

    // Income Statement Data
    if (incomeRes.status === 'fulfilled' && incomeRes.value.ok) {
      incomeData = await incomeRes.value.json()
    }

    // Growth Data (FMP's calculated ratios)
    if (growthRes.status === 'fulfilled' && growthRes.value.ok) {
      growthData = await growthRes.value.json()
    }

    // Estimates Data
    if (estimatesRes.status === 'fulfilled' && estimatesRes.value.ok) {
      estimatesData = await estimatesRes.value.json()
    }

    console.log(`📊 [Growth] Data loaded: income=${incomeData.length}, growth=${growthData.length}, estimates=${estimatesData.length}`)

    // ✅ BERECHNUNG DER GROWTH RATES
    const result: GrowthData = {}

    // 1) Verwende FMP Growth Data wenn verfügbar
    if (growthData.length > 0) {
      const latest = growthData[0]
      result.revenueGrowth1Y = latest.revenueGrowth * 100 || null
      result.epsGrowth1Y = latest.epsgrowth * 100 || null
      result.ebitdaGrowth1Y = latest.ebitgrowth * 100 || null
      result.fcfGrowth1Y = latest.freeCashFlowGrowth * 100 || null
    }

    // 2) Manuelle CAGR Berechnung aus Income Statements
    if (incomeData.length >= 3) {
      const sortedData = incomeData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      const current = sortedData[0]
      const oneYearAgo = sortedData[1]
      const threeYearsAgo = sortedData[3]
      const fiveYearsAgo = sortedData[5]
      const tenYearsAgo = sortedData[9]

      // Revenue Growth
      if (oneYearAgo && current.revenue && oneYearAgo.revenue) {
        result.revenueGrowth1Y = result.revenueGrowth1Y || calculateYoY(current.revenue, oneYearAgo.revenue)
      }
      
      if (threeYearsAgo && current.revenue && threeYearsAgo.revenue) {
        result.revenueGrowth3Y = calculateCAGR(threeYearsAgo.revenue, current.revenue, 3)
      }
      
      if (fiveYearsAgo && current.revenue && fiveYearsAgo.revenue) {
        result.revenueGrowth5Y = calculateCAGR(fiveYearsAgo.revenue, current.revenue, 5)
      }
      
      if (tenYearsAgo && current.revenue && tenYearsAgo.revenue) {
        result.revenueGrowth10Y = calculateCAGR(tenYearsAgo.revenue, current.revenue, 10)
      }

      // EPS Growth  
      if (oneYearAgo && current.eps && oneYearAgo.eps && oneYearAgo.eps !== 0) {
        result.epsGrowth1Y = result.epsGrowth1Y || calculateYoY(current.eps, oneYearAgo.eps)
      }
      
      if (threeYearsAgo && current.eps && threeYearsAgo.eps && threeYearsAgo.eps > 0) {
        result.epsGrowth3Y = calculateCAGR(threeYearsAgo.eps, current.eps, 3)
      }
      
      if (fiveYearsAgo && current.eps && fiveYearsAgo.eps && fiveYearsAgo.eps > 0) {
        result.epsGrowth5Y = calculateCAGR(fiveYearsAgo.eps, current.eps, 5)
      }
      
      if (tenYearsAgo && current.eps && tenYearsAgo.eps && tenYearsAgo.eps > 0) {
        result.epsGrowth10Y = calculateCAGR(tenYearsAgo.eps, current.eps, 10)
      }

      // EBITDA Growth
      if (threeYearsAgo && current.ebitda && threeYearsAgo.ebitda && threeYearsAgo.ebitda > 0) {
        result.ebitdaGrowth3Y = calculateCAGR(threeYearsAgo.ebitda, current.ebitda, 3)
      }
    }

    // 3) Forward Growth aus Analyst Estimates
    if (estimatesData.length >= 2) {
      const currentYear = new Date().getFullYear()
      const nextYear = estimatesData.find(e => parseInt(e.date.slice(0, 4)) === currentYear + 1)
      const yearAfter = estimatesData.find(e => parseInt(e.date.slice(0, 4)) === currentYear + 2)
      const currentEst = estimatesData.find(e => parseInt(e.date.slice(0, 4)) === currentYear)

      // Revenue Forward Growth
      if (currentEst && nextYear && currentEst.estimatedRevenueAvg && nextYear.estimatedRevenueAvg) {
        result.revenueGrowthForward2Y = calculateYoY(nextYear.estimatedRevenueAvg, currentEst.estimatedRevenueAvg)
      }

      // EPS Forward Growth
      if (currentEst && nextYear && currentEst.estimatedEpsAvg && nextYear.estimatedEpsAvg && currentEst.estimatedEpsAvg > 0) {
        result.epsGrowthForward2Y = calculateYoY(nextYear.estimatedEpsAvg, currentEst.estimatedEpsAvg)
      }

      // Long-term EPS Growth (if available)
      if (currentEst && yearAfter && currentEst.estimatedEpsAvg && yearAfter.estimatedEpsAvg && currentEst.estimatedEpsAvg > 0) {
        result.epsGrowthLongTerm = calculateCAGR(currentEst.estimatedEpsAvg, yearAfter.estimatedEpsAvg, 2)
      }
    }

    console.log(`✅ [Growth] Calculated growth rates for ${ticker}:`, {
      revenue3Y: result.revenueGrowth3Y?.toFixed(1),
      eps3Y: result.epsGrowth3Y?.toFixed(1),
      revenueFwd: result.revenueGrowthForward2Y?.toFixed(1)
    })

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      growth: result,
      dataQuality: {
        hasIncomeData: incomeData.length > 0,
        hasGrowthData: growthData.length > 0,
        hasEstimates: estimatesData.length > 0,
        periods: incomeData.length
      },
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error(`❌ [Growth] Error for ${ticker}:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch growth data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}