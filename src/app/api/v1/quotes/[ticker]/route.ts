// Finclue Data API v1 – Real-Time Stock Quote
// GET /api/v1/quotes/{ticker}
//
// Nutzt denselben Quote-Service wie /api/quotes: Stammdaten je ISIN, EODHD für
// europäische Börsen, FMP für US-Werte, Yahoo als letzte Instanz.
//
// Vorher lief hier Finnhub mit einem FMP-Fallback — und die Währung kam aus
// einer Ticker-Tabelle, die britische Papiere nicht kannte: ULVR.L lieferte
// 4670 (Pence) ausgewiesen als USD. Jede Rechnung gegen diesen Preis lag um
// den Faktor 100 daneben.

import { NextRequest, NextResponse } from 'next/server'
import { getQuotes } from '@/lib/marketData/quoteService'
import { convertAmount } from '@/lib/marketData/currency'
import { detectTickerCurrency } from '@/lib/fmp'
import { getEUCompanyInfo } from '@/lib/tickerResolver'

function expectedCurrency(symbol: string): string {
  const currency = detectTickerCurrency(symbol)
  // '.L' notiert in Pence — der Contract von /api/quotes gilt hier genauso.
  return currency === 'GBP' ? 'GBX' : currency
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  if (!/^[A-Z0-9.^-]{1,15}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  try {
    const quotes = await getQuotes([ticker])
    const quote = quotes.get(ticker)

    if (!quote) {
      return NextResponse.json(
        { error: `Kein Kurs gefunden für ${ticker}`, symbol: ticker },
        { status: 404 }
      )
    }

    const target = expectedCurrency(ticker)
    const price = await convertAmount(quote.price, quote.currency, target)
    if (price === null || price <= 0) {
      return NextResponse.json(
        { error: `Kurs für ${ticker} nicht umrechenbar`, symbol: ticker },
        { status: 404 }
      )
    }

    const change = (await convertAmount(quote.change, quote.currency, target)) ?? 0
    const previousClose = (await convertAmount(quote.previousClose, quote.currency, target)) ?? null
    const raw = (quote.raw || {}) as Record<string, any>
    const euInfo = getEUCompanyInfo(ticker)

    return NextResponse.json(
      {
        symbol: ticker,
        price,
        change,
        changePercent: quote.changePercent,
        dayHigh: raw.dayHigh ?? null,
        dayLow: raw.dayLow ?? null,
        open: raw.open ?? null,
        previousClose,
        marketCap: raw.marketCap ?? null,
        name: quote.name || euInfo?.name || null,
        exchange: raw.exchange || euInfo?.exchange || null,
        // Die tatsächliche Notierungswährung — 'GBX' heißt Pence.
        currency: target,
        country: euInfo?.country || null,
        timestamp: raw.timestamp || Math.floor(Date.now() / 1000),
        source: quote.source,
      },
      { headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
