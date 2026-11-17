// src/lib/quoteProvider.ts
//
// Abstraktion über Quote-/Profile-Datenquellen.
// Kurse: Finnhub. Profile: FMP (mit 52W-Spanne und KGV), Finnhub als Auffangnetz.
//
// Auswahl per ENV:
//   QUOTE_PROVIDER=finnhub|auto    (default: 'auto' → FMP-Profile wenn Key da, sonst Finnhub)
//
// Konsumenten benutzen ausschließlich diese Funktionen, nicht die Service-Module direkt.

import { getFmpProfile, type FmpProfile } from './marketData/providers/fmpProfile'
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
  volume: number | null      // Finnhub Free liefert kein Volume
  timestamp: number
  source: 'finnhub'
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
  week52High: number | null  // FMP liefert direkt; Finnhub Free nicht
  week52Low: number | null
  peRatio: number | null
  source: 'finnhub' | 'fmp'
}

// ─── Provider-Selektor ──────────────────────────────────────────────────────

export type ProfileProvider = 'fmp' | 'finnhub'

/** Quelle der Profile. Kurse kommen immer von Finnhub. */
export function getActiveProvider(): ProfileProvider {
  const raw = (process.env.QUOTE_PROVIDER || 'auto').toLowerCase()
  if (raw === 'finnhub') return 'finnhub'
  // 'auto' / unset (auch ein veraltetes 'eodhd') → FMP, wenn der Key konfiguriert ist
  return process.env.FMP_API_KEY ? 'fmp' : 'finnhub'
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

function fromFmpProfile(p: FmpProfile): NormalizedProfile {
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
    source: 'fmp',
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getQuote(symbol: string): Promise<NormalizedQuote | null> {
  const q = await getFinnhubQuote(symbol)
  return q ? fromFinnhubQuote(q) : null
}

export async function getBatchQuotes(symbols: string[]): Promise<Record<string, NormalizedQuote>> {
  const raw = await getFinnhubBatchQuotes(symbols)
  const out: Record<string, NormalizedQuote> = {}
  for (const [k, v] of Object.entries(raw)) out[k] = fromFinnhubQuote(v)
  return out
}

export async function getProfile(symbol: string): Promise<NormalizedProfile | null> {
  // Kennt FMP das Symbol nicht, fallen wir sauber auf Finnhub zurück – so bleibt
  // 'name/marketCap/exchange' verfügbar, nur ohne 52W-Spanne und KGV.
  if (getActiveProvider() === 'fmp') {
    const p = await getFmpProfile(symbol).catch(() => null)
    if (p) return fromFmpProfile(p)
    const fb = await getFinnhubProfile(symbol).catch(() => null)
    return fb ? fromFinnhubProfile(fb) : null
  }
  const p = await getFinnhubProfile(symbol)
  return p ? fromFinnhubProfile(p) : null
}
