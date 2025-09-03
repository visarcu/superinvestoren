// src/app/api/etf-holdings/[symbol]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!symbol || !date) {
    return NextResponse.json({ error: 'Symbol and date are required' }, { status: 400 })
  }

  const url = `https://financialmodelingprep.com/api/v4/etf-holdings?date=${date}&symbol=${symbol}&apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      console.error(`FMP ETF Holdings API responded with ${res.status}`)
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()
    
    // Sort by percentage value descending and limit to top holdings
    const sortedHoldings = data
      .sort((a: any, b: any) => (b.pctVal || 0) - (a.pctVal || 0))
      .slice(0, 50) // Top 50 holdings
    
    return NextResponse.json(sortedHoldings)
    
  } catch (err) {
    console.error('ETF Holdings API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETF holdings' }, { status: 502 })
  }
}