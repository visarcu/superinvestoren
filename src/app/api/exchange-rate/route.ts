import { NextResponse } from 'next/server'
import { getExchangeRate } from '@/lib/exchangeRates'

async function getHistoricalExchangeRate(date: string): Promise<number | null> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/EURUSD?from=${date}&to=${date}&apikey=${apiKey}`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.historical && data.historical.length > 0) {
      return data.historical[0].close // EUR per USD
    }
    return null
  } catch (error) {
    console.error('Historical exchange rate error:', error)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || 'USD'
  const to = searchParams.get('to') || 'EUR'
  const date = searchParams.get('date')

  try {
    let rate: number | null
    
    if (date) {
      // Get historical rate
      rate = await getHistoricalExchangeRate(date)
    } else {
      // Get current rate
      rate = await getExchangeRate(from, to)
    }
    
    if (rate === null || isNaN(rate) || rate <= 0) {
      return NextResponse.json(
        { error: 'Exchange rate data currently unavailable. Please try again later.' },
        { status: 503 } // Service Unavailable - temporary issue
      )
    }

    return NextResponse.json({
      from,
      to,
      rate,
      timestamp: Date.now(),
      date: date || new Date().toISOString().split('T')[0]
    }, {
      headers: {
        'Cache-Control': date ? 'public, max-age=86400' : 'public, max-age=600', // 24h for historical, 10min for current
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