// src/app/api/growth/[ticker]/route.ts - Erweiterte Growth API
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

// CAGR Berechnung
function calculateCAGR(startValue: number, endValue: number, years: number): number | null {
  if (!startValue || startValue === 0 || !endValue || years <= 0) return null
  
  // Handle negative values properly
  if (startValue < 0 && endValue < 0) {
    // Both negative: calculate based on absolute values, then negate
    const cagr = (Math.pow(Math.abs(endValue / startValue), 1 / years) - 1) * 100
    return -cagr
  } else if (startValue < 0 && endValue > 0) {
    // Turnaround from loss to profit: return very high growth
    return 100
  } else if (startValue > 0 && endValue < 0) {
    // From profit to loss: return very negative growth
    return -100
  }
  
  const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100
  return isFinite(cagr) ? cagr : null
}

// YoY Growth Berechnung
function calculateYoYGrowth(currentValue: number, previousValue: number): number | null {
  if (!previousValue || previousValue === 0) return null
  
  const growth = ((currentValue - previousValue) / Math.abs(previousValue)) * 100
  return isFinite(growth) ? growth : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Lade multiple Datenquellen parallel
    const [
      incomeResponse,
      cashFlowResponse,
      balanceResponse,
      estimatesResponse,
      ratiosResponse
    ] = await Promise.all([
      // Income Statement für Revenue, EPS, EBITDA, Net Income, Operating Income
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=11&apikey=${FMP_API_KEY}`),
      // Cash Flow für FCF und CAPEX
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=annual&limit=11&apikey=${FMP_API_KEY}`),
      // Balance Sheet für Tangible Book Value
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=annual&limit=11&apikey=${FMP_API_KEY}`),
      // Analyst Estimates für Forward Growth
      fetch(`https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?limit=4&apikey=${FMP_API_KEY}`),
      // Financial Ratios für ROE
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?limit=11&apikey=${FMP_API_KEY}`)
    ])

    const [income, cashFlow, balance, estimates, ratios] = await Promise.all([
      incomeResponse.json(),
      cashFlowResponse.json(),
      balanceResponse.json(),
      estimatesResponse.json(),
      ratiosResponse.json()
    ])

    // Validierung
    if (!Array.isArray(income) || income.length < 2) {
      return NextResponse.json({
        ticker,
        growth: {},
        dataQuality: {
          hasIncomeData: false,
          hasGrowthData: false,
          hasEstimates: false,
          periods: 0
        },
        lastUpdated: new Date().toISOString()
      })
    }

    // Sortiere nach Datum (neueste zuerst)
    const sortedIncome = income.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const sortedCashFlow = Array.isArray(cashFlow) ? cashFlow.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ) : []
    const sortedBalance = Array.isArray(balance) ? balance.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ) : []
    const sortedRatios = Array.isArray(ratios) ? ratios.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ) : []

    // Berechne Growth Metriken
    const growth: any = {}

    // Revenue Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      growth.revenueGrowth1Y = calculateYoYGrowth(sortedIncome[0].revenue, sortedIncome[1].revenue)
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      growth.revenueGrowth3Y = calculateCAGR(sortedIncome[3].revenue, sortedIncome[0].revenue, 3)
    }
    if (sortedIncome[0] && sortedIncome[5]) {
      growth.revenueGrowth5Y = calculateCAGR(sortedIncome[5].revenue, sortedIncome[0].revenue, 5)
    }
    if (sortedIncome[0] && sortedIncome[10]) {
      growth.revenueGrowth10Y = calculateCAGR(sortedIncome[10].revenue, sortedIncome[0].revenue, 10)
    }

    // EPS Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      growth.epsGrowth1Y = calculateYoYGrowth(sortedIncome[0].epsdiluted, sortedIncome[1].epsdiluted)
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      growth.epsGrowth3Y = calculateCAGR(sortedIncome[3].epsdiluted, sortedIncome[0].epsdiluted, 3)
    }
    if (sortedIncome[0] && sortedIncome[5]) {
      growth.epsGrowth5Y = calculateCAGR(sortedIncome[5].epsdiluted, sortedIncome[0].epsdiluted, 5)
    }
    if (sortedIncome[0] && sortedIncome[10]) {
      growth.epsGrowth10Y = calculateCAGR(sortedIncome[10].epsdiluted, sortedIncome[0].epsdiluted, 10)
    }

    // EBITDA Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      growth.ebitdaGrowth1Y = calculateYoYGrowth(sortedIncome[0].ebitda, sortedIncome[1].ebitda)
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      growth.ebitdaGrowth3Y = calculateCAGR(sortedIncome[3].ebitda, sortedIncome[0].ebitda, 3)
    }

    // Net Income Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      growth.netIncomeGrowth1Y = calculateYoYGrowth(sortedIncome[0].netIncome, sortedIncome[1].netIncome)
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      growth.netIncomeGrowth3Y = calculateCAGR(sortedIncome[3].netIncome, sortedIncome[0].netIncome, 3)
    }

    // Operating Income Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      growth.operatingIncomeGrowth1Y = calculateYoYGrowth(sortedIncome[0].operatingIncome, sortedIncome[1].operatingIncome)
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      growth.operatingIncomeGrowth3Y = calculateCAGR(sortedIncome[3].operatingIncome, sortedIncome[0].operatingIncome, 3)
    }

    // FCF Growth (aus Cash Flow Statement)
    if (sortedCashFlow.length >= 2) {
      const fcf0 = sortedCashFlow[0].freeCashFlow || (sortedCashFlow[0].operatingCashFlow - Math.abs(sortedCashFlow[0].capitalExpenditure))
      const fcf1 = sortedCashFlow[1].freeCashFlow || (sortedCashFlow[1].operatingCashFlow - Math.abs(sortedCashFlow[1].capitalExpenditure))
      growth.fcfGrowth1Y = calculateYoYGrowth(fcf0, fcf1)
    }
    if (sortedCashFlow.length >= 4) {
      const fcf0 = sortedCashFlow[0].freeCashFlow || (sortedCashFlow[0].operatingCashFlow - Math.abs(sortedCashFlow[0].capitalExpenditure))
      const fcf3 = sortedCashFlow[3].freeCashFlow || (sortedCashFlow[3].operatingCashFlow - Math.abs(sortedCashFlow[3].capitalExpenditure))
      growth.fcfGrowth3Y = calculateCAGR(fcf3, fcf0, 3)
    }

    // CAPEX Growth
    if (sortedCashFlow.length >= 2) {
      growth.capexGrowth1Y = calculateYoYGrowth(
        Math.abs(sortedCashFlow[0].capitalExpenditure), 
        Math.abs(sortedCashFlow[1].capitalExpenditure)
      )
    }
    if (sortedCashFlow.length >= 4) {
      growth.capexGrowth3Y = calculateCAGR(
        Math.abs(sortedCashFlow[3].capitalExpenditure), 
        Math.abs(sortedCashFlow[0].capitalExpenditure), 
        3
      )
    }

    // Tangible Book Value Growth
    if (sortedBalance.length >= 2) {
      const tbv0 = sortedBalance[0].totalEquity - (sortedBalance[0].goodwill || 0) - (sortedBalance[0].intangibleAssets || 0)
      const tbv1 = sortedBalance[1].totalEquity - (sortedBalance[1].goodwill || 0) - (sortedBalance[1].intangibleAssets || 0)
      growth.tangibleBookValueGrowth1Y = calculateYoYGrowth(tbv0, tbv1)
    }
    if (sortedBalance.length >= 4) {
      const tbv0 = sortedBalance[0].totalEquity - (sortedBalance[0].goodwill || 0) - (sortedBalance[0].intangibleAssets || 0)
      const tbv3 = sortedBalance[3].totalEquity - (sortedBalance[3].goodwill || 0) - (sortedBalance[3].intangibleAssets || 0)
      growth.tangibleBookValueGrowth3Y = calculateCAGR(tbv3, tbv0, 3)
    }

    // Dividend Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      const dps0 = sortedIncome[0].dividendsPaid / sortedIncome[0].weightedAverageShsOut
      const dps1 = sortedIncome[1].dividendsPaid / sortedIncome[1].weightedAverageShsOut
      if (dps0 && dps1) {
        growth.dividendGrowth1Y = calculateYoYGrowth(Math.abs(dps0), Math.abs(dps1))
      }
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      const dps0 = sortedIncome[0].dividendsPaid / sortedIncome[0].weightedAverageShsOut
      const dps3 = sortedIncome[3].dividendsPaid / sortedIncome[3].weightedAverageShsOut
      if (dps0 && dps3) {
        growth.dividendGrowth3Y = calculateCAGR(Math.abs(dps3), Math.abs(dps0), 3)
      }
    }

    // ROE Growth
    if (sortedRatios.length >= 2) {
      growth.roeGrowth1Y = calculateYoYGrowth(sortedRatios[0].returnOnEquity, sortedRatios[1].returnOnEquity)
    }
    if (sortedRatios.length >= 4) {
      growth.roeGrowth3Y = calculateCAGR(sortedRatios[3].returnOnEquity, sortedRatios[0].returnOnEquity, 3)
    }

    // Forward Growth aus Analyst Estimates
    if (Array.isArray(estimates) && estimates.length > 0) {
      const currentYear = new Date().getFullYear()
      const currentEstimate = estimates.find(e => 
        new Date(e.date).getFullYear() === currentYear
      )
      const nextYearEstimate = estimates.find(e => 
        new Date(e.date).getFullYear() === currentYear + 1
      )
      const twoYearEstimate = estimates.find(e => 
        new Date(e.date).getFullYear() === currentYear + 2
      )

      // Revenue Forward Growth
      if (currentEstimate && twoYearEstimate) {
        growth.revenueGrowthForward2Y = calculateCAGR(
          currentEstimate.estimatedRevenueAvg,
          twoYearEstimate.estimatedRevenueAvg,
          2
        )
      }

      // EPS Forward Growth
      if (currentEstimate && twoYearEstimate) {
        growth.epsGrowthForward2Y = calculateCAGR(
          currentEstimate.estimatedEpsAvg,
          twoYearEstimate.estimatedEpsAvg,
          2
        )
      }

      // Long-term EPS Growth (3-5 Jahre)
      const threeYearEstimate = estimates.find(e => 
        new Date(e.date).getFullYear() === currentYear + 3
      )
      if (currentEstimate && threeYearEstimate) {
        growth.epsGrowthLongTerm = calculateCAGR(
          currentEstimate.estimatedEpsAvg,
          threeYearEstimate.estimatedEpsAvg,
          3
        )
      }
    }

    // Berechne Datenqualität
    const dataQuality = {
      hasIncomeData: sortedIncome.length > 0,
      hasGrowthData: Object.keys(growth).length > 0,
      hasEstimates: Array.isArray(estimates) && estimates.length > 0,
      periods: Math.min(sortedIncome.length, 10)
    }

    // Response
    return NextResponse.json({
      ticker,
      growth,
      dataQuality,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching growth data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch growth data' },
      { status: 500 }
    )
  }
}