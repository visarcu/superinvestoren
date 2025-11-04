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

    // Get earnings calendar - use stable API for current + old API for future months
    try {
      console.log('📅 Loading current and future earnings...')
      
      // Method 1: Current earnings from stable API
      const stableResponse = await fetch(
        `https://financialmodelingprep.com/stable/earnings-calendar?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } }
      )
      
      // Method 2: Future earnings from old API (for November onwards)
      const today = new Date().toISOString().split('T')[0]
      const nextMonths = new Date()
      nextMonths.setMonth(nextMonths.getMonth() + 4) // Look ahead 4 months
      const endDate = nextMonths.toISOString().split('T')[0]
      
      const futureResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/earning_calendar?from=${today}&to=${endDate}&apikey=${FMP_API_KEY}`,
        { next: { revalidate: 7200 } } // Cache future earnings for 2 hours
      )
      
      let allCalendarData = []
      
      // Process stable API data (current earnings)
      if (stableResponse.ok) {
        const stableData = await stableResponse.json()
        if (Array.isArray(stableData)) {
          allCalendarData.push(...stableData)
          console.log(`📊 Loaded ${stableData.length} current earnings from stable API`)
        }
      }
      
      // Process future API data (upcoming months)
      if (futureResponse.ok) {
        const futureData = await futureResponse.json()
        if (Array.isArray(futureData)) {
          // Filter out duplicates and only keep future dates
          const futureOnly = futureData.filter(event => {
            const eventDate = new Date(event.date)
            const now = new Date()
            now.setHours(0, 0, 0, 0) // Start of today
            return eventDate > now && !allCalendarData.some(existing => 
              existing.symbol === event.symbol && existing.date === event.date
            )
          })
          allCalendarData.push(...futureOnly)
          console.log(`📊 Loaded ${futureOnly.length} future earnings from v3 API`)
        }
      }
      
      // Now process the combined data
      if (allCalendarData.length > 0) {
        
        if (Array.isArray(allCalendarData)) {
          // Filter for major US companies only
          const relevantEvents = allCalendarData
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
            .slice(0, 5000) // Increase limit to catch all major companies
          
          console.log(`📊 Filtered ${allCalendarData.length} events down to ${relevantEvents.length} relevant US companies`)
          
          console.log(`📊 Processing ${relevantEvents.length} relevant events`)
          
          // Priority major companies (always include if present)
          const majorTickers = ['AAPL', 'AMZN', 'MSFT', 'GOOGL', 'TSLA', 'META', 'NVDA', 'LLY', 'MA', 'V', 'UNH', 'HD', 'PG']
          const priorityEvents = relevantEvents.filter(event => majorTickers.includes(event.symbol))
          const otherEvents = relevantEvents.filter(event => !majorTickers.includes(event.symbol))
          
          console.log(`🎯 Found ${priorityEvents.length} major companies: ${priorityEvents.map(e => e.symbol).join(', ')}`)
          
          // Get market cap data efficiently (priority events first, then sample of others)
          const batchSize = 100
          const allEventsWithMarketCap = []
          
          // Process priority events first
          if (priorityEvents.length > 0) {
            const priorityPromises = priorityEvents.map(async (event) => {
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
                // Continue on errors
              }
              return { ...event, marketCap: 0 }
            })
            
            const priorityResults = await Promise.all(priorityPromises)
            allEventsWithMarketCap.push(...priorityResults)
            console.log(`✅ Processed ${priorityEvents.length} priority companies`)
          }
          
          // Process sample of other events
          const sampleOtherEvents = otherEvents.slice(0, 300) // Take first 300 others
          for (let i = 0; i < sampleOtherEvents.length; i += batchSize) {
            const batch = sampleOtherEvents.slice(i, i + batchSize)
            
            const marketCapPromises = batch.map(async (event) => {
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
                // Continue on errors
              }
              return { ...event, marketCap: 0 }
            })
            
            const batchResults = await Promise.all(marketCapPromises)
            allEventsWithMarketCap.push(...batchResults)
            
            // Limit to avoid too many API calls
            if (i >= 200) break
          }
          
          // Sort ALL events by market cap (highest first)
          const sortedEvents = allEventsWithMarketCap
            .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
            .slice(0, 150) // Top 150 companies by market cap
          
          console.log(`🎯 Final sorted list - Top 5: ${sortedEvents.slice(0, 5).map(e => `${e.symbol} (${e.marketCap ? '$' + (e.marketCap/1000000000).toFixed(1) + 'B' : 'N/A'})`).join(', ')}`)
          
          // Process earnings events with better company names
          for (const event of sortedEvents) {
            earningsEvents.push({
              ticker: event.symbol,
              companyName: event.name || event.symbol,
              date: event.date,
              time: event.time || 'amc', // Use API time if available, otherwise default to amc
              quarter: `Q${Math.ceil(new Date(event.date).getMonth() / 3)} ${new Date(event.date).getFullYear()}`,
              fiscalYear: new Date(event.date).getFullYear().toString(),
              estimatedEPS: event.epsEstimated || event.eps || null, // Handle both API formats
              actualEPS: event.epsActual || event.epsEstimated || null, // Handle both API formats
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