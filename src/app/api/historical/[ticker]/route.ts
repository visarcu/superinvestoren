// src/app/api/historical/[ticker]/route.ts
// Primär: FMP (Financial Modeling Prep)
// Fallback: Yahoo Finance (für europäische ETFs die FMP schlecht abdeckt)
import { NextRequest, NextResponse } from 'next/server'

/**
 * Yahoo Finance Historical Data Fallback.
 * Liefert tägliche Kurse für max. 5 Jahre.
 * Wird aufgerufen wenn FMP keine oder zu wenige Daten hat.
 */
async function fetchYahooHistorical(symbol: string): Promise<{ date: string; close: number }[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1d&region=DE`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const timestamps: number[] = result.timestamp || []
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []

    if (!timestamps.length || !closes.length) return null

    const historical: { date: string; close: number }[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i]
      if (close === null || close === undefined || close <= 0) continue
      const d = new Date(timestamps[i] * 1000)
      const dateStr = d.toISOString().split('T')[0]
      historical.push({ date: dateStr, close: Math.round(close * 100) / 100 })
    }

    return historical.length > 0 ? historical : null
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // Ist es ein europäischer Ticker? (.DE, .L, .PA, .AS, .MI etc.)
  const isEuropeanTicker = /\.(DE|L|PA|AS|MI|SW|BR|MC|VI|HE|CO|ST|OL|LS|WA|IR)$/i.test(ticker)

  try {
    // FMP als primäre Quelle
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${apiKey}`,
      { next: { revalidate: 1800 } }
    )

    let fmpData: { date: string; close: number }[] = []
    if (response.ok) {
      const data = await response.json()
      fmpData = data?.historical || []
    }

    // Prüfe ob FMP-Daten ausreichend aktuell sind
    // Für europäische Ticker: Wenn letzter Datenpunkt > 7 Tage alt oder < 30 Datenpunkte → Yahoo Fallback
    let needsFallback = false
    if (isEuropeanTicker) {
      if (fmpData.length < 30) {
        needsFallback = true
      } else {
        // Prüfe ob der neueste Datenpunkt aktuell ist (FMP sortiert DESC)
        const latestDate = new Date(fmpData[0]?.date || '1970-01-01')
        const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLatest > 7) {
          needsFallback = true
        }
      }
    }

    if (needsFallback) {
      const yahooData = await fetchYahooHistorical(ticker)
      if (yahooData && yahooData.length > 30) {
        // Yahoo liefert chronologisch (älteste zuerst) — FMP Format ist DESC (neueste zuerst)
        const sorted = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
        return NextResponse.json({
          symbol: ticker,
          historical: sorted,
          _source: 'yahoo',
        })
      }
    }

    // FMP-Daten zurückgeben (oder leeres Array)
    if (fmpData.length > 0) {
      return NextResponse.json({
        symbol: ticker,
        historical: fmpData,
      })
    }

    // Letzter Versuch: Yahoo für jeden Ticker wenn FMP komplett leer ist
    if (fmpData.length === 0) {
      const yahooData = await fetchYahooHistorical(ticker)
      if (yahooData && yahooData.length > 0) {
        const sorted = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
        return NextResponse.json({
          symbol: ticker,
          historical: sorted,
          _source: 'yahoo',
        })
      }
    }

    return NextResponse.json({ symbol: ticker, historical: [] })

  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error)

    // Bei FMP-Fehler: Yahoo als Fallback versuchen
    try {
      const yahooData = await fetchYahooHistorical(ticker)
      if (yahooData && yahooData.length > 0) {
        const sorted = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
        return NextResponse.json({
          symbol: ticker,
          historical: sorted,
          _source: 'yahoo',
        })
      }
    } catch {
      // Yahoo auch fehlgeschlagen
    }

    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 })
  }
}
