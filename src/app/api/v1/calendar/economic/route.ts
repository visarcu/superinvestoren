// Finclue Data API v1 – Economic Calendar
// GET /api/v1/calendar/economic?from=2026-04-01&to=2026-04-30
// Eigene kuratierte Daten – keine Drittanbieter-API.

import { NextRequest, NextResponse } from 'next/server'
import { ECONOMIC_EVENTS, SCHEDULED_EVENTS_2026 } from '@/lib/economic/economicEvents'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const from = searchParams.get('from') || new Date().toISOString().slice(0, 10)
  const to = searchParams.get('to') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const country = searchParams.get('country')?.toUpperCase()
  const impact = searchParams.get('impact')

  // Filter scheduled events by date range
  let events = SCHEDULED_EVENTS_2026
    .filter(se => se.date >= from && se.date <= to)
    .map(se => {
      const eventDef = ECONOMIC_EVENTS.find(e => e.id === se.eventId)
      if (!eventDef) return null
      return {
        date: se.date,
        time: se.time || null,
        name: eventDef.name,
        nameDE: eventDef.nameDE,
        country: eventDef.country,
        category: eventDef.category,
        impact: eventDef.impact,
        description: eventDef.description,
        actual: se.actual ?? null,
        forecast: se.forecast ?? null,
        previous: se.previous ?? null,
      }
    })
    .filter(Boolean)

  // Filters
  if (country) events = events.filter(e => e!.country === country)
  if (impact) events = events.filter(e => e!.impact === impact)

  // Group by date
  const byDate: Record<string, any[]> = {}
  for (const event of events) {
    if (!event) continue
    if (!byDate[event.date]) byDate[event.date] = []
    byDate[event.date].push(event)
  }

  return NextResponse.json({
    from,
    to,
    totalEvents: events.length,
    dates: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({ date, events })),
    source: 'finclue-curated',
    note: 'Kuratierte Wirtschaftstermine. Historische Werte werden über FRED (Federal Reserve) ergänzt.',
  }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}
