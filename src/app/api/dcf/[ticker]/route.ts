// /api/fmp/dcf/[ticker]/route.ts (App Router)
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  try {
    // Normaler DCF Endpoint von FMP
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/discounted-cash-flow/${ticker}?apikey=${process.env.FMP_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('DCF API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch DCF data' },
      { status: 500 }
    )
  }
}