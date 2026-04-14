// Finclue Data API v1 – Batch Stock Quotes
// GET /api/v1/quotes/batch?symbols=AAPL,MSFT,GOOGL
// Source: Finnhub (kostenlos, Echtzeit) + FMP Fallback

import { NextRequest, NextResponse } from 'next/server'
import { getFinnhubBatchQuotes, getQuoteCacheStats } from '@/lib/finnhubService'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols') || ''
  const showStats = searchParams.get('stats') === 'true'

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
    // Finnhub batch (sequential mit Cache-Optimierung)
    const finnhubQuotes = await getFinnhubBatchQuotes(symbols)

    // Finde fehlende Symbole
    const missing = symbols.filter(s => !finnhubQuotes[s])

    // FMP Fallback für fehlende
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

    // Combine results
    const quotes = symbols.map(sym => {
      const fh = finnhubQuotes[sym]
      if (fh) {
        return {
          symbol: sym,
          price: fh.price,
          change: fh.change,
          changePercent: fh.changePercent,
          dayHigh: fh.high,
          dayLow: fh.low,
          open: fh.open,
          previousClose: fh.previousClose,
          timestamp: fh.timestamp,
          source: 'finnhub' as const,
        }
      }

      const fmp = fmpQuotes[sym]
      if (fmp) {
        return {
          symbol: sym,
          price: fmp.price,
          change: fmp.change || 0,
          changePercent: fmp.changesPercentage || 0,
          dayHigh: fmp.dayHigh || null,
          dayLow: fmp.dayLow || null,
          open: fmp.open || null,
          previousClose: fmp.previousClose || null,
          timestamp: fmp.timestamp || Math.floor(Date.now() / 1000),
          source: 'fmp-fallback' as const,
        }
      }

      return { symbol: sym, error: 'not found' }
    })

    return NextResponse.json({
      quotes,
      count: quotes.filter((q: any) => !q.error).length,
      requested: symbols.length,
      ...(showStats ? { cacheStats: getQuoteCacheStats() } : {}),
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' },
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
