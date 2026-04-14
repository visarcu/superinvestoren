// Finclue Data API v1 – Politiker-Trades pro Aktie
// GET /api/v1/politician-trades/stock/{ticker}
// Source: Eigene Daten (STOCK Act Disclosures)

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  try {
    // Load politician index
    const indexPath = path.join(process.cwd(), 'src/data/politician-trades/index.json')
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as any[]

    const trades: any[] = []

    // Search through all politician files for this ticker
    for (const pol of indexData) {
      // Quick filter: skip if ticker not in recent tickers
      // (this is an optimization, we still check all trades below)
      const filePath = path.join(process.cwd(), `src/data/politician-trades/${pol.slug}.json`)
      if (!fs.existsSync(filePath)) continue

      try {
        const polData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        const polTrades = (polData.trades || []).filter((t: any) =>
          t.ticker?.toUpperCase() === ticker
        )

        for (const t of polTrades) {
          trades.push({
            politician: {
              name: polData.name || pol.name,
              slug: pol.slug,
              party: polData.party || t.party || null,
              chamber: t.chamber || pol.chamber || null,
              state: t.state || pol.state || null,
              district: t.district || null,
            },
            ticker: t.ticker?.toUpperCase(),
            asset: t.assetDescription || null,
            type: t.type || t.typeRaw || null,
            amount: t.amount || null,
            transactionDate: t.transactionDate || null,
            disclosureDate: t.disclosureDate || null,
            disclosureYear: t.disclosureYear || null,
            owner: t.owner || null,
            capitalGains: t.capitalGainsOver200USD || false,
            link: t.link || null,
          })
        }
      } catch {
        // Skip individual file errors
      }
    }

    // Sort by transaction date (newest first)
    trades.sort((a, b) => {
      const da = a.transactionDate || a.disclosureDate || ''
      const db = b.transactionDate || b.disclosureDate || ''
      return db.localeCompare(da)
    })

    // Summary
    const purchases = trades.filter(t => t.type?.toLowerCase().includes('purchase'))
    const sales = trades.filter(t => t.type?.toLowerCase().includes('sale'))

    return NextResponse.json({
      ticker,
      trades: trades.slice(0, limit),
      count: Math.min(trades.length, limit),
      totalTrades: trades.length,
      summary: {
        purchases: purchases.length,
        sales: sales.length,
        uniquePoliticians: new Set(trades.map(t => t.politician.slug)).size,
        sentiment: purchases.length > sales.length * 1.5 ? 'bullish' : sales.length > purchases.length * 1.5 ? 'bearish' : 'neutral',
      },
      source: 'stock-act-disclosures',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
