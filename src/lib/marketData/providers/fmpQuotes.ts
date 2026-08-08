// src/lib/marketData/providers/fmpQuotes.ts
// FMP — stark bei US-Werten und Fundamentaldaten, lückenhaft bei deutschen Börsen.

import type { RawQuote } from '../types'

export function fmpConfigured(): boolean {
  return Boolean(process.env.FMP_API_KEY)
}

/**
 * Batch-Quotes. FMP liefert keine Währung mit — die kommt aus den Stammdaten
 * bzw. aus dem Ticker-Suffix.
 */
export async function fetchFmpQuotes(symbols: string[]): Promise<Record<string, RawQuote>> {
  if (!fmpConfigured() || symbols.length === 0) return {}

  const out: Record<string, RawQuote> = {}
  const CHUNK = 50

  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK)
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${chunk.map(encodeURIComponent).join(',')}?apikey=${process.env.FMP_API_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) continue

      const data = await res.json()
      if (!Array.isArray(data)) continue

      for (const q of data) {
        const price = Number(q?.price)
        if (!q?.symbol || !Number.isFinite(price) || price <= 0) continue
        out[String(q.symbol).toUpperCase()] = {
          symbol: String(q.symbol).toUpperCase(),
          price,
          change: Number(q.change) || 0,
          changePercent: Number(q.changesPercentage) || 0,
          previousClose: Number(q.previousClose) || 0,
          name: q.name || undefined,
          raw: q,
        }
      }
    } catch {
      // Nächster Chunk.
    }
  }

  return out
}
