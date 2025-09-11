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
    
    // Try different FMP endpoints for exchange rate
    let response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/EURUSD?apikey=${FMP_API_KEY}`
    )
    
    // If that fails, try the forex endpoint
    if (!response.ok) {
      response = await fetch(
        `https://financialmodelingprep.com/api/v3/fx/EURUSD?apikey=${FMP_API_KEY}`
      )
    }
    
    if (!response.ok) {
      console.warn(`FMP Exchange Rate API error: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    console.log('FMP Exchange Rate API response:', JSON.stringify(data, null, 2))
    
    // Handle different response formats
    let eurUsdRate: number
    
    if (Array.isArray(data) && data.length > 0) {
      // Quote endpoint format: [{ symbol, price, ... }]
      if (data[0].price) {
        eurUsdRate = data[0].price
        console.log(`✅ Got exchange rate from quote endpoint: ${eurUsdRate}`)
      } else {
        console.warn('No exchange rate data from quote endpoint')
        return null
      }
    } else {
      console.warn('No exchange rate data returned from FMP API, data structure:', JSON.stringify(data))
      return null
    }
    
    let rate: number
    if (fromCurrency === 'USD' && toCurrency === 'EUR') {
      // USD->EUR: EURUSD gives us EUR/USD (e.g., 1.17), so we need to invert it to get USD/EUR
      // If 1 EUR = 1.17 USD, then 1 USD = 1/1.17 = 0.855 EUR
      rate = 1 / eurUsdRate
    } else {
      // EUR->USD: use EURUSD rate directly (1 EUR = eurUsdRate USD)
      rate = eurUsdRate
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
export function formatPriceWithEuroEquivalent(_usdAmount: number): string | null {
  // This will be called on the client side with cached exchange rate
  return null // Implementation will be in a React hook
}