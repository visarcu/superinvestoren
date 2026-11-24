// src/lib/depotSplits.ts: Neue Buchungen auf die Stückzahl-Basis des Depots bringen
//
// Hat ein Depot einen Split verrechnet, stehen seine Buchungen davor auf der
// neuen Stückzahl. Ein späterer Export, der den Split nicht nennt, bringt weitere
// Käufe von davor mit der alten. Unverändert gespeichert, mischen sich beide:
// 0,038492 L8I7.DE zu 1.260 € neben 7,6984 zu 6,30 € (Split 200:1) hoben den
// Einstand von 6,89 auf 7,39 €.
//
// Umgerechnet wird nur mit Beleg:
//  - Die Datei bucht den Split selbst ein (Trade Republic: 19,264991 Gratisstücke
//    neben den unveränderten alten Käufen). Dann stehen die Käufe davor in alter
//    Stückzahl, und die Buchung entfällt, weil das Depot den Split schon enthält.
//  - Zeilen derselben Datei, die das Depot schon kennt, stehen dort umgerechnet
//    und in der Datei nicht.
//  - Der Kurs liegt eindeutig näher an den Kursen des Depots vor dem Split.
// Bleibt es offen, ändert der Import nichts und sagt es.

import {
  appendSplitNote, appliedSplits, hasSplitApplied, isNearSplitDate, isSameSplit, stripSplitMarkers, type AppliedSplit,
} from '@/lib/splitAdjustment'
import { SPLIT_TYPES, type NewBooking, type StoredBooking, type StoredMatch } from '@/lib/transactionMatch'

export interface DepotSplitPlan {
  /** Neue Buchungen (Index), denen diese Splits fehlen */
  adopt: Map<number, AppliedSplit[]>
  /** Neue Buchungen (Index), bei denen offen ist, ob sie diese Splits schon enthalten */
  unclear: Map<number, AppliedSplit[]>
  /** Split-Buchungen der Datei (Index), die das Depot schon verrechnet hat */
  redundant: Map<number, AppliedSplit[]>
}

// Ab diesem Abstand zweier Kurse gilt einer als eindeutig näher am Vergleichskurs,
// und weiter darf auch der nähere nicht weg sein: Faktor 3. Ein 2:1 oder 8:9 lässt
// sich so nie am Kurs erkennen, ein 25:1 oder 200:1 sicher.
const CLEAR_PRICE_GAP = Math.log(3)

/** Splits, die das Depot je Kürzel verrechnet hat, aufsteigend und ohne Doppelte. */
function depotSplitsBySymbol(stored: StoredBooking[]): Map<string, AppliedSplit[]> {
  const bySymbol = new Map<string, AppliedSplit[]>()
  for (const row of stored) {
    if (!SPLIT_TYPES.has(row.type)) continue
    for (const split of appliedSplits(row.notes)) {
      const splits = bySymbol.get(row.symbol) ?? []
      if (splits.some(s => isSameSplit(s, split))) continue
      bySymbol.set(row.symbol, [...splits, split].sort((a, b) => a.date.localeCompare(b.date)))
    }
  }
  return bySymbol
}

/**
 * Wie viele der Splits (jüngster zuerst) fehlen einer Buchung mit diesem Kurs?
 * Null, wenn der Vergleichskurs aus dem Depot es nicht eindeutig zeigt.
 */
function missingByPrice(price: number, reference: number, splits: AppliedSplit[]): number | null {
  if (!(price > 0) || !(reference > 0)) return null
  let factor = 1
  const candidates = [1, ...splits.map(split => (factor *= split.ratio))]
    .map((f, count) => ({ count, gap: Math.abs(Math.log(price / f / reference)) }))
    .sort((a, b) => a.gap - b.gap)
  const [best, second] = candidates
  return best.gap <= CLEAR_PRICE_GAP && second.gap - best.gap >= CLEAR_PRICE_GAP ? best.count : null
}

/** Kurs der zeitlich nächsten Buchung des Depots, die alle Splits verrechnet hat. */
function nearestPrice(rows: StoredBooking[], splits: AppliedSplit[], date: string): number {
  const distance = (row: StoredBooking) => Math.abs(Date.parse(row.date) - Date.parse(date))
  const nearest = rows
    .filter(row =>
      Number(row.price) > 0 &&
      splits.every(s => row.date >= s.date || hasSplitApplied(row.notes, s.date, s.ratio))
    )
    .sort((a, b) => distance(a) - distance(b))[0]
  return nearest ? Number(nearest.price) : 0
}

/** Wertlose, als Split benannte Buchung: so steht er bei Trading 212 und Trade Republic. */
function isSplitBooking(tx: NewBooking): boolean {
  return (
    (tx.type === 'transfer_in' || tx.type === 'transfer_out') &&
    (!!tx.ignorePrice || !(tx.price > 0)) &&
    /split/i.test(stripSplitMarkers(tx.notes))
  )
}

/** Welche Splits des Depots fehlen den neuen Buchungen einer Datei? */
export function planDepotSplits(
  stored: StoredBooking[],
  transactions: NewBooking[],
  /** Buchungen, die das Depot schon kennt (matchStoredBookings) */
  matches: ReadonlyMap<number, StoredMatch>
): DepotSplitPlan {
  const plan: DepotSplitPlan = { adopt: new Map(), unclear: new Map(), redundant: new Map() }

  for (const [symbol, splits] of depotSplitsBySymbol(stored)) {
    const inFile = transactions
      .map((tx, index) => ({ tx, index }))
      .filter(({ tx }) => tx.symbol === symbol && SPLIT_TYPES.has(tx.type))
    const fresh = inFile.filter(({ index }) => !matches.has(index))
    if (fresh.length === 0) continue

    const rows = stored.filter(row => row.symbol === symbol && SPLIT_TYPES.has(row.type))

    // Was die Datei über jeden Split sagt: fehlt er ihren Zeilen davor, enthalten
    // sie ihn schon, oder bleibt es offen?
    const known = splits.map((split): { missing?: boolean; keep?: boolean } => {
      const bookings = inFile.filter(({ tx }) => isSplitBooking(tx) && isNearSplitDate(tx.date, split.date))
      if (bookings.length > 0) {
        // Führt das Depot die Split-Buchung selbst oder noch alte Stückzahlen, zu
        // denen sie gehört, bleiben die Zeilen der Datei, wie sie sind.
        const settled =
          bookings.every(({ index }) => !matches.has(index)) &&
          rows.every(row => row.date >= split.date || hasSplitApplied(row.notes, split.date, split.ratio))
        if (!settled) return { keep: true }
        bookings.forEach(({ index }) => plan.redundant.set(index, [split]))
        return { missing: true }
      }

      let without = 0
      let including = 0
      for (const { tx, index } of inFile) {
        const match = matches.get(index)
        if (!match || hasSplitApplied(tx.notes, split.date, split.ratio)) continue
        if (!match.rows.some(row => hasSplitApplied(row.notes, split.date, split.ratio))) continue
        if (match.openSplits.some(s => isSameSplit(s, split))) without++
        else including++
      }
      return without > 0 === including > 0 ? {} : { missing: without > 0 }
    })

    for (const { tx, index } of fresh) {
      const open = splits
        .map((split, i) => ({ split, ...known[i] }))
        .filter(({ split, keep }) => split.date > tx.date && !keep && !hasSplitApplied(tx.notes, split.date, split.ratio))
      if (open.length === 0 || plan.redundant.has(index)) continue

      let adopt: AppliedSplit[] | null
      if (open.every(o => o.missing !== undefined)) {
        adopt = open.filter(o => o.missing).map(o => o.split)
      } else {
        const latestFirst = open.map(o => o.split).reverse()
        const reference = tx.ignorePrice ? 0 : nearestPrice(rows, splits.filter(s => s.date > tx.date), tx.date)
        const count = missingByPrice(tx.price, reference, latestFirst)
        adopt = count === null ? null : latestFirst.slice(0, count).reverse()
      }

      if (adopt === null) plan.unclear.set(index, open.map(o => o.split))
      else if (adopt.length > 0) plan.adopt.set(index, adopt)
    }
  }
  return plan
}

/**
 * Das Verhältnis ohne die Rundung der Marker-Note: "1.0417:1" steht für 24:25.
 * Vier Nachkommastellen können gerundet sein, dann gilt der einfachste Bruch,
 * der dieselbe Anzeige ergibt. Sonst bliebe bei 10 Stück ein Rest von 0,0003.
 */
function exactRatio(ratio: number): number {
  const label = ratio >= 1 ? ratio : 1 / ratio
  const shown = Math.round(label * 10000)
  if (shown % 10 === 0) return ratio
  for (let denominator = 2; denominator <= 50; denominator++) {
    const numerator = Math.round(label * denominator)
    if (Math.round((numerator / denominator) * 10000) !== shown) continue
    return ratio >= 1 ? numerator / denominator : denominator / numerator
  }
  return ratio
}

/** Buchung auf die Stückzahl nach den Splits bringen, der Betrag bleibt. */
export function adoptSplits<T extends { quantity: number; price: number; notes: string }>(
  tx: T,
  splits: AppliedSplit[]
): T {
  return splits.reduce((row, split) => {
    const ratio = exactRatio(split.ratio)
    return {
      ...row,
      quantity: row.quantity * ratio,
      price: row.price / ratio,
      notes: appendSplitNote(row.notes, split.ratio, split.date),
    }
  }, tx)
}

export interface DepotSplitSummary extends AppliedSplit {
  symbol: string
  /** Buchungen, die umgerechnet werden */
  adopted: number
  /** Buchungen, bei denen es offen bleibt */
  unclear: number
  /** Split-Buchungen der Datei, die entfallen */
  redundant: number
}

/** Zusammenfassung je Papier und Split für die Vorschau. */
export function summarizeDepotSplits(plan: DepotSplitPlan, transactions: NewBooking[]): DepotSplitSummary[] {
  const summary = new Map<string, DepotSplitSummary>()
  const count = (entries: Map<number, AppliedSplit[]>, kind: 'adopted' | 'unclear' | 'redundant') => {
    for (const [index, splits] of entries) {
      const { symbol } = transactions[index]
      for (const { date, ratio } of splits) {
        const key = `${symbol}|${date}|${ratio}`
        const entry = summary.get(key) ?? { symbol, date, ratio, adopted: 0, unclear: 0, redundant: 0 }
        entry[kind]++
        summary.set(key, entry)
      }
    }
  }
  count(plan.adopt, 'adopted')
  count(plan.unclear, 'unclear')
  count(plan.redundant, 'redundant')
  return [...summary.values()].sort((a, b) => a.symbol.localeCompare(b.symbol) || a.date.localeCompare(b.date))
}
