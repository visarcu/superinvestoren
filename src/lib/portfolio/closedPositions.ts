// src/lib/portfolio/closedPositions.ts
//
// Vollständig verkaufte Positionen mit Gewinn. Zählt den Einstand der
// verkauften Stücke, nicht die Summe aller Zugänge: Nach einem Depotumzug
// standen Käufe und Wiedereinbuchung sonst doppelt darin (−23.150 € statt
// +211 € bei einem Scalable-Depot).

import { bookedAmount, walkCostBasis, type CostBasisTransaction } from '@/lib/portfolio/costBasis'

export interface ClosedPosition {
  symbol: string
  name: string
  /** Verkaufte Stückzahl */
  totalBought: number
  avgBuyPrice: number
  avgSellPrice: number
  /** Einstand der verkauften Stücke */
  totalInvested: number
  /** Erlös nach Gebühren und Steuern */
  totalReceived: number
  realizedGain: number
  realizedGainPercent: number
  dividends: number
  firstBuyDate: string
  lastSellDate: string
  /** Gewinn plus Dividenden */
  totalReturn: number
}

interface ClosedPositionTransaction extends CostBasisTransaction {
  symbol: string
  name: string
  total_value: number
}

/** Letzte Verkäufe zuerst */
export function computeClosedPositions(transactions: readonly ClosedPositionTransaction[]): ClosedPosition[] {
  const bySymbol = new Map<string, ClosedPositionTransaction[]>()
  for (const tx of transactions || []) {
    if (!tx.symbol) continue
    if (!bySymbol.has(tx.symbol)) bySymbol.set(tx.symbol, [])
    bySymbol.get(tx.symbol)!.push(tx)
  }

  const closed: ClosedPosition[] = []
  bySymbol.forEach((txs, symbol) => {
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))

    let received = 0
    let quantitySold = 0
    let costSold = 0
    let lastSellDate = ''
    const open = walkCostBasis(sorted, ({ tx, quantity, cost }) => {
      if (tx.type !== 'sell' || quantity <= 0) return
      const booked = Number(tx.quantity) || 0
      const proceeds = bookedAmount(tx) - Math.abs(Number(tx.fee) || 0)
      received += booked > 0 ? proceeds * (quantity / booked) : 0
      quantitySold += quantity
      costSold += cost
      lastSellDate = tx.date
    })

    const openShares = [...open.values()].reduce((sum, position) => sum + position.shares, 0)
    if (openShares > 0.0001 || quantitySold <= 0) return

    const entries = sorted.filter(tx => tx.type === 'buy' || tx.type === 'transfer_in')
    const dividends = sorted.reduce((sum, tx) => (tx.type === 'dividend' ? sum + Number(tx.total_value || 0) : sum), 0)
    const realizedGain = received - costSold
    closed.push({
      symbol,
      name: entries[0]?.name || sorted[0].name,
      totalBought: quantitySold,
      avgBuyPrice: costSold / quantitySold,
      avgSellPrice: received / quantitySold,
      totalInvested: costSold,
      totalReceived: received,
      realizedGain,
      realizedGainPercent: costSold > 0 ? (realizedGain / costSold) * 100 : 0,
      dividends,
      firstBuyDate: entries[0]?.date || '',
      lastSellDate,
      totalReturn: realizedGain + dividends,
    })
  })

  return closed.sort((a, b) => b.lastSellDate.localeCompare(a.lastSellDate))
}
