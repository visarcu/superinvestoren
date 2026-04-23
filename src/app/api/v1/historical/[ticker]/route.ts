// Finclue Data API v1 – Historical EOD für ein einzelnes Symbol
// GET /api/v1/historical/AAPL?days=730
//
// Nutzt eodhdService.getEodhdHistorical (mit Yahoo-Fallback bei EODHD-401).
// Antwort-Shape kompatibel zum alten /api/historical/[ticker] (FMP-basiert).

import { NextRequest, NextResponse } from 'next/server'
import { getEodhdHistorical } from '@/lib/eodhdService'
import { resolveEUTicker } from '@/lib/tickerResolver'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const rawTicker = params.ticker?.toUpperCase()
  if (!rawTicker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '730'), 7), 1825)

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const fromDate = startDate.toISOString().slice(0, 10)
  const toDate = endDate.toISOString().slice(0, 10)

  // EU-Ticker-Resolution (BMW → BMW.DE → EODHD mapped → BMW.XETRA)
  const euMapping = resolveEUTicker(rawTicker)
  const lookupSymbol = euMapping?.fmp || rawTicker

  try {
    const points = await getEodhdHistorical(lookupSymbol, fromDate, toDate)

    // Antwort-Shape: { historical: [{ date, close }] } - kompatibel zum alten Endpoint.
    // Sortiert absteigend (neuestes zuerst), wie FMP es liefert.
    const historical = points
      .map(p => ({
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        adjClose: p.adjusted_close,
        volume: p.volume,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json(
      {
        symbol: rawTicker,
        historical,
        count: historical.length,
      },
      { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
