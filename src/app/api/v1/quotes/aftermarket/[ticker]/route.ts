// Finclue Data API v1 – After-Hours Trade
// GET /api/v1/quotes/aftermarket/{ticker}
//
// Liefert den letzten nachbörslichen Trade-Preis (After-Hours / Pre-Market).
// Quelle: FMP Aftermarket Trade Endpoint (Premium-Plan).
// Berechnet aftermarketChange/changePct relativ zum regulären Schlusskurs.

import { NextRequest, NextResponse } from 'next/server'

interface FmpAftermarketTrade {
  symbol: string
  price: number
  size?: number
  timestamp?: number
}

interface FmpRegularQuote {
  symbol: string
  price: number
  previousClose: number
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'FMP API key not configured', symbol: ticker },
      { status: 503 }
    )
  }

  try {
    // Beide parallel: After-Hours Trade + reguläre Quote (für Schlusskurs als Referenz)
    const [tradeRes, quoteRes] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/api/v3/aftermarket-trade/${ticker}?apikey=${apiKey}`,
        { next: { revalidate: 30 } }
      ),
      fetch(
        `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`,
        { next: { revalidate: 60 } }
      ),
    ])

    const tradeData = tradeRes.ok ? await tradeRes.json() : null
    const quoteData = quoteRes.ok ? await quoteRes.json() : null

    const trade: FmpAftermarketTrade | null = Array.isArray(tradeData)
      ? tradeData[0] ?? null
      : (tradeData as FmpAftermarketTrade | null)
    const quote: FmpRegularQuote | null = Array.isArray(quoteData)
      ? quoteData[0] ?? null
      : null

    if (!trade?.price || trade.price <= 0) {
      return NextResponse.json(
        { available: false, symbol: ticker },
        {
          status: 200,
          headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=180' },
        }
      )
    }

    // Referenz-Preis: regulärer Schlusskurs (= aktuelle Quote.price wenn Markt zu)
    const referencePrice = quote?.price ?? null
    const change =
      referencePrice && referencePrice > 0 ? trade.price - referencePrice : null
    const changePct =
      change !== null && referencePrice
        ? (change / referencePrice) * 100
        : null

    return NextResponse.json(
      {
        available: true,
        symbol: ticker,
        price: trade.price,
        size: trade.size ?? null,
        timestamp: trade.timestamp ?? null,
        referencePrice,
        change,
        changePct,
        source: 'fmp',
      },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg, symbol: ticker }, { status: 500 })
  }
}
