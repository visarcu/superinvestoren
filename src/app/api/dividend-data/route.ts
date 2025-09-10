import { NextRequest, NextResponse } from 'next/server'

interface DividendCalendarItem {
  symbol: string
  date: string
  adjDividend: number
  dividend: number
  recordDate: string
  paymentDate: string
  declarationDate: string
}

interface HistoricalDividend {
  date: string
  adjDividend: number
  dividend: number
}

export async function POST(request: NextRequest) {
  try {
    const { holdings } = await request.json()
    
    // Validate holdings array
    if (!Array.isArray(holdings)) {
      return NextResponse.json({ error: 'Invalid holdings format' }, { status: 400 })
    }

    const apiKey = process.env.FMP_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    console.log('🔍 Loading dividend data for portfolio...')
    
    // Get dividend calendar for next year
    const fromDate = new Date().toISOString().split('T')[0]
    const toDate = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    
    const calendarResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/stock_dividend_calendar?from=${fromDate}&to=${toDate}&apikey=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )
    
    let upcomingDividends: DividendCalendarItem[] = []
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json()
      upcomingDividends = Array.isArray(calendarData) ? calendarData : []
      console.log(`📅 Dividend calendar loaded: ${upcomingDividends.length} entries`)
    } else {
      console.warn('❌ Dividend calendar API failed:', calendarResponse.status)
    }

    // Get historical dividends for each holding
    const historicalDividends: Record<string, HistoricalDividend[]> = {}
    
    for (const holding of holdings) {
      if (!holding.symbol || typeof holding.symbol !== 'string') {
        continue
      }
      
      try {
        const histResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${holding.symbol}?apikey=${apiKey}`,
          { next: { revalidate: 7200 } } // Cache for 2 hours
        )
        
        if (histResponse.ok) {
          const histData = await histResponse.json()
          if (histData.historical && Array.isArray(histData.historical)) {
            historicalDividends[holding.symbol] = histData.historical
            console.log(`✅ Historical dividends for ${holding.symbol}: ${histData.historical.length} entries`)
          }
        } else {
          console.warn(`❌ Historical dividends failed for ${holding.symbol}:`, histResponse.status)
        }
      } catch (error) {
        console.error(`Error fetching dividends for ${holding.symbol}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      upcomingDividends,
      historicalDividends,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dividend data API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch dividend data',
      upcomingDividends: [],
      historicalDividends: {},
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}