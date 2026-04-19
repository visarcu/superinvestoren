// Finclue Data API v1 – Batch Stock Quotes
// GET /api/v1/quotes/batch?symbols=AAPL,MSFT,GOOGL
//
// Provider-agnostisch: Quote-Quelle wird über QUOTE_PROVIDER (env) gewählt
// (siehe src/lib/quoteProvider.ts). Aktuell: EODHD (default wenn Key da) oder Finnhub.
// FMP bleibt als Notfall-Fallback für fehlende Symbole.

import { NextRequest, NextResponse } from 'next/server'
import { getBatchQuotes, getActiveProvider } from '@/lib/quoteProvider'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols') || ''

  if (!symbolsParam) {
    return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.-]{1,10}$/.test(s))
    .slice(0, 30) // Max 30 pro Request

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No valid symbols' }, { status: 400 })
  }

  try {
    const provider = getActiveProvider()
    const primaryQuotes = await getBatchQuotes(symbols)

    // FMP-Fallback für fehlende Symbole (Provider-unabhängig).
    const missing = symbols.filter(s => !primaryQuotes[s])
    let fmpQuotes: Record<string, any> = {}
    if (missing.length > 0 && process.env.FMP_API_KEY) {
      try {
        const fmpRes = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${missing.join(',')}?apikey=${process.env.FMP_API_KEY}`,
          { next: { revalidate: 30 } }
        )
        if (fmpRes.ok) {
          const fmpData = await fmpRes.json()
          if (Array.isArray(fmpData)) {
            for (const q of fmpData) {
              if (q.symbol && q.price) {
                fmpQuotes[q.symbol.toUpperCase()] = q
              }
            }
          }
        }
      } catch { /* FMP Fallback Fehler ignorieren */ }
    }

    const quotes = symbols.map(sym => {
      const p = primaryQuotes[sym]
      if (p) {
        return {
          symbol: sym,
          price: p.price,
          change: p.change,
          changePercent: p.changePercent,
          dayHigh: p.high,
          dayLow: p.low,
          open: p.open,
          previousClose: p.previousClose,
          volume: p.volume,
          timestamp: p.timestamp,
          source: p.source,
        }
      }

      const fmp = fmpQuotes[sym]
      if (fmp) {
        return {
          symbol: sym,
          price: fmp.price,
          change: fmp.change || 0,
          changePercent: fmp.changesPercentage || 0,
          dayHigh: fmp.dayHigh ?? null,
          dayLow: fmp.dayLow ?? null,
          open: fmp.open ?? null,
          previousClose: fmp.previousClose ?? null,
          volume: fmp.volume ?? null,
          timestamp: fmp.timestamp || Math.floor(Date.now() / 1000),
          source: 'fmp-fallback' as const,
        }
      }

      return { symbol: sym, error: 'not found' }
    })

    return NextResponse.json(
      {
        quotes,
        count: quotes.filter((q: any) => !q.error).length,
        requested: symbols.length,
        provider,
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
