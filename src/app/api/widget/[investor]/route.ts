// app/api/widget/[investor]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, incrementUsage, checkRateLimit, isDomainAllowed } from '@/lib/widget-helpers'
import holdingsHistory from '@/data/holdings'

interface WidgetPortfolioData {
  investor: string
  portfolio_value: number
  total_change_percent: number
  quarterly_change_percent: number
  last_update: string
  chart_data: Array<{ quarter: string; value: number; date: string }>
  top_holdings: Array<{ 
    ticker: string
    name: string
    value: number
    percentage: number
  }>
  total_positions: number
}

// Helper function to extract ticker from company name
function extractTicker(companyName: string): string {
  const name = companyName.toUpperCase()
  if (name.includes('APPLE')) return 'AAPL'
  if (name.includes('MICROSOFT')) return 'MSFT'
  if (name.includes('AMAZON')) return 'AMZN'
  if (name.includes('GOOGLE') || name.includes('ALPHABET')) return 'GOOGL'
  if (name.includes('TESLA')) return 'TSLA'
  if (name.includes('BERKSHIRE')) return 'BRK.A'
  if (name.includes('AMERICAN EXPRESS')) return 'AXP'
  if (name.includes('COCA COLA')) return 'KO'
  if (name.includes('BANK AMER')) return 'BAC'
  if (name.includes('VISA')) return 'V'
  if (name.includes('MASTERCARD')) return 'MA'
  if (name.includes('CHEVRON')) return 'CVX'
  if (name.includes('KRAFT HEINZ')) return 'KHC'
  if (name.includes('OCCIDENTAL')) return 'OXY'
  if (name.includes('CHUBB')) return 'CB'
  if (name.includes('MOODYS')) return 'MCO'
  if (name.includes('DAVITA')) return 'DVA'
  if (name.includes('SIRIUS')) return 'SIRI'
  if (name.includes('CITIGROUP')) return 'C'
  if (name.includes('KROGER')) return 'KR'
  if (name.includes('VERISIGN')) return 'VRSN'
  if (name.includes('NU HLDGS')) return 'NU'
  
  // Fallback: return abbreviated company name
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4)
  }
  return words[0].substring(0, 4)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { investor: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const apiKey = searchParams.get('api_key')
    const referer = request.headers.get('referer')
    const origin = request.headers.get('origin')

    // Validate API key
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    }

    const validation = await validateApiKey(apiKey)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 401 }
      )
    }

    const keyData = validation.keyData!

    // Check rate limiting
    if (!checkRateLimit(apiKey, 30)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 30 requests per minute.' },
        { status: 429 }
      )
    }

    // Check domain whitelist
    if (keyData.allowed_domains.length > 0 && (referer || origin)) {
      const requestDomain = referer || origin!
      if (!isDomainAllowed(keyData.allowed_domains, requestDomain)) {
        return NextResponse.json(
          { error: 'Domain not allowed' },
          { status: 403 }
        )
      }
    }

    // Validate investor slug
    const investor = params.investor
    if (!investor || typeof investor !== 'string') {
      return NextResponse.json(
        { error: 'Invalid investor parameter' },
        { status: 400 }
      )
    }

    // Get investor data from JSON files
    const investorData = holdingsHistory[investor]
    if (!investorData || !Array.isArray(investorData) || investorData.length === 0) {
      return NextResponse.json(
        { error: 'Investor not found' },
        { status: 404 }
      )
    }

    // Get the latest snapshot
    const latestSnapshot = investorData[investorData.length - 1]
    const latestData = latestSnapshot.data
    
    // Calculate portfolio value
    const portfolioValue = latestData.totalValue || 
      (latestData.positions ? latestData.positions.reduce((sum: number, pos: any) => sum + (pos.value || 0), 0) : 0)

    // Get last 4 quarters for chart data
    const chartData = investorData
      .slice(-4)
      .map(snapshot => {
        const value = snapshot.data.totalValue || 
          (snapshot.data.positions ? snapshot.data.positions.reduce((sum: number, pos: any) => sum + (pos.value || 0), 0) : 0)
        
        return {
          quarter: snapshot.quarter,
          value: value,
          date: snapshot.data.date || snapshot.data.period || new Date().toISOString()
        }
      })

    // Calculate quarterly change
    let quarterlyChange = 0
    if (chartData.length >= 2) {
      const current = chartData[chartData.length - 1].value
      const previous = chartData[chartData.length - 2].value
      if (previous > 0) {
        quarterlyChange = ((current - previous) / previous) * 100
      }
    }

    // Calculate total change (from earliest to latest)
    let totalChange = 0
    if (chartData.length >= 2) {
      const current = chartData[chartData.length - 1].value
      const earliest = chartData[0].value
      if (earliest > 0) {
        totalChange = ((current - earliest) / earliest) * 100
      }
    }

    // Get top holdings
    let topHoldings: Array<{ ticker: string; name: string; value: number; percentage: number }> = []
    let totalPositions = 0
    
    if (latestData.positions && Array.isArray(latestData.positions)) {
      // Group positions by CUSIP to handle duplicates
      const positionMap = new Map<string, { name: string; value: number }>()
      
      latestData.positions.forEach((position: any) => {
        const cusip = position.cusip || position.name
        const existing = positionMap.get(cusip)
        if (existing) {
          existing.value += position.value || 0
        } else {
          positionMap.set(cusip, {
            name: position.name || 'Unknown',
            value: position.value || 0
          })
        }
      })

      // Set total positions count
      totalPositions = positionMap.size

      // Convert to array and sort by value
      topHoldings = Array.from(positionMap.entries())
        .map(([_, data]) => ({
          ticker: extractTicker(data.name),
          name: data.name,
          value: data.value,
          percentage: portfolioValue > 0 ? (data.value / portfolioValue) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    }

    // Format response data
    const response: WidgetPortfolioData = {
      investor: investor,
      portfolio_value: portfolioValue,
      total_change_percent: Math.round(totalChange * 10) / 10,
      quarterly_change_percent: Math.round(quarterlyChange * 10) / 10,
      last_update: latestData.date || latestData.period || new Date().toISOString(),
      chart_data: chartData,
      top_holdings: topHoldings,
      total_positions: totalPositions // Echte Anzahl der Positionen
    }

    // Increment usage count (fire and forget)
    incrementUsage(apiKey).catch(console.error)

    // Set CORS headers for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    }

    return NextResponse.json(response, {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Widget API Error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}