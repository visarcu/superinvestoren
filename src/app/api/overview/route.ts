// API route for optimized overview page data
// Die Berechnung liegt in src/lib/superinvestorOverview.ts (auch von der
// Server-Seite /superinvestor genutzt).
import { NextResponse } from 'next/server'
import { buildOverviewData } from '@/lib/superinvestorOverview'

// Nicht beim Build vorrendern (Static-Generation-Timeout bei wachsendem Datenbestand)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(buildOverviewData(), {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', // 1 hour cache, 1 day stale
      },
    })
  } catch (error) {
    console.error('❌ Error calculating overview data:', error)
    return NextResponse.json({ error: 'Failed to load overview data' }, { status: 500 })
  }
}
