// src/lib/portfolio/costBasis.ts
//
// Einstand der Positionen aus den Buchungen (Durchschnittskosten). Eine
// Rechnung für alle: realisierte Gewinne, verkaufte Wertpapiere, Positionsseite,
// Kostenlinie im Verlauf. Früher rechnete jede Stelle für sich und nahm bei
// Einbuchungen den Marktwert als neuen Einstand. Nach Scalables
// Lagerstellenwechsel vom 05./06.12.2025 zeigte die Positionsseite deshalb
// 589 € Gewinn, wo die Übersicht 1.239 € zeigte.
//
// Die Regeln sind dieselben wie in portfolioReconcile (Bestände):
//  - Rückübertrag: Wurde das Papier vorher aus demselben Depot ausgebucht,
//    übernimmt die Einbuchung den Ø-Einstand dieser Ausbuchung.
//  - Umbenennung: Der Einstand der alten Position geht auf die neue über.
//  - Split als Paar aus wertlosem Aus- und Einbuchen: nur die Stückzahl ändert sich.

import { isCorpActionTransfer } from '@/lib/portfolioTwr'
import { appendSplitNote, stripSplitMarkers } from '@/lib/splitAdjustment'

export interface CostBasisTransaction {
  id?: string
  portfolio_id?: string | null
  symbol?: string | null
  type: string
  date: string
  quantity?: number | string | null
  price?: number | string | null
  total_value?: number | string | null
  fee?: number | string | null
  notes?: string | null
}

export interface CostBasisStep<T> {
  tx: T
  /** Depot und Symbol, siehe costBasisKey */
  key: string
  /** Ø-Einstand je Stück vor der Buchung */
  avgBefore: number
  /** Tatsächlich bewegte Stücke (Verkäufe über den Bestand hinaus gekappt) */
  quantity: number
  /** Einstand der bewegten Stücke */
  cost: number
  /** Bestand und Einstand nach der Buchung */
  shares: number
  totalCost: number
}

export interface CostBasisPosition {
  shares: number
  cost: number
}

const POSITION_TYPES = new Set(['buy', 'sell', 'transfer_in', 'transfer_out'])
const EPS_SHARES = 0.0001

// Kennzeichen aus dem Scalable-Import, siehe portfolioReconcile
const RENAME_OUT_NOTE = /Kostenbasis übertragen|Aufgegliedert in/
const RENAME_IN_NOTE = /Einstandskurs übernommen/

/** Ein- und Ausbuchung innerhalb dieser Zeit gelten als Umzug im selben Depot */
const INTERNAL_TRANSFER_DAYS = 14

const num = (value: number | string | null | undefined) => Number(value) || 0
const day = (tx: CostBasisTransaction) => String(tx.date).slice(0, 10)

export function costBasisKey(tx: Pick<CostBasisTransaction, 'portfolio_id' | 'symbol'>): string {
  return `${tx.portfolio_id || ''}|${(tx.symbol || '').trim().toUpperCase()}`
}

/** Betrag der Buchung, notfalls aus Stückzahl und Kurs */
export function bookedAmount(tx: CostBasisTransaction): number {
  const total = num(tx.total_value)
  return total > 0 ? total : Math.abs(num(tx.quantity) * num(tx.price))
}

function isPositionTransaction(tx: CostBasisTransaction): boolean {
  const symbol = (tx.symbol || '').trim().toUpperCase()
  return POSITION_TYPES.has(tx.type) && symbol !== '' && symbol !== 'CASH'
}

function isValueless(tx: CostBasisTransaction): boolean {
  return !(num(tx.total_value) > 0) && !(num(tx.price) > 0)
}

const isRenameOut = (tx: CostBasisTransaction) =>
  tx.type === 'transfer_out' && isValueless(tx) && RENAME_OUT_NOTE.test(tx.notes || '')

const isRenameIn = (tx: CostBasisTransaction) =>
  tx.type === 'transfer_in' && RENAME_IN_NOTE.test(tx.notes || '')

/**
 * Splits, die als Paar aus wertlosem Aus- und Einbuchen am selben Tag vorliegen
 * (Trading 212: "Stock split close/open"). Nur die Stückzahl ändert sich.
 */
export function findSplitPairs<T extends CostBasisTransaction>(transactions: readonly T[]): Set<T> {
  const days = { transfer_in: new Set<string>(), transfer_out: new Set<string>() }
  const candidates: T[] = []
  for (const tx of transactions) {
    if (tx.type !== 'transfer_in' && tx.type !== 'transfer_out') continue
    if (!isPositionTransaction(tx) || !isValueless(tx)) continue
    days[tx.type].add(`${costBasisKey(tx)}|${day(tx)}`)
    candidates.push(tx)
  }
  return new Set(candidates.filter(tx => {
    const key = `${costBasisKey(tx)}|${day(tx)}`
    return days.transfer_in.has(key) && days.transfer_out.has(key)
  }))
}

/** Vom Broker gebuchter Split: wertloser, als Split benannter Übertrag. */
export function isSplitBooking(tx: CostBasisTransaction): boolean {
  return (
    (tx.type === 'transfer_in' || tx.type === 'transfer_out') &&
    isValueless(tx) &&
    /split/i.test(stripSplitMarkers(tx.notes))
  )
}

// Abweichung, bis zu der Bestand und Split-Buchung zusammenpassen
const SPLIT_TOLERANCE = 0.005

/**
 * Das Verhältnis eines gebuchten Splits, null wenn Buchung und Bestand nicht
 * zusammenpassen (fehlende Käufe, Teilexport).
 *  - Trading 212: alte Stücke aus, neue ein. Die alten müssen der Bestand sein.
 *  - Trade Republic: nur die zusätzlichen Stücke. Mit dem Bestand muss sich ein
 *    glattes Verhältnis ergeben (0,096809 Stück und 19,264991 dazu: 200:1).
 */
function bookedSplitRatio(held: number, out: number, added: number): number | null {
  if (!(held > 0) || !(added > 0)) return null
  if (out > 0) {
    const ratio = added / out
    return Math.abs(held / out - 1) <= SPLIT_TOLERANCE && Math.abs(ratio - 1) > 2 * SPLIT_TOLERANCE ? ratio : null
  }
  const ratio = (held + added) / held
  const smooth = Math.round(ratio * 4) / 4
  return smooth > 1 && Math.abs(ratio / smooth - 1) <= SPLIT_TOLERANCE ? ratio : null
}

/**
 * Rechnet vom Broker gebuchte Splits auf die Buchungen davor um (Stück ×
 * Verhältnis, Kurs ÷ Verhältnis, Betrag bleibt) und lässt die Split-Buchung weg.
 *
 * Kurse stehen rückwirkend auf der neuen Stückzahl. Ohne Umrechnung zählte die
 * Position vor dem Split mit der alten: Ein Trading-212-Depot stand nach dem Kauf
 * von Booking sieben Wochen lang bis zu 326 € zu niedrig (810 statt 1.137 €), und
 * die Dividendenprognose rechnete 6,78 statt 0,27 € je Stück. Bestand und
 * Einstand danach sind dieselben.
 *
 * Buchungen ohne passende Split-Buchung kommen unverändert zurück, ohne jede
 * Split-Buchung dieselbe Liste.
 */
export function settleSplitBookings<T extends CostBasisTransaction>(transactions: T[]): T[] {
  const bookedKeys = new Set(transactions.filter(tx => isPositionTransaction(tx) && isSplitBooking(tx)).map(costBasisKey))
  if (bookedKeys.size === 0) return transactions

  // Je Papier die geltende Fassung jeder Zeile, null = entfällt
  const current = new Map<T, T | null>()
  for (const key of bookedKeys) {
    const rows = transactions.filter(tx => isPositionTransaction(tx) && costBasisKey(tx) === key)
    const days = [...new Set(rows.filter(isSplitBooking).map(day))].sort()

    for (const splitDay of days) {
      const before = rows.filter(tx => day(tx) < splitDay && current.get(tx) !== null)
      const held = before.reduce((sum, tx) => {
        const quantity = num((current.get(tx) ?? tx).quantity)
        return tx.type === 'buy' || tx.type === 'transfer_in' ? sum + quantity : sum - quantity
      }, 0)
      const bookings = rows.filter(tx => day(tx) === splitDay && isSplitBooking(tx))
      const total = (type: string) => bookings.filter(tx => tx.type === type).reduce((sum, tx) => sum + num(tx.quantity), 0)
      const ratio = bookedSplitRatio(held, total('transfer_out'), total('transfer_in'))
      if (ratio === null) continue

      for (const tx of before) {
        const row = current.get(tx) ?? tx
        current.set(tx, {
          ...row,
          quantity: num(row.quantity) * ratio,
          price: num(row.price) / ratio,
          notes: appendSplitNote(row.notes, ratio, splitDay),
        })
      }
      bookings.forEach(tx => current.set(tx, null))
    }
  }
  if (current.size === 0) return transactions
  return transactions.flatMap(tx => {
    const row = current.has(tx) ? current.get(tx)! : tx
    return row === null ? [] : [row]
  })
}

/**
 * Geht die Buchungen in zeitlicher Reihenfolge durch und meldet zu jeder den
 * Einstand. Rückgabe: offene Positionen am Ende, je costBasisKey.
 */
export function walkCostBasis<T extends CostBasisTransaction>(
  transactions: readonly T[],
  visit?: (step: CostBasisStep<T>) => void,
): Map<string, CostBasisPosition> {
  const relevant = transactions.filter(isPositionTransaction)
  const splitPairs = findSplitPairs(relevant)

  // Am selben Tag zuerst Zugänge, dann Abgänge. Die Ausbuchung einer
  // Umbenennung läuft vor allem anderen, sonst fehlt ihr Einstand der Einbuchung.
  const rank = (tx: T) =>
    isRenameOut(tx) ? -1 : tx.type === 'buy' || tx.type === 'transfer_in' ? 0 : tx.type === 'sell' ? 1 : 2
  const timeline = [...relevant].sort((a, b) => day(a).localeCompare(day(b)) || rank(a) - rank(b))

  const positions = new Map<string, CostBasisPosition>()
  const avgAtTransferOut = new Map<string, number>()
  const renameBasis = new Map<string, number[]>()

  for (const tx of timeline) {
    const key = costBasisKey(tx)
    let pos = positions.get(key)
    if (!pos) {
      pos = { shares: 0, cost: 0 }
      positions.set(key, pos)
    }
    const quantity = num(tx.quantity)
    const avgBefore = pos.shares > EPS_SHARES ? pos.cost / pos.shares : 0
    let moved = quantity
    let cost = 0

    if (splitPairs.has(tx)) {
      pos.shares += tx.type === 'transfer_in' ? quantity : -quantity
    } else if (tx.type === 'buy') {
      // Kaufgebühren gehören zum Einstand
      cost = bookedAmount(tx) + Math.abs(num(tx.fee))
      pos.shares += quantity
      pos.cost += cost
    } else if (tx.type === 'transfer_in') {
      const renameKey = `${tx.portfolio_id || ''}|${day(tx)}`
      const basis = isRenameIn(tx) ? renameBasis.get(renameKey) : undefined
      const carried = avgAtTransferOut.get(key)
      if (basis?.length === 1) {
        cost = basis[0]
        renameBasis.delete(renameKey)
      } else if (carried !== undefined) {
        cost = quantity * carried
      } else {
        cost = bookedAmount(tx)
      }
      pos.shares += quantity
      pos.cost += cost
    } else {
      moved = Math.min(quantity, Math.max(0, pos.shares))
      cost = moved * avgBefore
      if (isRenameOut(tx)) {
        const renameKey = `${tx.portfolio_id || ''}|${day(tx)}`
        renameBasis.set(renameKey, [...(renameBasis.get(renameKey) || []), cost])
      }
      if (tx.type === 'transfer_out' && avgBefore > 0) avgAtTransferOut.set(key, avgBefore)
      pos.shares -= moved
      pos.cost -= cost
      if (pos.shares <= EPS_SHARES) {
        pos.shares = 0
        pos.cost = 0
      }
    }

    visit?.({ tx, key, avgBefore, quantity: moved, cost, shares: pos.shares, totalCost: pos.cost })
  }

  return positions
}

/**
 * Umzüge innerhalb eines Depots: dieselbe Stückzahl aus- und kurz darauf wieder
 * eingebucht (Lagerstellenwechsel). Dabei fließt kein Geld, und die Position
 * gehört dem Nutzer durchgehend. In Flussrechnungen (Rendite, Verlauf,
 * Eingezahlt) zählen beide Buchungen deshalb nicht.
 */
export function findInternalTransfers<T extends CostBasisTransaction>(transactions: readonly T[]): Set<T> {
  const outs = new Map<string, T[]>()
  const ins = new Map<string, T[]>()
  for (const tx of transactions) {
    if (tx.type !== 'transfer_in' && tx.type !== 'transfer_out') continue
    if (!isPositionTransaction(tx) || num(tx.quantity) <= 0) continue
    if (isCorpActionTransfer({ type: tx.type, notes: tx.notes })) continue
    const map = tx.type === 'transfer_out' ? outs : ins
    const key = costBasisKey(tx)
    map.set(key, [...(map.get(key) || []), tx])
  }

  const internal = new Set<T>()
  for (const [key, outList] of outs) {
    const inList = [...(ins.get(key) || [])].sort((a, b) => day(a).localeCompare(day(b)))
    for (const out of [...outList].sort((a, b) => day(a).localeCompare(day(b)))) {
      const outQuantity = num(out.quantity)
      const match = inList.find(candidate => {
        if (internal.has(candidate)) return false
        const days = (Date.parse(day(candidate)) - Date.parse(day(out))) / 86400000
        if (!(days >= 0 && days <= INTERNAL_TRANSFER_DAYS)) return false
        return Math.abs(num(candidate.quantity) - outQuantity) <= Math.max(EPS_SHARES, outQuantity * 0.001)
      })
      if (!match) continue
      internal.add(out)
      internal.add(match)
    }
  }
  return internal
}

/** Buchungen ohne Umzüge innerhalb des Depots, siehe findInternalTransfers */
export function withoutInternalTransfers<T extends CostBasisTransaction>(transactions: T[]): T[] {
  const internal = findInternalTransfers(transactions)
  return internal.size === 0 ? transactions : transactions.filter(tx => !internal.has(tx))
}
