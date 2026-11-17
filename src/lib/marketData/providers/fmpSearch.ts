// src/lib/marketData/providers/fmpSearch.ts
// FMP-Suche nach ISIN, Ticker oder Name — Basis der Stammdaten-Auflösung.
// FMP liefert je Notierung Symbol und Währung, aber keinen Börsencode in
// unserer Schreibweise; der wird aus dem Ticker-Suffix abgeleitet.

import { SUFFIX_TO_EXCHANGE } from '../symbols'

const BASE = 'https://financialmodelingprep.com'

export interface FmpListing {
  /** FMP-Schreibweise der Notierung: VWCE.DE, VOD.L, AAPL */
  symbol: string
  name: string
  /** 'GBX' für Pence-Notierungen, sonst ISO-Code. */
  currency: string | null
  /** Unser Börsencode (XETRA, LSE, US …), null wenn das Suffix unbekannt ist. */
  exchange: string | null
  isin: string | null
  type: string
  activelyTrading: boolean
  /** OTC-Zweitlinien (VODPF) nur nehmen, wenn es nichts anderes gibt. */
  otc: boolean
}

// Deutsche Regionalbörsen tragen bei FMP/Yahoo eigene Suffixe.
const REGIONAL_SUFFIX_TO_EXCHANGE: Record<string, string> = {
  MU: 'MU',
  SG: 'STU',
  BE: 'BE',
  DU: 'DU',
  HM: 'HM',
  HA: 'HA',
}

/** Börsencode aus dem FMP-Symbol: 'VOD.L' → 'LSE', 'AAPL' → 'US'. */
export function exchangeForFmpSymbol(symbol: string): string | null {
  const upper = symbol.toUpperCase()
  if (upper.startsWith('^')) return null
  const idx = upper.lastIndexOf('.')
  if (idx <= 0) return 'US'
  const suffix = upper.slice(idx + 1)
  return SUFFIX_TO_EXCHANGE[suffix] || REGIONAL_SUFFIX_TO_EXCHANGE[suffix] || null
}

/**
 * Notierung als Code.Börse (VOD.LSE, AAPL.US). In dieser Form steht sie in der
 * historisch so benannten Spalte `eodhd_symbol` — dort beschreibt sie nur noch,
 * welche Notierung ein Alias meint. EODHD selbst wird nicht mehr angefragt.
 */
export function listingCodeForFmpSymbol(symbol: string): string | null {
  const exchange = exchangeForFmpSymbol(symbol)
  if (!exchange) return null
  const upper = symbol.toUpperCase()
  const idx = upper.lastIndexOf('.')
  const code = idx > 0 ? upper.slice(0, idx) : upper
  return `${code}.${exchange}`
}

/** FMP schreibt Pence als 'GBp' — intern führen wir das als 'GBX'. */
export function normalizeFmpCurrency(currency: unknown): string | null {
  const raw = typeof currency === 'string' ? currency.trim() : ''
  if (!raw) return null
  if (raw === 'GBp' || raw.toUpperCase() === 'GBX') return 'GBX'
  return raw.toUpperCase()
}

function toListing(row: any): FmpListing | null {
  const symbol = typeof row?.symbol === 'string' ? row.symbol.toUpperCase() : ''
  if (!symbol) return null
  const exchangeShort = String(row.exchangeShortName || '').toUpperCase()
  // Nur die ISIN-Suche kennt den Typ; die Freitextsuche liefert ihn nicht.
  const type = row.isEtf ? 'etf' : row.isFund ? 'fund' : row.isEtf === false ? 'stock' : 'unknown'
  return {
    symbol,
    name: row.companyName || row.name || symbol,
    currency: normalizeFmpCurrency(row.currency),
    exchange: exchangeForFmpSymbol(symbol),
    isin: typeof row.isin === 'string' && row.isin ? row.isin.toUpperCase() : null,
    type,
    activelyTrading: row.isActivelyTrading !== false,
    otc: exchangeShort === 'OTC' || exchangeShort === 'PNK',
  }
}

async function fmpJson(path: string): Promise<any> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return null
  try {
    const separator = path.includes('?') ? '&' : '?'
    const res = await fetch(`${BASE}${path}${separator}apikey=${apiKey}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Handelbare zuerst, OTC-Zweitlinien zuletzt — Reihenfolge sonst wie von FMP. */
function rankListings(listings: FmpListing[]): FmpListing[] {
  const score = (l: FmpListing) => (l.activelyTrading ? 0 : 2) + (l.otc ? 1 : 0)
  return listings
    .map((listing, index) => ({ listing, index }))
    .sort((a, b) => score(a.listing) - score(b.listing) || a.index - b.index)
    .map(entry => entry.listing)
}

/** Alle Notierungen zu einer ISIN, mit Währung. */
export async function searchFmpByIsin(isin: string): Promise<FmpListing[]> {
  if (!isin) return []
  const data = await fmpJson(`/api/v4/search/isin?isin=${encodeURIComponent(isin.toUpperCase())}`)
  if (!Array.isArray(data)) return []
  return rankListings(data.map(toListing).filter((l): l is FmpListing => l !== null))
}

/** Freitextsuche über Ticker und Name. Liefert keine ISIN — dafür fetchFmpIsin. */
export async function searchFmpByQuery(query: string, limit = 30): Promise<FmpListing[]> {
  if (!query) return []
  const data = await fmpJson(`/api/v3/search?query=${encodeURIComponent(query)}&limit=${limit}`)
  if (!Array.isArray(data)) return []
  return rankListings(data.map(toListing).filter((l): l is FmpListing => l !== null))
}

/** ISIN einer Notierung aus dem FMP-Profil. */
export async function fetchFmpIsin(symbol: string): Promise<string | null> {
  const data = await fmpJson(`/api/v3/profile/${encodeURIComponent(symbol)}`)
  const isin = Array.isArray(data) ? data[0]?.isin : null
  return typeof isin === 'string' && isin ? isin.toUpperCase() : null
}
