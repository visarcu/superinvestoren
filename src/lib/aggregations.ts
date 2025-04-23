// src/lib/aggregations.ts
import type { Investor } from '../data/investors'

export interface Aggregated {
  ticker: string
  count: number
}

export function aggregateBuysByTicker(investors: Investor[]): Aggregated[] {
  const map: Record<string, number> = {}

  investors.forEach(inv =>
    inv.holdings
      .filter(h => h.action === 'buy')
      .forEach(h => {
        map[h.ticker] = (map[h.ticker] || 0) + 1
      })
  )

  return Object.entries(map)
    .map(([ticker, count]) => ({ ticker, count }))
    .sort((a, b) => b.count - a.count)
}
