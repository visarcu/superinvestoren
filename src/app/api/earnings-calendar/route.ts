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

    // Try different FMP APIs for earnings calendar
    // Method 1: General earnings calendar (get upcoming dates)
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 3)
      const endDate = nextMonth.toISOString().split('T')[0]
      
      const calendarResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/earning_calendar?from=${today}&to=${endDate}&apikey=${FMP_API_KEY}`,
        { next: { revalidate: 3600 } }
      )
      
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        
        if (Array.isArray(calendarData)) {
          const relevantEvents = calendarData
            .filter(event => tickerArray.includes(event.symbol))
            .slice(0, 20)
            .map(event => {
              // Calculate quarter from date if not provided
              let quarter = event.quarter
              if (!quarter && event.date) {
                const eventDate = new Date(event.date)
                const month = eventDate.getMonth() + 1 // 1-12
                if (month >= 1 && month <= 3) quarter = 1
                else if (month >= 4 && month <= 6) quarter = 2
                else if (month >= 7 && month <= 9) quarter = 3
                else quarter = 4
              }
              
              const year = event.fiscalYear || new Date(event.date).getFullYear()
              
              return {
                ticker: event.symbol,
                companyName: event.name || event.symbol,
                date: event.date,
                time: event.time || 'TBD',
                quarter: `Q${quarter || '?'} ${year}`,
                fiscalYear: year?.toString() || new Date().getFullYear().toString(),
                estimatedEPS: event.eps ? parseFloat(event.eps) : null,
                actualEPS: event.epsEstimated ? parseFloat(event.epsEstimated) : null
              }
            })
          
          earningsEvents.push(...relevantEvents)
          console.log(`📅 Found ${relevantEvents.length} events from general calendar`)
        }
      }
    } catch (error) {
      console.log('General calendar failed:', error)
    }

    // Method 2: If no events found, try individual ticker lookups using estimates API
    if (earningsEvents.length === 0) {
      for (const ticker of tickerArray) {
        try {
          const estimateResponse = await fetch(
            `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?limit=4&apikey=${FMP_API_KEY}`,
            { next: { revalidate: 3600 } }
          )

          if (estimateResponse.ok) {
            const estimates = await estimateResponse.json()
            
            if (Array.isArray(estimates) && estimates.length > 0) {
              // Get company name from quote
              const quoteResponse = await fetch(
                `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${FMP_API_KEY}`
              )
              
              let companyName = ticker
              if (quoteResponse.ok) {
                const quote = await quoteResponse.json()
                if (Array.isArray(quote) && quote[0]) {
                  companyName = quote[0].name || ticker
                }
              }

              // Create earnings events from estimates (both future and recent past)
              const currentYear = new Date().getFullYear()
              const sixMonthsAgo = new Date()
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
              
              // Get both future and recent past estimates
              const relevantEstimates = estimates.filter(est => 
                new Date(est.date) >= sixMonthsAgo
              )

              relevantEstimates.slice(0, 4).forEach(estimate => {
                const estimateDate = new Date(estimate.date)
                const month = estimateDate.getMonth() + 1 // 1-12
                const year = estimateDate.getFullYear()
                
                // Calculate quarter properly based on month
                let quarter
                if (month >= 1 && month <= 3) quarter = 1
                else if (month >= 4 && month <= 6) quarter = 2
                else if (month >= 7 && month <= 9) quarter = 3
                else quarter = 4
                
                earningsEvents.push({
                  ticker,
                  companyName,
                  date: estimate.date,
                  time: 'TBD',
                  quarter: `Q${quarter} ${year}`,
                  fiscalYear: year.toString(),
                  estimatedEPS: estimate.estimatedEpsAvg ? parseFloat(estimate.estimatedEpsAvg) : null,
                  actualEPS: null
                })
              })
            }
          }
        } catch (error) {
          console.error(`Error loading estimates for ${ticker}:`, error)
          continue
        }
      }
      
      console.log(`📅 Found ${earningsEvents.length} events from estimates API`)
    }

    // Sort by date
    const sortedEvents = earningsEvents.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    console.log(`📅 Found ${sortedEvents.length} earnings events`)

    return NextResponse.json(sortedEvents, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900'
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