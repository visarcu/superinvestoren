// src/lib/transactionMatch.ts
// Beschreiben eine gespeicherte und eine neue Buchung denselben Vorgang? Ohne
// Datenbank, damit Browser-Import (duplicateCheck) und Server-Abgleich
// (t212Import) dieselbe Regel nutzen.

import { appliedSplits, hasSplitApplied, type AppliedSplit } from '@/lib/splitAdjustment'
import { hasSpinoffBasisTaken, valueBeforeSpinoff } from '@/lib/spinoffAdjustment'

/** Gespeicherte Buchung, soweit der Vergleich sie braucht. */
export interface StoredBooking {
  type: string
  symbol: string
  date: string
  quantity: unknown
  price: unknown
  notes?: string | null
}

/** Buchung aus einer Datei oder einem Formular. */
export interface NewBooking {
  type: string
  symbol: string
  date: string
  quantity: number
  price: number
  /** Notiz des Parsers: nennt die Splits, die er an dieser Zeile schon verrechnet hat */
  notes?: string | null
  /** Der Kurs stammt nicht aus der Datei (geschätzter Einstand eines Übertrags) */
  ignorePrice?: boolean
}

/**
 * Menge und Preis mit Toleranz vergleichen.
 *
 * Die Toleranz ist bewusst relativ. Freedom24 & Co. liefern Fremdwährungs-Trades
 * in USD; wir rechnen sie mit dem Durchschnittskurs DER JEWEILIGEN DATEI in Euro
 * um. Zwei Exporte über unterschiedliche Zeiträume haben unterschiedliche
 * Durchschnittskurse — derselbe Kauf bekommt dann einen leicht anderen
 * Euro-Preis. Bei einer festen Grenze von 2 Cent galt eine 300-Euro-Position
 * schon bei 0,007 % Kursdrift als neue Transaktion, und der Import legte sie
 * ein zweites Mal an.
 */
const PRICE_TOLERANCE_RELATIVE = 0.01   // 1 % deckt übliche FX-Drift ab
const PRICE_TOLERANCE_ABSOLUTE = 0.02   // Untergrenze für Cent-Beträge
const QTY_TOLERANCE_RELATIVE = 0.001    // 0,1 % für Bruchstücke
const QTY_TOLERANCE_ABSOLUTE = 0.01

export function quantitiesMatch(a: number, b: number): boolean {
  const tolerance = Math.max(QTY_TOLERANCE_ABSOLUTE, Math.abs(b) * QTY_TOLERANCE_RELATIVE)
  return Math.abs(a - b) <= tolerance
}

export function pricesMatch(a: number, b: number): boolean {
  const reference = Math.max(Math.abs(a), Math.abs(b))
  const tolerance = Math.max(PRICE_TOLERANCE_ABSOLUTE, reference * PRICE_TOLERANCE_RELATIVE)
  return Math.abs(a - b) <= tolerance
}

/**
 * Passt eine gespeicherte Transaktion preislich zu einer aus der Datei?
 *
 * Die Spin-off-Kostenaufteilung schreibt gespeicherte Preise nachträglich um
 * (siehe spinoffAdjustment.ts), die Broker-Datei enthält beim Re-Import aber
 * weiter den Originalpreis. Gegen den umgeschriebenen Preis verglichen galt
 * derselbe Kauf als neu: Bei einem Freedom24-Depot standen dadurch Honeywell,
 * die Aerospace-Abspaltung, S&P Global und Mobility nach dem zweiten Import
 * doppelt im Bestand — und die doppelten Käufe zogen den Cash ins Minus.
 */
export function storedPriceMatches(
  stored: { price: unknown; notes?: string | null },
  price: number,
  matches: (a: number, b: number) => boolean = pricesMatch
): boolean {
  const storedPrice = Number(stored.price) || 0
  if (matches(storedPrice, price)) return true
  // Tochter-Einbuchung: Der Marktwert aus der Datei wurde durch einen Anteil an
  // der Mutter-Kostenbasis ersetzt und ist nicht rekonstruierbar. Gleiches
  // Symbol, Datum und Stückzahl beschreiben dann dieselbe Einbuchung.
  if (hasSpinoffBasisTaken(stored.notes)) return true
  return matches(valueBeforeSpinoff(storedPrice, stored.notes), price)
}

const bookingKey = (tx: { type: string; symbol: string; date: string }) => `${tx.type}|${tx.symbol}|${tx.date}`

/** Stimmen Stück und Kurs so, wie die Zeile gespeichert ist? */
function matchesAsStored(stored: StoredBooking, tx: NewBooking): boolean {
  return (
    quantitiesMatch(Number(stored.quantity), tx.quantity) &&
    (tx.ignorePrice || storedPriceMatches(stored, tx.price))
  )
}

/** Nur diese Buchungen rechnet ein Split um (CSVImportModal, applySplits.ts). */
export const SPLIT_TYPES: ReadonlySet<string> = new Set(['buy', 'sell', 'transfer_in', 'transfer_out'])

function withinRelative(tolerance: number) {
  return (a: number, b: number) => Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * tolerance
}
const splitQuantitiesMatch = withinRelative(QTY_TOLERANCE_RELATIVE)
const splitPricesMatch = withinRelative(PRICE_TOLERANCE_RELATIVE)

/**
 * Die Splits, vor denen die gespeicherte Zeile der neuen Buchung entspricht.
 * Null, wenn sie es vor keinem tut.
 *
 * Splits werden auch nachträglich verrechnet (CSVImportModal, applySplits.ts),
 * die Broker-Datei nennt sie aber nicht immer und enthält dann weiter die alten
 * Stückzahlen. Flatex-Depot 05f3c896: 0,025984 L8I7.DE zu 904,40 € in der Datei,
 * gespeichert 5,1968 zu 4,522 € (200:1). Ein erneuter Upload legte die Käufe
 * doppelt an.
 *
 * Splits, die der Parser an der Zeile schon verrechnet hat, bleiben verrechnet,
 * auch unter einem nahen Datum (hasSplitApplied). Die übrigen gehen vom jüngsten
 * rückwärts weg: Die Datei kann vor jedem von ihnen entstanden sein.
 *
 * Nur relative Toleranzen: Die Untergrenzen für Bruchstücke und Cent-Beträge
 * gelten für eine feste Stückzahl-Basis. 0,01 Stück vor einem 200:1 sind danach 2.
 */
function splitsSince(stored: StoredBooking, tx: NewBooking): AppliedSplit[] | null {
  if (!stored.notes || !SPLIT_TYPES.has(stored.type)) return null
  const openSplits = appliedSplits(stored.notes)
    .filter(split => !hasSplitApplied(tx.notes, split.date, split.ratio))
    .sort((a, b) => b.date.localeCompare(a.date))
  let factor = 1
  const count = openSplits.findIndex(split => {
    factor *= split.ratio
    return (
      splitQuantitiesMatch(Number(stored.quantity), tx.quantity * factor) &&
      (tx.ignorePrice || storedPriceMatches(stored, tx.price / factor, splitPricesMatch))
    )
  })
  return count < 0 ? null : openSplits.slice(0, count + 1)
}

/** Beschreibt die gespeicherte Zeile dieselbe Transaktion wie die neue? */
export function matchesStoredTransaction(stored: StoredBooking, tx: NewBooking): boolean {
  return bookingKey(stored) === bookingKey(tx) && (matchesAsStored(stored, tx) || splitsSince(stored, tx) !== null)
}

export interface StoredMatch {
  /** Gespeicherte Zeilen, die dieselbe Buchung beschreiben */
  rows: StoredBooking[]
  /** Splits, die dort verrechnet sind und in der neuen Buchung noch nicht */
  openSplits: AppliedSplit[]
}

/**
 * Die Buchungen, die schon gespeichert sind (Index → gespeicherte Zeilen).
 *
 * Über einen Split hinweg erklärt jede gespeicherte Zeile höchstens eine neue.
 * Ein zweiter Kauf am selben Tag bleibt damit neu, auch wenn er dem ersten in
 * Stück und Kurs gleicht.
 */
export function matchStoredBookings(stored: StoredBooking[], transactions: NewBooking[]): Map<number, StoredMatch> {
  const storedByKey = new Map<string, StoredBooking[]>()
  for (const row of stored) {
    const key = bookingKey(row)
    const rows = storedByKey.get(key)
    if (rows) rows.push(row)
    else storedByKey.set(key, [row])
  }

  const matches = new Map<number, StoredMatch>()
  const used = new Set<StoredBooking>()
  transactions.forEach((tx, i) => {
    const rows = (storedByKey.get(bookingKey(tx)) ?? []).filter(row => matchesAsStored(row, tx))
    if (rows.length === 0) return
    matches.set(i, { rows, openSplits: [] })
    rows.forEach(row => used.add(row))
  })

  // Beide Seiten nach Kurs: Mehrere ähnliche Käufe eines Tages nähmen sich sonst
  // gegenseitig die passende Zeile weg.
  const byPrice = (a: { price: unknown }, b: { price: unknown }) => Number(a.price) - Number(b.price)
  for (const rows of storedByKey.values()) rows.sort(byPrice)
  const open = transactions.map((tx, i) => ({ tx, i })).filter(({ i }) => !matches.has(i))
  for (const { tx, i } of open.sort((a, b) => byPrice(a.tx, b.tx))) {
    for (const row of storedByKey.get(bookingKey(tx)) ?? []) {
      const openSplits = used.has(row) ? null : splitsSince(row, tx)
      if (!openSplits) continue
      matches.set(i, { rows: [row], openSplits })
      used.add(row)
      break
    }
  }
  return matches
}
