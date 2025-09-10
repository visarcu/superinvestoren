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
    console.log(`🔍 Fetching company outlook for ${ticker}...`)
    
    const response = await fetch(
      `https://financialmodelingprep.com/api/v4/company-outlook?symbol=${ticker}&apikey=${apiKey}`,
      { 
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )
    
    if (!response.ok) {
      throw new Error(`Company Outlook API responded with status ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log(`✅ Company outlook API successful for ${ticker}`)
    
    return NextResponse.json(data)

  } catch (error) {
    console.error(`Company outlook error for ${ticker}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch company outlook data'
    }, { status: 500 })
  }
}