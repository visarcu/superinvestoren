// Economic Calendar API - Important macro events
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Default to current week if no dates provided
    const now = new Date()
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diff = day === 0 ? -6 : 1 - day
    startOfWeek.setDate(startOfWeek.getDate() + diff)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const fromDate = from || startOfWeek.toISOString().split('T')[0]
    const toDate = to || endOfWeek.toISOString().split('T')[0]

    console.log(`📅 [Economic Calendar] Loading events from ${fromDate} to ${toDate}`)

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${process.env.FMP_API_KEY}`
    )

    if (!response.ok) {
      console.error('FMP API error:', response.status)
      return NextResponse.json({ error: 'Failed to fetch economic calendar' }, { status: 500 })
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return NextResponse.json([])
    }

    // Filter and enrich events
    // Focus on major economies: US, EU, DE, UK, JP, CN
    const majorCountries = ['US', 'EU', 'DE', 'UK', 'JP', 'CN', 'CA', 'AU']

    const filteredEvents = data
      .filter((event: any) => {
        // Include High impact from anywhere
        if (event.impact === 'High') return true
        // Include Medium impact from major economies
        if (event.impact === 'Medium' && majorCountries.includes(event.country)) return true
        return false
      })
      .map((event: any) => ({
        date: event.date,
        country: event.country,
        event: event.event,
        impact: event.impact,
        actual: event.actual,
        previous: event.previous,
        estimate: event.estimate,
        change: event.change,
        changePercentage: event.changePercentage,
        unit: event.unit
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log(`✅ [Economic Calendar] Loaded ${filteredEvents.length} events (from ${data.length} total)`)

    return NextResponse.json(filteredEvents)

  } catch (error) {
    console.error('❌ Economic Calendar API Error:', error)
    return NextResponse.json({ error: 'Failed to load economic calendar' }, { status: 500 })
  }
}
