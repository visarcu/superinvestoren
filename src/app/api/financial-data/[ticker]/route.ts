import { NextRequest, NextResponse } from 'next/server'

interface FinancialDataResponse {
  incomeStatements: any[]
  balanceSheets: any[]
  cashFlows: any[]
  keyMetrics: any[]
  dividends: any[]
  ticker: string
  period: string
  years: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const { searchParams } = new URL(request.url)
  
  const years = parseInt(searchParams.get('years') || '5')
  const period = searchParams.get('period') || 'annual'
  
  // Validate ticker format (security check)
  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  // Validate period
  if (!['annual', 'quarterly'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  // Validate years range
  if (years < 1 || years > 20) {
    return NextResponse.json({ error: 'Invalid years range (1-20)' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const requestLimit = years * (period === 'quarterly' ? 4 : 1)
    
    console.log(`🔍 Fetching comprehensive financial data for ${ticker}...`)
    
    // Make all 5 API calls in parallel for better performance
    const [
      incomeRes,
      balanceRes,
      cashFlowRes,
      keyMetricsRes,
      dividendsRes
    ] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=${period}&limit=${requestLimit}&apikey=${apiKey}`, {
        next: { revalidate: 3600 }
      }),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${apiKey}`, {
        next: { revalidate: 7200 }
      })
    ])

    // Process responses
    const incomeStatements = incomeRes.ok ? await incomeRes.json() : []
    const balanceSheets = balanceRes.ok ? await balanceRes.json() : []
    const cashFlows = cashFlowRes.ok ? await cashFlowRes.json() : []
    const keyMetrics = keyMetricsRes.ok ? await keyMetricsRes.json() : []
    const dividendsData = dividendsRes.ok ? await dividendsRes.json() : null
    
    // Extract dividends from nested structure if needed
    const dividends = dividendsData?.historical || []
    
    const response: FinancialDataResponse = {
      incomeStatements: Array.isArray(incomeStatements) ? incomeStatements : [],
      balanceSheets: Array.isArray(balanceSheets) ? balanceSheets : [],
      cashFlows: Array.isArray(cashFlows) ? cashFlows : [],
      keyMetrics: Array.isArray(keyMetrics) ? keyMetrics : [],
      dividends: Array.isArray(dividends) ? dividends : [],
      ticker: ticker.toUpperCase(),
      period,
      years
    }
    
    console.log(`✅ Financial data API successful for ${ticker}: ${incomeStatements.length} income statements, ${balanceSheets.length} balance sheets, ${cashFlows.length} cash flows, ${keyMetrics.length} key metrics, ${dividends.length} dividends`)
    
    return NextResponse.json(response)

  } catch (error) {
    console.error(`Financial data error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch financial data',
      incomeStatements: [],
      balanceSheets: [],
      cashFlows: [],
      keyMetrics: [],
      dividends: [],
      ticker,
      period,
      years
    }, { status: 500 })
  }
}