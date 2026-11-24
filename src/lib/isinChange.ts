// src/lib/isinChange.ts — ISIN-Umstellungen beim Depot-Import
//
// Nach einer Kapitalmaßnahme bekommt eine Aktie oft eine neue ISIN (Unilever
// 8:9 am 09.12.2025: GB00B10RZP78 → GB00BVZK7T90). Die Broker-Datei führt die
// Buchungen davor weiter unter der alten, und dafür kennt OpenFIGI nur noch
// technische Kürzel ohne Kurse (ULVR1USD). Bis zur Umstellung fehlte die
// Position deshalb im Verlauf, und ein Spin-off am selben Tag (Magnum) ließ
// sich mangels Mutterkursen nicht aufteilen.
//
// Solche Buchungen laufen unter dem Kürzel der neuen ISIN, umgerechnet wie bei
// einem Split: Stück × Ratio, Kurs ÷ Ratio, Betrag bleibt, Marker-Note. Das
// wertlose Umstellungspaar (Aus- und Einbuchung) entfällt.
//
// Ob das geht, entscheidet das Depot. Frühere Importe haben dieselben Buchungen
// unter dem technischen Kürzel gespeichert (depotSymbols.ts findet es). Dort
// bleibt alles, wie es ist: Die Zeilen der Datei bekommen das gespeicherte
// Kürzel, und der Duplikat-Check erkennt sie wieder. Sonst stünden sie nach
// einem erneuten Upload doppelt im Depot.

import type { ParsedTransaction, StockSplit, TickerRename } from './scalableCSVParser'
import type { StoredTransaction } from './depotSymbols'
import { matchesStoredTransaction } from './duplicateCheck'
import { appendSplitNote, hasSplitApplied } from './splitAdjustment'

export interface IsinChangePlan {
  rename: TickerRename
  /**
   * adjust: Buchungen der alten ISIN laufen umgerechnet unter `symbol`.
   * keep:   Das Depot führt sie unter `symbol` auf alter Stückzahl-Basis,
   *         dabei bleibt es (samt Umstellungspaar).
   */
  mode: 'adjust' | 'keep'
  symbol: string
  /** Name der neuen Notierung (nur adjust) */
  name?: string
  /** Kürzel der neuen ISIN, im Modus keep das Ziel einer Bereinigung */
  successorSymbol: string
  /** Gespeicherte Buchungen von `symbol` stehen noch auf alter Stückzahl-Basis */
  rescaleStored: boolean
}

const POSITION_TYPES: ReadonlySet<string> = new Set(['buy', 'sell', 'transfer_in', 'transfer_out'])

/** Abweichung, bis zu der ein Bestand den ausgebuchten Stücken entspricht */
const COVERAGE_TOLERANCE = 0.0005

function isPosition(tx: { type: string }): boolean {
  return POSITION_TYPES.has(tx.type)
}

function signedQuantity(tx: { type: string; quantity: number | string | null }): number {
  if (!isPosition(tx)) return 0
  const quantity = Number(tx.quantity) || 0
  return tx.type === 'buy' || tx.type === 'transfer_in' ? quantity : -quantity
}

function isValueless(tx: ParsedTransaction): boolean {
  return !(tx.price > 0) && !(tx.totalValue > 0)
}

/**
 * Das Umstellungspaar in der Datei. Nur wertlose Zeilen: Umstellungen mit
 * Beträgen (Lyxor- in Amundi-ETF) sind Fusionen mit eigenem Einstand.
 */
function findRenamePair(
  transactions: ParsedTransaction[],
  rename: TickerRename
): { out: ParsedTransaction; in: ParsedTransaction } | null {
  const outs = transactions.filter(t =>
    t.type === 'transfer_out' && t.isFromCorpAction && t.isin === rename.fromIsin && t.date === rename.date
  )
  const ins = transactions.filter(t =>
    t.type === 'transfer_in' && t.corpActionType === 'rename' &&
    t.isin === rename.toIsin && t.fromIsin === rename.fromIsin && t.date === rename.date
  )
  if (outs.length !== 1 || ins.length !== 1) return null
  if (!isValueless(outs[0]) || !isValueless(ins[0])) return null
  return { out: outs[0], in: ins[0] }
}

/** Buchung der alten ISIN auf die Stückzahl-Basis der neuen bringen. */
function convertTransaction<T extends ParsedTransaction>(
  tx: T,
  plan: Pick<IsinChangePlan, 'rename' | 'symbol' | 'name'>,
  splits: StockSplit[]
): T {
  const { rename } = plan
  const converted: T = {
    ...tx,
    isin: rename.toIsin,
    symbol: plan.symbol,
    name: plan.name || tx.name,
  }
  if (!isPosition(tx)) return converted

  // Der Parser verrechnet Splits nur innerhalb einer ISIN. Splits der neuen
  // gelten jetzt auch für die Buchungen der alten.
  const steps = [
    { ratio: rename.ratio, date: rename.date },
    ...splits.filter(s => s.isin === rename.toIsin && s.date > rename.date),
  ]
  for (const { ratio, date } of steps) {
    if (!(ratio > 0) || ratio === 1) continue
    converted.quantity *= ratio
    converted.price /= ratio
    converted.notes = appendSplitNote(converted.notes, ratio, date)
  }
  return converted
}

/**
 * Wendet die geplanten Umstellungen auf die Buchungen der Datei an. Mehrere
 * Wechsel hintereinander (A → B → C) greifen in zeitlicher Reihenfolge, weil
 * jede umgerechnete Buchung die ISIN ihres Nachfolgers trägt.
 */
export function applyIsinChanges<T extends ParsedTransaction>(
  transactions: T[],
  plans: IsinChangePlan[],
  splits: StockSplit[] = []
): T[] {
  const ordered = [...plans].sort((a, b) => a.rename.date.localeCompare(b.rename.date))
  return ordered.reduce((rows, plan) => {
    const { fromIsin } = plan.rename
    if (plan.mode === 'keep') {
      return rows.map(t => (t.isin === fromIsin ? { ...t, symbol: plan.symbol } : t))
    }
    const pair = findRenamePair(rows, plan.rename)
    return rows
      .filter(t => t !== pair?.out && t !== pair?.in)
      .map(t => (t.isin === fromIsin ? convertTransaction(t, plan, splits) : t))
  }, transactions)
}

function matchesUnder(
  stored: StoredTransaction,
  tx: ParsedTransaction,
  symbol: string
): boolean {
  return matchesStoredTransaction(stored, {
    type: tx.type,
    symbol,
    date: tx.date,
    quantity: tx.quantity,
    price: tx.price,
  })
}

/**
 * Entscheidet je ISIN-Wechsel der Datei, ob und wie ihn der Import umsetzt.
 * Wechsel ohne Plan bleiben, wie der Parser sie geliefert hat.
 */
export function planIsinChanges({
  transactions,
  renames,
  splits = [],
  symbolOf,
  confirmed,
  stored,
}: {
  /** Buchungen der Datei, vor der Umstellung */
  transactions: ParsedTransaction[]
  renames: TickerRename[]
  splits?: StockSplit[]
  /** Kürzel einer ISIN, im Depot geführt (depotSymbols) oder aufgelöst */
  symbolOf: (isin: string) => { symbol: string; name: string } | undefined
  /** Alte ISINs ohne handelbares Kürzel, deren Nachfolger dasselbe Papier ist (resolve-isins) */
  confirmed: ReadonlySet<string>
  /** Gespeicherte Buchungen des Depots, leer bei neuem oder geleertem Depot */
  stored: StoredTransaction[]
}): IsinChangePlan[] {
  const plans: IsinChangePlan[] = []

  // Der jüngste Wechsel zuerst: Bei einer Kette steht das Kürzel am Ende.
  for (const rename of [...renames].sort((a, b) => b.date.localeCompare(a.date))) {
    const pair = findRenamePair(transactions, rename)
    const next = plans.find(p => p.rename.fromIsin === rename.toIsin)
    const successor = next
      ? { symbol: next.symbol, name: next.name }
      : symbolOf(rename.toIsin)
    if (!pair || !successor?.symbol || !(rename.ratio > 0)) continue

    const oldRows = transactions.filter(t => t.isin === rename.fromIsin)
    const bookings = oldRows.filter(t => t !== pair.out)
    const positions = bookings.filter(isPosition)

    const adjust: IsinChangePlan = {
      rename,
      mode: 'adjust',
      symbol: successor.symbol,
      name: successor.name,
      successorSymbol: successor.symbol,
      rescaleStored: false,
    }

    const storedNew = stored.filter(s => s.symbol === successor.symbol)
    const converted = applyIsinChanges(positions, [adjust, ...plans], splits)
    const convertedMatches = converted.filter(tx => storedNew.some(s => matchesUnder(s, tx, s.symbol))).length
    const alreadyAdjusted =
      convertedMatches > 0 || storedNew.some(s => hasSplitApplied(s.notes, rename.date, rename.ratio))

    // Führt das Depot die Buchungen der alten ISIN unter eigenem Kürzel? Keines
    // mit Käufen oder Verkäufen nach der Umstellung, da gab es die alte Aktie
    // nicht mehr.
    const oldSymbol = symbolOf(rename.fromIsin)?.symbol
    const storedOld = oldSymbol && oldSymbol !== successor.symbol ? stored.filter(s => s.symbol === oldSymbol) : []
    const oldMatches = storedOld.some(s => isPosition(s) && s.date > rename.date)
      ? 0
      : oldRows.filter(tx => isPosition(tx) && storedOld.some(s => matchesUnder(s, tx, s.symbol))).length

    if (oldSymbol && oldMatches > 0 && (!alreadyAdjusted || oldMatches > convertedMatches)) {
      plans.push({ ...adjust, mode: 'keep', symbol: oldSymbol, name: undefined })
      continue
    }
    if (alreadyAdjusted) {
      plans.push(adjust)
      continue
    }

    // Vor der Umstellung importiert, als die alte ISIN noch das heutige Kürzel
    // trug: Die gespeicherten Buchungen brauchen dieselbe Umrechnung. Nur wenn
    // sie zusammen mit der Datei genau den ausgebuchten Bestand ergeben.
    const isStored = (tx: ParsedTransaction) => storedNew.some(s => matchesUnder(s, tx, s.symbol))
    const held = storedNew
      .filter(s => s.date < rename.date)
      .reduce((sum, s) => sum + signedQuantity(s), 0)
    const added = positions
      .filter(tx => !isStored(tx))
      .reduce((sum, tx) => sum + signedQuantity(tx), 0)
    if ((held > 0 || positions.some(isStored)) && coversQuantity(held + added, pair.out.quantity)) {
      plans.push({ ...adjust, rescaleStored: rename.ratio !== 1 })
      continue
    }

    // Neues Depot (für dieses Papier). Nur umrechnen, wenn die Datei den ganzen
    // ausgebuchten Bestand erklärt: Fehlen Käufe (Teilexport), trüge ohne das
    // Umstellungspaar niemand die Stücke ein.
    const fileQuantity = positions.reduce((sum, tx) => sum + signedQuantity(tx), 0)
    if (confirmed.has(rename.fromIsin) && coversQuantity(fileQuantity, pair.out.quantity)) {
      plans.push(adjust)
    }
  }

  return plans
}

function coversQuantity(held: number, required: number): boolean {
  return Math.abs(held - required) <= Math.max(0.0001, required * COVERAGE_TOLERANCE)
}
