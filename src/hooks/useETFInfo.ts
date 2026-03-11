// src/hooks/useETFInfo.ts — Lädt ETF-Info (TER, ISIN, etc.) für unbekannte Symbole
// Befüllt den etfInfoCache, damit getETFBySymbol() synchron Daten findet.

import { useState, useEffect, useRef } from 'react'
import { etfs } from '@/data/etfs'
import { setCachedETFInfoBulk, getCachedETFInfo, type CachedETFInfo } from '@/lib/etfInfoCache'

// Set der statisch bekannten Symbole (für schnellen Lookup)
const staticSymbols = new Set<string>()
for (const etf of etfs) {
  staticSymbols.add(etf.symbol.toUpperCase())
  if (etf.symbol_de) staticSymbols.add(etf.symbol_de.toUpperCase())
}

// Globales Set: bereits angefragte Symbole (verhindert doppelte Requests)
const requestedSymbols = new Set<string>()

/**
 * Hook: Lädt ETF-Infos für Symbole die nicht in der statischen etfs.ts sind.
 * Nach dem Laden findet getETFBySymbol() sie automatisch im Cache.
 *
 * @param symbols - Liste von Ticker-Symbolen (z.B. ['VWCE.DE', 'XYZ.DE'])
 * @returns { loading, fetchedCount } - Loading-Status und Anzahl geladener ETFs
 */
export function useETFInfo(symbols: string[]): {
  loading: boolean
  fetchedCount: number
} {
  const [loading, setLoading] = useState(false)
  const [fetchedCount, setFetchedCount] = useState(0)
  const prevSymbolsRef = useRef<string>('')

  useEffect(() => {
    // Nur ETF-ähnliche Symbole (mit . wie .DE, .PA, .L) und nur unbekannte
    const missing = symbols
      .filter(s => s && s.includes('.'))
      .map(s => s.toUpperCase())
      .filter(s =>
        !staticSymbols.has(s) &&       // Nicht in statischer Liste
        !getCachedETFInfo(s) &&          // Nicht bereits im Cache
        !requestedSymbols.has(s)         // Nicht bereits angefragt
      )

    // Stabile Referenz — nur fetchen wenn sich die fehlenden Symbole ändern
    const key = missing.sort().join(',')
    if (key === prevSymbolsRef.current || missing.length === 0) return
    prevSymbolsRef.current = key

    // Als angefragt markieren
    missing.forEach(s => requestedSymbols.add(s))

    const controller = new AbortController()

    async function fetchMissing() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/etf-info-bulk?symbols=${missing.join(',')}`,
          { signal: controller.signal }
        )
        if (!res.ok) return

        const data: Array<{
          symbol: string
          name: string
          ter?: number
          isin?: string
          issuer?: string
          category?: string
          aum?: number
          domicile?: string
        }> = await res.json()

        if (data && data.length > 0) {
          const entries: CachedETFInfo[] = data.map(d => ({
            symbol: d.symbol,
            name: d.name,
            ter: d.ter,
            isin: d.isin,
            issuer: d.issuer,
            category: d.category,
            aum: d.aum,
            domicile: d.domicile,
            source: 'fmp_api' as const,
          }))
          setCachedETFInfoBulk(entries)
          setFetchedCount(prev => prev + entries.length)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('useETFInfo fetch error:', err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchMissing()

    return () => controller.abort()
  }, [symbols])

  return { loading, fetchedCount }
}
