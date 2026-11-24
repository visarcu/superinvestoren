// src/utils/portfolioCalculations.ts
// Pure Berechnungsfunktionen für Per-Symbol Portfolio-Performance
// Einstand nach der gemeinsamen Regel in lib/portfolio/costBasis

import { bookedAmount, findInternalTransfers, walkCostBasis } from '@/lib/portfolio/costBasis'

export interface RealizedGainDetail {
  realizedGain: number
  avgCostBasis: number
  realizedGainPercent: number
}

export interface SymbolPerformance {
  // Unrealisiert (verbleibende Position)
  unrealizedGain: number
  unrealizedGainPercent: number
  remainingQuantity: number
  currentAvgCostBasis: number
  currentValue: number
  totalCostBasis: number

  // Realisiert (aus Verkäufen)
  totalRealizedGain: number
  realizedGainByTxId: Map<string, RealizedGainDetail>

  // Dividenden
  totalDividends: number

  // Gesamt
  totalReturn: number
  totalInvested: number // Summe aller Käufe (für Prozentberechnung)
}

interface TransactionInput {
  id: string
  /** Für die Sicht über mehrere Depots: Einstand je Depot */
  portfolio_id?: string | null
  symbol?: string | null
  notes?: string | null
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  quantity: number
  price: number
  total_value: number
  fee?: number
  date: string
}

/**
 * Berechnet die vollständige Performance für ein einzelnes Symbol.
 * Verwendet die Durchschnittskostenmethode (Average Cost Method).
 *
 * @param transactions - Alle Transaktionen für EIN Symbol, beliebige Reihenfolge
 * @param currentPriceEUR - Aktueller Marktpreis in EUR
 * @returns SymbolPerformance
 */
export function calculateSymbolPerformance(
  transactions: TransactionInput[],
  currentPriceEUR: number
): SymbolPerformance {
  let totalShares = 0
  let totalCost = 0
  let totalRealizedGain = 0
  let totalDividends = 0
  let totalInvested = 0
  const realizedGainByTxId = new Map<string, RealizedGainDetail>()

  // Alle Buchungen gehören zu EINEM Symbol, auch wenn das Feld fehlt. Der Umzug
  // im selben Depot zählt nicht als neue Investition.
  const entries = transactions.map(tx => ({ ...tx, symbol: tx.symbol || 'POSITION' }))
  const internal = findInternalTransfers(entries)

  const positions = walkCostBasis(entries, ({ tx, avgBefore, quantity, cost }) => {
    if (tx.type === 'buy' || (tx.type === 'transfer_in' && !internal.has(tx))) {
      totalInvested += cost
    } else if (tx.type === 'sell' && quantity > 0) {
      // Verkaufsgebühren reduzieren den realisierten Gewinn
      const fee = Math.abs(Number(tx.fee) || 0)
      const proceedsPerShare = tx.quantity > 0 ? (bookedAmount(tx) - fee) / tx.quantity : 0
      const realizedGain = (proceedsPerShare - avgBefore) * quantity
      totalRealizedGain += realizedGain
      realizedGainByTxId.set(tx.id, {
        realizedGain,
        avgCostBasis: avgBefore,
        realizedGainPercent: avgBefore > 0 ? ((proceedsPerShare - avgBefore) / avgBefore) * 100 : 0,
      })
    }
  })
  for (const position of positions.values()) {
    totalShares += position.shares
    totalCost += position.cost
  }
  for (const tx of transactions) {
    if (tx.type === 'dividend') totalDividends += tx.total_value
  }

  // Unrealisierter Gewinn der verbleibenden Position
  const currentValue = totalShares * currentPriceEUR
  const unrealizedGain = currentValue - totalCost
  const unrealizedGainPercent = totalCost > 0
    ? (unrealizedGain / totalCost) * 100
    : 0
  const currentAvgCostBasis = totalShares > 0
    ? totalCost / totalShares
    : 0

  const totalReturn = unrealizedGain + totalRealizedGain + totalDividends

  return {
    unrealizedGain,
    unrealizedGainPercent,
    remainingQuantity: totalShares,
    currentAvgCostBasis,
    currentValue,
    totalCostBasis: totalCost,
    totalRealizedGain,
    realizedGainByTxId,
    totalDividends,
    totalReturn,
    totalInvested,
  }
}
