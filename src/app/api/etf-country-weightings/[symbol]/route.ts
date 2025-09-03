// src/app/api/etf-country-weightings/[symbol]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  const url = `https://financialmodelingprep.com/api/v4/etf-country-weightings?symbol=${symbol}&apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      console.error(`FMP ETF Country Weightings API responded with ${res.status}`)
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()
    
    // Sort by weightings percentage descending
    const sortedWeightings = data
      .sort((a: any, b: any) => (b.weightings || 0) - (a.weightings || 0))
      .slice(0, 10) // Top 10 countries
    
    return NextResponse.json(sortedWeightings)
    
  } catch (err) {
    console.error('ETF Country Weightings API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETF country weightings' }, { status: 502 })
  }
}