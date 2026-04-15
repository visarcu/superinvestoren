// src/app/api/quotes/route.ts
// Primäre Quelle: FMP (Financial Modeling Prep)
// Fallback 1: FMP mit alternativen Börsen (.AS, .L) für Xetra-ETFs
// Fallback 2: Yahoo Finance
//
// Sonderfälle pflegen: src/data/tickerFallbacks.ts
import { NextResponse } from 'next/server'
import { EXCHANGE_FALLBACKS, YAHOO_ALIASES } from '@/data/tickerFallbacks'

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
  currency: string
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d&region=DE`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const price = meta?.regularMarketPrice
    const previousClose = meta?.chartPreviousClose || meta?.previousClose || 0
    const currency: string = meta?.currency || 'USD'

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
      currency,
    }
  } catch {
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
    // Nicht sofort 502 — versuche Fallbacks
  }

  // Prüfe welche Symbole FMP nicht geliefert hat oder keinen validen Kurs haben
  // Außerdem: Symbole aus EXCHANGE_FALLBACKS immer über den alternativen Ticker holen
  // (FMP liefert für diese manchmal falsche Währung oder price=0)
  const fmpSymbols = new Set(
    quotes
      .filter((q: any) => q.price > 0 && !EXCHANGE_FALLBACKS[q.symbol])
      .map((q: any) => q.symbol)
  )
  // FMP-Quotes für XETRA-Fallback-Ticker verwerfen — werden unten korrekt geholt
  quotes = quotes.filter((q: any) => fmpSymbols.has(q.symbol))
  let missingSymbols = symbolList.filter(s => !fmpSymbols.has(s))

  // === Fallback 1: Xetra-ETFs auf alternativen Börsen suchen ===
  const xetraFallbackNeeded = missingSymbols.filter(s => EXCHANGE_FALLBACKS[s])

  if (xetraFallbackNeeded.length > 0) {
    // GBP/EUR Rate laden falls .L Ticker vorhanden (GBp oder GBP)
    const needsGbp = xetraFallbackNeeded.some(s => EXCHANGE_FALLBACKS[s]?.exchange === 'GBp' || EXCHANGE_FALLBACKS[s]?.exchange === 'GBP')
    let gbpToEurRate = 1.18 // Fallback-Rate

    if (needsGbp) {
      try {
        const rateRes = await fetch(
          `https://financialmodelingprep.com/api/v3/fx/GBPEUR?apikey=${process.env.FMP_API_KEY}`
        )
        if (rateRes.ok) {
          const rateData = await rateRes.json()
          if (Array.isArray(rateData) && rateData[0]?.ask) {
            gbpToEurRate = rateData[0].ask
          }
        }
      } catch {
        // Fallback-Rate verwenden
      }
    }

    // Alternative Ticker von FMP abrufen
    const altSymbols = xetraFallbackNeeded.map(s => EXCHANGE_FALLBACKS[s].symbol)
    try {
      const altEncoded = altSymbols.map(s => encodeURIComponent(s)).join(',')
      const altRes = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${altEncoded}?apikey=${process.env.FMP_API_KEY}`
      )
      if (altRes.ok) {
        const altData = await altRes.json()
        if (Array.isArray(altData)) {
          for (const altQuote of altData) {
            // Rückwärts-Mapping: alternativer Ticker → ursprünglicher .DE Ticker
            const originalTicker = xetraFallbackNeeded.find(
              s => EXCHANGE_FALLBACKS[s].symbol === altQuote.symbol
            )
            if (!originalTicker || !altQuote.price) continue

            const { exchange } = EXCHANGE_FALLBACKS[originalTicker]
            let eurPrice = altQuote.price

            if (exchange === 'GBp') {
              // GBp (Pence) → EUR: durch 100 teilen → GBP, dann × GBP/EUR
              eurPrice = (altQuote.price / 100) * gbpToEurRate
            } else if (exchange === 'GBP') {
              // GBP (bereits Pfund) → EUR: direkt × GBP/EUR
              eurPrice = altQuote.price * gbpToEurRate
            }

            // Als original .DE Symbol zurückgeben
            quotes.push({
              ...altQuote,
              symbol: originalTicker,
              price: eurPrice,
              change: exchange === 'GBp'
                ? ((altQuote.change || 0) / 100) * gbpToEurRate
                : exchange === 'GBP'
                  ? (altQuote.change || 0) * gbpToEurRate
                  : (altQuote.change || 0),
              _source: `fmp_alt:${altQuote.symbol}`,
            })
          }
        }
      }
    } catch (err) {
      console.error('Xetra exchange fallback failed:', err)
    }
  }

  // Symbole die nach Xetra-Fallback noch fehlen
  const resolvedNow = new Set(quotes.map((q: any) => q.symbol))
  missingSymbols = symbolList.filter(s => !resolvedNow.has(s))

  // === Fallback 1b: .DE-Ticker ohne Suffix nochmal via FMP probieren ===
  // Hintergrund: Freedom24 .EU → .DE Konvertierung erzeugt z.B. QYLD.DE oder RACE.DE,
  // aber FMP kennt diese nur als QYLD bzw. RACE (US-Listing).
  const deMissingWithBase = missingSymbols
    .filter(s => s.endsWith('.DE'))
    .map(s => ({ original: s, base: s.slice(0, -3) }))

  if (deMissingWithBase.length > 0) {
    // USD/EUR Rate für Konvertierung holen
    let usdToEurRate = 0.92 // Fallback
    try {
      const fxRes = await fetch(`https://financialmodelingprep.com/api/v3/fx/USDEUR?apikey=${process.env.FMP_API_KEY}`)
      if (fxRes.ok) {
        const fxData = await fxRes.json()
        if (Array.isArray(fxData) && fxData[0]?.ask) usdToEurRate = fxData[0].ask
      }
    } catch { /* Fallback-Rate verwenden */ }

    try {
      const baseEncoded = deMissingWithBase.map(({ base }) => encodeURIComponent(base)).join(',')
      const baseRes = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${baseEncoded}?apikey=${process.env.FMP_API_KEY}`
      )
      if (baseRes.ok) {
        const baseData = await baseRes.json()
        if (Array.isArray(baseData)) {
          for (const q of baseData) {
            const entry = deMissingWithBase.find(e => e.base === q.symbol)
            if (!entry || !q.price) continue
            // USD-Kurs in EUR umrechnen (US-Listings werden in USD geliefert)
            const isUsd = q.currency === 'USD'
            quotes.push({
              ...q,
              symbol: entry.original,
              price: isUsd ? q.price * usdToEurRate : q.price,
              change: isUsd ? (q.change || 0) * usdToEurRate : (q.change || 0),
              _source: `fmp_base:${q.symbol}`,
            })
          }
        }
      }
    } catch (err) {
      console.error('FMP base-ticker fallback failed:', err)
    }
  }

  // Nach Fallback 1b aktualisieren
  const resolvedAfter1b = new Set(quotes.map((q: any) => q.symbol))
  missingSymbols = symbolList.filter(s => !resolvedAfter1b.has(s))

  // === Fallback 2: Yahoo Finance für alle restlichen fehlenden Symbole ===
  if (missingSymbols.length > 0) {
    // FX-Raten für Yahoo-Konvertierung (USD→EUR, GBp→EUR)
    let yahooUsdToEur = 0.92
    let yahooGbpToEur = 1.18
    try {
      const [usdRes, gbpRes] = await Promise.allSettled([
        fetch(`https://financialmodelingprep.com/api/v3/fx/USDEUR?apikey=${process.env.FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/fx/GBPEUR?apikey=${process.env.FMP_API_KEY}`),
      ])
      if (usdRes.status === 'fulfilled' && usdRes.value.ok) {
        const d = await usdRes.value.json()
        if (Array.isArray(d) && d[0]?.ask) yahooUsdToEur = d[0].ask
      }
      if (gbpRes.status === 'fulfilled' && gbpRes.value.ok) {
        const d = await gbpRes.value.json()
        if (Array.isArray(d) && d[0]?.ask) yahooGbpToEur = d[0].ask
      }
    } catch { /* Fallback-Raten verwenden */ }

    const yahooPromises = missingSymbols.map(s => {
      const yahooSymbol = YAHOO_ALIASES[s] || s
      return fetchYahooQuote(yahooSymbol).then(result =>
        result ? { ...result, symbol: s } : null
      )
    })
    const yahooResults = await Promise.allSettled(yahooPromises)

    for (const result of yahooResults) {
      if (result.status === 'fulfilled' && result.value) {
        const q = result.value
        // Währungskonvertierung: USD und GBp → EUR
        let price = q.price
        let change = q.change
        if (q.currency === 'USD') {
          price = price * yahooUsdToEur
          change = change * yahooUsdToEur
        } else if (q.currency === 'GBp') {
          // GBp (Pence) → EUR: /100 für GBP, dann × GBP/EUR
          price = (price / 100) * yahooGbpToEur
          change = (change / 100) * yahooGbpToEur
        } else if (q.currency === 'GBP') {
          price = price * yahooGbpToEur
          change = change * yahooGbpToEur
        }
        quotes.push({
          ...q,
          price,
          change,
          changesPercentage: q.previousClose > 0 ? (change / (q.previousClose * (q.currency === 'GBp' ? yahooGbpToEur / 100 : q.currency === 'USD' ? yahooUsdToEur : 1))) * 100 : 0,
          dayLow: price,
          dayHigh: price,
          yearHigh: 0,
          yearLow: 0,
          marketCap: 0,
          priceAvg50: 0,
          priceAvg200: 0,
          exchange: 'XETRA',
          volume: 0,
          avgVolume: 0,
          open: price - change,
          eps: 0,
          pe: 0,
          earningsAnnouncement: '',
          sharesOutstanding: 0,
          timestamp: Math.floor(Date.now() / 1000),
          _source: 'yahoo',
        })
      }
    }
  }

  return NextResponse.json(quotes)
}
