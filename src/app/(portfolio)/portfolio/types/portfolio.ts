export interface Transaction {
    id: string
    date: string
    type: 'BUY' | 'SELL' | 'DIVIDEND' | 'INCOME' | 'EXPENSE'
    category: 'INVESTMENT' | 'INCOME' | 'EXPENSE'
    symbol: string
    name: string
    quantity: number
    price: number
    fees: number
    broker?: string
    account?: string // ✅ NEU: Konto-Information
    description?: string
  }
  
  export interface Account {
    id: string
    name: string
    bank: string
    type: 'CHECKING' | 'SAVINGS' | 'BUSINESS' | 'INVESTMENT' | 'OTHER'
    balance?: number
  }
  
  export interface PortfolioPosition {
    symbol: string
    name: string
    quantity: number
    totalCost: number
    currentValue: number
    currentPrice: number
    gainLoss: number
    gainLossPercent: number
  }
  
  export interface PortfolioData {
    totalValue: number
    totalInvested: number
    totalGainLoss: number
    gainLossPercent: number
    positions: PortfolioPosition[]
    monthlyIncome: number
    monthlyExpenses: number
    savingsRate: number
  }
  
  export interface ChartDataPoint {
    date: string
    value: number
    label: string
  }

  export interface StockQuote {
    symbol: string
    name: string
    price: number        // Jetzt in EUR!
    changesPercentage: number
    change: number       // Jetzt in EUR!
    marketCap?: number
    pe?: number
    // 🆕 NEU: Debug Fields
    priceUSD?: number    // Original USD Preis
    currency?: string    // 'EUR'
    exchangeRate?: number // Aktueller EUR/USD Kurs
  }