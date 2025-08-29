// src/app/api/financials/income-historical/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || '11'

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=${limit}&apikey=${apiKey}`,
      { next: { revalidate: 86400 } }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error(`Error fetching historical income statement for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch historical income statement' }, { status: 500 })
  }
}