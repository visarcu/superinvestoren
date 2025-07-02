// src/utils/sectorUtils.ts - Vollständige Helper-Datei
import { stocks } from '@/data/stocks'

/**
 * Ermittelt den Sektor einer Position basierend auf CUSIP oder Ticker
 */
export function getSectorFromPosition(position: {
  cusip: string
  ticker?: string | null
}): string {
  // Erst über Ticker suchen
  if (position.ticker) {
    const stockByTicker = stocks.find(s => s.ticker === position.ticker)
    if (stockByTicker?.sector) {
      return stockByTicker.sector
    }
  }
  
  // Dann über CUSIP suchen
  const stockByCusip = stocks.find(s => s.cusip === position.cusip)
  if (stockByCusip?.sector) {
    return stockByCusip.sector
  }
  
  // Fallback zu 'Other'
  return 'Other'
}

/**
 * Ermittelt den Sektor direkt über Ticker
 */
export function getSectorFromTicker(ticker: string): string {
  const stock = stocks.find(s => s.ticker === ticker)
  return stock?.sector || 'Other'
}

/**
 * Deutsche Sektor-Namen Mapping für bessere UX
 */
export const SECTOR_TRANSLATIONS: Record<string, string> = {
  'Technology': 'Technologie',
  'Healthcare': 'Gesundheitswesen',
  'Financial Services': 'Finanzdienstleistungen',
  'Consumer Staples': 'Basiskonsumgüter',
  'Consumer Discretionary': 'Zyklische Konsumgüter',
  'Energy': 'Energie',
  'Industrials': 'Industrie',
  'Real Estate': 'Immobilien',
  'Materials': 'Rohstoffe',
  'Utilities': 'Versorger',
  'Communication Services': 'Kommunikation',
  'Other': 'Sonstige'
}

/**
 * Übersetzt englische Sektornamen ins Deutsche
 */
export function translateSector(sector: string): string {
  return SECTOR_TRANSLATIONS[sector] || sector
}