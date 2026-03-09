// src/lib/isinResolver.ts — ISIN → Ticker Symbol Auflösung (Client-seitig)
// Nutzt nur leichtgewichtige ETF-Daten. CUSIP-Matching läuft server-seitig.

import { etfs } from '@/data/etfs'

export interface ResolvedISIN {
  isin: string
  symbol: string
  name: string
  source: 'etf_static' | 'cusip_local' | 'openfigi' | 'fmp_api' | 'manual'
}

let _etfMap: Map<string, { symbol: string; name: string }> | null = null

function getETFISINMap(): Map<string, { symbol: string; name: string }> {
  if (_etfMap) return _etfMap
  _etfMap = new Map()
  for (const etf of etfs) {
    if (etf.isin) {
      _etfMap.set(etf.isin.toUpperCase(), { symbol: etf.symbol, name: etf.name })
    }
  }
  return _etfMap
}

/**
 * ISIN lokal auflösen (nur ETFs aus etfs.ts).
 * Leichtgewichtig, für Client-Side geeignet.
 */
export function resolveISINLocally(isin: string): ResolvedISIN | null {
  const etfMap = getETFISINMap()
  const entry = etfMap.get(isin.toUpperCase())
  if (entry) {
    return { isin, symbol: entry.symbol, name: entry.name, source: 'etf_static' }
  }
  return null
}

/**
 * Mehrere ISINs lokal auflösen.
 */
export function resolveISINsLocally(isins: string[]): {
  resolved: Map<string, ResolvedISIN>
  unresolved: string[]
} {
  const resolved = new Map<string, ResolvedISIN>()
  const unresolved: string[] = []

  for (const isin of isins) {
    const result = resolveISINLocally(isin)
    if (result) {
      resolved.set(isin, result)
    } else {
      unresolved.push(isin)
    }
  }

  return { resolved, unresolved }
}
