// data/stocks.ts - KORREKTE VERSION

// Interface HIER definieren, nicht importieren!
export interface Stock {
    ticker: string
    cusip: string
    name: string
    sector: string
    metrics: any[]
  }
  
  // Dann die anderen Dateien importieren (OHNE das Interface!)
  import { stocks as usStocks } from './stocks-us'
  import { stocks as deStocks } from './stocks-de'
  
  // Kombiniertes Array exportieren
  export const stocks: Stock[] = [
    ...usStocks,
    ...deStocks
  ]