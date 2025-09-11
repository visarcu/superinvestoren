// src/lib/portfolioCurrency.ts - SECURE VERSION using API routes only

interface ExchangeRate {
  rate: number
  timestamp: number
  date?: string
}

interface HistoricalRate {
  date: string
  rate: number
}

// Cache für aktuelle Wechselkurse (5 Minuten)
const currentRateCache: Map<string, ExchangeRate> = new Map()

// Cache für historische Wechselkurse (permanent bis reload)
const historicalRateCache: Map<string, HistoricalRate> = new Map()

export class CurrencyManager {
  private static instance: CurrencyManager

  constructor() {
    // No API key needed - using secure API routes only
  }

  static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager()
    }
    return CurrencyManager.instance
  }

  // SECURE VERSION: Use exchange rate API route
  async getCurrentUSDtoEURRate(): Promise<number | null> {
    const cacheKey = 'USDEUR_current'
    const cached = currentRateCache.get(cacheKey)
    
    // 2 Minuten Cache für aktuelle Kurse
    if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
      console.log(`💰 Using cached USD→EUR rate: ${cached.rate} (${Math.round((Date.now() - cached.timestamp) / 1000)}s alt)`)
      return cached.rate
    }

    console.log('🔄 Fetching current USD→EUR exchange rate via secure API...')
    
    try {
      const response = await fetch('/api/exchange-rate?from=USD&to=EUR')
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.rate && !isNaN(data.rate) && data.rate > 0) {
          console.log(`✅ Fetched USD→EUR rate: ${data.rate.toFixed(6)}`)
          
          currentRateCache.set(cacheKey, { 
            rate: data.rate, 
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
          })
          return data.rate
        }
      }
      
      console.log('⚠️ Invalid API response, using fallback')
    } catch (error) {
      console.error('❌ Error fetching exchange rate:', error)
    }
    
    // NO FALLBACK! Return null to indicate unavailable data
    console.error('🚨 Exchange rate data unavailable - no fallback used for professional accuracy')
    return null
  }

  // SECURE VERSION: Use historical exchange rate API route
  async getHistoricalUSDtoEURRate(date: string): Promise<number | null> {
    const cacheKey = `USDEUR_${date}`
    const cached = historicalRateCache.get(cacheKey)
    
    if (cached) {
      return cached.rate
    }

    try {
      const response = await fetch(`/api/exchange-rate?from=USD&to=EUR&date=${date}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.rate && !isNaN(data.rate) && data.rate > 0) {
          console.log(`✅ Historical USD→EUR rate for ${date}: ${data.rate.toFixed(6)}`)
          historicalRateCache.set(cacheKey, { date, rate: data.rate })
          return data.rate
        }
      }
    } catch (error) {
      console.error(`Error fetching historical rate for ${date}:`, error)
    }

    // NO FALLBACK for professional accuracy
    console.log(`❌ Historical exchange rate for ${date} unavailable`)
    return null
  }

  // Portfolio conversion methods remain the same but now use secure API calls
  async convertHoldingsForDisplay(
    holdings: any[], 
    displayCurrency: 'USD' | 'EUR',
    includeHistoricalRates: boolean = false
  ) {
    if (displayCurrency === 'USD') {
      return holdings.map(h => ({
        ...h,
        current_price_display: h.current_price,
        current_value_display: h.current_value,
        cost_basis_display: h.cost_basis,
        total_return_display: h.total_return,
        purchase_price_display: h.purchase_price,
        display_currency: 'USD'
      }))
    }

    const rate = await this.getCurrentUSDtoEURRate()

    if (rate === null) {
      // If exchange rate is unavailable, return data in USD with warning
      return holdings.map(h => ({
        ...h,
        current_price_display: h.current_price,
        current_value_display: h.current_value,
        cost_basis_display: h.cost_basis,
        total_return_display: h.total_return,
        purchase_price_display: h.purchase_price,
        display_currency: 'USD',
        exchange_rate_unavailable: true
      }))
    }

    return holdings.map(h => ({
      ...h,
      current_price_display: h.current_price * rate,
      current_value_display: h.current_value * rate,
      cost_basis_display: h.cost_basis * rate,
      total_return_display: h.total_return * rate,
      purchase_price_display: h.purchase_price * rate,
      display_currency: 'EUR',
      exchange_rate_used: rate
    }))
  }

  // Convert cash position for display
  async convertCashPosition(
    cashAmount: number,
    displayCurrency: 'USD' | 'EUR'
  ): Promise<{ amount: number; currency: string; unavailable?: boolean }> {
    if (displayCurrency === 'USD') {
      return { amount: cashAmount, currency: 'USD' }
    }

    const rate = await this.getCurrentUSDtoEURRate()
    if (rate === null) {
      // Return USD amount if exchange rate unavailable
      return {
        amount: cashAmount,
        currency: 'USD',
        unavailable: true
      }
    }

    return {
      amount: cashAmount * rate,
      currency: 'EUR'
    }
  }

  // Convert new position data to USD for storage
  async convertNewPositionToUSD(
    price: number,
    currency: 'USD' | 'EUR'
  ): Promise<{ priceUSD: number; exchangeRate: number | null; metadata: any }> {
    if (currency === 'USD') {
      return {
        priceUSD: price,
        exchangeRate: 1.0,
        metadata: { originalCurrency: 'USD', conversionNeeded: false }
      }
    }

    const rate = await this.getCurrentUSDtoEURRate()
    if (rate === null) {
      throw new Error('Exchange rate unavailable. Cannot convert EUR to USD for storage.')
    }

    // Convert EUR to USD (divide by EUR/USD rate)
    const priceUSD = price / rate

    return {
      priceUSD,
      exchangeRate: rate,
      metadata: {
        originalCurrency: 'EUR',
        originalPrice: price,
        conversionNeeded: true,
        conversionDate: new Date().toISOString()
      }
    }
  }
}

// Export singleton instance
export const currencyManager = CurrencyManager.getInstance()