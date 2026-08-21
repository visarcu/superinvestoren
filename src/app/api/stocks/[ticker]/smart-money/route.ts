// API route: Smart-Money-Events (Superinvestoren + Insider + Kongress) für den Chart-Layer
import { NextRequest, NextResponse } from 'next/server'
import { getCongressEvents, getInsiderEvents, getSuperinvestorEvents } from '@/lib/smartMoney'

// Schwerer Holdings-Import + Auswertung über die komplette Historie —
// nicht beim Build vorrendern (gleiches Pattern wie super-investor-analysis).
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase()
    if (!/^[A-Z0-9.\-]{1,12}$/.test(ticker)) {
      return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
    }

    const [events, insiderEvents, congressEvents] = await Promise.all([
      Promise.resolve().then(() => getSuperinvestorEvents(ticker)),
      getInsiderEvents(ticker),
      Promise.resolve().then(() => getCongressEvents(ticker)),
    ])

    return NextResponse.json(
      { ticker, events, insiderEvents, congressEvents, generatedAt: new Date().toISOString() },
      {
        headers: {
          // Holdings ändern sich quartalsweise — 1h CDN-Cache reicht locker
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error(`❌ Error building smart money events for ${params.ticker}:`, error)
    return NextResponse.json(
      { error: 'Failed to load smart money events' },
      { status: 500 }
    )
  }
}
