// API Route for All Earnings Calendar - Gets all upcoming earnings
//
// DB-First: Liest aus der earningsCalendar-Tabelle (täglich befüllt vom
// /api/cron/sync-earnings, Range = 60 Tage). Vorher hat diese Route
// 4 Monate Earnings + Stable-API direkt von FMP gezogen — extrem
// bandwidth-intensiv. FMP wird nur noch als Fallback und für die
// Quote-basierte MarketCap-Anreicherung benötigt.
import { NextRequest, NextResponse } from 'next/server'
import { getEarningsFromDb } from '@/lib/earningsCalendarDb'

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

    const { searchParams } = new URL(request.url)
    const priorityParam = searchParams.get('priority') || ''
    const priorityTickers = priorityParam
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean)
    const prioritySet = new Set(priorityTickers)

    const minMarketCap = Number(searchParams.get('minMarketCap') || 5_000_000_000) // default $5B
    const maxResults = Number(searchParams.get('limit') || 250)
    const maxTickersForMarketCap = Number(searchParams.get('maxTickers') || 1000)

    console.log(`📅 Loading ALL earnings calendar...`)

    const earningsEvents: EarningsEvent[] = []

    // DB-First: Earnings für die nächsten 45 Tage aus der DB lesen
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString().split('T')[0]
      const nextMonths = new Date(today)
      nextMonths.setDate(nextMonths.getDate() + 45)
      const endDate = nextMonths.toISOString().split('T')[0]

      const dbRows = await getEarningsFromDb(todayIso, endDate)
      console.log(`📅 DB returned ${dbRows.length} earnings rows`)

      // FMP-shape Mapping (für minimal invasive Refactoring weiter unten).
      // Bewusst lockerer Typ — die Folge-Logik greift teils auf Felder
      // zu, die nur die Stable-API zurückliefert (z.B. event.eps).
      type CalendarEvent = {
        symbol: string
        date: string
        time?: string | null
        name?: string | null
        epsEstimated?: number | string | null
        epsActual?: number | string | null
        eps?: number | string | null
        revenueEstimated?: number | string | null
        revenueActual?: number | string | null
      }
      let allCalendarData: CalendarEvent[] = dbRows.map(r => ({
        symbol: r.symbol,
        date: r.date,
        time: r.time,
        epsEstimated: r.epsEstimate,
        epsActual: r.epsActual,
        revenueEstimated: r.revenueEstimate,
        revenueActual: r.revenueActual,
        name: r.companyName,
      }))

      // Fallback nur wenn DB für diesen Zeitraum komplett leer ist
      if (allCalendarData.length === 0) {
        console.warn('⚠️ DB-Earnings leer, fallback zu FMP /v3/earning_calendar')
        const futureResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/earning_calendar?from=${todayIso}&to=${endDate}&apikey=${FMP_API_KEY}`,
          { next: { revalidate: 21600 } }
        )
        if (futureResponse.ok) {
          const futureData = await futureResponse.json()
          if (Array.isArray(futureData)) {
            allCalendarData = futureData as CalendarEvent[]
          }
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
            .slice(0, maxTickersForMarketCap)
          
          console.log(`📊 Filtered ${allCalendarData.length} events down to ${relevantEvents.length} relevant US companies`)
          
          console.log(`📊 Processing ${relevantEvents.length} relevant events`)
          
          // Priority major companies (always include if present)
          const majorTickers = ['AAPL', 'AMZN', 'MSFT', 'GOOGL', 'TSLA', 'META', 'NVDA', 'LLY', 'MA', 'V', 'UNH', 'HD', 'PG']
          const priorityEvents = relevantEvents.filter(event => majorTickers.includes(event.symbol))
          const otherEvents = relevantEvents.filter(event => !majorTickers.includes(event.symbol))
          
          console.log(`🎯 Found ${priorityEvents.length} major companies: ${priorityEvents.map(e => e.symbol).join(', ')}`)
          
          // Get market cap data efficiently (priority events first, then sample of others)
          // Fetch market caps in bulk via quote endpoint to avoid per-ticker calls
          const eventsForMarketCap = [...priorityEvents, ...otherEvents].slice(0, maxTickersForMarketCap)
          const uniqueTickers = Array.from(new Set(eventsForMarketCap.map(event => event.symbol)))
          const marketCapMap = new Map<string, number>()
          const quoteBatchSize = 200
          for (let i = 0; i < uniqueTickers.length; i += quoteBatchSize) {
            const batch = uniqueTickers.slice(i, i + quoteBatchSize)
            try {
              const quoteResponse = await fetch(
                `https://financialmodelingprep.com/api/v3/quote/${batch.join(',')}?apikey=${FMP_API_KEY}`
              )
              if (quoteResponse.ok) {
                const quoteData = await quoteResponse.json()
                quoteData.forEach((quote: any) => {
                  if (quote.symbol) {
                    marketCapMap.set(quote.symbol.toUpperCase(), quote.marketCap || 0)
                  }
                })
              }
            } catch (error) {
              console.error('Error fetching market caps for batch:', error)
            }
          }

          const eventsWithMarketCap = eventsForMarketCap.map(event => ({
            ...event,
            marketCap: marketCapMap.get(event.symbol.toUpperCase()) || 0
          }))

          const filteredByCap = eventsWithMarketCap.filter(event => {
            const cap = event.marketCap || 0
            return cap >= minMarketCap || prioritySet.has(event.symbol.toUpperCase())
          })
          
          // Sort by market cap (highest first) and ensure priority tickers bubble to top if missing cap
          const sortedEvents = filteredByCap
            .sort((a, b) => {
              const aPriority = prioritySet.has(a.symbol.toUpperCase()) ? 1 : 0
              const bPriority = prioritySet.has(b.symbol.toUpperCase()) ? 1 : 0
              if (aPriority !== bPriority) {
                return bPriority - aPriority
              }
              return (b.marketCap || 0) - (a.marketCap || 0)
            })
            .slice(0, maxResults)
          
          console.log(`🎯 Final sorted list - Top 5: ${sortedEvents.slice(0, 5).map(e => `${e.symbol} (${e.marketCap ? '$' + (e.marketCap/1000000000).toFixed(1) + 'B' : 'N/A'})`).join(', ')}`)
          
          // Helper: DB liefert numbers, FMP-Stable liefert teilweise strings
          const toNum = (v: number | string | null | undefined): number | null => {
            if (v == null) return null
            if (typeof v === 'number') return v
            const n = parseFloat(v)
            return Number.isFinite(n) ? n : null
          }

          // Process earnings events with better company names
          for (const event of sortedEvents) {
            earningsEvents.push({
              ticker: event.symbol,
              companyName: event.name || event.symbol,
              date: event.date,
              time: event.time || 'amc', // Use API time if available, otherwise default to amc
              quarter: `Q${Math.ceil(new Date(event.date).getMonth() / 3)} ${new Date(event.date).getFullYear()}`,
              fiscalYear: new Date(event.date).getFullYear().toString(),
              estimatedEPS: toNum(event.epsEstimated) ?? toNum(event.eps),
              actualEPS: toNum(event.epsActual) ?? toNum(event.epsEstimated),
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
