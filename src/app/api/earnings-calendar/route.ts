// API Route for Earnings Calendar - Gets earnings dates for multiple tickers
//
// DB-First: Liest aus der earningsCalendar-Tabelle (täglich befüllt vom
// /api/cron/sync-earnings). FMP wird nur als Fallback aufgerufen, falls
// die DB für den Zeitraum leer ist (z.B. Cron noch nicht gelaufen).
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

    // DB-First: lese die nächsten 30 Tage aus der earningsCalendar-Tabelle
    // (gefiltert nach Tickern). Spart einen FMP-Call pro Page-Load.
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString().split('T')[0]
      const monthAhead = new Date(today)
      monthAhead.setDate(monthAhead.getDate() + 30)
      const toDate = monthAhead.toISOString().split('T')[0]

      const dbRows = await getEarningsFromDb(todayIso, toDate, tickerArray)
      console.log(`📅 DB returned ${dbRows.length} earnings rows for ${tickerArray.length} tickers`)

      // Map DB rows ins Response-Format
      const buildEvent = (e: {
        symbol: string
        date: string
        time: string
        epsEstimate: number | null
        epsActual: number | null
        revenueEstimate: number | null
        revenueActual: number | null
        companyName: string | null
      }) => {
        const eventDate = new Date(e.date)
        const month = eventDate.getMonth() + 1
        const quarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4
        const year = eventDate.getFullYear()
        return {
          ticker: e.symbol,
          companyName: e.companyName || e.symbol,
          date: e.date,
          time: e.time || 'TBD',
          quarter: `Q${quarter} ${year}`,
          fiscalYear: year.toString(),
          estimatedEPS: e.epsEstimate,
          actualEPS: e.epsActual,
          revenueEstimated: e.revenueEstimate,
          revenueActual: e.revenueActual,
        }
      }

      if (dbRows.length > 0) {
        earningsEvents.push(...dbRows.slice(0, 20).map(buildEvent))
      } else {
        // Fallback: DB leer für diesen Zeitraum (Cron noch nicht gelaufen?) → FMP
        console.warn('⚠️ DB-Earnings leer, fallback zu FMP')
        const calendarResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/earning_calendar?from=${todayIso}&to=${toDate}&apikey=${FMP_API_KEY}`,
          { next: { revalidate: 3600 } }
        )
        if (calendarResponse.ok) {
          const calendarData = await calendarResponse.json()
          if (Array.isArray(calendarData)) {
            const relevant = calendarData
              .filter((event: { symbol?: string; date?: string }) =>
                event.symbol && event.date && tickerArray.includes(event.symbol) && new Date(event.date) >= today
              )
              .slice(0, 20)
              .map((event: {
                symbol: string
                date: string
                time?: string
                epsEstimated?: number | string | null
                epsActual?: number | string | null
                revenueEstimated?: number | string | null
                revenueActual?: number | string | null
              }) => buildEvent({
                symbol: event.symbol,
                date: event.date,
                time: event.time || 'TBD',
                epsEstimate: event.epsEstimated != null ? parseFloat(String(event.epsEstimated)) : null,
                epsActual: event.epsActual != null ? parseFloat(String(event.epsActual)) : null,
                revenueEstimate: event.revenueEstimated != null ? parseFloat(String(event.revenueEstimated)) : null,
                revenueActual: event.revenueActual != null ? parseFloat(String(event.revenueActual)) : null,
                companyName: null,
              }))
            earningsEvents.push(...relevant)
          }
        }
      }
    } catch (error) {
      console.log('Earnings DB read failed:', error)
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

    // Deduplicate: keep only the earliest upcoming date per symbol
    const deduped = new Map<string, typeof earningsEvents[0]>()
    for (const event of earningsEvents) {
      const existing = deduped.get(event.ticker)
      if (!existing || new Date(event.date) < new Date(existing.date)) {
        deduped.set(event.ticker, event)
      }
    }

    // Sort by date (upcoming first)
    const sortedEvents = [...deduped.values()].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    console.log(`📅 Final result: ${sortedEvents.length} earnings events (deduped from ${earningsEvents.length})`)

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