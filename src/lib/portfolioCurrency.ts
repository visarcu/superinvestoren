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
      // Kein Cache - IMMER echte API-Kurse verwenden!
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
      
      // 2 Minuten Cache für aktuelle Kurse (häufiger frische Daten)
      if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
        console.log(`💰 Using cached USD→EUR rate: ${cached.rate} (${Math.round((Date.now() - cached.timestamp) / 1000)}s alt)`)
        return cached.rate
      }
  
      console.log('🔄 Fetching current USD→EUR exchange rate from FMP...')
      
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/fx/EURUSD?apikey=${this.apiKey}`
        )
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 FMP Response:', data)
          
          // FMP API gibt verschiedene Formate zurück
          let eurUsdRate = null
          
          if (data && Array.isArray(data) && data.length > 0) {
            // Neues Format: [{ bid, ask, open, high, low }]
            eurUsdRate = data[0].ask || data[0].bid || data[0].open || data[0].price || data[0].close || data[0].rate
          } else if (data && typeof data === 'object') {
            // Alternatives Format: { price, close, rate }
            eurUsdRate = data.ask || data.bid || data.open || data.price || data.close || data.rate
          }
          
          if (eurUsdRate && !isNaN(eurUsdRate) && eurUsdRate > 0) {
            const rate = 1 / eurUsdRate // EUR/USD zu USD/EUR umkehren
            console.log(`✅ Converted EUR/USD ${eurUsdRate} → USD/EUR ${rate.toFixed(6)}`)
            
            currentRateCache.set(cacheKey, { 
              rate, 
              timestamp: Date.now(),
              date: new Date().toISOString().split('T')[0]
            })
            return rate
          }
        }
        
        console.log('⚠️ Invalid FMP response, using fallback')
      } catch (error) {
        console.error('❌ Error fetching exchange rate:', error)
      }
      
      // NOTFALL-Fallback - sollte nie verwendet werden!
      const fallbackRate = 0.85 // Nur bei kompletter API-Ausfällen
      console.error(`🚨 API FEHLER! Verwende Notfall-Kurs: ${fallbackRate} - KURS IST NICHT AKTUELL!`)
      console.error('⚠️ Prüfe FMP API Key und Internetverbindung!')
      
      // Kurzen Cache, damit häufige Retries möglich sind
      currentRateCache.set(cacheKey, { 
        rate: fallbackRate, 
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      })
      return fallbackRate
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
          if (data?.historical && Array.isArray(data.historical) && data.historical[0]) {
            const eurUsdRate = data.historical[0].close || data.historical[0].price
            if (eurUsdRate && !isNaN(eurUsdRate) && eurUsdRate > 0) {
              const rate = 1 / eurUsdRate
              console.log(`✅ Historical EUR/USD ${eurUsdRate} → USD/EUR ${rate.toFixed(6)}`)
              historicalRateCache.set(cacheKey, { date, rate })
              return rate
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching historical rate for ${date}:`, error)
      }
  
      // Fallback: Nutze aktuellen Kurs
      console.log(`🔄 Using current rate as fallback for ${date}`)
      const currentRate = await this.getCurrentUSDtoEURRate()
      historicalRateCache.set(cacheKey, { date, rate: currentRate })
      return currentRate
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
  
      // EUR Konvertierung mit robuster Fehlerbehandlung
      console.log('🔄 Converting holdings to EUR display...')
      let currentRate: number
      
      try {
        currentRate = await this.getCurrentUSDtoEURRate()
        if (!currentRate || isNaN(currentRate) || currentRate <= 0) {
          throw new Error(`Invalid current rate: ${currentRate}`)
        }
      } catch (error) {
        console.error('❌ Failed to get current rate, using fallback:', error)
        currentRate = 0.92 // Robuster Fallback
      }
      
      const convertedHoldings = []
  
      for (const holding of holdings) {
        let purchaseRate = currentRate // Fallback
  
        // Wenn möglich, historischen Kurs vom Kaufdatum verwenden
        if (includeHistoricalRates && holding.purchase_date) {
          purchaseRate = await this.getHistoricalUSDtoEURRate(holding.purchase_date)
        }
  
        // Sichere Werte aus DB
        const purchasePrice = holding.purchase_price || 0
        const currentPrice = holding.current_price || 0
        const quantity = holding.quantity || 0

        if (purchasePrice === 0 || currentPrice === 0 || quantity === 0) {
          console.warn(`⚠️ Invalid holding data for ${holding.symbol}:`, { purchasePrice, currentPrice, quantity })
        }

        // Sichere Konvertierung
        const currentPriceEUR = currentPrice * currentRate
        const purchasePriceEUR = purchasePrice * purchaseRate
        const valueEUR = currentPriceEUR * quantity
        const investedEUR = purchasePriceEUR * quantity
        const gainLossEUR = valueEUR - investedEUR
        const gainLossPercent = investedEUR > 0 ? (gainLossEUR / investedEUR) * 100 : 0

        console.log(`💱 ${holding.symbol}: $${currentPrice} → ${currentPriceEUR.toFixed(2)}€ (rate: ${currentRate.toFixed(4)})`)
  
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