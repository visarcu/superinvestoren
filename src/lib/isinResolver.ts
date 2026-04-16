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

  // Priorität 1a: etfs.ts — nur XETRA-Listings (.DE) und solche mit symbol_de
  // Hintergrund: Die gleiche ISIN kann in etfs.ts mehrfach auftauchen (z.B. IE00B3RBWM25
  // als VGWL.DE UND als VWRL.L für das London-Listing). Für deutsche User wollen wir
  // XETRA-Preise (EUR), nicht London-Preise (GBX/Pence), sonst liefert FMP Pence und
  // unser GBX/100-Konverter skaliert den Marktwert um Faktor 100 herunter.
  for (const etf of etfs) {
    if (!etf.isin) continue
    const key = etf.isin.toUpperCase()
    const xetraSymbol = etf.symbol_de?.endsWith('.DE') ? etf.symbol_de
      : etf.symbol.endsWith('.DE') ? etf.symbol
      : null
    if (xetraSymbol) {
      _isinMap.set(key, { symbol: xetraSymbol, name: etf.name, source: 'etf_static' })
    }
  }

  // Priorität 1b: etfs.ts — alle übrigen (nicht-XETRA) Einträge, nur wenn ISIN noch frei
  for (const etf of etfs) {
    if (!etf.isin) continue
    const key = etf.isin.toUpperCase()
    if (!_isinMap.has(key)) {
      _isinMap.set(key, { symbol: etf.symbol, name: etf.name, source: 'etf_static' })
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
