// src/lib/quoteProvider.ts
//
// Abstraktion über Quote-/Profile-Datenquellen.
// Aktuelle Implementierungen: Finnhub (Free, Bestand) und EODHD (kostenpflichtig, neu).
//
// Auswahl per ENV:
//   QUOTE_PROVIDER=eodhd|finnhub|auto    (default: 'auto' → eodhd wenn Key da, sonst finnhub)
//
// Konsumenten benutzen ausschließlich diese Funktionen, nicht die Service-Module direkt.

import {
  getEodhdQuote,
  getEodhdBatchQuotes,
  getEodhdProfile,
  type EodhdQuote,
  type EodhdProfile,
} from './eodhdService'
import {
  getFinnhubQuote,
  getFinnhubBatchQuotes,
  getFinnhubProfile,
  type FinnhubQuote,
  type FinnhubProfile,
} from './finnhubService'

// ─── Gemeinsame Output-Typen ────────────────────────────────────────────────
// Diese normalisierten Shapes dienen als stabiles Interface für API-Routes,
// damit ein Provider-Wechsel keine Endpoint-Änderungen erzwingt.

export interface NormalizedQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number               // Day high
  low: number                // Day low
  open: number
  previousClose: number
  volume: number | null      // EODHD liefert volume; Finnhub Free nicht
  timestamp: number
  source: 'finnhub' | 'eodhd'
}

export interface NormalizedProfile {
  symbol: string
  name: string
  marketCap: number
  exchange: string
  industry: string
  sector: string | null
  logo: string
  currency: string
  week52High: number | null  // EODHD liefert direkt; Finnhub Free nicht
  week52Low: number | null
  peRatio: number | null
  source: 'finnhub' | 'eodhd'
}

// ─── Provider-Selektor ──────────────────────────────────────────────────────

export type QuoteProvider = 'eodhd' | 'finnhub'

export function getActiveProvider(): QuoteProvider {
  const raw = (process.env.QUOTE_PROVIDER || 'auto').toLowerCase()
  if (raw === 'eodhd') return 'eodhd'
  if (raw === 'finnhub') return 'finnhub'
  // 'auto' / unset → bevorzuge EODHD wenn Key konfiguriert ist
  return process.env.EODHD_API_KEY ? 'eodhd' : 'finnhub'
}

// ─── Adapter ────────────────────────────────────────────────────────────────

function fromFinnhubQuote(q: FinnhubQuote): NormalizedQuote {
  return {
    symbol: q.symbol,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    high: q.high,
    low: q.low,
    open: q.open,
    previousClose: q.previousClose,
    volume: null, // Finnhub Free liefert kein Volume in /quote
    timestamp: q.timestamp,
    source: 'finnhub',
  }
}

function fromEodhdQuote(q: EodhdQuote): NormalizedQuote {
  return {
    symbol: q.symbol,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    high: q.high,
    low: q.low,
    open: q.open,
    previousClose: q.previousClose,
    volume: q.volume,
    timestamp: q.timestamp,
    source: 'eodhd',
  }
}

function fromFinnhubProfile(p: FinnhubProfile): NormalizedProfile {
  return {
    symbol: p.symbol,
    name: p.name,
    marketCap: p.marketCap,
    exchange: p.exchange,
    industry: p.industry,
    sector: null,
    logo: p.logo,
    currency: p.currency,
    week52High: null,
    week52Low: null,
    peRatio: null,
    source: 'finnhub',
  }
}

function fromEodhdProfile(p: EodhdProfile): NormalizedProfile {
  return {
    symbol: p.symbol,
    name: p.name,
    marketCap: p.marketCap,
    exchange: p.exchange,
    industry: p.industry,
    sector: p.sector,
    logo: p.logo,
    currency: p.currency,
    week52High: p.week52High,
    week52Low: p.week52Low,
    peRatio: p.peRatio,
    source: 'eodhd',
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getQuote(symbol: string): Promise<NormalizedQuote | null> {
  if (getActiveProvider() === 'eodhd') {
    const q = await getEodhdQuote(symbol)
    return q ? fromEodhdQuote(q) : null
  }
  const q = await getFinnhubQuote(symbol)
  return q ? fromFinnhubQuote(q) : null
}

export async function getBatchQuotes(symbols: string[]): Promise<Record<string, NormalizedQuote>> {
  if (getActiveProvider() === 'eodhd') {
    const raw = await getEodhdBatchQuotes(symbols)
    const out: Record<string, NormalizedQuote> = {}
    for (const [k, v] of Object.entries(raw)) out[k] = fromEodhdQuote(v)
    return out
  }
  const raw = await getFinnhubBatchQuotes(symbols)
  const out: Record<string, NormalizedQuote> = {}
  for (const [k, v] of Object.entries(raw)) out[k] = fromFinnhubQuote(v)
  return out
}

export async function getProfile(symbol: string): Promise<NormalizedProfile | null> {
  // EODHD Fundamentals braucht einen höheren Plan als Real-Time Quotes.
  // Wenn EODHD-Profile fehlschlägt oder der Key dafür keinen Zugriff hat,
  // fallen wir sauber auf Finnhub zurück – so bleibt 'name/marketCap/exchange'
  // verfügbar, auch wenn nur der Quote-Plan aktiv ist.
  if (getActiveProvider() === 'eodhd') {
    const p = await getEodhdProfile(symbol).catch(() => null)
    if (p) return fromEodhdProfile(p)
    const fb = await getFinnhubProfile(symbol).catch(() => null)
    return fb ? fromFinnhubProfile(fb) : null
  }
  const p = await getFinnhubProfile(symbol)
  return p ? fromFinnhubProfile(p) : null
}
