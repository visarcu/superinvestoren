// src/lib/portfolioCurrency.ts
// Optimierte Version mit historischen Wechselkursen

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
    private apiKey: string
  
    constructor() {
      this.apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || ''
    }
  
    static getInstance(): CurrencyManager {
      if (!CurrencyManager.instance) {
        CurrencyManager.instance = new CurrencyManager()
      }
      return CurrencyManager.instance
    }
  
    // ✅ Aktueller Wechselkurs mit Cache
    async getCurrentUSDtoEURRate(): Promise<number> {
      const cacheKey = 'USDEUR_current'
      const cached = currentRateCache.get(cacheKey)
      
      // 5 Minuten Cache für aktuelle Kurse
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.rate
      }
  
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/fx/EURUSD?apikey=${this.apiKey}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data && data[0]) {
            const rate = 1 / data[0].price // EUR/USD zu USD/EUR umkehren
            currentRateCache.set(cacheKey, { 
              rate, 
              timestamp: Date.now(),
              date: new Date().toISOString().split('T')[0]
            })
            return rate
          }
        }
      } catch (error) {
        console.error('Error fetching current exchange rate:', error)
      }
      
      // Fallback rate (realistischer Durchschnitt)
      return 0.92
    }
  
    // ✅ Historischer Wechselkurs für Performance-Berechnung
    async getHistoricalUSDtoEURRate(date: string): Promise<number> {
      const cacheKey = `USDEUR_${date}`
      const cached = historicalRateCache.get(cacheKey)
      
      if (cached) {
        return cached.rate
      }
  
      try {
        // FMP historische Forex Daten
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-price-full/EURUSD?from=${date}&to=${date}&apikey=${this.apiKey}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data?.historical && data.historical[0]) {
            const rate = 1 / data.historical[0].close
            historicalRateCache.set(cacheKey, { date, rate })
            return rate
          }
        }
      } catch (error) {
        console.error(`Error fetching historical rate for ${date}:`, error)
      }
  
      // Fallback: Nutze aktuellen Kurs
      return await this.getCurrentUSDtoEURRate()
    }
  
    // ✅ Portfolio Holdings mit korrekter Währungsbehandlung
    async convertHoldingsForDisplay(
      holdings: any[], 
      displayCurrency: 'USD' | 'EUR',
      includeHistoricalRates: boolean = false
    ) {
      if (displayCurrency === 'USD') {
        return holdings.map(h => ({
          ...h,
          current_price_display: h.current_price,
          purchase_price_display: h.purchase_price,
          value: h.current_price * h.quantity,
          gain_loss: (h.current_price - h.purchase_price) * h.quantity,
          gain_loss_percent: h.purchase_price > 0 
            ? ((h.current_price - h.purchase_price) / h.purchase_price) * 100 
            : 0
        }))
      }
  
      // EUR Konvertierung
      const currentRate = await this.getCurrentUSDtoEURRate()
      const convertedHoldings = []
  
      for (const holding of holdings) {
        let purchaseRate = currentRate // Fallback
  
        // Wenn möglich, historischen Kurs vom Kaufdatum verwenden
        if (includeHistoricalRates && holding.purchase_date) {
          purchaseRate = await this.getHistoricalUSDtoEURRate(holding.purchase_date)
        }
  
        const currentPriceEUR = holding.current_price * currentRate
        const purchasePriceEUR = holding.purchase_price * purchaseRate
        const valueEUR = currentPriceEUR * holding.quantity
        const investedEUR = purchasePriceEUR * holding.quantity
        const gainLossEUR = valueEUR - investedEUR
        const gainLossPercent = investedEUR > 0 ? (gainLossEUR / investedEUR) * 100 : 0
  
        convertedHoldings.push({
          ...holding,
          // Original USD Werte behalten
          current_price_usd: holding.current_price,
          purchase_price_usd: holding.purchase_price,
          
          // EUR Anzeige-Werte
          current_price_display: currentPriceEUR,
          purchase_price_display: purchasePriceEUR,
          value: valueEUR,
          gain_loss: gainLossEUR,
          gain_loss_percent: gainLossPercent,
          
          // Metadata
          current_exchange_rate: currentRate,
          purchase_exchange_rate: purchaseRate,
          currency_aware: true
        })
      }
  
      return convertedHoldings
    }
  
    // ✅ Neue Position: Konvertiere Eingabe zu USD für DB
    async convertNewPositionToUSD(
      priceInput: number, 
      inputCurrency: 'USD' | 'EUR',
      purchaseDate?: string
    ): Promise<{
      priceUSD: number,
      exchangeRate: number,
      metadata: any
    }> {
      if (inputCurrency === 'USD') {
        return {
          priceUSD: priceInput,
          exchangeRate: 1,
          metadata: {
            input_currency: 'USD',
            input_price: priceInput,
            exchange_rate: 1
          }
        }
      }
  
      // EUR zu USD konvertieren
      let rate: number
      
      if (purchaseDate) {
        // Verwende historischen Kurs für das Kaufdatum
        rate = await this.getHistoricalUSDtoEURRate(purchaseDate)
      } else {
        // Verwende aktuellen Kurs
        rate = await this.getCurrentUSDtoEURRate()
      }
  
      const priceUSD = priceInput / rate
  
      return {
        priceUSD,
        exchangeRate: rate,
        metadata: {
          input_currency: 'EUR',
          input_price: priceInput,
          exchange_rate: rate,
          purchase_date: purchaseDate
        }
      }
    }
  
    // ✅ Cash Position konvertieren
    async convertCashPosition(
      cashUSD: number, 
      displayCurrency: 'USD' | 'EUR'
    ): Promise<number> {
      if (displayCurrency === 'USD') {
        return cashUSD
      }
  
      const rate = await this.getCurrentUSDtoEURRate()
      return cashUSD * rate
    }
  
    // ✅ Batch-Konvertierung für Performance
    async batchConvertToEUR(values: number[]): Promise<number[]> {
      const rate = await this.getCurrentUSDtoEURRate()
      return values.map(value => value * rate)
    }
  }
  
  // ✅ Singleton Export
  export const currencyManager = CurrencyManager.getInstance()
  
  // ✅ Convenience Functions
  export async function getUSDtoEURRate(): Promise<number> {
    return currencyManager.getCurrentUSDtoEURRate()
  }
  
  export async function convertPortfolioToEUR(holdings: any[], includeHistorical = false) {
    return currencyManager.convertHoldingsForDisplay(holdings, 'EUR', includeHistorical)
  }
  
  export async function convertInputToUSD(priceInEUR: number, currency: 'USD' | 'EUR', date?: string) {
    const result = await currencyManager.convertNewPositionToUSD(priceInEUR, currency, date)
    return result.priceUSD
  }