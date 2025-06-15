// src/lib/fmpActivity.ts - FMP Insider Trading Integration
interface FMPInsiderTrade {
    symbol: string
    transactionDate: string
    reportingDate: string
    filedDate: string
    reportingName: string
    typeOfOwner: string
    transactionType: string
    securitiesOwned: number
    securitiesTransacted: number
    price: number
    securityName: string
    companyCik: string
    reportingCik: string
    formType: string
    link: string
  }
  
  interface RealTimeActivity {
    id: string
    date: string
    investor: string
    activity: 'Buy' | 'Sell'
    security: string
    ticker: string
    shares: number
    price: number
    total: number
    formType: string
    link: string
  }
  
  export class FMPActivityService {
    private apiKey: string
    private baseUrl = 'https://financialmodelingprep.com/api/v4'
    
    constructor(apiKey: string) {
      this.apiKey = apiKey
    }
    
    // Get recent insider trading RSS feed
    async getRecentInsiderTrades(limit = 100): Promise<RealTimeActivity[]> {
      try {
        const response = await fetch(
          `${this.baseUrl}/insider-trading-rss-feed?limit=${limit}&apikey=${this.apiKey}`
        )
        
        if (!response.ok) {
          throw new Error(`FMP API Error: ${response.status}`)
        }
        
        const data: FMPInsiderTrade[] = await response.json()
        
        return data
          .filter(trade => this.isRelevantTrade(trade))
          .map(trade => this.transformToActivity(trade))
          .slice(0, 50) // Limit to 50 most recent
          
      } catch (error) {
        console.error('Error fetching FMP insider trades:', error)
        return []
      }
    }
    
    // Get insider trades for specific investor/company
    async getInsiderTradesForCompany(symbol: string, limit = 50): Promise<RealTimeActivity[]> {
      try {
        const response = await fetch(
          `${this.baseUrl}/insider-trading?symbol=${symbol}&limit=${limit}&apikey=${this.apiKey}`
        )
        
        if (!response.ok) {
          throw new Error(`FMP API Error: ${response.status}`)
        }
        
        const data: FMPInsiderTrade[] = await response.json()
        
        return data
          .filter(trade => this.isRelevantTrade(trade))
          .map(trade => this.transformToActivity(trade))
          
      } catch (error) {
        console.error('Error fetching company insider trades:', error)
        return []
      }
    }
    
    // Filter for relevant trades (large trades, known investors, etc.)
    private isRelevantTrade(trade: FMPInsiderTrade): boolean {
      // Filter criteria for interesting trades
      const minTradeValue = 100000 // $100k minimum
      const totalValue = (trade.securitiesTransacted || 0) * (trade.price || 0)
      
      // Skip if trade too small
      if (totalValue < minTradeValue) return false
      
      // Skip if no transaction
      if (!trade.securitiesTransacted || trade.securitiesTransacted === 0) return false
      
      // Focus on actual buy/sell transactions
      const relevantTransactionTypes = [
        'P-Purchase',
        'S-Sale', 
        'A-Grant, award or other acquisition',
        'D-Disposition (sale or gift)',
        'M-Exercise or conversion of derivative security'
      ]
      
      return relevantTransactionTypes.some(type => 
        trade.transactionType?.startsWith(type.charAt(0))
      )
    }
    
    // Transform FMP data to our activity format
    private transformToActivity(trade: FMPInsiderTrade): RealTimeActivity {
      const isBuy = this.isBuyTransaction(trade.transactionType)
      
      return {
        id: `fmp-${trade.reportingCik}-${trade.symbol}-${trade.transactionDate}`,
        date: trade.transactionDate || trade.filedDate,
        investor: this.cleanInvestorName(trade.reportingName),
        activity: isBuy ? 'Buy' : 'Sell',
        security: trade.securityName || trade.symbol,
        ticker: trade.symbol,
        shares: Math.abs(trade.securitiesTransacted || 0),
        price: trade.price || 0,
        total: Math.abs((trade.securitiesTransacted || 0) * (trade.price || 0)),
        formType: trade.formType || 'Form 4',
        link: trade.link || ''
      }
    }
    
    private isBuyTransaction(transactionType: string): boolean {
      const buyTypes = ['P', 'A', 'M'] // Purchase, Award, Exercise
      return buyTypes.some(type => transactionType?.startsWith(type))
    }
    
    private cleanInvestorName(name: string): string {
      return name
        ?.replace(/\s+/g, ' ')
        ?.replace(/,?\s*(JR|SR|III|II)\.?$/i, '')
        ?.trim() || name
    }
  }
  