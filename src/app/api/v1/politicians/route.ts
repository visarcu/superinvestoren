// GET /api/v1/politicians — Alle Politiker mit Statistiken
// Quelle: STOCK Act Disclosures (House + Senate), eigene Daten
import { NextRequest, NextResponse } from 'next/server'
import politicianIndex from '@/data/politician-trades/index.json'

interface IndexEntry {
  slug: string; name: string; chamber: string; state: string
  tradeCount: number; lastTradeDate: string; recentTickers: string[]
  bioguideId?: string; photoUrl?: string; party?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase()
  const chamber = searchParams.get('chamber') // senate, house
  const party = searchParams.get('party') // Democrat, Republican
  const sort = searchParams.get('sort') || 'recent' // recent, trades, name
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  let politicians = (politicianIndex as IndexEntry[]).map(p => ({
    slug: p.slug,
    name: p.name,
    chamber: p.chamber,
    state: p.state,
    party: p.party || null,
    tradeCount: p.tradeCount,
    lastTradeDate: p.lastTradeDate,
    recentTickers: p.recentTickers,
    photoUrl: p.photoUrl || null,
    bioguideId: p.bioguideId || null,
  }))

  // Filter
  if (search) {
    politicians = politicians.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.slug.includes(search) ||
      p.state.toLowerCase().includes(search)
    )
  }
  if (chamber) {
    politicians = politicians.filter(p => p.chamber === chamber)
  }
  if (party) {
    politicians = politicians.filter(p => p.party?.startsWith(party))
  }

  // Sort
  if (sort === 'recent') {
    politicians.sort((a, b) => (b.lastTradeDate || '').localeCompare(a.lastTradeDate || ''))
  } else if (sort === 'trades') {
    politicians.sort((a, b) => b.tradeCount - a.tradeCount)
  } else if (sort === 'name') {
    politicians.sort((a, b) => a.name.localeCompare(b.name))
  }

  const total = politicians.length
  politicians = politicians.slice(0, limit)

  return NextResponse.json({
    politicians,
    total,
    filters: { search, chamber, party, sort },
    source: 'stock-act-disclosures',
    fetchedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
  })
}
