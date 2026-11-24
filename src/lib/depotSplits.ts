// src/lib/depotSplits.ts: Neue Buchungen auf die Stückzahl nach einem Split bringen
//
// Hat ein Depot einen Split verrechnet, stehen seine Buchungen davor auf der
// neuen Stückzahl. Ein späterer Export, der den Split nicht nennt, bringt weitere
// Käufe von davor mit der alten. Unverändert gespeichert, mischen sich beide:
// 0,038492 L8I7.DE zu 1.260 € neben 7,6984 zu 6,30 € (Split 200:1) hoben den
// Einstand von 6,89 auf 7,39 €.
//
// In einem Depot ohne Buchungen vor dem Split gilt dasselbe für Splits, die der
// Kursanbieter kennt (missingSplits.ts): Die Kurse stehen immer auf der heutigen
// Stückzahl. Stehen dort schon ältere Buchungen ohne den Split, bleibt alles.
//
// Umgerechnet wird nur mit Beleg:
//  - Die Datei bucht den Split selbst ein (Trade Republic: 19,264991 Gratisstücke
//    neben den unveränderten alten Käufen). Dann stehen die Käufe davor in alter
//    Stückzahl, und die Buchung entfällt, weil das Depot den Split schon enthält.
//  - Eine Einbuchung um den Split-Tag ergibt genau Bestand mal Verhältnis. Ältere
//    Scalable-Exporte buchen so die neuen Stücke ein, ohne die alten auszubuchen
//    (Walmart 3:1: 11 Stück, dann 33 dazu, im Depot standen 44).
//  - Zeilen derselben Datei, die das Depot schon kennt, stehen dort umgerechnet
//    und in der Datei nicht.
//  - Die Kaufkurse liegen um das Split-Verhältnis über den Schlusskursen dieser Tage.
//  - Der Kurs liegt eindeutig näher an den Kursen des Depots vor dem Split.
// Bleibt es offen, ändert der Import nichts und sagt es.

import {
  appendSplitNote, appliedSplits, hasSplitApplied, isNearSplitDate, isSameSplit, stripSplitMarkers, type AppliedSplit,
} from '@/lib/splitAdjustment'
import { SPLIT_TYPES, type NewBooking, type StoredBooking, type StoredMatch } from '@/lib/transactionMatch'
import type { SplitVerdict } from '@/lib/marketData/missingSplits'

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

/**
 * Käufe und Verkäufe tragen den Marktkurs ihres Tages. Überträge oft den alten
 * Einstand (bei einem Umzug Amazon 54 % unter dem Tageskurs), der über die
 * Stückzahl nichts sagt.
 */
export function hasMarketPrice(tx: { type: string; price: unknown; ignorePrice?: boolean }): boolean {
  return (tx.type === 'buy' || tx.type === 'sell') && !tx.ignorePrice && Number(tx.price) > 0
}

/** Kurs der zeitlich nächsten Buchung des Depots, die alle Splits verrechnet hat. */
function nearestPrice(rows: StoredBooking[], splits: AppliedSplit[], date: string): number {
  const distance = (row: StoredBooking) => Math.abs(Date.parse(row.date) - Date.parse(date))
  const nearest = rows
    .filter(row =>
      hasMarketPrice(row) &&
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

// Abweichung, bis zu der eine Einbuchung dem Bestand mal Verhältnis entspricht
const REPLACEMENT_TOLERANCE = 0.005

const signedQuantity = (tx: { type: string; quantity: unknown }) =>
  (tx.type === 'buy' || tx.type === 'transfer_in' ? 1 : -1) * (Number(tx.quantity) || 0)

/**
 * Ist die Einbuchung der Split selbst? Ihre Stücke sind dann der Bestand davor mal
 * Verhältnis (alle neuen) oder mal Verhältnis minus eins (nur die zusätzlichen).
 */
function matchesSplitQuantity(quantity: number, held: number, ratio: number): boolean {
  if (!(held > 0) || !(quantity > 0)) return false
  return [held * ratio, held * (ratio - 1)].some(
    expected => expected > 0 && Math.abs(quantity / expected - 1) <= REPLACEMENT_TOLERANCE
  )
}

/** Welche Splits fehlen den neuen Buchungen einer Datei? */
export function planDepotSplits(
  stored: StoredBooking[],
  transactions: NewBooking[],
  /** Buchungen, die das Depot schon kennt (matchStoredBookings) */
  matches: ReadonlyMap<number, StoredMatch>,
  /** Splits laut Kursanbieter, mit Urteil über die Kurse der Datei */
  listed: SplitVerdict[] = []
): DepotSplitPlan {
  const plan: DepotSplitPlan = { adopt: new Map(), unclear: new Map(), redundant: new Map() }
  const depotSplits = depotSplitsBySymbol(stored)

  for (const symbol of new Set([...depotSplits.keys(), ...listed.map(s => s.symbol)])) {
    const rows = stored.filter(row => row.symbol === symbol && SPLIT_TYPES.has(row.type))
    const inDepot = depotSplits.get(symbol) ?? []
    const verdicts = listed.filter(s => s.symbol === symbol)
    const splits: AppliedSplit[] = [
      ...inDepot,
      // Stehen im Depot ältere Buchungen ohne diesen Split, bleibt es dabei
      ...verdicts
        .filter(v => !inDepot.some(s => isSameSplit(s, v)) && !rows.some(row => row.date < v.date))
        .map(({ date, ratio }) => ({ date, ratio })),
    ].sort((a, b) => a.date.localeCompare(b.date))
    const inFile = transactions
      .map((tx, index) => ({ tx, index }))
      .filter(({ tx }) => tx.symbol === symbol && SPLIT_TYPES.has(tx.type))
    const fresh = inFile.filter(({ index }) => !matches.has(index))
    if (fresh.length === 0) continue

    // Was die Datei über jeden Split sagt: fehlt er ihren Zeilen davor, enthalten
    // sie ihn schon, oder bleibt es offen?
    const known = splits.map((split): { missing?: boolean; keep?: boolean; blocked?: boolean } => {
      const near = inFile.filter(({ tx }) =>
        (tx.type === 'transfer_in' || tx.type === 'transfer_out') && isNearSplitDate(tx.date, split.date)
      )
      const bookings = near.filter(({ tx }) => isSplitBooking(tx))
      if (bookings.length > 0) {
        // Hat das Depot den Split nicht verrechnet, führt es die Split-Buchung
        // selbst oder noch alte Stückzahlen, zu denen sie gehört, bleiben die
        // Zeilen der Datei, wie sie sind.
        const settled =
          inDepot.includes(split) &&
          bookings.every(({ index }) => !matches.has(index)) &&
          rows.every(row => row.date >= split.date || hasSplitApplied(row.notes, split.date, split.ratio))
        if (!settled) return { keep: true }
        bookings.forEach(({ index }) => plan.redundant.set(index, [split]))
        return { missing: true }
      }

      // Die Einbuchung der neuen Stücke, ohne Hinweis und oft mit Kurs. Der Bestand
      // davor zählt auf der alten Stückzahl, aus Depot und neuen Buchungen.
      const beforeSplit = (row: { type: string; quantity: unknown; notes?: string | null }) =>
        signedQuantity(row) / (hasSplitApplied(row.notes, split.date, split.ratio) ? split.ratio : 1)
      const replacement = near.length === 1 && near[0].tx.type === 'transfer_in' ? near[0] : undefined
      if (replacement && !hasSplitApplied(replacement.tx.notes, split.date, split.ratio)) {
        const held =
          rows.filter(row => row.date < replacement.tx.date).reduce((sum, row) => sum + beforeSplit(row), 0) +
          fresh.filter(({ tx }) => tx.date < replacement.tx.date).reduce((sum, { tx }) => sum + beforeSplit(tx), 0)
        if (matchesSplitQuantity(replacement.tx.quantity, held, split.ratio)) {
          const settled =
            !matches.has(replacement.index) &&
            rows.every(row => row.date >= split.date || hasSplitApplied(row.notes, split.date, split.ratio))
          const contradicted = verdicts.find(v => isSameSplit(v, split))?.missing === false
          if (settled && !contradicted) {
            plan.redundant.set(replacement.index, [split])
            return { missing: true }
          }
          // Die Buchungen davor stehen im Depot noch auf der alten Stückzahl: Mit
          // der Einbuchung zusammen stimmt der Bestand nicht
          if (!matches.has(replacement.index)) plan.unclear.set(replacement.index, [split])
        }
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
      if (without > 0 !== including > 0) return { missing: without > 0 }
      // Ein anderer Übertrag um den Split-Tag kann zum Split gehören
      if (near.length > 0) return { blocked: true }
      const verdict = verdicts.find(v => isSameSplit(v, split))?.missing
      return verdict === true || verdict === false ? { missing: verdict } : {}
    })

    for (const { tx, index } of fresh) {
      const open = splits
        .map((split, i) => ({ split, ...known[i] }))
        .filter(({ split, keep }) => split.date > tx.date && !keep && !hasSplitApplied(tx.notes, split.date, split.ratio))
      if (open.length === 0 || plan.redundant.has(index)) continue

      let adopt: AppliedSplit[] | null
      if (open.some(o => o.blocked)) {
        adopt = null
      } else if (open.every(o => o.missing !== undefined)) {
        adopt = open.filter(o => o.missing).map(o => o.split)
      } else {
        const latestFirst = open.map(o => o.split).reverse()
        const reference = !hasMarketPrice(tx) ? 0 : nearestPrice(rows, splits.filter(s => s.date > tx.date), tx.date)
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
