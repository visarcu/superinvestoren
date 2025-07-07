// ✅ src/app/api/quote/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 300 } }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
  }
}
