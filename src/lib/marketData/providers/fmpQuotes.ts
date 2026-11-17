// src/lib/marketData/providers/fmpQuotes.ts
// FMP — stark bei US-Werten und Fundamentaldaten, lückenhaft bei deutschen Börsen.

import type { RawQuote } from '../types'

export function fmpConfigured(): boolean {
  return Boolean(process.env.FMP_API_KEY)
}

const CURRENCY_TTL_MS = 24 * 60 * 60 * 1000
const currencyCache = new Map<string, { currency: string; expires: number }>()

/**
 * Notierungswährung laut FMP-Profil ('GBX' für Pence), gebündelt und 24 h
 * gecacht. Nötig an der LSE: Dort notieren Pence-, Pfund- und USD-Linien
 * nebeneinander (VOD.L 117 GBp, VUSA.L 110 GBP, CSKR.L 461 USD), und der
 * Quote-Endpoint nennt keine Währung.
 */
export async function fetchFmpCurrencies(symbols: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const missing: string[] = []
  for (const symbol of new Set(symbols.map(s => s.toUpperCase()))) {
    const hit = currencyCache.get(symbol)
    if (hit && hit.expires > Date.now()) out[symbol] = hit.currency
    else missing.push(symbol)
  }
  if (!fmpConfigured() || missing.length === 0) return out

  const CHUNK = 50
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK)
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${chunk.map(encodeURIComponent).join(',')}?apikey=${process.env.FMP_API_KEY}`,
        { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data)) continue
      for (const row of data) {
        const symbol = String(row?.symbol || '').toUpperCase()
        const raw = typeof row?.currency === 'string' ? row.currency.trim() : ''
        if (!symbol || !raw) continue
        const currency = raw === 'GBp' || raw.toUpperCase() === 'GBX' ? 'GBX' : raw.toUpperCase()
        currencyCache.set(symbol, { currency, expires: Date.now() + CURRENCY_TTL_MS })
        out[symbol] = currency
      }
    } catch {
      // Ohne Profil bleibt es bei Stammdaten bzw. Suffix-Konvention.
    }
  }
  return out
}

/**
 * Batch-Quotes. FMP liefert keine Währung mit — die kommt aus den Stammdaten
 * bzw. aus dem Ticker-Suffix. Ausnahme LSE: siehe fetchFmpCurrencies.
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

  const london = Object.keys(out).filter(s => s.endsWith('.L'))
  if (london.length > 0) {
    const currencies = await fetchFmpCurrencies(london)
    for (const symbol of london) {
      if (currencies[symbol]) out[symbol].currency = currencies[symbol]
    }
  }

  return out
}
