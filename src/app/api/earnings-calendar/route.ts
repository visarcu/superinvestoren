// API Route for Earnings Calendar - Gets earnings dates for multiple tickers
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

interface EarningsEvent {
  ticker: string
  companyName: string
  date: string
  time: string
  quarter: string
  fiscalYear: string
  estimatedEPS: number | null
  actualEPS: number | null
  revenueEstimated: number | null
  revenueActual: number | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tickers = searchParams.get('tickers')

    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    if (!tickers) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
    }

    console.log(`📅 Loading earnings calendar for: ${tickers}`)

    const tickerArray = tickers.split(',').map(t => t.trim()).filter(Boolean)
    const earningsEvents: EarningsEvent[] = []

    // Only use the current earnings calendar for real upcoming events
    try {
      console.log('📅 Loading current earnings from main calendar...')
      
      const calendarResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/earning_calendar?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 900 } } // 15 min cache for fresh data
      )
      
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        
        if (Array.isArray(calendarData)) {
          // Filter for upcoming events only (today and future)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          const relevantEvents = calendarData
            .filter(event => {
              // Must be watchlist ticker and future date
              const eventDate = new Date(event.date)
              return tickerArray.includes(event.symbol) && eventDate >= today
            })
            .slice(0, 20) // Reasonable limit
            .map(event => {
              const eventDate = new Date(event.date)
              const month = eventDate.getMonth() + 1 // 1-12
              let quarter
              if (month >= 1 && month <= 3) quarter = 1
              else if (month >= 4 && month <= 6) quarter = 2
              else if (month >= 7 && month <= 9) quarter = 3
              else quarter = 4
              
              const year = eventDate.getFullYear()
              
              return {
                ticker: event.symbol,
                companyName: event.symbol, // Use symbol for now
                date: event.date,
                time: event.time || 'TBD',
                quarter: `Q${quarter} ${year}`,
                fiscalYear: year.toString(),
                estimatedEPS: event.epsEstimated ? parseFloat(event.epsEstimated) : null,
                actualEPS: event.epsActual ? parseFloat(event.epsActual) : null,
                revenueEstimated: event.revenueEstimated ? parseFloat(event.revenueEstimated) : null,
                revenueActual: event.revenueActual ? parseFloat(event.revenueActual) : null
              }
            })
          
          earningsEvents.push(...relevantEvents)
          console.log(`📅 Found ${relevantEvents.length} upcoming watchlist events`)
        }
      }
    } catch (error) {
      console.log('Calendar API failed:', error)
    }

    // If we still have no events, try the alternative calendar
    if (earningsEvents.length === 0) {
      try {
        console.log('📅 Trying alternative calendar endpoint...')
        
        const altResponse = await fetch(
          `https://financialmodelingprep.com/stable/earnings-calendar?apikey=${FMP_API_KEY}`,
          { next: { revalidate: 1800 } }
        )
        
        if (altResponse.ok) {
          const altData = await altResponse.json()
          
          if (Array.isArray(altData)) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const relevantEvents = altData
              .filter(event => {
                const eventDate = new Date(event.date)
                return tickerArray.includes(event.symbol) && eventDate >= today
              })
              .slice(0, 15)
              .map(event => ({
                ticker: event.symbol,
                companyName: event.symbol,
                date: event.date,
                time: 'amc',
                quarter: `Q${Math.ceil((new Date(event.date).getMonth() + 1) / 3)} ${new Date(event.date).getFullYear()}`,
                fiscalYear: new Date(event.date).getFullYear().toString(),
                estimatedEPS: null,
                actualEPS: null,
                revenueEstimated: null,
                revenueActual: null
              }))
              
            earningsEvents.push(...relevantEvents)
            console.log(`📅 Found ${relevantEvents.length} events from alt calendar`)
          }
        }
      } catch (error) {
        console.log('Alternative calendar failed:', error)
      }
    }

    // Sort by date (upcoming first)
    const sortedEvents = earningsEvents.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    console.log(`📅 Final result: ${sortedEvents.length} earnings events`)

    return NextResponse.json(sortedEvents, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600'
      }
    })

  } catch (error) {
    console.error('❌ Earnings Calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar' },
      { status: 500 }
    )
  }
}