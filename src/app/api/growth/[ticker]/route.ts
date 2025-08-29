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
    if (sortedIncome[0] && sortedIncome[5]) {
      growth.ebitdaGrowth5Y = calculateCAGR(sortedIncome[5].ebitda, sortedIncome[0].ebitda, 5)
    }
    if (sortedIncome[0] && sortedIncome[10]) {
      growth.ebitdaGrowth10Y = calculateCAGR(sortedIncome[10].ebitda, sortedIncome[0].ebitda, 10)
    }

    // Net Income Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      growth.netIncomeGrowth1Y = calculateYoYGrowth(sortedIncome[0].netIncome, sortedIncome[1].netIncome)
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      growth.netIncomeGrowth3Y = calculateCAGR(sortedIncome[3].netIncome, sortedIncome[0].netIncome, 3)
    }
    if (sortedIncome[0] && sortedIncome[5]) {
      growth.netIncomeGrowth5Y = calculateCAGR(sortedIncome[5].netIncome, sortedIncome[0].netIncome, 5)
    }
    if (sortedIncome[0] && sortedIncome[10]) {
      growth.netIncomeGrowth10Y = calculateCAGR(sortedIncome[10].netIncome, sortedIncome[0].netIncome, 10)
    }

    // Operating Income Growth
    if (sortedIncome[0] && sortedIncome[1]) {
      growth.operatingIncomeGrowth1Y = calculateYoYGrowth(sortedIncome[0].operatingIncome, sortedIncome[1].operatingIncome)
    }
    if (sortedIncome[0] && sortedIncome[3]) {
      growth.operatingIncomeGrowth3Y = calculateCAGR(sortedIncome[3].operatingIncome, sortedIncome[0].operatingIncome, 3)
    }
    if (sortedIncome[0] && sortedIncome[5]) {
      growth.operatingIncomeGrowth5Y = calculateCAGR(sortedIncome[5].operatingIncome, sortedIncome[0].operatingIncome, 5)
    }
    if (sortedIncome[0] && sortedIncome[10]) {
      growth.operatingIncomeGrowth10Y = calculateCAGR(sortedIncome[10].operatingIncome, sortedIncome[0].operatingIncome, 10)
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
    if (sortedCashFlow.length >= 6) {
      const fcf0 = sortedCashFlow[0].freeCashFlow || (sortedCashFlow[0].operatingCashFlow - Math.abs(sortedCashFlow[0].capitalExpenditure))
      const fcf5 = sortedCashFlow[5].freeCashFlow || (sortedCashFlow[5].operatingCashFlow - Math.abs(sortedCashFlow[5].capitalExpenditure))
      growth.fcfGrowth5Y = calculateCAGR(fcf5, fcf0, 5)
    }
    if (sortedCashFlow.length >= 11) {
      const fcf0 = sortedCashFlow[0].freeCashFlow || (sortedCashFlow[0].operatingCashFlow - Math.abs(sortedCashFlow[0].capitalExpenditure))
      const fcf10 = sortedCashFlow[10].freeCashFlow || (sortedCashFlow[10].operatingCashFlow - Math.abs(sortedCashFlow[10].capitalExpenditure))
      growth.fcfGrowth10Y = calculateCAGR(fcf10, fcf0, 10)
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
    if (sortedCashFlow.length >= 6) {
      growth.capexGrowth5Y = calculateCAGR(
        Math.abs(sortedCashFlow[5].capitalExpenditure), 
        Math.abs(sortedCashFlow[0].capitalExpenditure), 
        5
      )
    }
    if (sortedCashFlow.length >= 11) {
      growth.capexGrowth10Y = calculateCAGR(
        Math.abs(sortedCashFlow[10].capitalExpenditure), 
        Math.abs(sortedCashFlow[0].capitalExpenditure), 
        10
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
    if (sortedBalance.length >= 6) {
      const tbv0 = sortedBalance[0].totalEquity - (sortedBalance[0].goodwill || 0) - (sortedBalance[0].intangibleAssets || 0)
      const tbv5 = sortedBalance[5].totalEquity - (sortedBalance[5].goodwill || 0) - (sortedBalance[5].intangibleAssets || 0)
      growth.tangibleBookValueGrowth5Y = calculateCAGR(tbv5, tbv0, 5)
    }
    if (sortedBalance.length >= 11) {
      const tbv0 = sortedBalance[0].totalEquity - (sortedBalance[0].goodwill || 0) - (sortedBalance[0].intangibleAssets || 0)
      const tbv10 = sortedBalance[10].totalEquity - (sortedBalance[10].goodwill || 0) - (sortedBalance[10].intangibleAssets || 0)
      growth.tangibleBookValueGrowth10Y = calculateCAGR(tbv10, tbv0, 10)
    }

    // Dividend Growth (verwende Cash Flow Statement für bessere Verfügbarkeit)
    if (sortedCashFlow.length >= 2) {
      const dps0 = Math.abs(sortedCashFlow[0].dividendsPaid || 0) / (sortedIncome[0]?.weightedAverageShsOut || sortedIncome[0]?.weightedAverageShsOutDil || 1)
      const dps1 = Math.abs(sortedCashFlow[1].dividendsPaid || 0) / (sortedIncome[1]?.weightedAverageShsOut || sortedIncome[1]?.weightedAverageShsOutDil || 1)
      if (dps0 > 0 && dps1 > 0) {
        growth.dividendGrowth1Y = calculateYoYGrowth(dps0, dps1)
      }
    }
    if (sortedCashFlow.length >= 4 && sortedIncome.length >= 4) {
      const dps0 = Math.abs(sortedCashFlow[0].dividendsPaid || 0) / (sortedIncome[0]?.weightedAverageShsOut || sortedIncome[0]?.weightedAverageShsOutDil || 1)
      const dps3 = Math.abs(sortedCashFlow[3].dividendsPaid || 0) / (sortedIncome[3]?.weightedAverageShsOut || sortedIncome[3]?.weightedAverageShsOutDil || 1)
      if (dps0 > 0 && dps3 > 0) {
        growth.dividendGrowth3Y = calculateCAGR(dps3, dps0, 3)
      }
    }
    if (sortedCashFlow.length >= 6 && sortedIncome.length >= 6) {
      const dps0 = Math.abs(sortedCashFlow[0].dividendsPaid || 0) / (sortedIncome[0]?.weightedAverageShsOut || sortedIncome[0]?.weightedAverageShsOutDil || 1)
      const dps5 = Math.abs(sortedCashFlow[5].dividendsPaid || 0) / (sortedIncome[5]?.weightedAverageShsOut || sortedIncome[5]?.weightedAverageShsOutDil || 1)
      if (dps0 > 0 && dps5 > 0) {
        growth.dividendGrowth5Y = calculateCAGR(dps5, dps0, 5)
      }
    }
    if (sortedCashFlow.length >= 11 && sortedIncome.length >= 11) {
      const dps0 = Math.abs(sortedCashFlow[0].dividendsPaid || 0) / (sortedIncome[0]?.weightedAverageShsOut || sortedIncome[0]?.weightedAverageShsOutDil || 1)
      const dps10 = Math.abs(sortedCashFlow[10].dividendsPaid || 0) / (sortedIncome[10]?.weightedAverageShsOut || sortedIncome[10]?.weightedAverageShsOutDil || 1)
      if (dps0 > 0 && dps10 > 0) {
        growth.dividendGrowth10Y = calculateCAGR(dps10, dps0, 10)
      }
    }

    // ROE Growth
    if (sortedRatios.length >= 2) {
      growth.roeGrowth1Y = calculateYoYGrowth(sortedRatios[0].returnOnEquity, sortedRatios[1].returnOnEquity)
    }
    if (sortedRatios.length >= 4) {
      growth.roeGrowth3Y = calculateCAGR(sortedRatios[3].returnOnEquity, sortedRatios[0].returnOnEquity, 3)
    }
    if (sortedRatios.length >= 6) {
      growth.roeGrowth5Y = calculateCAGR(sortedRatios[5].returnOnEquity, sortedRatios[0].returnOnEquity, 5)
    }
    if (sortedRatios.length >= 11) {
      growth.roeGrowth10Y = calculateCAGR(sortedRatios[10].returnOnEquity, sortedRatios[0].returnOnEquity, 10)
    }

    // Working Capital Growth
    if (sortedBalance.length >= 2) {
      const wc0 = (sortedBalance[0].totalCurrentAssets || 0) - (sortedBalance[0].totalCurrentLiabilities || 0)
      const wc1 = (sortedBalance[1].totalCurrentAssets || 0) - (sortedBalance[1].totalCurrentLiabilities || 0)
      growth.workingCapitalGrowth1Y = calculateYoYGrowth(wc0, wc1)
    }
    if (sortedBalance.length >= 4) {
      const wc0 = (sortedBalance[0].totalCurrentAssets || 0) - (sortedBalance[0].totalCurrentLiabilities || 0)
      const wc3 = (sortedBalance[3].totalCurrentAssets || 0) - (sortedBalance[3].totalCurrentLiabilities || 0)
      growth.workingCapitalGrowth3Y = calculateCAGR(wc3, wc0, 3)
    }
    if (sortedBalance.length >= 6) {
      const wc0 = (sortedBalance[0].totalCurrentAssets || 0) - (sortedBalance[0].totalCurrentLiabilities || 0)
      const wc5 = (sortedBalance[5].totalCurrentAssets || 0) - (sortedBalance[5].totalCurrentLiabilities || 0)
      growth.workingCapitalGrowth5Y = calculateCAGR(wc5, wc0, 5)
    }
    if (sortedBalance.length >= 11) {
      const wc0 = (sortedBalance[0].totalCurrentAssets || 0) - (sortedBalance[0].totalCurrentLiabilities || 0)
      const wc10 = (sortedBalance[10].totalCurrentAssets || 0) - (sortedBalance[10].totalCurrentLiabilities || 0)
      growth.workingCapitalGrowth10Y = calculateCAGR(wc10, wc0, 10)
    }

    // Total Assets Growth
    if (sortedBalance.length >= 2) {
      growth.totalAssetsGrowth1Y = calculateYoYGrowth(sortedBalance[0].totalAssets, sortedBalance[1].totalAssets)
    }
    if (sortedBalance.length >= 4) {
      growth.totalAssetsGrowth3Y = calculateCAGR(sortedBalance[3].totalAssets, sortedBalance[0].totalAssets, 3)
    }
    if (sortedBalance.length >= 6) {
      growth.totalAssetsGrowth5Y = calculateCAGR(sortedBalance[5].totalAssets, sortedBalance[0].totalAssets, 5)
    }
    if (sortedBalance.length >= 11) {
      growth.totalAssetsGrowth10Y = calculateCAGR(sortedBalance[10].totalAssets, sortedBalance[0].totalAssets, 10)
    }

    // Levered Free Cash Flow Growth (FCF - Interest Payments)
    if (sortedCashFlow.length >= 2 && sortedIncome.length >= 2) {
      const levFcf0 = (sortedCashFlow[0].freeCashFlow || 0) - Math.abs(sortedIncome[0].interestExpense || 0)
      const levFcf1 = (sortedCashFlow[1].freeCashFlow || 0) - Math.abs(sortedIncome[1].interestExpense || 0)
      growth.leveredFcfGrowth1Y = calculateYoYGrowth(levFcf0, levFcf1)
    }
    if (sortedCashFlow.length >= 4 && sortedIncome.length >= 4) {
      const levFcf0 = (sortedCashFlow[0].freeCashFlow || 0) - Math.abs(sortedIncome[0].interestExpense || 0)
      const levFcf3 = (sortedCashFlow[3].freeCashFlow || 0) - Math.abs(sortedIncome[3].interestExpense || 0)
      growth.leveredFcfGrowth3Y = calculateCAGR(levFcf3, levFcf0, 3)
    }
    if (sortedCashFlow.length >= 6 && sortedIncome.length >= 6) {
      const levFcf0 = (sortedCashFlow[0].freeCashFlow || 0) - Math.abs(sortedIncome[0].interestExpense || 0)
      const levFcf5 = (sortedCashFlow[5].freeCashFlow || 0) - Math.abs(sortedIncome[5].interestExpense || 0)
      growth.leveredFcfGrowth5Y = calculateCAGR(levFcf5, levFcf0, 5)
    }
    if (sortedCashFlow.length >= 11 && sortedIncome.length >= 11) {
      const levFcf0 = (sortedCashFlow[0].freeCashFlow || 0) - Math.abs(sortedIncome[0].interestExpense || 0)
      const levFcf10 = (sortedCashFlow[10].freeCashFlow || 0) - Math.abs(sortedIncome[10].interestExpense || 0)
      growth.leveredFcfGrowth10Y = calculateCAGR(levFcf10, levFcf0, 10)
    }

    // Forward Growth aus Analyst Estimates
    if (Array.isArray(estimates) && estimates.length > 0) {
      const currentYear = new Date().getFullYear()
      const currentEstimate = estimates.find(e => 
        new Date(e.date).getFullYear() === currentYear
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