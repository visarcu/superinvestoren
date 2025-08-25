import { NextResponse } from 'next/server'
import { getExchangeRate } from '@/lib/exchangeRates'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || 'USD'
  const to = searchParams.get('to') || 'EUR'

  try {
    const rate = await getExchangeRate(from, to)
    
    if (rate === null) {
      return NextResponse.json(
        { error: 'Could not fetch exchange rate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      from,
      to,
      rate,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600', // 10 minutes cache
      }
    })
    
  } catch (error) {
    console.error('Exchange rate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}