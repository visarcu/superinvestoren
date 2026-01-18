// src/lib/portfolioCurrency.ts - VEREINFACHTE VERSION für EUR-only System
//
// Neues System:
// - DB speichert alles in EUR (direkt vom User eingegeben)
// - Aktienkurse von API (USD) werden 1x in EUR konvertiert
// - Keine _display, _original Felder mehr
// - Einfache Berechnung: totalValue = stockValues + cash

// Cache für aktuellen Wechselkurs (5 Minuten)
let exchangeRateCache: { rate: number; timestamp: number } | null = null
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 Minuten

// Custom Error für Wechselkurs-Probleme
export class ExchangeRateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExchangeRateError'
  }
}

/**
 * Holt den aktuellen EUR/USD Wechselkurs
 * Verwendet um USD-Kurse von der API in EUR umzurechnen
 * @throws ExchangeRateError wenn der Kurs nicht geladen werden kann
 */
export async function getEURRate(): Promise<number> {
  // Check cache
  if (exchangeRateCache && Date.now() - exchangeRateCache.timestamp < CACHE_DURATION_MS) {
    return exchangeRateCache.rate
  }

  try {
    const response = await fetch('/api/exchange-rate?from=USD&to=EUR')

    if (response.ok) {
      const data = await response.json()

      if (data.rate && !isNaN(data.rate) && data.rate > 0) {
        exchangeRateCache = { rate: data.rate, timestamp: Date.now() }
        return data.rate
      }
    }
  } catch (error) {
    console.error('Fehler beim Laden des Wechselkurses:', error)
  }

  // Kein Fallback - Error werfen wenn API nicht erreichbar
  throw new ExchangeRateError('Wechselkurs konnte nicht geladen werden. Bitte versuche es später erneut.')
}

/**
 * Konvertiert einen USD-Preis in EUR
 * Wird verwendet für aktuelle Kurse von der FMP API
 */
export async function convertUSDtoEUR(priceUSD: number): Promise<number> {
  const rate = await getEURRate()
  return priceUSD * rate
}

/**
 * Konvertiert mehrere USD-Preise in EUR
 * Effizienter da nur ein API-Call für den Wechselkurs
 */
export async function convertPricesToEUR(pricesUSD: Record<string, number>): Promise<Record<string, number>> {
  const rate = await getEURRate()
  const pricesEUR: Record<string, number> = {}

  for (const [symbol, priceUSD] of Object.entries(pricesUSD)) {
    pricesEUR[symbol] = priceUSD * rate
  }

  return pricesEUR
}

/**
 * Portfolio-Wert berechnen (alles in EUR)
 */
export function calculatePortfolioValue(
  holdings: Array<{ quantity: number; currentPriceEUR: number }>,
  cashEUR: number
): { stockValue: number; cashValue: number; totalValue: number } {
  const stockValue = holdings.reduce(
    (sum, h) => sum + (h.quantity * h.currentPriceEUR),
    0
  )

  return {
    stockValue,
    cashValue: cashEUR,
    totalValue: stockValue + cashEUR
  }
}

/**
 * Cash-Anteil berechnen
 */
export function calculateCashPercentage(cashEUR: number, totalValueEUR: number): number {
  if (totalValueEUR <= 0) return 0
  return (cashEUR / totalValueEUR) * 100
}

/**
 * Gewinn/Verlust berechnen für eine Position
 */
export function calculateGainLoss(
  quantity: number,
  purchasePriceEUR: number,
  currentPriceEUR: number
): { gainLoss: number; gainLossPercent: number } {
  const costBasis = quantity * purchasePriceEUR
  const currentValue = quantity * currentPriceEUR
  const gainLoss = currentValue - costBasis
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

  return { gainLoss, gainLossPercent }
}

// ============================================================
// DEPRECATED - Alte CurrencyManager Klasse für Kompatibilität
// TODO: Entfernen sobald alle Komponenten migriert sind
// ============================================================

export class CurrencyManager {
  private static instance: CurrencyManager

  static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager()
    }
    return CurrencyManager.instance
  }

  // DEPRECATED - Verwendet die neue getEURRate Funktion
  async getCurrentUSDtoEURRate(): Promise<number | null> {
    try {
      return await getEURRate()
    } catch {
      return null
    }
  }

  // DEPRECATED - Im neuen System speichern wir direkt in EUR
  async convertNewPositionToUSD(
    price: number,
    _currency: 'USD' | 'EUR'
  ): Promise<{ priceUSD: number; exchangeRate: number | null; metadata: any }> {
    // Im neuen System speichern wir direkt in EUR!
    // Diese Funktion gibt den EUR-Preis zurück ohne Konvertierung
    return {
      priceUSD: price, // Eigentlich EUR, aber für Kompatibilität
      exchangeRate: 1.0,
      metadata: { note: 'Direkt in EUR gespeichert' }
    }
  }

  // DEPRECATED - Vereinfacht für neues System
  async convertHoldingsForDisplay(
    holdings: any[],
    _displayCurrency: 'USD' | 'EUR',
    _includeHistoricalRates: boolean = false
  ) {
    // Im neuen System: purchase_price ist bereits EUR
    // Nur current_price (von API in USD) muss konvertiert werden
    const rate = await getEURRate()

    return holdings.map(h => ({
      ...h,
      // current_price kommt in USD von API, konvertieren zu EUR
      current_price_display: h.current_price * rate,
      // purchase_price ist bereits EUR
      purchase_price_display: h.purchase_price,
      display_currency: 'EUR',
      exchange_rate_used: rate
    }))
  }

  // DEPRECATED
  async convertCashPosition(cashAmount: number, _displayCurrency: 'USD' | 'EUR') {
    // Cash ist bereits in EUR
    return { amount: cashAmount, currency: 'EUR' }
  }

  // DEPRECATED
  async getHistoricalUSDtoEURRate(_date: string): Promise<number | null> {
    return null
  }
}

// Export singleton für Kompatibilität
export const currencyManager = CurrencyManager.getInstance()
