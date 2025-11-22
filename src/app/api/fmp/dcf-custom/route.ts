// /api/fmp/dcf-custom/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  // Build FMP API URL with all parameters
  const fmpParams = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'symbol') {
      fmpParams.append(key, value)
    }
  })

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v4/advanced_dcf/${symbol}?${fmpParams}&apikey=${process.env.FMP_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Custom DCF API Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate DCF' },
      { status: 500 }
    )
  }
}