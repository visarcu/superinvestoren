// src/app/api/company-efficiency/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker required' }, { status: 400 })
  }

  try {
    const apiKey = process.env.FMP_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    console.log(`🔍 [Company Efficiency API] Loading data for ${ticker}`)

    // ✅ PARALLEL LADEN: Alle benötigten Financial Daten
    const [profileRes, incomeRes, balanceRes, keyMetricsRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`, {
        next: { revalidate: 86400 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=10&apikey=${apiKey}`, {
        next: { revalidate: 86400 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=annual&limit=10&apikey=${apiKey}`, {
        next: { revalidate: 86400 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=10&apikey=${apiKey}`, {
        next: { revalidate: 86400 }
      })
    ])
    
    let profileData: any = null
    let incomeData: any[] = []
    let balanceData: any[] = []
    let keyMetricsData: any[] = []
    
    // Company Profile
    if (profileRes.ok) {
      const profile = await profileRes.json()
      profileData = Array.isArray(profile) ? profile[0] : profile
      console.log(`✅ [Company Efficiency API] Profile loaded`)
    }
    
    // Income Statement
    if (incomeRes.ok) {
      incomeData = await incomeRes.json()
      console.log(`✅ [Company Efficiency API] Income statements: ${incomeData.length} years`)
    }
    
    // Balance Sheet
    if (balanceRes.ok) {
      balanceData = await balanceRes.json()
      console.log(`✅ [Company Efficiency API] Balance sheets: ${balanceData.length} years`)
    }
    
    // Key Metrics
    if (keyMetricsRes.ok) {
      keyMetricsData = await keyMetricsRes.json()
      console.log(`✅ [Company Efficiency API] Key metrics: ${keyMetricsData.length} years`)
    }

    // ✅ BERECHNE EFFICIENCY METRICS
    const efficiencyData = calculateEfficiencyMetrics(
      incomeData,
      balanceData,
      keyMetricsData,
      profileData,
      ticker
    )
    
    return NextResponse.json({
      success: true,
      data: efficiencyData,
      debug: {
        ticker,
        incomeYears: incomeData.length,
        balanceYears: balanceData.length,
        keyMetricsYears: keyMetricsData.length,
        hasProfile: !!profileData
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600'
      }
    })

  } catch (error) {
    console.error(`❌ [Company Efficiency API] Error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch efficiency data',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

function calculateEfficiencyMetrics(
  incomeData: any[],
  balanceData: any[],
  keyMetricsData: any[],
  profileData: any,
  ticker: string
) {
  console.log(`🔧 [Company Efficiency API] Calculating efficiency metrics for ${ticker}`)
  
  if (incomeData.length === 0 || balanceData.length === 0) {
    console.warn(`⚠️ [Company Efficiency API] Insufficient data for ${ticker}`)
    return {
      historicalMetrics: [],
      currentMetrics: {
        roa: 0,
        roe: 0,
        assetTurnover: 0,
        revenuePerEmployee: null,
        efficiency: 'poor',
        trend: 'stable'
      },
      companyName: ticker,
      dataQuality: 'limited'
    }
  }

  // ✅ KOMBINIERE DATEN NACH JAHR
  const combinedData = incomeData
    .filter(income => income.calendarYear && income.calendarYear >= 2015) // Nur moderne Daten
    .map((income, index) => {
      const year = income.calendarYear.toString()
      const balance = balanceData.find(b => b.calendarYear === income.calendarYear) || {}
      const keyMetrics = keyMetricsData.find(k => k.calendarYear === income.calendarYear) || {}
      
      // ✅ BERECHNE EFFICIENCY KENNZAHLEN
      const revenue = income.revenue || 0
      const netIncome = income.netIncome || 0
      const totalAssets = balance.totalAssets || 0
      const totalEquity = balance.totalStockholdersEquity || balance.totalEquity || 0
      const operatingIncome = income.operatingIncome || 0
      const operatingMargin = income.operatingIncomeRatio || (operatingIncome / revenue) || 0
      const netMargin = income.netIncomeRatio || (netIncome / revenue) || 0
      const totalDebt = balance.totalDebt || 0
      const currentAssets = balance.totalCurrentAssets || 0
      const currentLiabilities = balance.totalCurrentLiabilities || 0
      
      // ROA (Return on Assets)
      const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0
      
      // ROE (Return on Equity)  
      const roe = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0
      
      // Asset Turnover
      const assetTurnover = totalAssets > 0 ? revenue / totalAssets : 0
      
      // Debt to Equity
      const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 0
      
      // Current Ratio
      const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
      
      // Revenue per Employee (wenn verfügbar)
      const employees = profileData?.fullTimeEmployees || keyMetrics.numberOfEmployees || null
      const revenuePerEmployee = employees && employees > 0 ? revenue / employees : null
      
      return {
        year,
        roaPercent: roa,
        roePercent: roe,
        assetTurnover,
        revenuePerEmployee,
        operatingMargin: operatingMargin * 100,
        netMargin: netMargin * 100,
        debtToEquity,
        currentRatio
      }
    })
    .reverse() // Chronological order
    .slice(-8) // Last 8 years

  if (combinedData.length === 0) {
    return {
      historicalMetrics: [],
      currentMetrics: {
        roa: 0,
        roe: 0,
        assetTurnover: 0,
        revenuePerEmployee: null,
        efficiency: 'poor',
        trend: 'stable'
      },
      companyName: ticker,
      dataQuality: 'limited'
    }
  }

  // ✅ AKTUELLE KENNZAHLEN (letztes Jahr)
  const latest = combinedData[combinedData.length - 1]
  
  // ✅ TREND BERECHNUNG
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (combinedData.length >= 3) {
    const recent = combinedData.slice(-3)
    const avgRecent = recent.reduce((sum, d) => sum + d.roaPercent + d.roePercent, 0) / (recent.length * 2)
    const older = combinedData.slice(-6, -3)
    if (older.length > 0) {
      const avgOlder = older.reduce((sum, d) => sum + d.roaPercent + d.roePercent, 0) / (older.length * 2)
      const improvement = ((avgRecent - avgOlder) / Math.abs(avgOlder)) * 100
      
      if (improvement > 5) trend = 'improving'
      else if (improvement < -5) trend = 'declining'
    }
  }
  
  // ✅ EFFICIENCY SCORE
  let efficiency: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  const roaScore = latest.roaPercent > 15 ? 4 : latest.roaPercent > 10 ? 3 : latest.roaPercent > 5 ? 2 : 1
  const roeScore = latest.roePercent > 20 ? 4 : latest.roePercent > 15 ? 3 : latest.roePercent > 10 ? 2 : 1
  const marginScore = latest.operatingMargin > 20 ? 4 : latest.operatingMargin > 15 ? 3 : latest.operatingMargin > 10 ? 2 : 1
  
  const totalScore = (roaScore + roeScore + marginScore) / 3
  if (totalScore >= 3.5) efficiency = 'excellent'
  else if (totalScore >= 2.5) efficiency = 'good'
  else if (totalScore >= 1.5) efficiency = 'fair'
  
  // ✅ DATENQUALITÄT
  let dataQuality: 'excellent' | 'good' | 'fair' | 'limited' = 'limited'
  if (combinedData.length >= 7) dataQuality = 'excellent'
  else if (combinedData.length >= 5) dataQuality = 'good'
  else if (combinedData.length >= 3) dataQuality = 'fair'
  
  console.log(`📊 [Company Efficiency API] Processed ${combinedData.length} years, Quality: ${dataQuality}, Trend: ${trend}`)

  return {
    historicalMetrics: combinedData,
    currentMetrics: {
      roa: latest.roaPercent,
      roe: latest.roePercent,
      assetTurnover: latest.assetTurnover,
      revenuePerEmployee: latest.revenuePerEmployee,
      efficiency,
      trend
    },
    companyName: profileData?.companyName || ticker,
    dataQuality
  }
}