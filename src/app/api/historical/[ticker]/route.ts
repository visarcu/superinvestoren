// src/app/api/historical/[ticker]/route.ts
// Primär: FMP (Financial Modeling Prep)
// Fallback: Yahoo Finance (für europäische ETFs die FMP schlecht abdeckt)
// Zweiter Fallback: EXCHANGE_FALLBACKS aus tickerFallbacks.ts (Xetra-ETFs
// die FMP nur auf .L führt, z.B. FWRG.DE → FWRG.L mit GBp→EUR-Umrechnung)
import { NextRequest, NextResponse } from 'next/server'
import { resolveFMPTicker, isEUTicker } from '@/lib/tickerResolver'
import { resolvePriceSource } from '@/lib/etfMasterLookup'
import { EXCHANGE_FALLBACKS } from '@/data/tickerFallbacks'

// GBP→EUR Näherungsrate für historische Umrechnung. Für Chart-Trend ist das
// ausreichend — eine tagesgenaue historische FX-Rate ist pro Datenpunkt zu
// teuer (N FMP-Calls) und ändert nichts am Wachstums-Pattern.
const GBP_EUR_APPROX = 1.17

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

// Historische FX-Raten holen (EODHD oder FMP Fallback)
async function fetchHistoricalFxRates(
  pair: string, // z.B. 'USDEUR'
  from: string,
  to: string,
  fmpApiKey: string,
): Promise<Map<string, number>> {
  const rateMap = new Map<string, number>()
  const eodhd = process.env.EODHD_API_KEY

  // Versuch 1: EODHD (bessere tägliche FX-Raten)
  if (eodhd) {
    try {
      const symbol = pair.slice(0, 3) + pair.slice(3) + '.FOREX' // USDEUR → USDEUR.FOREX
      const res = await fetch(
        `https://eodhd.com/api/eod/${symbol}?from=${from}&to=${to}&api_token=${eodhd}&fmt=json`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          for (const d of data) rateMap.set(d.date, d.close)
          if (rateMap.size > 0) return rateMap
        }
      }
    } catch { /* Fallback zu FMP */ }
  }

  // Versuch 2: FMP historische FX-Raten
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${pair}?from=${from}&to=${to}&apikey=${fmpApiKey}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = await res.json()
      const hist = data?.historical
      if (Array.isArray(hist)) {
        for (const d of hist) rateMap.set(d.date, d.close)
      }
    }
  } catch { /* keine FX-Raten verfügbar */ }

  return rateMap
}

// Nächste verfügbare FX-Rate für ein Datum finden (für Lücken an Wochenenden)
function findClosestRate(rateMap: Map<string, number>, date: string): number | null {
  if (rateMap.has(date)) return rateMap.get(date)!
  // Bis zu 7 Tage zurück suchen
  const d = new Date(date)
  for (let i = 1; i <= 7; i++) {
    d.setDate(d.getDate() - 1)
    const key = d.toISOString().slice(0, 10)
    if (rateMap.has(key)) return rateMap.get(key)!
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const rawTicker = params.ticker
  const apiKey = process.env.FMP_API_KEY
  const convertToEUR = request.nextUrl.searchParams.get('convertToEUR') === 'true'

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // EU-Ticker Resolution: BMW → BMW.DE
  const ticker = resolveFMPTicker(rawTicker)
  const isEuropeanTicker = isEUTicker(rawTicker) || /\.(DE|L|PA|AS|MI|SW|BR|MC|VI|HE|CO|ST|OL|LS|WA|IR)$/i.test(ticker)

  // etfMaster hat Priorität für die Preis-Quelle
  const masterSource = resolvePriceSource(ticker) || resolvePriceSource(rawTicker)

  // Helper: FMP Historical mit Währungs-Konvertierung
  const fetchFmpHistorical = async (fetchTicker: string, exchange?: 'GBp' | 'GBP' | 'EUR') => {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(fetchTicker)}?serietype=line&apikey=${apiKey}`,
      { next: { revalidate: 1800 } },
    )
    if (!res.ok) return []
    const data = await res.json()
    const hist: { date: string; close: number }[] = data?.historical || []
    if (!exchange || exchange === 'EUR') return hist
    return hist.map(p => {
      let close = p.close
      if (exchange === 'GBp') close = (p.close / 100) * GBP_EUR_APPROX
      else if (exchange === 'GBP') close = p.close * GBP_EUR_APPROX
      return { date: p.date, close: Math.round(close * 100) / 100 }
    })
  }

  // Helper: Ergebnis mit optionaler EUR-Konvertierung zurückgeben
  async function respondWithHistorical(
    historical: { date: string; close: number }[],
    extra: Record<string, unknown> = {},
  ) {
    // EUR-Konvertierung: wenn angefragt und Ticker nicht in EUR notiert
    if (convertToEUR && !isEuropeanTicker && historical.length > 0) {
      const dates = historical.map(h => h.date).sort()
      const from = dates[0]
      const to = dates[dates.length - 1]
      const fxRates = await fetchHistoricalFxRates('USDEUR', from, to, apiKey!)

      if (fxRates.size > 0) {
        historical = historical.map(h => {
          const rate = findClosestRate(fxRates, h.date)
          return {
            date: h.date,
            close: rate ? Math.round(h.close * rate * 100) / 100 : h.close,
          }
        })
        extra._currency = 'EUR'
        extra._converted = true
      }
    }

    return NextResponse.json({ symbol: ticker, historical, ...extra })
  }

  try {
    // === Master-gesteuertes Fetching ===
    if (masterSource) {
      let historical: { date: string; close: number }[] = []
      let source = ''

      if (masterSource.type === 'fmp_direct') {
        historical = await fetchFmpHistorical(ticker)
        source = 'fmp'
      } else if (masterSource.type === 'fmp_alt') {
        historical = await fetchFmpHistorical(masterSource.ticker, masterSource.exchange)
        source = `fmp_alt:${masterSource.ticker}`
      } else if (masterSource.type === 'yahoo') {
        const yahooTicker = masterSource.ticker || ticker
        const yahooData = await fetchYahooHistorical(yahooTicker)
        if (yahooData && yahooData.length > 0) {
          historical = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
          source = 'yahoo'
        }
      }

      // Master-Fallback: wenn prescribierte Quelle leer, Yahoo als Backup
      if (historical.length === 0 && masterSource.type !== 'yahoo') {
        const yahooData = await fetchYahooHistorical(ticker)
        if (yahooData && yahooData.length > 0) {
          historical = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
          source = 'yahoo'
        }
      }

      return respondWithHistorical(historical, source && source !== 'fmp' ? { _source: source } : {})
    }

    // === Nicht im Master: bestehende Fallback-Chain ===
    let fmpData = await fetchFmpHistorical(ticker)

    // Für EU-Ticker: FMP-Daten prüfen und ggf. Yahoo bevorzugen
    let needsFallback = false
    if (isEuropeanTicker) {
      if (fmpData.length < 30) {
        needsFallback = true
      } else {
        const latestDate = new Date(fmpData[0]?.date || '1970-01-01')
        const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLatest > 7) needsFallback = true
      }
    }

    if (needsFallback) {
      const yahooData = await fetchYahooHistorical(ticker)
      if (yahooData && yahooData.length > 30) {
        const sorted = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
        return respondWithHistorical(sorted, { _source: 'yahoo' })
      }
    }

    if (fmpData.length > 0) {
      return respondWithHistorical(fmpData)
    }

    // Yahoo wenn FMP komplett leer
    const yahooData = await fetchYahooHistorical(ticker)
    if (yahooData && yahooData.length > 0) {
      const sorted = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
      return respondWithHistorical(sorted, { _source: 'yahoo' })
    }

    // Finaler Fallback: EXCHANGE_FALLBACKS (für nicht-Master-Ticker)
    const fallback = EXCHANGE_FALLBACKS[ticker] || EXCHANGE_FALLBACKS[rawTicker]
    if (fallback) {
      const altHist = await fetchFmpHistorical(fallback.symbol, fallback.exchange)
      if (altHist.length > 0) {
        return respondWithHistorical(altHist, { _source: `fmp_alt:${fallback.symbol}` })
      }
    }

    return respondWithHistorical([])

  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error)

    try {
      const yahooData = await fetchYahooHistorical(ticker)
      if (yahooData && yahooData.length > 0) {
        const sorted = [...yahooData].sort((a, b) => b.date.localeCompare(a.date))
        return respondWithHistorical(sorted, { _source: 'yahoo' })
      }
    } catch { /* Yahoo auch fehlgeschlagen */ }

    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 })
  }
}
