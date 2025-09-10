import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker parameter required' }, { status: 400 })
  }

  // Validate ticker format (basic security check)
  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  try {
    const apiKey = process.env.FMP_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`,
      { 
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    )
    
    if (!response.ok) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }
    
    const data = await response.json()
    const [profile] = data

    if (profile && profile.companyName) {
      return NextResponse.json({
        valid: true,
        name: profile.companyName,
        price: profile.price || 0
      })
    } else {
      return NextResponse.json({ valid: false })
    }
  } catch (error) {
    console.error('Stock validation error:', error)
    return NextResponse.json({ valid: false }, { status: 200 })
  }
}