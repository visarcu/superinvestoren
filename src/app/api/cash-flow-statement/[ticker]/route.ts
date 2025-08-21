// src/app/api/cash-flow-statement/[ticker]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    )
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?limit=1&apikey=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`[CashFlow API] Error for ${ticker}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch cash flow data' },
      { status: 500 }
    )
  }
}