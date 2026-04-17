// src/app/api/quotes/route.ts
// Primäre Quelle: FMP (Financial Modeling Prep)
// Fallback 1: FMP mit alternativen Börsen (.AS, .L) für Xetra-ETFs
// Fallback 2: Yahoo Finance
//
// Sonderfälle pflegen: src/data/tickerFallbacks.ts
import { NextResponse } from 'next/server'
import { resolvePriceSource, type PriceSource } from '@/lib/etfMasterLookup'
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

  // === Phase 1: Symbole klassifizieren (Master vs. Non-Master) ===
  // Master-Symbole bekommen ihre Preis-Quelle direkt vorgeschrieben.
  // Non-Master-Symbole laufen durch die bestehende Fallback-Chain.
  const masterSources = new Map<string, PriceSource>()
  for (const s of symbolList) {
    const ps = resolvePriceSource(s)
    if (ps) masterSources.set(s, ps)
  }

  // FMP-Ergebnisse filtern:
  // - Master fmp_direct → trust FMP quote
  // - Master fmp_alt/yahoo → FMP-Direkt-Preis ist falsch, verwerfen
  // - Non-Master + in EXCHANGE_FALLBACKS → verwerfen (bestehende Logik)
  // - Non-Master + nicht in EXCHANGE_FALLBACKS → trust FMP quote
  const fmpSymbols = new Set(
    quotes
      .filter((q: any) => {
        if (q.price <= 0) return false
        const ms = masterSources.get(q.symbol)
        if (ms) return ms.type === 'fmp_direct'
        return !EXCHANGE_FALLBACKS[q.symbol]
      })
      .map((q: any) => q.symbol)
  )
  quotes = quotes.filter((q: any) => fmpSymbols.has(q.symbol))
  let missingSymbols = symbolList.filter(s => !fmpSymbols.has(s))

  // === Phase 2: Master fmp_alt Symbole — Batch-Fetch über alt-Ticker ===
  const masterAltNeeded = missingSymbols.filter(s => masterSources.get(s)?.type === 'fmp_alt')

  // Alle fmp_alt-Symbole (Master + non-Master EXCHANGE_FALLBACKS) sammeln
  const nonMasterFallbackNeeded = missingSymbols.filter(s =>
    !masterSources.has(s) && EXCHANGE_FALLBACKS[s]
  )
  const allAltNeeded = [...masterAltNeeded, ...nonMasterFallbackNeeded]

  if (allAltNeeded.length > 0) {
    // GBP/EUR Rate laden
    const needsGbp = allAltNeeded.some(s => {
      const ms = masterSources.get(s)
      if (ms?.type === 'fmp_alt') return ms.exchange === 'GBp' || ms.exchange === 'GBP'
      const fb = EXCHANGE_FALLBACKS[s]
      return fb?.exchange === 'GBp' || fb?.exchange === 'GBP'
    })
    let gbpToEurRate = 1.18

    if (needsGbp) {
      try {
        const rateRes = await fetch(
          `https://financialmodelingprep.com/api/v3/fx/GBPEUR?apikey=${process.env.FMP_API_KEY}`
        )
        if (rateRes.ok) {
          const rateData = await rateRes.json()
          if (Array.isArray(rateData) && rateData[0]?.ask) gbpToEurRate = rateData[0].ask
        }
      } catch { /* Fallback-Rate verwenden */ }
    }

    // Rückwärts-Mapping aufbauen: altTicker → { original, exchange }
    const altMapping = new Map<string, { original: string; exchange: 'GBp' | 'GBP' | 'EUR' }>()
    for (const s of allAltNeeded) {
      const ms = masterSources.get(s)
      if (ms?.type === 'fmp_alt') {
        altMapping.set(ms.ticker, { original: s, exchange: ms.exchange })
      } else {
        const fb = EXCHANGE_FALLBACKS[s]
        if (fb) altMapping.set(fb.symbol, { original: s, exchange: fb.exchange })
      }
    }

    const altSymbols = [...altMapping.keys()]
    try {
      const altEncoded = altSymbols.map(s => encodeURIComponent(s)).join(',')
      const altRes = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${altEncoded}?apikey=${process.env.FMP_API_KEY}`
      )
      if (altRes.ok) {
        const altData = await altRes.json()
        if (Array.isArray(altData)) {
          for (const altQuote of altData) {
            const mapping = altMapping.get(altQuote.symbol)
            if (!mapping || !altQuote.price) continue

            let eurPrice = altQuote.price
            let eurChange = altQuote.change || 0
            if (mapping.exchange === 'GBp') {
              eurPrice = (altQuote.price / 100) * gbpToEurRate
              eurChange = (eurChange / 100) * gbpToEurRate
            } else if (mapping.exchange === 'GBP') {
              eurPrice = altQuote.price * gbpToEurRate
              eurChange = eurChange * gbpToEurRate
            }

            quotes.push({
              ...altQuote,
              symbol: mapping.original,
              price: eurPrice,
              change: eurChange,
              _source: `fmp_alt:${altQuote.symbol}`,
            })
          }
        }
      }
    } catch (err) {
      console.error('Alt-exchange quote fetch failed:', err)
    }
  }

  // === Phase 3: Master yahoo Symbole — direkt Yahoo aufrufen ===
  const resolvedAfterAlt = new Set(quotes.map((q: any) => q.symbol))
  const masterYahooNeeded = symbolList.filter(s =>
    !resolvedAfterAlt.has(s) && masterSources.get(s)?.type === 'yahoo'
  )

  // FX-Raten für Yahoo-Konvertierung laden (einmal für Phase 3 + 5)
  let yahooUsdToEur = 0.92
  let yahooGbpToEur = 1.18
  const needsYahooRates = masterYahooNeeded.length > 0 || missingSymbols.length > 0
  if (needsYahooRates) {
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
  }

  // Helper: Yahoo-Quote holen, konvertieren, als Quote-Objekt formatieren
  const processYahooQuote = (q: { symbol: string; name: string; price: number; change: number; changesPercentage: number; previousClose: number; currency: string }, originalSymbol: string): any => {
    let price = q.price
    let change = q.change
    if (q.currency === 'USD') {
      price = price * yahooUsdToEur
      change = change * yahooUsdToEur
    } else if (q.currency === 'GBp') {
      price = (price / 100) * yahooGbpToEur
      change = (change / 100) * yahooGbpToEur
    } else if (q.currency === 'GBP') {
      price = price * yahooGbpToEur
      change = change * yahooGbpToEur
    }
    return {
      ...q,
      symbol: originalSymbol,
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
    }
  }

  if (masterYahooNeeded.length > 0) {
    const yahooPromises = masterYahooNeeded.map(s => {
      const ms = masterSources.get(s)
      const yahooTicker = (ms?.type === 'yahoo' && ms.ticker) ? ms.ticker : s
      return fetchYahooQuote(yahooTicker).then(result =>
        result ? { ...result, symbol: s } : null
      )
    })
    const yahooResults = await Promise.allSettled(yahooPromises)
    for (const result of yahooResults) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(processYahooQuote(result.value, result.value.symbol))
      }
    }
  }

  // === Phase 4: Non-Master .DE-Ticker ohne Suffix via FMP probieren ===
  const resolvedAfterYahoo = new Set(quotes.map((q: any) => q.symbol))
  missingSymbols = symbolList.filter(s => !resolvedAfterYahoo.has(s))

  const deMissingWithBase = missingSymbols
    .filter(s => s.endsWith('.DE') && !masterSources.has(s))
    .map(s => ({ original: s, base: s.slice(0, -3) }))

  if (deMissingWithBase.length > 0) {
    let usdToEurRate = 0.92
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

  // === Phase 5: Yahoo Finance für alle restlichen fehlenden Symbole ===
  const resolvedAfterBase = new Set(quotes.map((q: any) => q.symbol))
  missingSymbols = symbolList.filter(s => !resolvedAfterBase.has(s))

  if (missingSymbols.length > 0) {
    const yahooPromises = missingSymbols.map(s => {
      const yahooSymbol = YAHOO_ALIASES[s] || s
      return fetchYahooQuote(yahooSymbol).then(result =>
        result ? { ...result, symbol: s } : null
      )
    })
    const yahooResults = await Promise.allSettled(yahooPromises)
    for (const result of yahooResults) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(processYahooQuote(result.value, result.value.symbol))
      }
    }
  }

  return NextResponse.json(quotes)
}
