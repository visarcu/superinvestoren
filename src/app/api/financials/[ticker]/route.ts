// src/app/api/financials/[ticker]/route.ts - FIXED: Split-Adjusted + 20 Jahre
import { NextResponse } from 'next/server'

// ✅ SPLIT-ADJUSTMENT: Bekannte Stock Splits für Hauptaktien
const STOCK_SPLITS: Record<string, Array<{date: string, ratio: number, description: string}>> = {
  'AAPL': [
    { date: '2020-08-31', ratio: 4, description: '4-for-1 split' },
    { date: '2014-06-09', ratio: 7, description: '7-for-1 split' },
    { date: '2005-02-28', ratio: 2, description: '2-for-1 split' },
    { date: '2000-06-21', ratio: 2, description: '2-for-1 split' }
  ],
  'TSLA': [
    { date: '2022-08-25', ratio: 3, description: '3-for-1 split' },
    { date: '2020-08-31', ratio: 5, description: '5-for-1 split' }
  ],
  'GOOGL': [
    { date: '2022-07-18', ratio: 20, description: '20-for-1 split' },
    { date: '2014-04-03', ratio: 2, description: '2-for-1 split (Class A/C)' }
  ],
  'AMZN': [
    { date: '2022-06-06', ratio: 20, description: '20-for-1 split' }
  ],
  'NVDA': [
    { date: '2024-06-07', ratio: 10, description: '10-for-1 split' },
    { date: '2021-07-20', ratio: 4, description: '4-for-1 split' }
  ]
}

// ✅ SPLIT-ADJUSTMENT CALCULATOR
function applySplitAdjustments(ticker: string, value: number, date: string): number {
  const splits = STOCK_SPLITS[ticker.toUpperCase()] || []
  let adjustedValue = value
  
  splits.forEach(split => {
    // Wenn das Datum VOR dem Split liegt, muss adjustiert werden
    if (date <= split.date) {
      adjustedValue = adjustedValue / split.ratio
    }
  })
  
  return adjustedValue
}

// ✅ DATUM FILTER: Nur ab 2005 (20 Jahre Historie)
// FMP liefert nur berichtete Perioden. Entscheidend ist deshalb das Periodenende, nicht das
// Kalenderjahr: Nvidias Geschäftsjahr 2026 endete im Januar 2026, Microsofts im Juni 2026.
function filterModernData(data: any[], period: 'annual' | 'quarter'): any[] {
  // ✅ FIX: Unterschiedliche Cutoffs für Annual vs Quarterly
  const cutoffYear = period === 'quarter' ? 1995 : 2005  // Quarterly: 30 Jahre, Annual: 20 Jahre
  const today = new Date().toISOString().slice(0, 10)

  return data.filter((item: any) => {
    if (!item.date || item.date > today) return false
    const year = Number((period === 'annual' && item.calendarYear) || item.date.slice(0, 4))
    return year >= cutoffYear
  })
}

// ✅ PROFESSIONAL: Multi-Source Data mit Split-Adjustierung
async function getReliableMetrics(ticker: string, apiKey: string) {
  console.log(`🔍 [Professional] Multi-source data fusion for ${ticker}`)
  
  const [liveQuoteRes, profileRes, keyMetricsRes] = await Promise.allSettled([
    fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`),
    fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`),
    fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${apiKey}`)
  ])
  
  const sources = { liveQuote: null as any, profile: null as any, keyMetrics: null as any }
  
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
  
  try {
    if (keyMetricsRes.status === 'fulfilled' && keyMetricsRes.value.ok) {
      const data = await keyMetricsRes.value.json()
      sources.keyMetrics = Array.isArray(data) ? data[0] : data
    }
  } catch (e) { console.warn('Key metrics failed:', e) }
  
  // ✅ AKTUELLE WERTE sind bereits split-adjusted (TTM)
  const reliableEPS = sources.liveQuote?.eps || sources.profile?.eps || sources.keyMetrics?.epsBasic || null
  const reliablePrice = sources.liveQuote?.price || sources.profile?.price || null
  
  console.log(`📊 [Professional] Current metrics (split-adjusted):`, {
    eps: reliableEPS,
    price: reliablePrice,
    ticker: ticker.toUpperCase()
  })
  
  return { eps: reliableEPS, price: reliablePrice }
}

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: 'Configuration Error',
        message: 'API key not configured. Please contact support.'
      }, 
      { status: 500 }
    )
  }

  try {
    console.log(`🚀 [Professional] Loading split-adjusted 20-year data for ${ticker}`)
    
    // URL Parameter
    const urlObj = new URL(req.url)
    const qPeriod = urlObj.searchParams.get('period')
    const period = qPeriod === 'quarterly' ? 'quarter' : 'annual'
    const limitQ = parseInt(urlObj.searchParams.get('limit') || '', 10)
    
    // ✅ FIX: Unterschiedliche Limits für Annual vs Quarterly
    const maxYears = 20
    const maxQuarters = 120  // 30 Jahre × 4 Quartale (mehr Daten für FMP $30 Plan)
    const maxLimit = period === 'quarter' ? maxQuarters : maxYears
    const limit = !isNaN(limitQ) ? Math.min(limitQ, maxLimit) : (period === 'quarter' ? 80 : maxYears)

    // Professional current metrics
    const reliableMetrics = await getReliableMetrics(ticker, apiKey)
    
    // Fetch historical statements
    async function fetchJson(u: string) {
      const r = await fetch(u)
      // Nie die ganze URL in den Fehlertext: Sie enthält den API-Schlüssel
      if (!r.ok) throw new Error(`FMP ${new URL(u).pathname}: HTTP ${r.status}`)
      return r.json()
    }

    const incUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=${period}&limit=${limit}&apikey=${apiKey}`
    const cfUrl = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${limit}&apikey=${apiKey}`
    const bsUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=${period}&limit=${limit}&apikey=${apiKey}`

    const [incData, cfData, bsData]: any[] = await Promise.all([
      fetchJson(incUrl),
      fetchJson(cfUrl),
      fetchJson(bsUrl),
    ])

    // ✅ FILTER: Nur moderne Daten (ab 2005, nicht zukünftige Perioden)
    const filteredIncData = filterModernData(incData, period)
    const filteredCfData = filterModernData(cfData, period)  
    const filteredBsData = filterModernData(bsData, period)

    console.log(`📊 [${ticker}] Filtered to modern data (2005+): ${incData.length} → ${filteredIncData.length} periods`)

    // ✅ SPLIT-ADJUSTED HISTORICAL DATA
    const data = filteredIncData.map((inc: any, index: number) => {
      const isQuarter = period === 'quarter'
      const keyMatch = isQuarter ? 'date' : 'calendarYear'
      const matchVal = inc[keyMatch]
      const cfRow = filteredCfData.find((c: any) => c[keyMatch] === matchVal) || {}
      const bsRow = filteredBsData.find((b: any) => b[keyMatch] === matchVal) || {}
      
      // Label erstellen
      let label: string
      let dataDate: string
      
      if (isQuarter) {
        const date = new Date(inc.date + 'T00:00:00')
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        
        // Microsoft Fiscal Year: Juli 2024 - Juni 2025 = FY2025
        let fiscalYear = year
        let quarter = 4
        
        if (month <= 3) {
          quarter = 3  // Jan-Mar = Q3 FY
        } else if (month <= 6) {
          quarter = 4  // Apr-Jun = Q4 FY
        } else if (month <= 9) {
          quarter = 1  // Jul-Sep = Q1 FY
          fiscalYear = year + 1  // FY beginnt im Juli
        } else {
          quarter = 2  // Oct-Dez = Q2 FY
          fiscalYear = year + 1  // FY beginnt im Juli
        }
        
        label = `Q${quarter} FY${fiscalYear}`
        dataDate = inc.date
      } else {
        label = String(inc.calendarYear)
        dataDate = `${inc.calendarYear}-12-31`
      }

      // ✅ SPLIT-ADJUSTED EPS (Historische Daten müssen adjustiert werden)
      const rawEPS = inc.eps || 0
      const adjustedEPS = applySplitAdjustments(ticker, rawEPS, dataDate)
      
      // ✅ SPLIT-ADJUSTED Dividends per Share (falls verfügbar)
      const rawDividendPerShare = inc.dividendPerShare || cfRow.dividendPerShare || 0
      const adjustedDividendPerShare = rawDividendPerShare > 0 ? 
        applySplitAdjustments(ticker, rawDividendPerShare, dataDate) : 0

      // ✅ DEBUG für bekannte problematische Ticker
      if (['AAPL', 'TSLA', 'GOOGL', 'NVDA'].includes(ticker.toUpperCase()) && rawEPS !== adjustedEPS) {
        console.log(`🔧 [${ticker}] Split-adjusted EPS for ${label}: ${rawEPS.toFixed(3)} → ${adjustedEPS.toFixed(3)}`)
      }

      return {
        year: isQuarter ? undefined : Number(inc.calendarYear),
        quarter: isQuarter ? inc.date : undefined,
        label,
        revenue: inc.revenue / 1_000_000,
        ebitda: inc.ebitda / 1_000_000,
        eps: adjustedEPS, // ✅ SPLIT-ADJUSTED!
        freeCashFlow: cfRow.freeCashFlow / 1_000_000 || 0,
        netIncome: inc.netIncome / 1_000_000 || 0,
        dividend: (cfRow.dividendsPaid ? -cfRow.dividendsPaid : 0) || 0,
        cash: bsRow.cashAndCashEquivalents / 1_000_000 || 0,
        debt: bsRow.totalLiabilities / 1_000_000 || 0,
        sharesOutstanding: bsRow.commonStockSharesOutstanding || inc.weightedAverageShsOut || 0,
        capEx: Math.abs(cfRow.capitalExpenditure || 0) / 1_000_000,
        researchAndDevelopment: (inc.researchAndDevelopmentExpenses || 0) / 1_000_000,
        operatingIncome: (inc.operatingIncome || 0) / 1_000_000,
        returnOnEquity: 0, // Would need calculation
        pe: index === 0 ? (reliableMetrics.eps && reliableMetrics.price ? reliableMetrics.price / reliableMetrics.eps : 0) : 0,
        dividendPerShare: adjustedDividendPerShare, // ✅ SPLIT-ADJUSTED!
        
        // ✅ METADATA
        dataSource: 'split-adjusted',
        originalEPS: rawEPS,
        splitAdjustmentApplied: rawEPS !== adjustedEPS
      }
    })

    // ✅ ENHANCED KEY METRICS mit aktuellen split-adjusted Werten
    const professionalKeyMetrics = {
      pe: reliableMetrics.eps && reliableMetrics.price ? reliableMetrics.price / reliableMetrics.eps : null,
      eps: reliableMetrics.eps, // Bereits split-adjusted (TTM)
      price: reliableMetrics.price,
      marketCap: data[0]?.pe ? reliableMetrics.price * (data[0]?.sharesOutstanding || 0) : null,
      
      // Standard metrics
      dividendYield: null, // Would need dividend data
      payoutRatio: null,
      
      // Quality indicators
      dataQuality: {
        approach: 'split-adjusted-20-years',
        splitAdjustmentApplied: STOCK_SPLITS[ticker.toUpperCase()] ? true : false,
        historicalPeriods: data.length,
        modernDataOnly: true,
        yearsOfData: `2005-${new Date().getFullYear()}`,
        ticker: ticker.toUpperCase()
      }
    }

    // ✅ LIMIT: User's requested number of periods (für UI: 10 Jahre = 10 annual ODER 40 quarterly)
    const limitedData = limitQ && limitQ > 0 ? data.slice(-limitQ) : data

    console.log(`✅ [${ticker}] Split-adjusted 20-year data complete:`, {
      periods: limitedData.length,
      latestEPS: limitedData[limitedData.length - 1]?.eps,
      currentEPS: reliableMetrics.eps,
      splitAdjusted: STOCK_SPLITS[ticker.toUpperCase()] ? 'Yes' : 'No'
    })

    return NextResponse.json({ 
      data: limitedData, 
      keyMetrics: professionalKeyMetrics,
      
      // ✅ METADATA für Frontend
      metadata: {
        dataQuality: 'split-adjusted-modern',
        yearsIncluded: `2005-${new Date().getFullYear()}`,
        splitAdjustment: STOCK_SPLITS[ticker.toUpperCase()] || null,
        totalPeriods: limitedData.length,
        modernDataOnly: true
      },
      rawStatements: {                    // ✅ Das erwartet dein Frontend!
        income: filteredIncData,
        balance: filteredBsData, 
        cashflow: filteredCfData
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=21600'
      }
    })

  } catch (error) {
    console.error(`❌ [Professional] Error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch financial data'
    }, { status: 500 })
  }
}