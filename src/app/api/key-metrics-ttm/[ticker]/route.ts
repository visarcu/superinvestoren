import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  // Validate ticker format (security check)
  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    console.log(`🔍 Fetching key metrics TTM for ${ticker}...`)
    
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${apiKey}`,
      { 
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )
    
    if (!response.ok) {
      throw new Error(`Key Metrics TTM API responded with status ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log(`✅ Key metrics TTM API successful for ${ticker}`)
    
    return NextResponse.json(data)

  } catch (error) {
    console.error(`Key metrics TTM error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch key metrics TTM data'
    }, { status: 500 })
  }
}