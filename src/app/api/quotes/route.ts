// src/app/api/quotes/route.ts
// Primäre Quelle: FMP (Financial Modeling Prep)
// Fallback 1: FMP mit alternativen Börsen (.AS, .L) für Xetra-ETFs
// Fallback 2: Yahoo Finance
import { NextResponse } from 'next/server'

// Bekannte Xetra-Ticker die FMP nicht unterstützt → auf andere Börsen mappen
// .AS = Euronext Amsterdam (EUR, keine Konvertierung nötig)
// .L  = London Stock Exchange (GBp, durch 100 teilen → GBP, dann × GBP/EUR)
const XETRA_EXCHANGE_FALLBACK: Record<string, { symbol: string; exchange: 'EUR' | 'GBp' }> = {
  'VHYL.DE': { symbol: 'VHYL.AS', exchange: 'EUR' },
  'FWRG.DE': { symbol: 'FWRG.L',  exchange: 'GBp' },
  'FWIA.DE': { symbol: 'FWRA.L',  exchange: 'GBp' },
  'VWRL.DE': { symbol: 'VWRL.L',  exchange: 'GBp' },
  'VWCE.DE': { symbol: 'VWCE.L',  exchange: 'GBp' },
  'EQQQ.DE': { symbol: 'EQQQ.L',  exchange: 'GBp' },
  'IUIT.DE': { symbol: 'IUIT.L',  exchange: 'GBp' },
  'CSPX.DE': { symbol: 'CSPX.L',  exchange: 'GBp' },
  'SWDA.DE': { symbol: 'SWDA.L',  exchange: 'GBp' },
  'HMWO.DE': { symbol: 'HMWO.L',  exchange: 'GBp' },
}

// Ticker-Aliases für Yahoo Finance Fallback (FMP kennt sie nicht)
const YAHOO_TICKER_ALIASES: Record<string, string> = {
  'NLM.DE': 'NLM.F', // FRoSTA AG — nur im Freiverkehr, Yahoo kennt Frankfurt-Ticker
}

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
    // Nicht sofort 502 — versuche Fallbacks
  }

  // Prüfe welche Symbole FMP nicht geliefert hat
  const fmpSymbols = new Set(quotes.map((q: any) => q.symbol))
  let missingSymbols = symbolList.filter(s => !fmpSymbols.has(s))

  // === Fallback 1: Xetra-ETFs auf alternativen Börsen suchen ===
  const xetraFallbackNeeded = missingSymbols.filter(s => XETRA_EXCHANGE_FALLBACK[s])

  if (xetraFallbackNeeded.length > 0) {
    // GBP/EUR Rate laden falls .L Ticker vorhanden
    const needsGbp = xetraFallbackNeeded.some(s => XETRA_EXCHANGE_FALLBACK[s]?.exchange === 'GBp')
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
    const altSymbols = xetraFallbackNeeded.map(s => XETRA_EXCHANGE_FALLBACK[s].symbol)
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
              s => XETRA_EXCHANGE_FALLBACK[s].symbol === altQuote.symbol
            )
            if (!originalTicker || !altQuote.price) continue

            const { exchange } = XETRA_EXCHANGE_FALLBACK[originalTicker]
            let eurPrice = altQuote.price

            // GBp → EUR Konvertierung: FMP liefert GBp (Pence), nicht GBP
            if (exchange === 'GBp') {
              eurPrice = (altQuote.price / 100) * gbpToEurRate
            }

            // Als original .DE Symbol zurückgeben
            quotes.push({
              ...altQuote,
              symbol: originalTicker,
              price: eurPrice,
              change: exchange === 'GBp'
                ? ((altQuote.change || 0) / 100) * gbpToEurRate
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

  // === Fallback 2: Yahoo Finance für alle restlichen fehlenden Symbole ===
  if (missingSymbols.length > 0) {
    const yahooPromises = missingSymbols.map(s => {
      const yahooSymbol = YAHOO_TICKER_ALIASES[s] || s
      return fetchYahooQuote(yahooSymbol).then(result =>
        result ? { ...result, symbol: s } : null // Alias zurück auf Original-Symbol mappen
      )
    })
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
          _source: 'yahoo',
        })
      }
    }
  }

  return NextResponse.json(quotes)
}
