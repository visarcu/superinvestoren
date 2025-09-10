// src/lib/hybridFinancialService.ts - NEUE DATEI ERSTELLEN

import { enhancePromptWithRAG } from './ragSystem'

interface FMPFinancialData {
  revenue: number
  eps: number
  netIncome: number
  grossProfit: number
  operatingIncome: number
  quarter: string
  year: number
  date: string
}

class FMPDataService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || ''
    if (!this.apiKey) {
      console.warn('FMP API Key nicht gefunden')
    }
  }

  // Aktuelle Quartalszahlen holen
  async getQuarterlyResults(ticker: string, limit: number = 4): Promise<FMPFinancialData[]> {
    if (!this.apiKey) {
      console.error('FMP API Key fehlt')
      return []
    }

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=${limit}&apikey=${this.apiKey}`
      )
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      return data.map((item: any) => ({
        revenue: item.revenue || 0,
        eps: item.eps || 0,
        netIncome: item.netIncome || 0,
        grossProfit: item.grossProfit || 0,
        operatingIncome: item.operatingIncome || 0,
        quarter: this.getQuarterFromDate(item.date),
        year: new Date(item.date).getFullYear(),
        date: item.date
      }))
    } catch (error) {
      console.error('Error fetching FMP quarterly data:', error)
      return []
    }
  }

  // Key Metrics holen
  async getKeyMetrics(ticker: string): Promise<any> {
    if (!this.apiKey) return {}

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=quarter&limit=1&apikey=${this.apiKey}`
      )
      
      const data = await response.json()
      return data[0] || {}
    } catch (error) {
      console.error('Error fetching key metrics:', error)
      return {}
    }
  }

  // Aktienkurs holen
  async getCurrentPrice(ticker: string): Promise<{ price: number, change: number, changePercent: number }> {
    if (!this.apiKey) return { price: 0, change: 0, changePercent: 0 }

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${this.apiKey}`
      )
      
      const data = await response.json()
      const quote = data[0]
      
      return {
        price: quote?.price || 0,
        change: quote?.change || 0,
        changePercent: quote?.changesPercentage || 0
      }
    } catch (error) {
      console.error('Error fetching current price:', error)
      return { price: 0, change: 0, changePercent: 0 }
    }
  }

  private getQuarterFromDate(dateString: string): string {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const quarter = Math.ceil(month / 3)
    return `Q${quarter}`
  }
}

// Hauptklasse für Hybrid-Service
export class HybridFinancialService {
  private fmpService: FMPDataService
  
  constructor() {
    this.fmpService = new FMPDataService()
  }

  // Kombiniert FMP-Daten mit RAG-Kontext
  async getComprehensiveAnalysis(
    ticker: string, 
    userQuery: string
  ): Promise<{
    fmpData: {
      quarterly: FMPFinancialData[]
      metrics: any
      currentPrice: any
    }
    ragContext: string
    enhancedPrompt: string
  }> {
    
    console.log(`🔍 Gathering comprehensive analysis for ${ticker}...`)
    
    // 1. Direkte FMP-Daten holen (parallel)
    const [quarterly, metrics, currentPrice] = await Promise.allSettled([
      this.fmpService.getQuarterlyResults(ticker, 4),
      this.fmpService.getKeyMetrics(ticker),
      this.fmpService.getCurrentPrice(ticker)
    ])

    // 2. RAG-Kontext holen
    let ragContext = ''
    try {
      ragContext = await enhancePromptWithRAG(userQuery, ticker, 'stock')
    } catch (error) {
      console.warn('RAG enhancement failed:', error)
      ragContext = 'RAG context temporarily unavailable.'
    }

    // Extract successful results
    const quarterlyData = quarterly.status === 'fulfilled' ? quarterly.value : []
    const metricsData = metrics.status === 'fulfilled' ? metrics.value : {}
    const priceData = currentPrice.status === 'fulfilled' ? currentPrice.value : { price: 0, change: 0, changePercent: 0 }

    // 3. Kombinierter Prompt mit beiden Datenquellen
    const fmpDataSummary = this.formatFMPData(quarterlyData, metricsData, priceData, ticker)
    
    const enhancedPrompt = `
=== AKTUELLE FINANZDATEN (FMP API) ===
${fmpDataSummary}

=== ZUSÄTZLICHER KONTEXT (RAG) ===
${ragContext}

--- ORIGINAL USER QUERY ---
${userQuery}

INSTRUCTIONS: 
1. Verwende VORRANGIG die aktuellen FMP-Finanzdaten für präzise Zahlen
2. Nutze RAG-Kontext für zusätzliche Einblicke und Trends
3. Erwähne immer die Quellen (FMP für Zahlen, News/Earnings für Kontext)
4. Gib konkrete Zahlen und Prozentwerte an
5. Antworte auf Deutsch
`

    return {
      fmpData: { 
        quarterly: quarterlyData, 
        metrics: metricsData, 
        currentPrice: priceData 
      },
      ragContext,
      enhancedPrompt
    }
  }

  private formatFMPData(
    quarterly: FMPFinancialData[], 
    metrics: any, 
    currentPrice: any, 
    ticker: string
  ): string {
    if (quarterly.length === 0) {
      return `⚠️ Keine aktuellen Finanzdaten für ${ticker} von FMP API verfügbar.`
    }

    const latest = quarterly[0]
    const previous = quarterly[1]
    
    let summary = `
🏢 AKTUELLE QUARTALSZAHLEN für ${ticker.toUpperCase()}:

📊 Letztes Quartal (${latest.quarter} ${latest.year}):
   • Umsatz: $${(latest.revenue / 1e9).toFixed(2)} Milliarden`
    
    if (previous && previous.revenue > 0) {
      const revenueGrowth = ((latest.revenue - previous.revenue) / previous.revenue * 100).toFixed(1)
      summary += ` (${parseFloat(revenueGrowth) > 0 ? '+' : ''}${revenueGrowth}% YoY)`
    }
    
    summary += `
   • EPS: $${latest.eps}
   • Nettogewinn: $${(latest.netIncome / 1e9).toFixed(2)} Milliarden
   • Bruttogewinn: $${(latest.grossProfit / 1e9).toFixed(2)} Milliarden

📈 Aktueller Aktienkurs:
   • Preis: $${currentPrice.price}
   • Änderung: ${currentPrice.change >= 0 ? '+' : ''}$${currentPrice.change} (${currentPrice.changePercent >= 0 ? '+' : ''}${currentPrice.changePercent}%)

📊 Key Metrics:
   • P/E Ratio: ${metrics.peRatio || 'N/A'}
   • Market Cap: ${metrics.marketCap ? '$' + (metrics.marketCap / 1e9).toFixed(2) + ' Milliarden' : 'N/A'}
   • Revenue TTM: ${metrics.revenueTTM ? '$' + (metrics.revenueTTM / 1e9).toFixed(2) + ' Milliarden' : 'N/A'}

📈 HISTORISCHE QUARTALE:
`

    quarterly.slice(0, 4).forEach((q, index) => {
      summary += `   ${q.quarter} ${q.year}: $${(q.revenue / 1e9).toFixed(2)}B Revenue, $${q.eps} EPS\n`
    })

    summary += `\nQuelle: Financial Modeling Prep (FMP) API - Echtzeitdaten\n`

    return summary
  }
}

// Helper function für direkte Nutzung
export async function getHybridFinancialData(ticker: string, query: string) {
  const service = new HybridFinancialService()
  return await service.getComprehensiveAnalysis(ticker, query)
}