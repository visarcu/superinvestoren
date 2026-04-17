// src/lib/isinResolver.ts — ISIN → Ticker Symbol Auflösung (Client-seitig)
// Nutzt etfMaster (Prio 0, handkuratiert) + xetraETFsComplete.ts (Prio 1, auto-generiert).

import { etfMaster } from '@/data/etfMaster'
import { xetraETFs } from '@/data/xetraETFsComplete'

export interface ResolvedISIN {
  isin: string
  symbol: string
  name: string
  source: 'etf_master' | 'etf_xetra' | 'cusip_local' | 'openfigi' | 'fmp_api' | 'manual'
}

let _isinMap: Map<string, { symbol: string; name: string; source: ResolvedISIN['source'] }> | null = null

function getISINMap(): Map<string, { symbol: string; name: string; source: ResolvedISIN['source'] }> {
  if (_isinMap) return _isinMap
  _isinMap = new Map()

  // Priorität 0: etfMaster — verifizierte, autoritative Einträge
  for (const entry of etfMaster) {
    _isinMap.set(entry.isin.toUpperCase(), {
      symbol: entry.xetraTicker,
      name: entry.name,
      source: 'etf_master',
    })
  }

  // Priorität 1: xetraETFsComplete (breitere Coverage, überschreibt NICHT Prio 0)
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
 * ISIN lokal auflösen (etfMaster + xetraETFsComplete.ts).
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
