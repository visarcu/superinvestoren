// GET /api/v1/politicians — Alle Politiker mit Statistiken
// Quelle: eigene DB (STOCK Act Disclosures), befüllt vom Cron
// /api/cron/sync-politician-trades.
import { NextRequest, NextResponse } from 'next/server'
import { listPoliticians } from '@/lib/politicianTradesDb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const chamber = searchParams.get('chamber') // senate, house
  const party = searchParams.get('party') // Democrat, Republican
  const sort = searchParams.get('sort') || 'recent' // recent, trades, name
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  try {
    const { politicians, total } = await listPoliticians({ search, chamber, party, sort, limit })

    return NextResponse.json(
      {
        politicians: politicians.map(p => ({
          slug: p.slug,
          name: p.name,
          chamber: p.chamber,
          state: p.state || '',
          party: p.party,
          tradeCount: p.tradeCount,
          lastTradeDate: p.lastTradeDate || '',
          recentTickers: p.recentTickers,
          photoUrl: p.photoUrl,
          bioguideId: p.bioguideId,
        })),
        total,
        filters: { search, chamber, party, sort },
        source: 'stock-act-disclosures',
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    console.error('Politiker-Liste Fehler:', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
