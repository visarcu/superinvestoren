// Batch API for multiple stock quotes - Performance optimization
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbols = searchParams.get('symbols')

    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    if (!symbols) {
      return NextResponse.json({ error: 'No symbols provided' }, { status: 400 })
    }

    console.log(`📊 Batch loading quotes for: ${symbols}`)

    // Single batched request instead of individual calls
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${FMP_API_KEY}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const quotes = Array.isArray(data) ? data : [data]

    console.log(`✅ Batch loaded ${quotes.length} quotes`)

    return NextResponse.json(quotes, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    })

  } catch (error) {
    console.error('❌ Batch quotes API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batch quotes' },
      { status: 500 }
    )
  }
}