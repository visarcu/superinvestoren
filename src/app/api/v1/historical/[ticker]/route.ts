// Finclue Data API v1 – Historical EOD für ein einzelnes Symbol
// GET /api/v1/historical/AAPL?days=730
//
// Nutzt eodhdService.getEodhdHistorical (mit Yahoo-Fallback bei EODHD-401).
// Antwort-Shape kompatibel zum alten /api/historical/[ticker] (FMP-basiert).

import { NextRequest, NextResponse } from 'next/server'
import { getEodhdFxHistory, getEodhdHistorical } from '@/lib/eodhdService'
import { resolveEUTicker } from '@/lib/tickerResolver'

function isEURTicker(symbol: string): boolean {
  return /\.(DE|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU)$/i.test(symbol)
}

function isGBXTicker(symbol: string): boolean {
  return /\.L$/i.test(symbol)
}

function getRateForDate(rateMap: Map<string, number>, date: string, fallback: number): number {
  const direct = rateMap.get(date)
  if (direct && direct > 0) return direct

  const dates = Array.from(rateMap.keys()).sort()
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= date) {
      const rate = rateMap.get(dates[i])
      if (rate && rate > 0) return rate
    }
  }

  return fallback
}

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
  const convertToEUR = searchParams.get('convertToEUR') === 'true'

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const fromDate = startDate.toISOString().slice(0, 10)
  const toDate = endDate.toISOString().slice(0, 10)

  // EU-Ticker-Resolution (BMW → BMW.DE → EODHD mapped → BMW.XETRA)
  const euMapping = resolveEUTicker(rawTicker)
  const lookupSymbol = euMapping?.fmp || rawTicker

  try {
    const [points, usdEurMap, gbpEurMap] = await Promise.all([
      getEodhdHistorical(lookupSymbol, fromDate, toDate),
      convertToEUR && !isEURTicker(lookupSymbol) && !isGBXTicker(lookupSymbol)
        ? getEodhdFxHistory('USDEUR', fromDate, toDate)
        : Promise.resolve(new Map<string, number>()),
      convertToEUR && isGBXTicker(lookupSymbol)
        ? getEodhdFxHistory('GBPEUR', fromDate, toDate)
        : Promise.resolve(new Map<string, number>()),
    ])

    // Antwort-Shape: { historical: [{ date, close }] } - kompatibel zum alten Endpoint.
    // Sortiert absteigend (neuestes zuerst), wie FMP es liefert.
    const historical = points
      .map(p => ({
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: convertToEUR
          ? isEURTicker(lookupSymbol)
            ? p.close
            : isGBXTicker(lookupSymbol)
              ? (p.close / 100) * getRateForDate(gbpEurMap, p.date, 1.16)
              : p.close * getRateForDate(usdEurMap, p.date, 0.92)
          : p.close,
        adjClose: convertToEUR
          ? isEURTicker(lookupSymbol)
            ? p.adjusted_close
            : isGBXTicker(lookupSymbol)
              ? (p.adjusted_close / 100) * getRateForDate(gbpEurMap, p.date, 1.16)
              : p.adjusted_close * getRateForDate(usdEurMap, p.date, 0.92)
          : p.adjusted_close,
        volume: p.volume,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json(
      {
        symbol: rawTicker,
        historical,
        count: historical.length,
        _currency: convertToEUR ? 'EUR' : undefined,
        _converted: convertToEUR || undefined,
      },
      { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
