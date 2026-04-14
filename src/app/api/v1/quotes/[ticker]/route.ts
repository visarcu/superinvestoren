// Finclue Data API v1 – Real-Time Stock Quote
// GET /api/v1/quotes/{ticker}
// Source: Finnhub (kostenlos, Echtzeit, 60 calls/min)
// Fallback: FMP (wenn Finnhub keinen Kurs hat)

import { NextRequest, NextResponse } from 'next/server'
import { getFinnhubQuote, getFinnhubProfile } from '@/lib/finnhubService'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  try {
    // Primary: Finnhub (kostenlos, Echtzeit)
    const [quote, profile] = await Promise.all([
      getFinnhubQuote(ticker),
      getFinnhubProfile(ticker),
    ])

    if (quote) {
      return NextResponse.json({
        symbol: ticker,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        dayHigh: quote.high,
        dayLow: quote.low,
        open: quote.open,
        previousClose: quote.previousClose,
        marketCap: profile?.marketCap || null,
        name: profile?.name || null,
        exchange: profile?.exchange || null,
        currency: profile?.currency || 'USD',
        timestamp: quote.timestamp,
        source: 'finnhub',
      }, {
        headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' },
      })
    }

    // Fallback: FMP (wenn Finnhub den Ticker nicht kennt)
    const fmpKey = process.env.FMP_API_KEY
    if (fmpKey) {
      const fmpRes = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${fmpKey}`,
        { next: { revalidate: 30 } }
      )
      if (fmpRes.ok) {
        const fmpData = await fmpRes.json()
        const q = Array.isArray(fmpData) ? fmpData[0] : fmpData
        if (q?.price) {
          return NextResponse.json({
            symbol: ticker,
            price: q.price,
            change: q.change || 0,
            changePercent: q.changesPercentage || 0,
            dayHigh: q.dayHigh || null,
            dayLow: q.dayLow || null,
            open: q.open || null,
            previousClose: q.previousClose || null,
            marketCap: q.marketCap || null,
            name: q.name || null,
            exchange: q.exchange || null,
            currency: 'USD',
            timestamp: q.timestamp || Math.floor(Date.now() / 1000),
            source: 'fmp-fallback',
          }, {
            headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' },
          })
        }
      }
    }

    return NextResponse.json({
      error: `Kein Kurs gefunden für ${ticker}`,
      symbol: ticker,
    }, { status: 404 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
