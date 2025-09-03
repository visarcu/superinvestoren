// src/app/api/etf-info/[symbol]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  const url = `https://financialmodelingprep.com/api/v4/etf-info?symbol=${symbol}&apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      console.error(`FMP ETF Info API responded with ${res.status}`)
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
    
  } catch (err) {
    console.error('ETF Info API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETF info' }, { status: 502 })
  }
}