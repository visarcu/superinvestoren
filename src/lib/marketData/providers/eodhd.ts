// src/lib/marketData/providers/eodhd.ts
// EODHD — Hauptquelle für europäische Börsen (Xetra, Frankfurt, Amsterdam, LSE …).
// Deckt Notierungen ab, die FMP schlicht nicht führt (z.B. DEGC.XETRA).

import type { RawQuote } from '../types'

const BASE = 'https://eodhd.com/api'

export function eodhdConfigured(): boolean {
  return Boolean(process.env.EODHD_API_KEY)
}

function token(): string {
  return process.env.EODHD_API_KEY || ''
}

export interface EodhdSymbolRow {
  Code: string
  Name: string
  Country: string
  Exchange: string
  Currency: string
  Type: string
  Isin: string | null
}

export interface EodhdSearchHit {
  Code: string
  Exchange: string
  Name: string
  Type: string
  Country: string
  Currency: string
  ISIN?: string | null
}

/**
 * LSE liefert Kurse in Pence, die Symbol-Liste labelt sie trotzdem als GBP.
 * Ohne diese Korrektur wären britische Papiere um den Faktor 100 zu teuer.
 */
export function normalizeEodhdCurrency(currency: string | null | undefined, exchange: string): string {
  const cur = (currency || '').toUpperCase()
  if (exchange.toUpperCase() === 'LSE' && (cur === 'GBP' || cur === 'GBX' || cur === '')) return 'GBX'
  if (cur === 'GBX') return 'GBX'
  return cur || 'EUR'
}

/**
 * Batch-Kurse. EODHD nimmt das erste Symbol im Pfad, den Rest als ?s=…
 * Bei einem einzelnen Symbol kommt ein Objekt statt eines Arrays zurück.
 */
export async function fetchEodhdQuotes(symbols: string[]): Promise<Record<string, RawQuote>> {
  if (!eodhdConfigured() || symbols.length === 0) return {}

  const out: Record<string, RawQuote> = {}
  const CHUNK = 40

  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK)
    const [first, ...rest] = chunk
    const params = new URLSearchParams({ api_token: token(), fmt: 'json' })
    if (rest.length > 0) params.set('s', rest.join(','))

    try {
      const res = await fetch(`${BASE}/real-time/${encodeURIComponent(first)}?${params}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue

      const data = await res.json()
      const rows = Array.isArray(data) ? data : [data]

      for (const row of rows) {
        const price = Number(row?.close)
        // EODHD schreibt 'NA' in alle Felder, wenn es das Papier nicht kennt.
        if (!row?.code || !Number.isFinite(price) || price <= 0) continue
        const previousClose = Number(row.previousClose)
        out[String(row.code).toUpperCase()] = {
          symbol: String(row.code).toUpperCase(),
          price,
          change: Number.isFinite(Number(row.change)) ? Number(row.change) : 0,
          changePercent: Number.isFinite(Number(row.change_p)) ? Number(row.change_p) : 0,
          previousClose: Number.isFinite(previousClose) ? previousClose : 0,
          raw: {
            open: Number(row.open) || 0,
            dayHigh: Number(row.high) || 0,
            dayLow: Number(row.low) || 0,
            volume: Number(row.volume) || 0,
            timestamp: Number(row.timestamp) || Math.floor(Date.now() / 1000),
          },
        }
      }
    } catch {
      // Nächster Chunk — der Aufrufer hat weitere Anbieter in der Hinterhand.
    }
  }

  return out
}

/** Alle Listings zu einer ISIN oder einem Ticker — Basis der Stammdaten-Auflösung. */
export async function searchEodhd(query: string): Promise<EodhdSearchHit[]> {
  if (!eodhdConfigured() || !query) return []
  try {
    const res = await fetch(
      `${BASE}/search/${encodeURIComponent(query)}?api_token=${token()}&fmt=json&limit=30`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** Komplettes Symbol-Verzeichnis einer Börse (XETRA ≈ 4.200 Zeilen). */
export async function fetchExchangeSymbols(exchange: string): Promise<EodhdSymbolRow[]> {
  if (!eodhdConfigured()) return []
  try {
    const res = await fetch(
      `${BASE}/exchange-symbol-list/${encodeURIComponent(exchange)}?api_token=${token()}&fmt=json`,
      { signal: AbortSignal.timeout(60000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
