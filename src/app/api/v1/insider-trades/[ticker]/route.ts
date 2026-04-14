// Finclue Data API v1 – Insider Trades (SEC Form 4)
// GET /api/v1/insider-trades/{ticker}
// GET /api/v1/insider-trades/{ticker}?type=buy&limit=20
// Source: SEC EDGAR Form 4 – 100% eigene Daten, kostenlos

import { NextRequest, NextResponse } from 'next/server'
import { getInsiderTrades } from '@/lib/sec/insiderTradesService'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
  const typeFilter = searchParams.get('type') // 'buy' | 'sell'

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  try {
    let trades = await getInsiderTrades(ticker, { limit: limit * 2 })

    // Filter by type
    if (typeFilter === 'buy') trades = trades.filter(t => t.type === 'buy')
    if (typeFilter === 'sell') trades = trades.filter(t => t.type === 'sell')

    trades = trades.slice(0, limit)

    // Summary stats
    const buys = trades.filter(t => t.type === 'buy')
    const sells = trades.filter(t => t.type === 'sell')
    const buyValue = buys.reduce((s, t) => s + (t.totalValue || 0), 0)
    const sellValue = sells.reduce((s, t) => s + (t.totalValue || 0), 0)

    // Format for response
    const formatted = trades.map(t => ({
      insiderName: t.insiderName,
      title: t.title || (t.isDirector ? 'Director' : t.is10PctOwner ? '10% Owner' : 'Insider'),
      type: t.type,
      transactionCode: t.transactionCode,
      transactionDate: t.transactionDate,
      filingDate: t.filingDate,
      shares: t.shares,
      pricePerShare: t.pricePerShare,
      totalValue: t.totalValue,
      sharesAfter: t.sharesAfter,
      securityType: t.securityType,
      filingUrl: t.filingUrl,
    }))

    return NextResponse.json({
      ticker,
      trades: formatted,
      count: formatted.length,
      summary: {
        totalBuys: buys.length,
        totalSells: sells.length,
        buyVolume: buyValue,
        sellVolume: sellValue,
        netVolume: buyValue - sellValue,
        sentiment: buyValue > sellValue * 1.2 ? 'bullish' : sellValue > buyValue * 1.2 ? 'bearish' : 'neutral',
      },
      source: 'sec-form4',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=86400' },
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
