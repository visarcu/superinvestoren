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

/**
 * Durchschnittskosten-Methode: Verkäufe senken den Bestand, lassen den
 * Einstandskurs aber unberührt — genau wie die Anzeige im Depot.
 */
export function reconstructHoldingsFromTransactions(
  transactions: ReconcileTransaction[]
): Map<string, ReconstructedHolding> {
  const bySymbol = new Map<string, ReconcileTransaction[]>()
  for (const tx of transactions) {
    const symbol = String(tx.symbol || '').trim()
    if (!symbol || symbol === 'CASH') continue
    if (!POSITION_TX_TYPES.includes(tx.type as typeof POSITION_TX_TYPES[number])) continue
    const list = bySymbol.get(symbol) || []
    list.push(tx)
    bySymbol.set(symbol, list)
  }

  const result = new Map<string, ReconstructedHolding>()

  for (const [symbol, txs] of bySymbol) {
    // Am selben Tag zuerst Zugänge, dann Abgänge — sonst verkauft man Stücke,
    // die man laut Reihenfolge noch nicht besitzt.
    const phase = (t: ReconcileTransaction) => (t.type === 'buy' || t.type === 'transfer_in' ? 0 : 1)
    const ordered = [...txs].sort((a, b) => a.date.localeCompare(b.date) || phase(a) - phase(b))

    let shares = 0
    let cost = 0
    let name = symbol
    let isin: string | null = null
    let earliestDate = ordered[0].date

    for (const tx of ordered) {
      const qty = Number(tx.quantity) || 0
      const totalValue = Number(tx.total_value) || Math.abs(qty * (Number(tx.price) || 0))

      if (tx.type === 'buy' || tx.type === 'transfer_in') {
        shares += qty
        // Gebühren gehören zur Kostenbasis; bei Einbuchungen gibt es keine.
        cost += totalValue + (tx.type === 'buy' ? Math.abs(Number(tx.fee) || 0) : 0)
        if (tx.name) name = tx.name
        if (tx.isin) isin = tx.isin
        if (tx.date < earliestDate) earliestDate = tx.date
      } else {
        const avg = shares > 0 ? cost / shares : 0
        shares -= qty
        cost -= qty * avg
      }
    }

    if (shares <= EPS_QTY) continue

    result.set(symbol, {
      symbol,
      name,
      isin,
      quantity: parseFloat(shares.toFixed(8)),
      avgPrice: parseFloat((cost / shares).toFixed(4)),
      earliestDate,
    })
  }

  return result
}

export interface HoldingDrift {
  symbol: string
  art: 'fehlt' | 'menge' | 'kurs' | 'überzählig'
  gespeichert?: { quantity: number; purchasePrice: number }
  erwartet?: { quantity: number; purchasePrice: number }
  /** Unterhalb der Korrekturschwelle — wird gemeldet, aber nicht geschrieben. */
  bagatelle?: boolean
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
  } = {}
): Promise<ReconcileResult> {
  const driftThreshold = options.driftThreshold ?? 0.02
  const result: ReconcileResult = { created: 0, updated: 0, deleted: 0, unchanged: 0, drifts: [], errors: [] }

  // portfolio_transactions führt keine ISIN — die hängt am Bestand bzw. am
  // Instrumenten-Stammsatz.
  const { data: txData, error: txError } = await supabase
    .from('portfolio_transactions')
    .select('symbol, name, type, date, quantity, price, total_value, fee')
    .eq('portfolio_id', portfolioId)
    .in('type', POSITION_TX_TYPES as unknown as string[])

  if (txError) {
    result.errors.push(`Transaktionen konnten nicht geladen werden: ${txError.message}`)
    return result
  }

  const expected = reconstructHoldingsFromTransactions((txData || []) as ReconcileTransaction[])

  const { data: holdingData, error: holdingError } = await supabase
    .from('portfolio_holdings')
    .select('id, symbol, isin, quantity, purchase_price')
    .eq('portfolio_id', portfolioId)

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
      if (options.dryRun) continue

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
    const qtyDrift = want.quantity > 0 ? Math.abs(have.quantity - want.quantity) / want.quantity : 0
    const priceDrift = want.avgPrice > 0 ? Math.abs(have.purchase_price - want.avgPrice) / want.avgPrice : 0
    const relevant = Math.max(qtyDrift, priceDrift) >= driftThreshold

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
    // Löschen nur auf ausdrückliche Anweisung: ein unvollständig importierter
    // Zeitraum sieht genauso aus wie eine verkaufte Position.
    if (options.dryRun || !options.deleteOrphans) continue

    const { error } = await supabase.from('portfolio_holdings').delete().eq('id', have.id)
    if (error) result.errors.push(`${symbol}: Löschen fehlgeschlagen — ${error.message}`)
    else result.deleted++
  }

  return result
}
