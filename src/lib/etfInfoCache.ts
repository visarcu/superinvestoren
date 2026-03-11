// src/lib/etfInfoCache.ts — Client-seitiger ETF-Info-Cache
// Wird initial mit etfs.ts (200 handkuratierte ETFs) befüllt.
// Der useETFInfo-Hook befüllt den Cache dynamisch mit FMP v4 Daten.

import { etfs, type ETF } from '@/data/etfs'

export interface CachedETFInfo {
  symbol: string
  name: string
  ter?: number
  isin?: string
  issuer?: string
  category?: string
  assetClass?: 'Equity' | 'Fixed Income' | 'Commodity' | 'Mixed'
  aum?: number
  domicile?: string
  source: 'static' | 'fmp_api'
}

// In-Memory Cache
const cache = new Map<string, CachedETFInfo>()

// Initial befüllen mit statischen Daten (200 handkuratierte ETFs)
function initCache() {
  if (cache.size > 0) return // Bereits initialisiert
  for (const etf of etfs) {
    const key = etf.symbol.toUpperCase()
    cache.set(key, {
      symbol: etf.symbol,
      name: etf.name,
      ter: etf.ter,
      isin: etf.isin,
      issuer: etf.issuer,
      category: etf.category,
      assetClass: etf.assetClass,
      source: 'static',
    })
    // Auch symbol_de mappen
    if (etf.symbol_de) {
      cache.set(etf.symbol_de.toUpperCase(), {
        symbol: etf.symbol_de,
        name: etf.name,
        ter: etf.ter,
        isin: etf.isin,
        issuer: etf.issuer,
        category: etf.category,
        assetClass: etf.assetClass,
        source: 'static',
      })
    }
  }
}

// Sofort beim Import initialisieren
initCache()

/**
 * Synchroner Lookup im Cache
 */
export function getCachedETFInfo(symbol: string): CachedETFInfo | undefined {
  return cache.get(symbol.toUpperCase())
}

/**
 * ETF-Info in den Cache schreiben.
 * Statische Daten werden NICHT überschrieben (handkuratiert = korrektere TER).
 */
export function setCachedETFInfo(symbol: string, info: CachedETFInfo): void {
  const key = symbol.toUpperCase()
  const existing = cache.get(key)
  // Statische Daten nicht mit API-Daten überschreiben
  if (existing?.source === 'static') return
  cache.set(key, info)
}

/**
 * Mehrere ETFs in den Cache schreiben (von API-Response).
 */
export function setCachedETFInfoBulk(entries: CachedETFInfo[]): void {
  for (const entry of entries) {
    setCachedETFInfo(entry.symbol, entry)
  }
}

/**
 * Prüfen welche Symbole noch nicht im Cache sind.
 */
export function getMissingFromCache(symbols: string[]): string[] {
  return symbols.filter(s => !cache.has(s.toUpperCase()))
}

/**
 * Cache-Größe (für Debugging)
 */
export function getCacheSize(): number {
  return cache.size
}

/**
 * Konvertiert CachedETFInfo → ETF Format (für Kompatibilität mit etfUtils)
 */
export function cachedInfoToETF(info: CachedETFInfo): ETF {
  return {
    symbol: info.symbol,
    name: info.name,
    issuer: info.issuer || 'Unknown',
    assetClass: info.assetClass || 'Equity',
    category: info.category || 'Unknown',
    ter: info.ter,
    isin: info.isin,
  }
}
