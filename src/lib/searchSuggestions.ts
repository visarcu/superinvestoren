// src/lib/searchSuggestions.ts
// Gemeinsame Vorschlagslogik für die Navbar-Suche und die Suche auf der Startseite.

import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

export interface SearchResult {
  type: 'stock' | 'investor'
  id: string
  title: string
  subtitle: string
  href: string
}

export function getSearchSuggestions(
  term: string,
  { stockLimit = 6, investorLimit = 4 }: { stockLimit?: number; investorLimit?: number } = {}
): SearchResult[] {
  const query = term.trim().toUpperCase()
  if (!query) return []

  const stockResults = stocks
    .filter(stock => stock.ticker.startsWith(query) || stock.name.toUpperCase().includes(query))
    .slice(0, stockLimit)
    .map((stock): SearchResult => ({
      type: 'stock',
      id: stock.ticker,
      title: stock.ticker,
      subtitle: stock.name,
      href: `/analyse/stocks/${stock.ticker}`,
    }))

  const investorResults = investors
    .filter(investor => investor.name.toUpperCase().includes(query) || investor.slug.toUpperCase().includes(query))
    .slice(0, investorLimit)
    .map((investor): SearchResult => ({
      type: 'investor',
      id: investor.slug,
      title: investor.name.split('–')[0].trim(),
      subtitle: 'Investor Portfolio',
      href: `/superinvestor/${investor.slug}`,
    }))

  // Reihenfolge: exakter Ticker-Treffer → Investoren → übrige Wertpapiere.
  // Sonst verdrängen z. B. bei "buff" fünf Buffer-ETFs Warren Buffett.
  const exactTicker = stockResults.filter(s => s.id === query)
  const otherStocks = stockResults.filter(s => s.id !== query)
  return [...exactTicker, ...investorResults, ...otherStocks]
}
