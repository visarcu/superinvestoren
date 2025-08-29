// Shared logic for sector stock selection used by both screener and peer comparison
import { stocks } from '@/data/stocks'

export function getSectorStocks(sector: string, excludeTicker?: string): string[] {
  // Same filtering logic as peer comparison service
  let sectorStocks = stocks
    .filter(stock => 
      stock.sector === sector && 
      (!excludeTicker || stock.ticker !== excludeTicker.toUpperCase()) &&
      stock.ticker.length <= 5 && // Nur normale Ticker (keine langen ETF Codes)
      !stock.ticker.includes('.') && // Keine internationalen/OTC Ticker
      stock.ticker.match(/^[A-Z]{1,5}$/) && // Nur Standard US Ticker
      !stock.name.toLowerCase().includes('etf') && // Keine ETFs
      !stock.name.toLowerCase().includes('fund') && // Keine Fonds
      !stock.name.toLowerCase().includes('trust') && // Keine Trusts
      stock.sector !== 'Asset Management' && // Keine Asset Management (meist ETFs)
      !stock.ticker.endsWith('X') && // Viele ETFs enden mit X
      !stock.ticker.endsWith('W') // Warrants ausschließen
    )
    .map(stock => stock.ticker)

  // Prioritize well-known large cap stocks first (same as peer comparison)
  const priorityStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'LLY', 'AVGO', 'JPM', 'UNH', 'XOM', 'V', 'JNJ', 'MA', 'PG', 'HD', 'CVX', 'ABBV', 'COST', 'KO', 'ADBE', 'NFLX', 'CRM', 'BAC', 'TMO', 'WMT', 'ORCL', 'MRK']
  
  const prioritizedStocks = [
    ...sectorStocks.filter(ticker => priorityStocks.includes(ticker)),
    ...sectorStocks.filter(ticker => !priorityStocks.includes(ticker))
  ]

  return prioritizedStocks
}

export function getSectorStockNames(sector: string, limit?: number): Array<{ticker: string, name: string}> {
  const tickers = getSectorStocks(sector)
  const result = tickers.map(ticker => {
    const stock = stocks.find(s => s.ticker === ticker)
    return {
      ticker,
      name: stock?.name || ticker
    }
  })

  return limit ? result.slice(0, limit) : result
}