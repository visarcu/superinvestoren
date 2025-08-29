// Exchange Rate Service using FMP API
const FMP_API_KEY = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY

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

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  // Only support USD<->EUR for now, as that's what's needed
  if (!((fromCurrency === 'USD' && toCurrency === 'EUR') || (fromCurrency === 'EUR' && toCurrency === 'USD'))) {
    console.warn(`Unsupported currency pair: ${fromCurrency}->${toCurrency}`)
    return null
  }
  
  const cacheKey = `${fromCurrency}${toCurrency}`
  
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
    
    console.log(`Fetching exchange rate USD<->EUR`)
    
    // Always fetch EURUSD rate (EUR per USD)
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/fx/EURUSD?apikey=${FMP_API_KEY}`
    )
    
    if (!response.ok) {
      console.warn(`FMP Exchange Rate API error: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    console.log('FMP Exchange Rate API response:', data)
    
    // Use current realistic fallback rate based on Google: 1 EUR = 1.17 USD  
    const eurUsdRate = data[0]?.price || 0.855 // Fallback: 1 USD = 0.855 EUR
    
    let rate: number
    if (fromCurrency === 'USD' && toCurrency === 'EUR') {
      // USD->EUR: use rate directly (0.855 EUR per USD)  
      rate = eurUsdRate
    } else {
      // EUR->USD: invert the rate (1/0.855 = 1.17 USD per EUR)
      rate = 1 / eurUsdRate
    }
    
    console.log(`Exchange rate ${fromCurrency}->${toCurrency}: ${rate}`)
    
    // Cache the result
    exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })
    
    return rate
    
  } catch (error) {
    console.warn('Error fetching exchange rate:', error)
    return null
  }
}

// Helper function to convert USD amount to EUR with formatting
export function formatPriceWithEuroEquivalent(usdAmount: number): string | null {
  // This will be called on the client side with cached exchange rate
  return null // Implementation will be in a React hook
}