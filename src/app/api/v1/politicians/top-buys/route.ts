// GET /api/v1/politicians/top-buys — Top gekaufte Aktien im Kongress
// Aggregiert alle Politiker-Trades und zeigt die meistgekauften Aktien
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface Trade {
  ticker: string; assetDescription: string; type: string
  transactionDate: string; amount: string; representative: string; slug: string
}

function amountMidpoint(amount: string): number {
  const ranges: Record<string, number> = {
    '$1,001 - $15,000': 8000,
    '$15,001 - $50,000': 32500,
    '$50,001 - $100,000': 75000,
    '$100,001 - $250,000': 175000,
    '$250,001 - $500,000': 375000,
    '$500,001 - $1,000,000': 750000,
    '$1,000,001 - $5,000,000': 3000000,
    '$5,000,001 - $25,000,000': 15000000,
    '$25,000,001 - $50,000,000': 37500000,
    'Over $50,000,000': 75000000,
  }
  return ranges[amount] || 0
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const months = parseInt(searchParams.get('months') || '3') // Default: letzte 3 Monate
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const type = searchParams.get('type') || 'purchase' // purchase oder sale

  try {
    const dataDir = path.join(process.cwd(), 'src/data/politician-trades')
    const files = (await fs.readdir(dataDir)).filter(f => f.endsWith('.json') && f !== 'index.json')

    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - months)
    const cutoff = cutoffDate.toISOString().split('T')[0]

    // Alle Trades laden und aggregieren
    const tickerAgg: Record<string, {
      ticker: string; name: string; buyCount: number; sellCount: number
      totalVolume: number; buyers: Set<string>; sellers: Set<string>
      latestDate: string
    }> = {}

    for (const file of files) {
      try {
        const raw = await fs.readFile(path.join(dataDir, file), 'utf-8')
        const data = JSON.parse(raw)
        const trades: Trade[] = data.trades || []

        for (const t of trades) {
          if (!t.ticker || t.transactionDate < cutoff) continue

          if (!tickerAgg[t.ticker]) {
            tickerAgg[t.ticker] = {
              ticker: t.ticker, name: t.assetDescription || t.ticker,
              buyCount: 0, sellCount: 0, totalVolume: 0,
              buyers: new Set(), sellers: new Set(),
              latestDate: '',
            }
          }

          const agg = tickerAgg[t.ticker]
          const vol = amountMidpoint(t.amount)

          if (t.type === 'purchase') {
            agg.buyCount++
            agg.buyers.add(t.slug || t.representative)
          } else {
            agg.sellCount++
            agg.sellers.add(t.slug || t.representative)
          }
          agg.totalVolume += vol
          if (t.transactionDate > agg.latestDate) agg.latestDate = t.transactionDate
        }
      } catch { /* skip broken files */ }
    }

    // Sortieren nach gewünschtem Typ
    const sortKey = type === 'purchase' ? 'buyCount' : 'sellCount'
    const results = Object.values(tickerAgg)
      .map(a => ({
        ticker: a.ticker,
        name: a.name,
        buyCount: a.buyCount,
        sellCount: a.sellCount,
        totalVolume: a.totalVolume,
        volumeFormatted: a.totalVolume >= 1e6 ? `$${(a.totalVolume / 1e6).toFixed(1)}M` : `$${(a.totalVolume / 1e3).toFixed(0)}K`,
        uniqueBuyers: a.buyers.size,
        uniqueSellers: a.sellers.size,
        netSentiment: a.buyCount - a.sellCount,
        latestDate: a.latestDate,
      }))
      .filter(a => type === 'purchase' ? a.buyCount > 0 : a.sellCount > 0)
      .sort((a, b) => {
        if (type === 'purchase') return b.buyCount - a.buyCount || b.totalVolume - a.totalVolume
        return b.sellCount - a.sellCount || b.totalVolume - a.totalVolume
      })
      .slice(0, limit)

    return NextResponse.json({
      type,
      period: `${months} Monate`,
      cutoffDate: cutoff,
      topStocks: results,
      totalAggregated: Object.keys(tickerAgg).length,
      source: 'stock-act-disclosures',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to aggregate trades' }, { status: 500 })
  }
}
