// src/lib/etfMasterLookup.ts
//
// Shared Lookup-Modul für etfMaster.ts. Baut lazy-initialisierte Maps
// und stellt Lookup-Funktionen für isinResolver und alle API-Routes bereit.

import { etfMaster, type ETFMasterEntry, type PriceSource } from '@/data/etfMaster'
export type { PriceSource, ETFMasterEntry }

let _byIsin: Map<string, ETFMasterEntry> | null = null
let _byTicker: Map<string, ETFMasterEntry> | null = null

function ensureMaps() {
  if (_byIsin) return
  _byIsin = new Map()
  _byTicker = new Map()
  for (const entry of etfMaster) {
    _byIsin.set(entry.isin.toUpperCase(), entry)
    _byTicker.set(entry.xetraTicker.toUpperCase(), entry)
  }
}

/**
 * Master-Eintrag per ISIN finden.
 * Verwendet vom isinResolver (Priorität 0).
 */
export function lookupMasterByIsin(isin: string): ETFMasterEntry | null {
  ensureMaps()
  return _byIsin!.get(isin.toUpperCase()) ?? null
}

/**
 * Master-Eintrag per XETRA-Ticker finden.
 * Verwendet von API-Routes für Ticker-basierte Lookups.
 */
export function lookupMasterByTicker(ticker: string): ETFMasterEntry | null {
  ensureMaps()
  return _byTicker!.get(ticker.toUpperCase()) ?? null
}

/**
 * PriceSource für einen Ticker auflösen.
 * Kernfunktion für /api/quotes, /api/historical, /api/portfolio-history.
 * Gibt null zurück wenn der Ticker nicht im Master ist (→ alte Fallback-Chain).
 */
export function resolvePriceSource(ticker: string): PriceSource | null {
  const entry = lookupMasterByTicker(ticker)
  return entry?.priceSource ?? null
}
