// Finclue Data API v1 – Batch Stock Quotes
// GET /api/v1/quotes/batch?symbols=AAPL,MSFT,VHYL.DE
//
// Nutzt denselben Quote-Service wie /api/quotes: Stammdaten je ISIN, EODHD für
// europäische Börsen, FMP für US-Werte, Yahoo als letzte Instanz.
// Vorher lief hier eine eigene Kette ohne Stammdaten — Xetra-ETFs wie VHYL.DE
// oder DEGC.DE kamen dadurch als 'not found' zurück.

import { NextRequest, NextResponse } from 'next/server'
import { getQuotes } from '@/lib/marketData/quoteService'
import { convertAmount } from '@/lib/marketData/currency'
import { detectTickerCurrency } from '@/lib/fmp'

function expectedCurrency(symbol: string): string {
  const currency = detectTickerCurrency(symbol)
  return currency === 'GBP' ? 'GBX' : currency
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols') || ''

  if (!symbolsParam) {
    return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.^-]{1,15}$/.test(s))
    .slice(0, 50)

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No valid symbols' }, { status: 400 })
  }

  try {
    const resolved = await getQuotes(symbols)

    const quotes = await Promise.all(
      symbols.map(async sym => {
        const quote = resolved.get(sym)
        if (!quote) return { symbol: sym, error: 'not found' }

        const target = expectedCurrency(sym)
        const price = await convertAmount(quote.price, quote.currency, target)
        if (price === null || price <= 0) return { symbol: sym, error: 'not found' }

        const change = (await convertAmount(quote.change, quote.currency, target)) ?? 0
        const previousClose = (await convertAmount(quote.previousClose, quote.currency, target)) ?? null
        const raw = (quote.raw || {}) as Record<string, number | undefined>

        return {
          symbol: sym,
          price,
          change,
          changePercent: quote.changePercent,
          dayHigh: raw.dayHigh ?? null,
          dayLow: raw.dayLow ?? null,
          open: raw.open ?? null,
          previousClose,
          volume: raw.volume ?? null,
          timestamp: raw.timestamp ?? Math.floor(Date.now() / 1000),
          currency: target,
          source: quote.source,
        }
      })
    )

    return NextResponse.json(
      {
        quotes,
        count: quotes.filter((q: any) => !q.error).length,
        requested: symbols.length,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' },
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
