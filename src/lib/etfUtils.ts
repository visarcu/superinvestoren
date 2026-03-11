// src/lib/etfUtils.ts — ETF-Lookup und TER-Berechnungen
// Priorisierung: 1) Statische etfs.ts (handkuratiert) → 2) Runtime-Cache (FMP v4 API)
import { etfs, type ETF } from '@/data/etfs'
import { getCachedETFInfo, cachedInfoToETF } from '@/lib/etfInfoCache'

/**
 * ETF anhand Symbol finden.
 * Prüft zuerst statische Daten (handkuratiert, korrekte TER),
 * dann den Runtime-Cache (befüllt durch useETFInfo Hook / API).
 */
export function getETFBySymbol(symbol: string): ETF | undefined {
  const upper = symbol.toUpperCase()

  // 1. Statische Liste (handkuratiert, immer korrekt)
  const staticMatch = etfs.find(
    e => e.symbol.toUpperCase() === upper ||
         (e.symbol_de && e.symbol_de.toUpperCase() === upper)
  )
  if (staticMatch) return staticMatch

  // 2. Runtime-Cache (FMP v4 API Daten)
  const cached = getCachedETFInfo(upper)
  if (cached) return cachedInfoToETF(cached)

  return undefined
}

/**
 * Prüft ob ein Symbol ein bekannter ETF ist.
 */
export function isETF(symbol: string): boolean {
  return getETFBySymbol(symbol) !== undefined
}

/**
 * ETF anhand ISIN finden (z.B. für PDF-Import).
 * Prüft statische Daten und Runtime-Cache.
 */
export function getETFByISIN(isin: string): ETF | undefined {
  const upper = isin.toUpperCase()
  // Statische Daten zuerst
  return etfs.find(e => e.isin?.toUpperCase() === upper)
  // Hinweis: ISIN-Suche im Runtime-Cache ist nicht implementiert,
  // da ISINs über den isinResolver aufgelöst werden
}

/**
 * Gibt den Display-Namen für ein Symbol zurück.
 * Bei ETFs: vollständiger Name (z.B. "Vanguard FTSE All-World")
 * Bei Aktien: null (dann FMP-Name verwenden)
 */
export function getETFDisplayName(symbol: string): string | null {
  const etf = getETFBySymbol(symbol)
  if (!etf) return null
  return etf.name
}

/**
 * ETFs durchsuchen — matcht Name, Symbol, Issuer, ISIN und Kategorie.
 * Durchsucht nur die statische Liste (schnell, für Autocomplete).
 */
export function searchETFs(query: string, limit: number = 8): ETF[] {
  if (!query || query.length < 2) return []
  const lower = query.toLowerCase()
  const terms = lower.split(/\s+/)

  return etfs
    .filter(etf => {
      const searchable = [
        etf.symbol,
        etf.symbol_de || '',
        etf.name,
        etf.issuer,
        etf.isin || '',
        etf.category,
      ].join(' ').toLowerCase()

      // Alle Suchbegriffe müssen matchen
      return terms.every(term => searchable.includes(term))
    })
    .slice(0, limit)
}

/**
 * Jährliche TER-Kosten in EUR berechnen.
 * @param positionValue Aktueller Wert der Position in EUR
 * @param ter TER als Dezimalzahl (z.B. 0.22 für 0,22%)
 */
export function calculateTERCost(positionValue: number, ter: number): number {
  return positionValue * (ter / 100)
}

/**
 * Sparpotenzial berechnen: Differenz zu einer günstigeren Referenz-TER.
 * @param positionValue Aktueller Wert der Position in EUR
 * @param currentTER Aktuelle TER (z.B. 0.22)
 * @param referenceTER Günstigere Referenz-TER (Default: 0.20% — Standard für breit diversifizierte ETFs)
 */
export function calculateTERSavings(
  positionValue: number,
  currentTER: number,
  referenceTER: number = 0.20
): {
  currentCostPerYear: number
  referenceCostPerYear: number
  savingsPerYear: number
  savingsOver5Years: number
  savingsOver10Years: number
} {
  const currentCostPerYear = calculateTERCost(positionValue, currentTER)
  const referenceCostPerYear = calculateTERCost(positionValue, referenceTER)
  const savingsPerYear = currentCostPerYear - referenceCostPerYear

  return {
    currentCostPerYear,
    referenceCostPerYear,
    savingsPerYear,
    savingsOver5Years: savingsPerYear * 5,
    savingsOver10Years: savingsPerYear * 10,
  }
}

/**
 * TER als formatierten deutschen String: 0.22 → "0,22%"
 */
export function formatTER(ter: number): string {
  return `${ter.toFixed(2).replace('.', ',')}%`
}
