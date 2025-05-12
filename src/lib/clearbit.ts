// src/lib/clearbit.ts
export const tickerToDomain: Record<string,string> = {
    AAPL: 'apple.com',
    MSFT: 'microsoft.com',
    GOOGL: 'abc.xyz',
    AMZN: 'amazon.com',
    // …weitere Domains nach Bedarf
  }
  
  // Fallback-Domain (wenn ticker nicht in Mapping)
  export function domainForTicker(ticker: string): string {
    return tickerToDomain[ticker] ?? `${ticker.toLowerCase()}.com`
  }