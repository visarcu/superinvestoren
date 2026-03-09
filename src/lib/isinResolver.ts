// src/lib/isinResolver.ts — ISIN → Ticker Symbol Auflösung
// Nutzt statische Daten aus etfs.ts + OpenFIGI API + FMP API für unbekannte ISINs

import { etfs } from '@/data/etfs'

export interface ResolvedISIN {
  isin: string
  symbol: string
  name: string
  source: 'etf_static' | 'openfigi' | 'fmp_api' | 'manual'
}

/**
 * Statische ISIN → Symbol Map aus etfs.ts aufbauen.
 * Wird beim ersten Aufruf einmalig erstellt.
 */
let _staticMap: Map<string, { symbol: string; name: string }> | null = null

function getStaticISINMap(): Map<string, { symbol: string; name: string }> {
  if (_staticMap) return _staticMap

  _staticMap = new Map()
  for (const etf of etfs) {
    if (etf.isin) {
      _staticMap.set(etf.isin.toUpperCase(), {
        symbol: etf.symbol,
        name: etf.name,
      })
    }
  }
  return _staticMap
}

/**
 * ISIN lokal auflösen (nur aus etfs.ts).
 * Schnell, kein API-Call nötig.
 */
export function resolveISINLocally(isin: string): ResolvedISIN | null {
  const map = getStaticISINMap()
  const entry = map.get(isin.toUpperCase())
  if (entry) {
    return {
      isin,
      symbol: entry.symbol,
      name: entry.name,
      source: 'etf_static',
    }
  }
  return null
}

/**
 * Mehrere ISINs lokal auflösen.
 * Gibt Map von aufgelösten und Liste von unaufgelösten ISINs zurück.
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
