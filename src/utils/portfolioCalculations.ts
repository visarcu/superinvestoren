// src/utils/portfolioCalculations.ts
// Pure Berechnungsfunktionen für Per-Symbol Portfolio-Performance
// Verwendet die Durchschnittskostenmethode (Average Cost Method)

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
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  quantity: number
  price: number
  total_value: number
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
  // Chronologisch sortieren (älteste zuerst)
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  let totalShares = 0
  let totalCost = 0
  let totalRealizedGain = 0
  let totalDividends = 0
  let totalInvested = 0
  const realizedGainByTxId = new Map<string, RealizedGainDetail>()

  for (const tx of sorted) {
    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      totalShares += tx.quantity
      totalCost += tx.quantity * tx.price
      totalInvested += tx.quantity * tx.price
    } else if (tx.type === 'sell') {
      if (totalShares <= 0) continue

      const avgCostPerShare = totalCost / totalShares
      const realizedGain = (tx.price - avgCostPerShare) * tx.quantity
      const realizedGainPercent = avgCostPerShare > 0
        ? ((tx.price - avgCostPerShare) / avgCostPerShare) * 100
        : 0

      totalRealizedGain += realizedGain
      realizedGainByTxId.set(tx.id, {
        realizedGain,
        avgCostBasis: avgCostPerShare,
        realizedGainPercent,
      })

      // Kostenbasis reduzieren
      totalShares -= tx.quantity
      totalCost -= tx.quantity * avgCostPerShare

      // Floating-Point Guard
      if (totalShares <= 0.0001) {
        totalShares = 0
        totalCost = 0
      }
    } else if (tx.type === 'transfer_out') {
      // Depotübertrag: Bestand reduzieren, aber KEIN realisierter Gewinn/Verlust
      if (totalShares <= 0) continue

      const avgCostPerShare = totalCost / totalShares
      totalShares -= tx.quantity
      totalCost -= tx.quantity * avgCostPerShare

      // Floating-Point Guard
      if (totalShares <= 0.0001) {
        totalShares = 0
        totalCost = 0
      }
    } else if (tx.type === 'dividend') {
      totalDividends += tx.total_value
    }
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
