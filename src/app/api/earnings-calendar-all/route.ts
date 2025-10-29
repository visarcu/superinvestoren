// API Route for All Earnings Calendar - Gets all upcoming earnings
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
  marketCap?: number
}

export async function GET(request: NextRequest) {
  try {
    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    console.log(`📅 Loading ALL earnings calendar...`)

    const earningsEvents: EarningsEvent[] = []

    // Get earnings calendar for next 3 months (starting from yesterday to catch all current earnings)
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 1) // Start from yesterday to ensure we don't miss today's earnings
      const fromDate = startDate.toISOString().split('T')[0]
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 3)
      const endDate = nextMonth.toISOString().split('T')[0]
      
      const calendarResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${endDate}&apikey=${FMP_API_KEY}`,
        { next: { revalidate: 3600 } }
      )
      
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        
        if (Array.isArray(calendarData)) {
          // Filter for major US companies only
          const relevantEvents = calendarData
            .filter(event => {
              if (!event.symbol || !event.date) return false
              
              const ticker = event.symbol
              
              // Remove all foreign exchanges with suffixes
              if (ticker.includes('.')) return false
              
              // Remove obvious patterns of foreign/irrelevant tickers
              if (/^\d+/.test(ticker)) return false // Starts with numbers
              if (ticker.length > 5) return false // Too long for US stocks
              if (ticker.includes('-') && !['BRK-A', 'BRK-B'].includes(ticker)) {
                // Allow known hyphenated stocks but filter most others
                if (!ticker.match(/^[A-Z]+-[A-Z]$/)) return false
              }
              
              return true
            })
            .slice(0, 300) // Limit to first 300 relevant events
          
          console.log(`📊 Filtered ${calendarData.length} events down to ${relevantEvents.length} relevant US companies`)
          
          // Get market cap data for better sorting
          const marketCapPromises = relevantEvents.slice(0, 100).map(async (event) => {
            try {
              const marketCapResponse = await fetch(
                `https://financialmodelingprep.com/api/v3/market-capitalization/${event.symbol}?apikey=${FMP_API_KEY}`
              )
              if (marketCapResponse.ok) {
                const marketCapData = await marketCapResponse.json()
                return {
                  ...event,
                  marketCap: marketCapData[0]?.marketCap || 0
                }
              }
            } catch (error) {
              console.log(`Could not get market cap for ${event.symbol}`)
            }
            return { ...event, marketCap: 0 }
          })
          
          const eventsWithMarketCap = await Promise.all(marketCapPromises)
          
          // Sort by market cap (highest first) and add remaining events
          const sortedEvents = eventsWithMarketCap
            .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
            .concat(relevantEvents.slice(100).map(event => ({ ...event, marketCap: 0 })))
          
          // Process earnings events with better company names
          for (const event of sortedEvents) {
            earningsEvents.push({
              ticker: event.symbol,
              companyName: event.name || event.symbol,
              date: event.date,
              time: event.time || 'Unknown',
              quarter: `Q${Math.ceil(new Date(event.date).getMonth() / 3)} ${new Date(event.date).getFullYear()}`,
              fiscalYear: new Date(event.date).getFullYear().toString(),
              estimatedEPS: event.eps || null,
              actualEPS: event.epsEstimated || null,
              marketCap: event.marketCap || 0
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching earnings calendar:', error)
    }

    // Sort by date
    earningsEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log(`✅ Loaded ${earningsEvents.length} earnings events`)

    return NextResponse.json(earningsEvents, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
      }
    })

  } catch (error) {
    console.error('[Earnings Calendar All] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load earnings calendar' },
      { status: 500 }
    )
  }
}