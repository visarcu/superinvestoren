import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const limit = searchParams.get('limit') || '1'

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/financial-growth/${symbol}?limit=${limit}&apikey=${process.env.FMP_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Financial growth API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch growth data' }, { status: 500 })
  }
}
