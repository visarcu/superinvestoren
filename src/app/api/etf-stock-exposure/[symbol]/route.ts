// src/app/api/etf-stock-exposure/[symbol]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  const url = `https://financialmodelingprep.com/api/v4/etf-stock-exposure/${symbol}?apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      console.error(`FMP ETF Stock Exposure API responded with ${res.status}`)
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()
    
    // Sort by asset exposure percentage descending and limit to top ETFs
    const sortedExposure = data
      .sort((a: any, b: any) => (b.assetExposure || 0) - (a.assetExposure || 0))
      .slice(0, 20) // Top 20 ETFs holding this stock
    
    return NextResponse.json(sortedExposure)
    
  } catch (err) {
    console.error('ETF Stock Exposure API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETF stock exposure' }, { status: 502 })
  }
}