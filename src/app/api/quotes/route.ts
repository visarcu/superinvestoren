// src/app/api/quotes/route.ts
// Primäre Quelle: FMP (Financial Modeling Prep)
// Fallback: Yahoo Finance (für europäische ETFs die FMP nicht abdeckt)
import { NextResponse } from 'next/server'

/**
 * Yahoo Finance Fallback: Kurs für ein einzelnes Symbol holen.
 * Wird nur aufgerufen wenn FMP keinen Kurs liefert.
 */
async function fetchYahooQuote(symbol: string): Promise<{
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  previousClose: number
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d&region=DE`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(5000), // 5s Timeout
    })

    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const price = meta?.regularMarketPrice
    const previousClose = meta?.chartPreviousClose || meta?.previousClose || 0

    if (!price || price <= 0) return null

    const change = previousClose > 0 ? price - previousClose : 0
    const changesPercentage = previousClose > 0 ? (change / previousClose) * 100 : 0

    return {
      symbol,
      name: meta?.shortName || meta?.longName || symbol,
      price,
      changesPercentage,
      change,
      previousClose,
    }
  } catch {
    // Yahoo fallback fehlgeschlagen — still ignorieren
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get('symbols')
  if (!symbols) {
    return NextResponse.json([], { status: 400 })
  }

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)

  // **Hier** URL-Encoding pro Symbol:
  const encoded = symbolList
    .map((s) => encodeURIComponent(s))
    .join(',')

  const url = `https://financialmodelingprep.com/api/v3/quote/${encoded}?apikey=${process.env.FMP_API_KEY}`

  let quotes: any[] = []
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`FMP antwortete mit ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      quotes = data
    }
  } catch (err) {
    console.error('FMP /api/quotes failed:', err)
    // Nicht sofort 502 — versuche Yahoo Fallback
  }

  // Prüfe welche Symbole FMP nicht geliefert hat
  const fmpSymbols = new Set(quotes.map((q: any) => q.symbol))
  const missingSymbols = symbolList.filter(s => !fmpSymbols.has(s))

  // Yahoo Finance Fallback für fehlende Symbole
  if (missingSymbols.length > 0) {
    const yahooPromises = missingSymbols.map(s => fetchYahooQuote(s))
    const yahooResults = await Promise.allSettled(yahooPromises)

    for (const result of yahooResults) {
      if (result.status === 'fulfilled' && result.value) {
        // Yahoo-Quote als FMP-kompatibles Objekt hinzufügen
        quotes.push({
          ...result.value,
          dayLow: result.value.price,
          dayHigh: result.value.price,
          yearHigh: 0,
          yearLow: 0,
          marketCap: 0,
          priceAvg50: 0,
          priceAvg200: 0,
          exchange: 'XETRA',
          volume: 0,
          avgVolume: 0,
          open: result.value.previousClose,
          eps: 0,
          pe: 0,
          earningsAnnouncement: '',
          sharesOutstanding: 0,
          timestamp: Math.floor(Date.now() / 1000),
          _source: 'yahoo', // Interne Markierung
        })
      }
    }
  }

  return NextResponse.json(quotes)
}
