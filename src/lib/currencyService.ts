// src/lib/currencyService.ts - EUR/USD Wechselkurs Service
// Nutzt die kostenlose Frankfurter API (basiert auf EZB-Kursen)

interface ExchangeRates {
  EUR_USD: number;
  USD_EUR: number;
  lastUpdated: string;
}

let cachedRates: ExchangeRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 Stunde

/**
 * Holt den aktuellen EUR/USD Wechselkurs
 * Cached für 1 Stunde um API-Calls zu minimieren
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  // Return cached rates if still valid
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    // Frankfurter API - kostenlos, basiert auf EZB-Kursen
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    const eurToUsd = data.rates.USD;

    cachedRates = {
      EUR_USD: eurToUsd,           // 1 EUR = X USD (z.B. 1.08)
      USD_EUR: 1 / eurToUsd,       // 1 USD = X EUR (z.B. 0.92)
      lastUpdated: data.date
    };
    cacheTimestamp = now;

    return cachedRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);

    // Fallback: Return cached rates if available, otherwise use approximate rate
    if (cachedRates) {
      return cachedRates;
    }

    // Fallback rate (approximate)
    return {
      EUR_USD: 1.08,
      USD_EUR: 0.926,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * Konvertiert USD zu EUR
 */
export async function usdToEur(usdAmount: number): Promise<number> {
  const rates = await getExchangeRates();
  return usdAmount * rates.USD_EUR;
}

/**
 * Konvertiert EUR zu USD
 */
export async function eurToUsd(eurAmount: number): Promise<number> {
  const rates = await getExchangeRates();
  return eurAmount * rates.EUR_USD;
}

/**
 * Holt nur den USD_EUR Kurs (für schnelle synchrone Nutzung nach initialem Load)
 */
export function getCachedUsdToEurRate(): number {
  return cachedRates?.USD_EUR ?? 0.926; // Fallback
}

/**
 * Prüft ob Rates gecached sind
 */
export function hasValidCache(): boolean {
  return cachedRates !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION;
}
