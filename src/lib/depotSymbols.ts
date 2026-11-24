// src/lib/depotSymbols.ts — Unter welchem Kürzel führt ein Depot die Papiere einer Datei?
//
// Die ISIN-Auflösung liefert nicht immer dasselbe Kürzel. Seit dem
// Instrumenten-Stammsatz wird aus McDonald's MDO.DE statt MCD, aus Realty Income
// RY6.F statt O, und OpenFIGI ändert seine technischen Kürzel von selbst. Die
// Buchungen eines früheren Imports stehen aber unter dem alten Kürzel: Derselbe
// Export galt dort zu großen Teilen als neu und hätte alles noch einmal angelegt
// (Depot dd3d983f: 190 von 901 Buchungen).
//
// Deshalb gilt für ein Depot das Kürzel, unter dem es ein Papier schon führt.
// Erkannt wird es an den Buchungen selbst, portfolio_transactions kennt keine
// ISIN: Art, Tag, Stück und Kurs einer Zeile der Datei stimmen mit einer
// gespeicherten überein, nur das Kürzel nicht.

import type { ParsedTransaction, TickerRename } from './scalableCSVParser'
import { matchesStoredTransaction } from './duplicateCheck'
import { appliedSplits } from './splitAdjustment'

/** Gespeicherte Buchung, soweit der Abgleich sie braucht. */
export interface StoredTransaction {
  type: string
  symbol: string
  date: string
  quantity: number | string | null
  price: number | string | null
  notes?: string | null
}

export interface DepotSymbol {
  isin: string
  /** Kürzel aus der ISIN-Auflösung */
  resolved: string
  /** Kürzel, unter dem das Depot die Buchungen führt */
  stored: string
}

const POSITION_TYPES: ReadonlySet<string> = new Set(['buy', 'sell', 'transfer_in', 'transfer_out'])

/** Anteil übereinstimmender Buchungen, ab dem das Kürzel als belegt gilt */
const MIN_SHARE = 0.5

/** Käufe, Verkäufe und Überträge (Bestand) bzw. Dividenden, die übereinstimmen */
interface Evidence {
  positions: number
  dividends: number
}

function isStronger(a: Evidence, b: Evidence): boolean {
  return a.positions !== b.positions ? a.positions > b.positions : a.dividends > b.dividends
}

/**
 * Passt die gespeicherte Zeile zur Buchung der Datei, abgesehen vom Kürzel?
 * Auch vor einer Split-Verrechnung: Der Parser hat die Datei schon umgerechnet,
 * das Depot vielleicht noch nicht.
 */
function describesSameBooking(stored: StoredTransaction, tx: ParsedTransaction): boolean {
  const matches = (quantity: number, price: number) =>
    matchesStoredTransaction(stored, { type: tx.type, symbol: stored.symbol, date: tx.date, quantity, price })
  if (matches(tx.quantity, tx.price)) return true
  const factor = appliedSplits(tx.notes).reduce((product, split) => product * split.ratio, 1)
  return factor !== 1 && matches(tx.quantity / factor, tx.price * factor)
}

/**
 * Papiere der Datei, die das Depot unter einem anderen Kürzel führt als die
 * ISIN-Auflösung heute liefert.
 *
 * Ein anderes Kürzel gilt nur, wenn mehr Buchungen darunter stehen als unter dem
 * aufgelösten, mindestens die Hälfte der vergleichbaren übereinstimmt und kein
 * anderes Papier der Datei das Kürzel besser belegt. Dividenden haben immer
 * Stückzahl 1 und können sich zufällig gleichen; ohne übereinstimmenden Kauf,
 * Verkauf oder Übertrag braucht es mindestens zwei.
 */
export function findDepotSymbols({
  transactions,
  symbolOf,
  stored,
  renames = [],
}: {
  /** Buchungen der Datei; Zeilen mit eigenem Kürzel aus der Datei zählen nicht */
  transactions: ParsedTransaction[]
  symbolOf: (isin: string) => { symbol: string } | undefined
  stored: StoredTransaction[]
  /** ISIN-Wechsel der Datei */
  renames?: TickerRename[]
}): Map<string, DepotSymbol> {
  const result = new Map<string, DepotSymbol>()
  if (stored.length === 0) return result

  const storedByDay = new Map<string, StoredTransaction[]>()
  const storedCount = new Map<string, Evidence>()
  let lastStoredDate = ''
  for (const row of stored) {
    if (row.symbol === 'CASH') continue
    const key = `${row.type}|${row.date}`
    const list = storedByDay.get(key)
    if (list) list.push(row)
    else storedByDay.set(key, [row])
    const count = storedCount.get(row.symbol) || { positions: 0, dividends: 0 }
    if (POSITION_TYPES.has(row.type)) count.positions++
    else if (row.type === 'dividend') count.dividends++
    storedCount.set(row.symbol, count)
    if (row.date > lastStoredDate) lastStoredDate = row.date
  }

  // Übereinstimmungen je ISIN und gespeichertem Kürzel
  const evidence = new Map<string, Map<string, Evidence>>()
  const comparable = new Map<string, Evidence>()
  for (const tx of transactions) {
    if (!tx.isin || tx.symbol) continue
    const isPosition = POSITION_TYPES.has(tx.type)
    if (!isPosition && tx.type !== 'dividend') continue

    if (tx.date <= lastStoredDate) {
      const count = comparable.get(tx.isin) || { positions: 0, dividends: 0 }
      if (isPosition) count.positions++
      else count.dividends++
      comparable.set(tx.isin, count)
    }

    const symbols = new Set(
      (storedByDay.get(`${tx.type}|${tx.date}`) || [])
        .filter(row => describesSameBooking(row, tx))
        .map(row => row.symbol)
    )
    if (symbols.size === 0) continue
    const bySymbol = evidence.get(tx.isin) || new Map<string, Evidence>()
    evidence.set(tx.isin, bySymbol)
    for (const symbol of symbols) {
      const count = bySymbol.get(symbol) || { positions: 0, dividends: 0 }
      if (isPosition) count.positions++
      else count.dividends++
      bySymbol.set(symbol, count)
    }
  }

  // Wem gehört ein gespeichertes Kürzel? Dem Papier mit den meisten
  // Übereinstimmungen, bei Gleichstand dem, das heute so heißt.
  const ownerOf = new Map<string, { isin: string; found: Evidence }>()
  for (const [isin, bySymbol] of evidence) {
    for (const [symbol, found] of bySymbol) {
      const owner = ownerOf.get(symbol)
      const isOwnSymbol = symbolOf(isin)?.symbol === symbol
      if (!owner || isStronger(found, owner.found) || (isOwnSymbol && !isStronger(owner.found, found))) {
        ownerOf.set(symbol, { isin, found })
      }
    }
  }

  for (const [isin, bySymbol] of evidence) {
    const resolved = symbolOf(isin)?.symbol
    if (!resolved) continue
    const current = bySymbol.get(resolved) || { positions: 0, dividends: 0 }

    let best: { symbol: string; found: Evidence } | null = null
    for (const [symbol, found] of bySymbol) {
      if (symbol === resolved || ownerOf.get(symbol)?.isin !== isin) continue
      if (!isStronger(found, current)) continue
      if (!best || isStronger(found, best.found)) best = { symbol, found }
    }
    if (!best) continue

    const kind: keyof Evidence = best.found.positions > 0 ? 'positions' : 'dividends'
    if (kind === 'dividends' && best.found.dividends < 2) continue
    const inFile = comparable.get(isin)?.[kind] || 0
    const inDepot = storedCount.get(best.symbol)?.[kind] || 0
    const share = best.found[kind] / Math.max(1, Math.min(inFile, inDepot))
    if (share < MIN_SHARE) continue

    result.set(isin, { isin, resolved, stored: best.symbol })
  }

  // Ob die alte ISIN einer Umstellung unter das Kürzel der neuen gehört, ist eine
  // Frage der Umrechnung (isinChange.ts): Aus- und Einbuchung der Umstellung
  // unter demselben Kürzel ergäben sonst einen falschen Bestand.
  for (const { fromIsin, toIsin } of renames) {
    const own = result.get(fromIsin)
    if (own && own.stored === (result.get(toIsin)?.stored ?? symbolOf(toIsin)?.symbol)) result.delete(fromIsin)
  }
  return result
}
