// GET /api/v1/politicians/top-buys — Top gekaufte Aktien im Kongress
// Aggregiert die Politiker-Trades aus der DB und zeigt die meistgekauften Aktien
import { NextRequest, NextResponse } from 'next/server'
import { getTradesSince } from '@/lib/politicianTradesDb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const months = parseInt(searchParams.get('months') || '3') // Default: letzte 3 Monate
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const type = searchParams.get('type') || 'purchase' // purchase oder sale

  try {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - months)
    const cutoff = cutoffDate.toISOString().split('T')[0]

    const trades = await getTradesSince(cutoff)

    const tickerAgg: Record<
      string,
      {
        ticker: string
        name: string
        buyCount: number
        sellCount: number
        totalVolume: number
        buyers: Set<string>
        sellers: Set<string>
        latestDate: string
      }
    > = {}

    for (const t of trades) {
      if (!t.ticker) continue

      if (!tickerAgg[t.ticker]) {
        tickerAgg[t.ticker] = {
          ticker: t.ticker,
          name: t.assetDescription || t.ticker,
          buyCount: 0,
          sellCount: 0,
          totalVolume: 0,
          buyers: new Set(),
          sellers: new Set(),
          latestDate: '',
        }
      }

      const agg = tickerAgg[t.ticker]
      if (t.type === 'purchase') {
        agg.buyCount++
        agg.buyers.add(t.politicianSlug)
      } else {
        agg.sellCount++
        agg.sellers.add(t.politicianSlug)
      }
      agg.totalVolume += t.amountMid || 0
      if (t.transactionDate > agg.latestDate) agg.latestDate = t.transactionDate
    }

    const results = Object.values(tickerAgg)
      .map(a => ({
        ticker: a.ticker,
        name: a.name,
        buyCount: a.buyCount,
        sellCount: a.sellCount,
        totalVolume: a.totalVolume,
        volumeFormatted:
          a.totalVolume >= 1e6 ? `$${(a.totalVolume / 1e6).toFixed(1)}M` : `$${(a.totalVolume / 1e3).toFixed(0)}K`,
        uniqueBuyers: a.buyers.size,
        uniqueSellers: a.sellers.size,
        netSentiment: a.buyCount - a.sellCount,
        latestDate: a.latestDate,
      }))
      .filter(a => (type === 'purchase' ? a.buyCount > 0 : a.sellCount > 0))
      .sort((a, b) => {
        if (type === 'purchase') return b.buyCount - a.buyCount || b.totalVolume - a.totalVolume
        return b.sellCount - a.sellCount || b.totalVolume - a.totalVolume
      })
      .slice(0, limit)

    return NextResponse.json(
      {
        type,
        period: `${months} Monate`,
        cutoffDate: cutoff,
        topStocks: results,
        totalAggregated: Object.keys(tickerAgg).length,
        source: 'stock-act-disclosures',
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } }
    )
  } catch (error) {
    console.error('Top-Buys Aggregation Fehler:', error)
    return NextResponse.json({ error: 'Failed to aggregate trades' }, { status: 500 })
  }
}
