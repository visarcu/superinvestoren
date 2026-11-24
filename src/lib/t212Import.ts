// src/lib/t212Import.ts
// Trading-212-Berichte (CSV) auf dem Server ins Depot übernehmen. Gleiche Regeln
// wie der Import im Browser (CSVImportModal): prüfen, bekannte Buchungen
// überspringen, in einem Rutsch schreiben, Spin-offs aufteilen, Bestände und
// Cash neu ableiten. Zusätzlich merkt sich broker_sync_items die Kennung jeder
// Zeile, damit auch zwei gleiche Käufe am selben Tag nicht verwechselt werden.

import type { SupabaseClient } from '@supabase/supabase-js'
import { adoptSplits, planDepotSplits } from '@/lib/depotSplits'
import { loadEurCloses } from '@/lib/historicalEurCloses'
import { describeValidationIssues, NAME_MAX_LENGTH, validateImportRows } from '@/lib/importValidation'
import { loadAllRows, POSITION_TX_TYPES, reconcileHoldings } from '@/lib/portfolioReconcile'
import type { ParsedTransaction } from '@/lib/scalableCSVParser'
import {
  detectSpinoffEvents, hasSpinoffBasisTaken, isSpinoffChildTransfer, planSpinoffCostSplit, valueBeforeSpinoff, type SpinoffEvent,
} from '@/lib/spinoffAdjustment'
import { parseTrading212CSV } from '@/lib/trading212CSVParser'
import { matchesStoredTransaction, matchStoredBookings, quantitiesMatch } from '@/lib/transactionMatch'

export interface T212ImportResult {
  /** Zeilen in den Berichten */
  zeilen: number
  /** neu gespeicherte Buchungen */
  neu: number
  /** schon vorhandene Buchungen, die der Abgleich jetzt kennt */
  wiedererkannt: number
  positionenGeaendert: number
  cash: number | null
  hinweise: string[]
  /** ISIN → Kürzel aus den Berichten */
  symbolByIsin: Map<string, string>
}

interface StoredRow {
  id: string
  type: string
  symbol: string
  date: string
  quantity: number | string
  price: number | string
  notes: string | null
}

const BATCH = 50

export async function importT212Reports(db: SupabaseClient, portfolioId: string, reports: string[]): Promise<T212ImportResult> {
  // Überlappende Berichte: dieselbe Zeile nur einmal
  const rows = new Map<string, ParsedTransaction>()
  const hinweise = new Set<string>()
  const symbolByIsin = new Map<string, string>()
  for (const csv of reports) {
    const parsed = parseTrading212CSV(csv)
    for (const tx of parsed.transactions) {
      if (!tx.symbol || !tx.externalId) continue
      rows.set(tx.externalId, tx)
      if (tx.isin) symbolByIsin.set(tx.isin.toUpperCase(), tx.symbol)
    }
    for (const s of parsed.skipped) {
      if (/Unbekannter Action-Typ/.test(s)) hinweise.add(s.replace(/^Zeile \d+: /, ''))
    }
  }
  const all = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date))
  const issues = validateImportRows(all)
  if (issues.length > 0) throw new Error(`Nichts gespeichert: ${describeValidationIssues(issues)}`)

  const { data: items, error: itemError } = await loadAllRows<{ external_id: string; transaction_id: string }>((from, to) =>
    db.from('broker_sync_items').select('external_id, transaction_id').eq('portfolio_id', portfolioId).order('external_id', { ascending: true }).range(from, to))
  if (itemError) throw new Error(`Abgleichsdaten nicht lesbar (${itemError.message})`)
  const known = new Set(items.map(i => i.external_id))
  const mapped = new Set(items.map(i => i.transaction_id))

  // Schon gespeicherte, aber noch nicht zugeordnete Buchungen (früherer CSV-Import)
  const { data: stored, error: storedError } = await loadAllRows<StoredRow>((from, to) =>
    db.from('portfolio_transactions').select('id, type, symbol, date, quantity, price, notes').eq('portfolio_id', portfolioId).order('id', { ascending: true }).range(from, to))
  if (storedError) throw new Error(`Buchungen nicht lesbar (${storedError.message})`)
  const pool = new Map<string, StoredRow[]>()
  for (const row of stored) {
    if (mapped.has(row.id)) continue
    const key = `${row.type}|${row.symbol}|${row.date}`
    pool.set(key, [...(pool.get(key) ?? []), row])
  }

  const links: Array<{ portfolio_id: string; external_id: string; transaction_id: string }> = []
  const unknown: Array<{ tx: ParsedTransaction; id: string }> = []
  for (const tx of all) {
    if (known.has(tx.externalId!)) continue
    const candidates = pool.get(`${tx.type}|${tx.symbol}|${tx.date}`) ?? []
    const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out'
    // Überträge stehen in der Datei ohne Preis, gespeichert oft mit geschätztem
    const index = candidates.findIndex(c =>
      isTransfer ? quantitiesMatch(Number(c.quantity), tx.quantity) : matchesStoredTransaction(c, { type: tx.type, symbol: tx.symbol!, date: tx.date, quantity: tx.quantity, price: tx.price }))
    if (index >= 0) {
      links.push({ portfolio_id: portfolioId, external_id: tx.externalId!, transaction_id: candidates[index].id })
      candidates.splice(index, 1)
    } else {
      unknown.push({ tx, id: crypto.randomUUID() })
    }
  }

  // Hat das Depot einen Split schon verrechnet (Import einer alten CSV), entfällt
  // das Split-Paar des Berichts, und neue Buchungen davor kommen auf die neue
  // Stückzahl. Sonst zählte der Split doppelt.
  const bookings = all.map(tx => ({ type: tx.type, symbol: tx.symbol!, date: tx.date, quantity: tx.quantity, price: tx.price, notes: tx.notes }))
  const matches = matchStoredBookings(stored, bookings)
  const unknownRows = new Set(unknown.map(u => u.tx))
  all.forEach((tx, i) => {
    if (unknownRows.has(tx)) matches.delete(i)
    else if (!matches.has(i)) matches.set(i, { rows: [], openSplits: [] })
  })
  const splits = planDepotSplits(stored, bookings, matches)
  const indexOf = new Map(all.map((tx, i) => [tx, i]))
  const fresh = unknown
    .filter(({ tx }) => !splits.redundant.has(indexOf.get(tx)!))
    .map(({ tx, id }) => {
      const missing = splits.adopt.get(indexOf.get(tx)!)
      return { tx: missing ? adoptSplits(tx, missing) : tx, id }
    })
  for (const i of splits.unclear.keys()) hinweise.add(`${all[i].symbol}: Stückzahl nach einem Aktiensplit bitte prüfen.`)

  // Alles oder nichts: Scheitert ein Stapel, kommen auch die vorigen wieder raus
  for (let i = 0; i < fresh.length; i += BATCH) {
    const { error } = await db.from('portfolio_transactions').insert(fresh.slice(i, i + BATCH).map(({ tx, id }) => ({
      id, portfolio_id: portfolioId, type: tx.type, symbol: tx.symbol!, name: tx.name ? tx.name.slice(0, NAME_MAX_LENGTH) : tx.name,
      quantity: parseFloat(tx.quantity.toFixed(8)), price: parseFloat(tx.price.toFixed(4)), total_value: parseFloat(tx.totalValue.toFixed(2)),
      fee: parseFloat((tx.fee || 0).toFixed(4)), date: tx.date, notes: tx.notes,
    })))
    if (error) {
      const written = fresh.slice(0, i + BATCH).map(f => f.id)
      for (let k = 0; k < written.length; k += 100) {
        await db.from('portfolio_transactions').delete().eq('portfolio_id', portfolioId).in('id', written.slice(k, k + 100))
      }
      throw new Error(`Buchungen nicht gespeichert: ${error.message}`)
    }
  }
  const newItems = [...links, ...fresh.map(({ tx, id }) => ({ portfolio_id: portfolioId, external_id: tx.externalId!, transaction_id: id }))]
  for (let i = 0; i < newItems.length; i += 200) {
    const { error } = await db.from('broker_sync_items').upsert(newItems.slice(i, i + 200), { onConflict: 'portfolio_id,external_id' })
    // Kein Abbruch: Beim nächsten Lauf erkennt der Vergleich oben die Buchungen wieder
    if (error) hinweise.add('Einige Buchungen konnten nicht markiert werden und werden beim nächsten Mal neu verglichen.')
  }

  if (fresh.length > 0) {
    for (const warning of await splitSpinoffCosts(db, portfolioId, all)) hinweise.add(warning)
  }
  const reconcile = await reconcileHoldings(db, portfolioId, {
    entryPrice: async (symbol, date) => (await closes([{ symbol, date }]))[`${symbol}|${date}`] ?? null,
  })
  for (const e of reconcile.errors) hinweise.add(e)
  for (const symbol of reconcile.missingCosts) hinweise.add(`${symbol}: Einstand unbekannt, Position nicht angelegt.`)
  await fillIsins(db, portfolioId, symbolByIsin)

  return {
    zeilen: all.length, neu: fresh.length, wiedererkannt: links.length,
    positionenGeaendert: reconcile.created + reconcile.updated + reconcile.deleted,
    cash: await updateCash(db, portfolioId), hinweise: [...hinweise], symbolByIsin,
  }
}

async function closes(items: { symbol: string; date: string }[]): Promise<Record<string, number>> {
  try {
    return (await loadEurCloses(items)).results
  } catch {
    return {}
  }
}

/** Trading 212 nennt die Mutter eines Spin-offs nicht, detectSpinoffEvents findet sie am Zuteilungsverhältnis */
async function splitSpinoffCosts(db: SupabaseClient, portfolioId: string, rows: ParsedTransaction[]): Promise<string[]> {
  const spinoffs = rows.filter(t => t.corpActionType === 'spinoff')
  if (spinoffs.length === 0) return []
  const { data, error } = await loadAllRows<any>((from, to) =>
    db.from('portfolio_transactions').select('id, type, symbol, date, quantity, price, total_value, fee, notes').eq('portfolio_id', portfolioId)
      .in('type', [...POSITION_TX_TYPES]).order('id', { ascending: true }).range(from, to))
  if (error) return [`Spin-offs nicht aufgeteilt: ${error.message}`]
  const txs = data.map(t => ({ ...t, quantity: Number(t.quantity) || 0, price: Number(t.price) || 0, total_value: Number(t.total_value) || 0, fee: Number(t.fee) || 0 }))
  type DepotTx = (typeof txs)[number]
  const detected = detectSpinoffEvents<DepotTx>(txs)
  const warnings: string[] = []
  const handled = new Set<string>()
  for (const { symbol, date } of spinoffs) {
    const key = `${symbol}|${date}`
    if (handled.has(key)) continue
    handled.add(key)
    const childTxs = txs.filter(t => t.type === 'transfer_in' && t.symbol === symbol && t.date === date && isSpinoffChildTransfer(t))
    if (childTxs.length === 0 || childTxs.some(t => hasSpinoffBasisTaken(t.notes))) continue
    const parentSymbol = detected.find(e => e.childSymbol === symbol && e.date === date)?.parentSymbol
    if (!parentSymbol || parentSymbol === symbol) {
      warnings.push(`Spin-off ${symbol} (${date}): Mutterposition nicht eindeutig, Einstand nicht aufgeteilt.`)
      continue
    }
    const event: SpinoffEvent<DepotTx> = { portfolioId, parentSymbol, childSymbol: symbol!, date, costSplit: false, childTxs }
    const prices = await closes([{ symbol: parentSymbol, date }, { symbol: symbol!, date }])
    const plan = planSpinoffCostSplit({ event, parentTxs: txs.filter(t => t.symbol === parentSymbol), parentPrice: prices[`${parentSymbol}|${date}`] || 0, childPrice: prices[`${symbol}|${date}`] || 0 })
    if (!plan) {
      warnings.push(`Spin-off ${symbol} aus ${parentSymbol} (${date}): Kurse fehlen, Einstand nicht aufgeteilt.`)
      continue
    }
    for (const { id, ...update } of plan.updates) {
      const { error: updateError } = await db.from('portfolio_transactions').update(update).eq('id', id)
      if (updateError) {
        warnings.push(`Spin-off ${symbol}: ${updateError.message}`)
        break
      }
    }
  }
  return warnings
}

/** Die Berichte nennen die ISIN, portfolio_transactions kennt keine: am Bestand nachtragen */
async function fillIsins(db: SupabaseClient, portfolioId: string, symbolByIsin: Map<string, string>): Promise<void> {
  const { data } = await db.from('portfolio_holdings').select('id, symbol, isin').eq('portfolio_id', portfolioId)
  const isinBySymbol = new Map([...symbolByIsin].map(([isin, symbol]) => [symbol, isin]))
  for (const h of data ?? []) {
    const isin = isinBySymbol.get(h.symbol)
    if (!h.isin && isin) await db.from('portfolio_holdings').update({ isin }).eq('id', h.id)
  }
}

/** Kontostand aus allen Buchungen, wie im Import im Browser */
async function updateCash(db: SupabaseClient, portfolioId: string): Promise<number | null> {
  const { data, error } = await loadAllRows<{ type: string; total_value: number | string; fee: number | string | null; notes: string | null }>((from, to) =>
    db.from('portfolio_transactions').select('type, total_value, fee, notes').eq('portfolio_id', portfolioId).order('id', { ascending: true }).range(from, to))
  if (error || !data.some(t => t.type === 'cash_deposit' || t.type === 'cash_withdrawal')) return null
  const cash = data.reduce((sum, t) => {
    const value = Number(t.total_value) || 0
    const fee = Math.abs(Number(t.fee) || 0)
    switch (t.type) {
      case 'cash_deposit': case 'dividend': return sum + value
      case 'cash_withdrawal': return sum - value
      case 'buy': return sum - valueBeforeSpinoff(value, t.notes) - fee
      case 'sell': return sum + value - fee
      default: return sum
    }
  }, 0)
  const rounded = Math.round(cash * 100) / 100
  await db.from('portfolios').update({ cash_position: rounded, updated_at: new Date().toISOString() }).eq('id', portfolioId)
  return rounded
}
