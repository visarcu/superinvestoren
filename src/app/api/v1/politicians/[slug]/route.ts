// GET /api/v1/politicians/[slug] — Einzelner Politiker mit allen Trades + Statistiken
// Quelle: eigene DB (STOCK Act Disclosures), befüllt vom Cron
// /api/cron/sync-politician-trades.
import { NextRequest, NextResponse } from 'next/server'
import { getPolitician, getPoliticianTrades, type DbTrade } from '@/lib/politicianTradesDb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug?.toLowerCase()
  if (!slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 })
  }

  try {
    const politician = await getPolitician(slug)
    if (!politician) {
      return NextResponse.json({ error: `Politician '${slug}' not found` }, { status: 404 })
    }

    const trades: DbTrade[] = await getPoliticianTrades(slug)

    // Statistiken
    const purchases = trades.filter(t => t.type === 'purchase')
    const sales = trades.filter(t => t.type === 'sale')
    const uniqueTickers = [...new Set(trades.map(t => t.ticker).filter(Boolean))]

    // Volumen aus den beim Sync berechneten Mittelwerten der Betrags-Ranges
    const totalVolume = trades.reduce((sum, t) => sum + (t.amountMid || 0), 0)

    // Top Ticker nach Volumen
    const tickerCounts: Record<string, { count: number; buys: number; sells: number; volume: number }> = {}
    for (const t of trades) {
      if (!t.ticker) continue
      if (!tickerCounts[t.ticker]) tickerCounts[t.ticker] = { count: 0, buys: 0, sells: 0, volume: 0 }
      tickerCounts[t.ticker].count++
      tickerCounts[t.ticker].volume += t.amountMid || 0
      if (t.type === 'purchase') tickerCounts[t.ticker].buys++
      else tickerCounts[t.ticker].sells++
    }
    const topTickers = Object.entries(tickerCounts)
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, 15)
      .map(([ticker, data]) => ({ ticker, ...data }))

    // Trades nach Jahr
    const byYear: Record<string, { buys: number; sells: number; volume: number }> = {}
    for (const t of trades) {
      const year = t.transactionDate.slice(0, 4)
      if (year.length !== 4) continue
      if (!byYear[year]) byYear[year] = { buys: 0, sells: 0, volume: 0 }
      byYear[year].volume += t.amountMid || 0
      if (t.type === 'purchase') byYear[year].buys++
      else byYear[year].sells++
    }
    const tradesByYear = Object.entries(byYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, data]) => ({ year, ...data, total: data.buys + data.sells }))

    // Trades kommen bereits absteigend nach transactionDate aus der DB
    const lastTradeDate = trades.length > 0 ? trades[0].transactionDate : null
    const firstTradeDate = trades.length > 0 ? trades[trades.length - 1].transactionDate : null

    return NextResponse.json(
      {
        slug: politician.slug,
        name: politician.name,
        chamber: politician.chamber,
        state: politician.state || '',
        party: politician.party,
        photoUrl: politician.photoUrl,
        bioguideId: politician.bioguideId,

        stats: {
          totalTrades: trades.length,
          purchases: purchases.length,
          sales: sales.length,
          uniqueStocks: uniqueTickers.length,
          estimatedVolume: totalVolume,
          estimatedVolumeFormatted:
            totalVolume >= 1e6 ? `$${(totalVolume / 1e6).toFixed(1)}M` : `$${(totalVolume / 1e3).toFixed(0)}K`,
          lastTradeDate,
          firstTradeDate,
        },

        topTickers,
        tradesByYear,

        trades: trades.map(t => ({
          transactionDate: t.transactionDate,
          disclosureDate: t.disclosureDate,
          ticker: t.ticker,
          asset: t.assetDescription,
          type: t.type,
          amount: t.amount,
          owner: t.owner,
          capitalGains: t.capitalGains,
          link: t.link,
        })),

        source: 'stock-act-disclosures',
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    console.error('Politiker-Detail Fehler:', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
