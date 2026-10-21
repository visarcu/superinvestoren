// src/lib/portfolioReconcile.ts
// Bestände sind eine Ableitung der Transaktionen — nicht umgekehrt.
//
// Beide Wege nutzen dieselbe Logik: der CSV-Import am Ende jedes Laufs und das
// Audit-Skript. Vorher schrieb der Import die Bestände einmal beim Anlegen und
// korrigierte sie danach nur innerhalb eines try/catch, das Fehler verschluckte.
// Ergebnis in echten Depots: Honeywell trug nach dem Spin-off weiter die volle
// Kostenbasis (388,17 € statt 190,05 €) und die abgespaltene Position fehlte
// ganz — obwohl die Transaktionen korrekt waren.

import type { SupabaseClient } from '@supabase/supabase-js'

/** Transaktionsarten, die den Bestand verändern. */
export const POSITION_TX_TYPES = ['buy', 'sell', 'transfer_in', 'transfer_out'] as const

export interface ReconcileTransaction {
  symbol: string
  name?: string | null
  isin?: string | null
  type: string
  date: string
  quantity: number | string | null
  price?: number | string | null
  total_value?: number | string | null
  fee?: number | string | null
  notes?: string | null
}

export interface ReconstructedHolding {
  symbol: string
  name: string
  isin: string | null
  quantity: number
  avgPrice: number
  earliestDate: string
}

const EPS_QTY = 0.0001
const EPS_PRICE = 0.005

function groupPositionTransactions(transactions: ReconcileTransaction[]): Map<string, ReconcileTransaction[]> {
  const bySymbol = new Map<string, ReconcileTransaction[]>()
  for (const tx of transactions) {
    const symbol = String(tx.symbol || '').trim()
    if (!symbol || symbol === 'CASH') continue
    if (!POSITION_TX_TYPES.includes(tx.type as typeof POSITION_TX_TYPES[number])) continue
    const list = bySymbol.get(symbol) || []
    list.push(tx)
    bySymbol.set(symbol, list)
  }
  return bySymbol
}

// Am selben Tag zuerst Zugänge, dann Abgänge — sonst verkauft man Stücke,
// die man laut Reihenfolge noch nicht besitzt.
function orderPositionTransactions(txs: ReconcileTransaction[]): ReconcileTransaction[] {
  const phase = (t: ReconcileTransaction) => (t.type === 'buy' || t.type === 'transfer_in' ? 0 : 1)
  return [...txs].sort((a, b) => a.date.localeCompare(b.date) || phase(a) - phase(b))
}

function isZeroValueTransfer(tx: ReconcileTransaction): boolean {
  if (tx.type !== 'transfer_in' && tx.type !== 'transfer_out') return false
  return !(Number(tx.total_value) > 0) && !(Number(tx.price) > 0)
}

/**
 * Tage, an denen ein Split als Paar aus wertlosem Aus- und Einbuchen vorliegt
 * (Trading 212: "Stock split close/open"). Die Stückzahl ändert sich, die
 * Kostenbasis nicht — als gewöhnliche Ausbuchung zum Durchschnittskurs
 * verlor die Position sonst einen Teil ihres Einstands (BKNG 25:1: −4 %).
 */
function splitPairDates(txs: ReconcileTransaction[]): Set<string> {
  const outDates = new Set(txs.filter(t => t.type === 'transfer_out' && isZeroValueTransfer(t)).map(t => t.date))
  return new Set(txs.filter(t => t.type === 'transfer_in' && isZeroValueTransfer(t) && outDates.has(t.date)).map(t => t.date))
}

// Umbenennung bzw. Hauptposition nach Kapitalmaßnahme, so markiert vom
// Scalable-Import (scalableCSVParser.normalizeCorporateActions): wertlose
// Ausbuchung des alten Papiers, gleichtägige Einbuchung des neuen.
const RENAME_OUT_NOTE = /Kostenbasis übertragen|Aufgegliedert in/
const RENAME_IN_NOTE = /Einstandskurs übernommen/

function isRenameOut(tx: ReconcileTransaction): boolean {
  return tx.type === 'transfer_out' && isZeroValueTransfer(tx) && RENAME_OUT_NOTE.test(tx.notes || '')
}

function isRenameIn(tx: ReconcileTransaction): boolean {
  return tx.type === 'transfer_in' && RENAME_IN_NOTE.test(tx.notes || '')
}

/**
 * Durchschnittskosten-Methode: Verkäufe senken den Bestand, lassen den
 * Einstandskurs aber unberührt — genau wie die Anzeige im Depot.
 *
 * Einbuchungen tragen den Marktwert am Übertragstag (Scalable "Security
 * transfer", Schlusskurs-Schätzung im Import). Das passt nur für Stücke, die
 * neu ins Depot kommen. Zwei Fälle behalten deshalb den bisherigen Einstand:
 *  - Rückübertrag: Das Symbol wurde vorher aus diesem Depot ausgebucht
 *    (Scalable-Lagerstellen-Migration 05./06.12.2025, Übertrag zu ING und
 *    zurück). Die Einbuchung übernimmt den Ø-Kurs dieser Ausbuchung.
 *  - Umbenennung: Die Basis der alten Position geht auf die neue über.
 * Die Transaktionen selbst bleiben beim Marktwert: Die TWR braucht ihn als
 * Fluss, und der Duplikat-Check vergleicht den Preis aus der Datei.
 */
export function reconstructHoldingsFromTransactions(
  transactions: ReconcileTransaction[]
): Map<string, ReconstructedHolding> {
  const bySymbol = groupPositionTransactions(transactions)
  const splitDatesBySymbol = new Map([...bySymbol].map(([symbol, txs]) => [symbol, splitPairDates(txs)]))

  // Eine Zeitlinie über alle Symbole, weil die Umbenennung die Basis von einem
  // Symbol ans andere weiterreicht. Ihre Ausbuchung läuft am selben Tag vor
  // allen anderen Buchungen, sonst ist die Basis bei der Einbuchung unbekannt.
  // Abgesehen davon bleibt je Symbol die Reihenfolge von orderPositionTransactions.
  const rank = (t: ReconcileTransaction) =>
    isRenameOut(t) ? -1 : t.type === 'buy' || t.type === 'transfer_in' ? 0 : 1
  const timeline = [...bySymbol]
    .flatMap(([symbol, txs]) => txs.map(tx => ({ symbol, tx })))
    .sort((a, b) => a.tx.date.localeCompare(b.tx.date) || rank(a.tx) - rank(b.tx))

  const positions = new Map<string, { shares: number; cost: number; name: string; isin: string | null; earliestDate: string }>()
  // Ø-Einstand je Symbol bei seiner letzten Ausbuchung
  const avgAtTransferOut = new Map<string, number>()
  // Basis der Umbenennungs-Ausbuchungen je Tag
  const renameBasisByDate = new Map<string, number[]>()

  for (const { symbol, tx } of timeline) {
    let pos = positions.get(symbol)
    if (!pos) {
      pos = { shares: 0, cost: 0, name: symbol, isin: null, earliestDate: tx.date }
      positions.set(symbol, pos)
    }
    const qty = Number(tx.quantity) || 0
    const totalValue = Number(tx.total_value) || Math.abs(qty * (Number(tx.price) || 0))

    if (splitDatesBySymbol.get(symbol)!.has(tx.date) && isZeroValueTransfer(tx)) {
      pos.shares += tx.type === 'transfer_in' ? qty : -qty
      continue
    }

    if (tx.type === 'buy') {
      pos.shares += qty
      // Gebühren gehören zur Kostenbasis; bei Einbuchungen gibt es keine.
      pos.cost += totalValue + Math.abs(Number(tx.fee) || 0)
    } else if (tx.type === 'transfer_in') {
      // Nur eindeutige Umbenennungen: eine Ausbuchung am Tag, einmal verbraucht.
      const renameBasis = isRenameIn(tx) ? renameBasisByDate.get(tx.date) : undefined
      const carriedAvg = avgAtTransferOut.get(symbol)
      pos.shares += qty
      if (renameBasis?.length === 1) {
        pos.cost += renameBasis[0]
        renameBasisByDate.delete(tx.date)
      } else if (carriedAvg !== undefined) {
        pos.cost += qty * carriedAvg
      } else {
        pos.cost += totalValue
      }
    } else {
      const avg = pos.shares > 0 ? pos.cost / pos.shares : 0
      if (isRenameOut(tx)) renameBasisByDate.set(tx.date, [...(renameBasisByDate.get(tx.date) || []), qty * avg])
      // Ohne bekannten Einstand (z.B. Käufe nicht importiert) nichts merken —
      // sonst käme eine spätere Einbuchung mit Basis 0 ins Depot.
      if (tx.type === 'transfer_out' && avg > 0) avgAtTransferOut.set(symbol, avg)
      pos.shares -= qty
      pos.cost -= qty * avg
    }

    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      if (tx.name) pos.name = tx.name
      if (tx.isin) pos.isin = tx.isin
    }
  }

  const result = new Map<string, ReconstructedHolding>()
  for (const [symbol, pos] of positions) {
    if (pos.shares <= EPS_QTY) continue
    result.set(symbol, {
      symbol,
      name: pos.name,
      isin: pos.isin,
      quantity: parseFloat(pos.shares.toFixed(8)),
      avgPrice: parseFloat((pos.cost / pos.shares).toFixed(4)),
      earliestDate: pos.earliestDate,
    })
  }

  return result
}

/**
 * Stückzahl-Verlauf je Symbol: Endstand und jeder Zwischenstand nach einer
 * Buchung. Stimmt ein gespeicherter Bestand mit einem Zwischenstand überein,
 * ist er nachweislich ein veralteter Stand genau dieser Transaktionen — etwa
 * weil ein Folge-Import neue Käufe oder den Verkauf ergänzt hat — und darf
 * ohne Schwellenwert nachgezogen bzw. entfernt werden.
 */
function quantityHistoryBySymbol(
  transactions: ReconcileTransaction[]
): Map<string, { final: number; snapshots: number[] }> {
  const history = new Map<string, { final: number; snapshots: number[] }>()
  for (const [symbol, txs] of groupPositionTransactions(transactions)) {
    let shares = 0
    const snapshots: number[] = []
    for (const tx of orderPositionTransactions(txs)) {
      const qty = Number(tx.quantity) || 0
      shares += tx.type === 'buy' || tx.type === 'transfer_in' ? qty : -qty
      snapshots.push(shares)
    }
    history.set(symbol, { final: shares, snapshots })
  }
  return history
}

function isStaleSnapshot(storedQuantity: number, history?: { snapshots: number[] }): boolean {
  return !!history?.snapshots.some(q => Math.abs(q - storedQuantity) <= EPS_QTY)
}

export interface HoldingDrift {
  symbol: string
  art: 'fehlt' | 'menge' | 'kurs' | 'überzählig'
  gespeichert?: { quantity: number; purchasePrice: number }
  erwartet?: { quantity: number; purchasePrice: number }
  /** Unterhalb der Korrekturschwelle — wird gemeldet, aber nicht geschrieben. */
  bagatelle?: boolean
}

// PostgREST liefert höchstens 1000 Zeilen je Anfrage. Ungeblättert fehlten
// großen Depots still die übrigen Buchungen: Bei 1312 Positionsbuchungen lag
// die AXP-Einbuchung von 2023 hinter der Grenze, der Abgleich errechnete einen
// Ø von 351.664 € und hätte ihn beim nächsten Import geschrieben.
const PAGE_SIZE = 1000

/**
 * Lädt alle Seiten einer Abfrage. `page` muss stabil sortieren, sonst
 * verrutschen die Seitengrenzen. Bei einem Fehler zählt das Ergebnis nicht —
 * ein Abgleich auf halben Daten richtet mehr Schaden an als keiner.
 */
export async function loadAllRows<T = any>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await page(offset, offset + PAGE_SIZE - 1)
    if (error) return { data: [], error }
    rows.push(...((data || []) as T[]))
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
  }
}

export interface ReconcileResult {
  created: number
  updated: number
  deleted: number
  unchanged: number
  drifts: HoldingDrift[]
  errors: string[]
}

/**
 * Gleicht die Bestände eines Depots mit seinen Transaktionen ab.
 *
 * `dryRun` meldet nur — dafür nutzt das Audit-Skript dieselbe Funktion.
 * Positionen ohne jede Transaktion (manuell angelegt) bleiben unangetastet.
 */
export async function reconcileHoldings(
  supabase: SupabaseClient,
  portfolioId: string,
  options: {
    dryRun?: boolean
    /**
     * Relative Abweichung, ab der korrigiert wird (Standard 2 %).
     * Darunter liegen meist Gebühren-Rundungen — die sind es nicht wert,
     * bestehende Depots anzufassen.
     */
    driftThreshold?: number
    /**
     * Positionen entfernen, deren Transaktionen auf 0 Stück laufen.
     * Standard aus: Wer nur einen Teilzeitraum importiert hat, verlöre sonst
     * echte Bestände, für die schlicht die alten Käufe fehlen.
     */
    deleteOrphans?: boolean
    /**
     * Nur eindeutige Fälle schreiben: veraltete Stückzahlen nachziehen und
     * glattgestellte Positionen entfernen. Keine neuen Bestände, keine
     * Einstands-Korrekturen per Schwellenwert. Für den erneuten Upload ohne
     * neue Buchungen — der darf nicht stillschweigend Einstände umschreiben,
     * die die Transaktionen nicht sauber abbilden (z.B. Einbuchungen von
     * einem anderen Broker, die den Marktkurs statt des Einstands tragen).
     */
    staleOnly?: boolean
  } = {}
): Promise<ReconcileResult> {
  const driftThreshold = options.driftThreshold ?? 0.02
  const result: ReconcileResult = { created: 0, updated: 0, deleted: 0, unchanged: 0, drifts: [], errors: [] }

  // portfolio_transactions führt keine ISIN — die hängt am Bestand bzw. am
  // Instrumenten-Stammsatz.
  const { data: txData, error: txError } = await loadAllRows<ReconcileTransaction>((from, to) =>
    supabase
      .from('portfolio_transactions')
      .select('symbol, name, type, date, quantity, price, total_value, fee, notes')
      .eq('portfolio_id', portfolioId)
      .in('type', POSITION_TX_TYPES as unknown as string[])
      .order('id', { ascending: true })
      .range(from, to)
  )

  if (txError) {
    result.errors.push(`Transaktionen konnten nicht geladen werden: ${txError.message}`)
    return result
  }

  const expected = reconstructHoldingsFromTransactions((txData || []) as ReconcileTransaction[])
  const quantityHistory = quantityHistoryBySymbol((txData || []) as ReconcileTransaction[])

  const { data: holdingData, error: holdingError } = await loadAllRows((from, to) =>
    supabase
      .from('portfolio_holdings')
      .select('id, symbol, isin, quantity, purchase_price')
      .eq('portfolio_id', portfolioId)
      .order('id', { ascending: true })
      .range(from, to)
  )

  if (holdingError) {
    result.errors.push(`Bestände konnten nicht geladen werden: ${holdingError.message}`)
    return result
  }

  const existing = new Map<string, { id: string; isin: string | null; quantity: number; purchase_price: number }>()
  for (const row of (holdingData || []) as any[]) {
    existing.set(String(row.symbol), {
      id: row.id,
      isin: row.isin ?? null,
      quantity: Number(row.quantity) || 0,
      purchase_price: Number(row.purchase_price) || 0,
    })
  }

  // Symbole, die Transaktionen haben — nur die dürfen angefasst werden.
  const symbolsWithTx = new Set(
    ((txData || []) as ReconcileTransaction[])
      .map(t => String(t.symbol || '').trim())
      .filter(s => s && s !== 'CASH')
  )

  for (const [symbol, want] of expected) {
    const have = existing.get(symbol)

    if (!have) {
      result.drifts.push({
        symbol,
        art: 'fehlt',
        erwartet: { quantity: want.quantity, purchasePrice: want.avgPrice },
      })
      if (options.dryRun || options.staleOnly) continue

      const { error } = await supabase.from('portfolio_holdings').insert({
        portfolio_id: portfolioId,
        symbol,
        name: want.name,
        isin: want.isin,
        quantity: want.quantity,
        purchase_price: want.avgPrice,
        purchase_date: want.earliestDate,
        purchase_currency: 'EUR',
      })
      if (error) result.errors.push(`${symbol}: Anlegen fehlgeschlagen — ${error.message}`)
      else result.created++
      continue
    }

    const qtyOff = Math.abs(have.quantity - want.quantity) > EPS_QTY
    const priceOff = Math.abs(have.purchase_price - want.avgPrice) > EPS_PRICE

    if (!qtyOff && !priceOff) {
      result.unchanged++
      continue
    }

    // Relative Abweichung entscheidet, ob korrigiert oder nur gemeldet wird.
    // Ausnahme: Der Bestand ist ein veralteter Stand der Transaktionen. Dann
    // fehlen ihm schlicht die neueren Buchungen — bei Bruchstück-Käufen (z.B.
    // reinvestierte Dividenden) liegt das weit unter jeder Schwelle und blieb
    // sonst für immer stehen.
    const qtyDrift = want.quantity > 0 ? Math.abs(have.quantity - want.quantity) / want.quantity : 0
    const priceDrift = want.avgPrice > 0 ? Math.abs(have.purchase_price - want.avgPrice) / want.avgPrice : 0
    const stale = qtyOff && isStaleSnapshot(have.quantity, quantityHistory.get(symbol))
    const relevant = stale || (!options.staleOnly && Math.max(qtyDrift, priceDrift) >= driftThreshold)

    result.drifts.push({
      symbol,
      art: qtyOff ? 'menge' : 'kurs',
      gespeichert: { quantity: have.quantity, purchasePrice: have.purchase_price },
      erwartet: { quantity: want.quantity, purchasePrice: want.avgPrice },
      bagatelle: !relevant,
    })
    if (options.dryRun || !relevant) continue

    const { error } = await supabase
      .from('portfolio_holdings')
      .update({ quantity: want.quantity, purchase_price: want.avgPrice, purchase_currency: 'EUR' })
      .eq('id', have.id)
    if (error) result.errors.push(`${symbol}: Aktualisieren fehlgeschlagen — ${error.message}`)
    else result.updated++
  }

  // Vollständig verkaufte Positionen entfernen — aber nur solche, die
  // überhaupt Transaktionen haben.
  for (const [symbol, have] of existing) {
    if (expected.has(symbol) || !symbolsWithTx.has(symbol)) continue

    result.drifts.push({
      symbol,
      art: 'überzählig',
      gespeichert: { quantity: have.quantity, purchasePrice: have.purchase_price },
    })
    // Ein unvollständig importierter Zeitraum sieht oft aus wie eine verkaufte
    // Position (Verkauf ohne die älteren Käufe → Bestand negativ). Ohne
    // ausdrückliche Anweisung wird deshalb nur gelöscht, was eindeutig
    // glattgestellt ist: Transaktionen laufen exakt auf 0 und der gespeicherte
    // Bestand ist ein früherer Stand genau dieser Transaktionen.
    const history = quantityHistory.get(symbol)
    const closedOut = !!history && Math.abs(history.final) <= EPS_QTY && isStaleSnapshot(have.quantity, history)
    if (options.dryRun || (!options.deleteOrphans && !closedOut)) continue

    const { error } = await supabase.from('portfolio_holdings').delete().eq('id', have.id)
    if (error) result.errors.push(`${symbol}: Löschen fehlgeschlagen — ${error.message}`)
    else result.deleted++
  }

  return result
}
