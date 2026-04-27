// src/app/api/earnings-calendar/[ticker]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/historical/earning_calendar/${ticker}?apikey=${apiKey}`
    const response = await fetch(url, { next: { revalidate: 86400 } }) // 24h cache — historische Earnings ändern sich selten

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
      }
    })
  } catch (error) {
    console.error(`[Earnings Calendar API] Error for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch earnings calendar' }, { status: 500 })
  }
}