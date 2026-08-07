// Finclue Data API v1 – Politiker-Trades pro Aktie
// GET /api/v1/politician-trades/stock/{ticker}
// Source: Eigene Daten (STOCK Act Disclosures) aus der DB

import { NextRequest, NextResponse } from 'next/server'
import { getTradesByTicker } from '@/lib/politicianTradesDb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  try {
    const rows = await getTradesByTicker(ticker)

    // Summary über den Gesamtbestand, nicht nur über die ausgelieferte Seite
    const purchases = rows.filter(t => t.type === 'purchase')
    const sales = rows.filter(t => t.type === 'sale')

    const trades = rows.slice(0, limit).map(t => ({
      politician: {
        name: t.politicianName,
        slug: t.politicianSlug,
        party: t.party,
        chamber: t.politicianChamber,
        state: t.politicianState,
        district: t.district,
      },
      ticker: t.ticker,
      asset: t.assetDescription,
      type: t.type,
      amount: t.amount,
      transactionDate: t.transactionDate,
      disclosureDate: t.disclosureDate,
      disclosureYear: t.disclosureDate.slice(0, 4),
      owner: t.owner,
      capitalGains: t.capitalGains,
      link: t.link,
    }))

    return NextResponse.json(
      {
        ticker,
        trades,
        count: trades.length,
        totalTrades: rows.length,
        summary: {
          purchases: purchases.length,
          sales: sales.length,
          uniquePoliticians: new Set(rows.map(t => t.politicianSlug)).size,
          sentiment:
            purchases.length > sales.length * 1.5
              ? 'bullish'
              : sales.length > purchases.length * 1.5
                ? 'bearish'
                : 'neutral',
        },
        source: 'stock-act-disclosures',
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Politiker-Trades pro Aktie Fehler:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
