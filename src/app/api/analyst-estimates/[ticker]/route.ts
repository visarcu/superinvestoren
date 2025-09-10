import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  const { ticker } = params

  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      throw new Error(`Analyst Estimates API responded with status ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error(`Analyst estimates error for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch analyst estimates data' }, { status: 500 })
  }
}