// src/lib/isinResolver.ts — ISIN → Ticker Symbol Auflösung (Client-seitig)
// Nutzt etfs.ts (200 handkuratierte) + xetraETFsComplete.ts (~1.600 mit ISIN).

import { etfs } from '@/data/etfs'
import { xetraETFs } from '@/data/xetraETFsComplete'

export interface ResolvedISIN {
  isin: string
  symbol: string
  name: string
  source: 'etf_static' | 'etf_xetra' | 'cusip_local' | 'openfigi' | 'fmp_api' | 'manual'
}

let _isinMap: Map<string, { symbol: string; name: string; source: ResolvedISIN['source'] }> | null = null

function getISINMap(): Map<string, { symbol: string; name: string; source: ResolvedISIN['source'] }> {
  if (_isinMap) return _isinMap
  _isinMap = new Map()

  // Priorität 1: Handkuratierte etfs.ts (korrektere Daten)
  for (const etf of etfs) {
    if (etf.isin) {
      _isinMap.set(etf.isin.toUpperCase(), { symbol: etf.symbol, name: etf.name, source: 'etf_static' })
    }
  }

  // Priorität 2: xetraETFsComplete (mehr Coverage, überschreibt NICHT Prio 1)
  for (const etf of xetraETFs) {
    if (etf.isin) {
      const key = etf.isin.toUpperCase()
      if (!_isinMap.has(key)) {
        _isinMap.set(key, { symbol: etf.symbol, name: etf.name, source: 'etf_xetra' })
      }
    }
  }

  return _isinMap
}

/**
 * ISIN lokal auflösen (etfs.ts + xetraETFsComplete.ts).
 */
export function resolveISINLocally(isin: string): ResolvedISIN | null {
  const map = getISINMap()
  const entry = map.get(isin.toUpperCase())
  if (entry) {
    return { isin, symbol: entry.symbol, name: entry.name, source: entry.source }
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
