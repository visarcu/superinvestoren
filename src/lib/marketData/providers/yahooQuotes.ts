// src/lib/marketData/providers/yahooQuotes.ts
// Yahoo — letzte Instanz. Undokumentierter Endpoint ohne Zusage: nur einsetzen,
// wenn EODHD und FMP nichts liefern, und niemals als einzige Quelle einplanen.

import type { RawQuote } from '../types'

/** Liefert die Währung mit ('GBp' bei britischen Pence-Notierungen). */
export async function fetchYahooQuote(symbol: string): Promise<RawQuote | null> {
  if (!symbol) return null
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d&region=DE`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null

    const meta = (await res.json())?.chart?.result?.[0]?.meta
    const price = Number(meta?.regularMarketPrice)
    if (!Number.isFinite(price) || price <= 0) return null

    const previousClose = Number(meta?.chartPreviousClose ?? meta?.previousClose) || 0
    const change = previousClose > 0 ? price - previousClose : 0

    // Yahoo schreibt Pence als 'GBp' — intern führen wir das als 'GBX'.
    const rawCurrency = String(meta?.currency || 'USD')
    const currency = rawCurrency === 'GBp' ? 'GBX' : rawCurrency.toUpperCase()

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent: previousClose > 0 ? (change / previousClose) * 100 : 0,
      previousClose,
      currency,
      name: meta?.shortName || meta?.longName || undefined,
    }
  } catch {
    return null
  }
}

/** Probiert mehrere Schreibweisen und nimmt die erste mit Kurs. */
export async function fetchYahooFirstAvailable(candidates: string[]): Promise<RawQuote | null> {
  for (const candidate of candidates) {
    const quote = await fetchYahooQuote(candidate)
    if (quote) return quote
  }
  return null
}
