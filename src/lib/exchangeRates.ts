// Exchange Rate Service using FMP API - SECURE VERSION
const FMP_API_KEY = process.env.FMP_API_KEY

interface FXResponse {
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  marketCap: number | null
  priceAvg50: number
  priceAvg200: number
  exchange: string
  volume: number
  avgVolume: number
  open: number
  previousClose: number
  timestamp: number
}

// Cache für Exchange Rates (10 Minuten)
const exchangeRateCache = new Map<string, { rate: number; timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 Minuten

// Unterstützte Währungspaare und ihre FMP-Symbole
const FX_PAIRS: Record<string, { fmpSymbol: string; invert: boolean }> = {
  'USD_EUR': { fmpSymbol: 'EURUSD', invert: true },   // EURUSD = 1.08 → USD→EUR = 1/1.08
  'EUR_USD': { fmpSymbol: 'EURUSD', invert: false },   // EURUSD = 1.08 → EUR→USD = 1.08
  'GBP_EUR': { fmpSymbol: 'GBPEUR', invert: false },   // GBPEUR direkt
  'EUR_GBP': { fmpSymbol: 'GBPEUR', invert: true },    // GBPEUR → EUR→GBP = 1/rate
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1

  const pairKey = `${fromCurrency}_${toCurrency}`
  const pairConfig = FX_PAIRS[pairKey]

  if (!pairConfig) {
    console.warn(`Unsupported currency pair: ${fromCurrency}->${toCurrency}`)
    return null
  }

  const cacheKey = pairKey

  // Check cache first
  const cached = exchangeRateCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate
  }

  try {
    if (!FMP_API_KEY) {
      console.warn('FMP_API_KEY not available for exchange rate')
      return null
    }

    // Try FMP quote endpoint
    let response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${pairConfig.fmpSymbol}?apikey=${FMP_API_KEY}`
    )

    // Fallback: fx endpoint
    if (!response.ok) {
      response = await fetch(
        `https://financialmodelingprep.com/api/v3/fx/${pairConfig.fmpSymbol}?apikey=${FMP_API_KEY}`
      )
    }

    if (!response.ok) {
      // Für GBP→EUR: Fallback über USD-Kreuzrate (GBPUSD / EURUSD)
      if (fromCurrency === 'GBP' && toCurrency === 'EUR') {
        const gbpUsd = await fetchFMPRate('GBPUSD')
        const eurUsd = await fetchFMPRate('EURUSD')
        if (gbpUsd && eurUsd) {
          const rate = gbpUsd / eurUsd
          exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })
          return rate
        }
      }
      console.warn(`FMP Exchange Rate API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    let fxRate: number | null = null
    if (Array.isArray(data) && data.length > 0 && data[0].price) {
      fxRate = data[0].price
    }

    if (!fxRate) {
      console.warn('No exchange rate data from FMP')
      return null
    }

    const rate = pairConfig.invert ? (1 / fxRate) : fxRate

    // Cache the result
    exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })

    return rate

  } catch (error) {
    console.warn('Error fetching exchange rate:', error)
    return null
  }
}

// Helper: Einzelnen FMP FX-Kurs laden
async function fetchFMPRate(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`
    )
    if (!response.ok) return null
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0 && data[0].price) {
      return data[0].price
    }
    return null
  } catch {
    return null
  }
}

// Helper function to convert USD amount to EUR with formatting
export function formatPriceWithEuroEquivalent(_usdAmount: number): string | null {
  // This will be called on the client side with cached exchange rate
  return null // Implementation will be in a React hook
}