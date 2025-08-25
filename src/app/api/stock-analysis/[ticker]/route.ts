// Combined Stock Analysis API - Reduces 13 API calls to 1
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
    const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    console.log(`🚀 [Stock Analysis API] Loading combined data for ${ticker}`)

    // Parallel fetch all data that would normally be 13 separate calls
    const [
      profileRes,
      historicalRes, 
      financialsRes,
      quoteRes,
      sharesRes,
      outlookRes,
      balanceSheetRes,
      incomeStatementRes,
      enterpriseValuesRes,
      estimatesRes,
      recommendationsRes,
      cashFlowRes
    ] = await Promise.all([
      fetch(`${baseURL}/api/profile/${ticker}`),
      fetch(`${baseURL}/api/historical/${ticker}`),
      fetch(`${baseURL}/api/financials/${ticker}`),
      fetch(`${baseURL}/api/quote/${ticker}`),
      fetch(`${baseURL}/api/shares/${ticker}`),
      fetch(`${baseURL}/api/outlook/${ticker}`),
      fetch(`${baseURL}/api/balance-sheet/${ticker}`),
      fetch(`${baseURL}/api/income-statement/${ticker}`),
      fetch(`${baseURL}/api/enterprise-values/${ticker}`),
      fetch(`${baseURL}/api/estimates/${ticker}`),
      fetch(`${baseURL}/api/recommendations/${ticker}`),
      fetch(`${baseURL}/api/cash-flow-statement/${ticker}`)
    ])

    // Parse all responses
    const [
      profile,
      historical,
      financials,
      quote,
      shares,
      outlook,
      balanceSheet,
      incomeStatement,
      enterpriseValues,
      estimates,
      recommendations,
      cashFlow
    ] = await Promise.all([
      profileRes.ok ? profileRes.json() : null,
      historicalRes.ok ? historicalRes.json() : null,
      financialsRes.ok ? financialsRes.json() : null,
      quoteRes.ok ? quoteRes.json() : null,
      sharesRes.ok ? sharesRes.json() : null,
      outlookRes.ok ? outlookRes.json() : null,
      balanceSheetRes.ok ? balanceSheetRes.json() : null,
      incomeStatementRes.ok ? incomeStatementRes.json() : null,
      enterpriseValuesRes.ok ? enterpriseValuesRes.json() : null,
      estimatesRes.ok ? estimatesRes.json() : null,
      recommendationsRes.ok ? recommendationsRes.json() : null,
      cashFlowRes.ok ? cashFlowRes.json() : null
    ])

    console.log(`✅ [Stock Analysis API] Combined data loaded for ${ticker}`)

    return NextResponse.json({
      success: true,
      ticker,
      data: {
        profile,
        historical,
        financials,
        quote,
        shares,
        outlook,
        balanceSheet,
        incomeStatement,
        enterpriseValues,
        estimates,
        recommendations,
        cashFlow
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
      }
    })

  } catch (error) {
    console.error(`❌ [Stock Analysis API] Error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch stock analysis data',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}