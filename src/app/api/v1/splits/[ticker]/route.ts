// Finclue Data API v1 – Stock Splits
// GET /api/v1/splits/{ticker}
// Quelle: eigene DB-Tabelle StockSplit (gefüttert aus EODHD /api/splits)

import { NextRequest, NextResponse } from 'next/server'
import { getStockSplits } from '@/lib/splitsService'

export async function GET(
  _request: NextRequest,
  { params }: { params: { ticker: string } },
) {
  const ticker = params.ticker.toUpperCase()

  if (!/^[A-Z0-9.-]{1,12}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  try {
    const splits = await getStockSplits(ticker)

    const formatted = splits.map((s) => ({
      symbol: s.symbol,
      date: s.date,
      numerator: s.numerator,
      denominator: s.denominator,
      ratio: `${s.numerator}:${s.denominator}`,
      type: s.numerator > s.denominator ? 'Aktiensplit' : 'Reverse Split',
      description:
        s.numerator > s.denominator
          ? `${s.numerator}-für-${s.denominator} Aktiensplit`
          : `${s.numerator}-für-${s.denominator} Reverse Split`,
      source: s.source,
    }))

    return NextResponse.json(
      {
        ticker,
        splits: formatted,
        count: formatted.length,
        source: 'finclue-db',
      },
      {
        headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[/api/v1/splits/${ticker}]`, message)
    return NextResponse.json(
      { error: 'Failed to fetch splits', ticker, splits: [], count: 0 },
      { status: 500 },
    )
  }
}
