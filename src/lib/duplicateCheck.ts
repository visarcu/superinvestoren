// src/lib/duplicateCheck.ts — Duplikat-Erkennung für Portfolio-Transaktionen
import { supabase } from '@/lib/supabaseClient'
import { planDepotSplits, type DepotSplitPlan } from '@/lib/depotSplits'
import { matchesStoredTransaction, matchStoredBookings, type NewBooking, type StoredBooking } from '@/lib/transactionMatch'
import { loadAllRows } from '@/lib/portfolioReconcile'

export { matchesStoredTransaction } from '@/lib/transactionMatch'

export interface DuplicateCheckParams {
  portfolioId: string
  type: string
  symbol: string
  date: string
  quantity: number
  price: number
}

export interface DuplicateMatch {
  id: string
  type: string
  symbol: string
  date: string
  quantity: number
  price: number
  total_value: number
}

/**
 * Prüft ob eine ähnliche Transaktion bereits existiert.
 * Matcht auf: portfolio_id, type, symbol, date + Toleranz bei quantity/price.
 * Gibt die erste übereinstimmende Transaktion zurück, oder null.
 */
export async function checkDuplicateTransaction(
  params: DuplicateCheckParams
): Promise<DuplicateMatch | null> {
  const { portfolioId, type, symbol, date, quantity, price } = params

  const { data } = await supabase
    .from('portfolio_transactions')
    .select('id, type, symbol, date, quantity, price, total_value, notes')
    .eq('portfolio_id', portfolioId)
    .eq('type', type)
    .eq('symbol', symbol)
    .eq('date', date)
    .limit(20)

  if (!data || data.length === 0) return null

  // Menge und Preis mit Toleranz vergleichen
  const match = data.find(tx => matchesStoredTransaction(tx, { type, symbol, date, quantity, price }))

  return match || null
}

export interface DepotComparison {
  /** Indizes der Buchungen, die das Depot schon kennt oder schon verrechnet hat */
  duplicates: Set<number>
  /** Splits, die das Depot verrechnet hat und die neuen Buchungen nicht */
  splits: DepotSplitPlan
}

async function loadStoredBookings(portfolioId: string): Promise<StoredBooking[]> {
  // Alle bestehenden Transaktionen des Portfolios laden — seitenweise: Ein
  // Depot mit 1926 Buchungen kam sonst nur mit 1000 zurück, und ein erneuter
  // Upload hätte die übrigen als neu importiert.
  const { data, error } = await loadAllRows<StoredBooking>((from, to) =>
    supabase
      .from('portfolio_transactions')
      .select('type, symbol, date, quantity, price, notes')
      .eq('portfolio_id', portfolioId)
      .order('id', { ascending: true })
      .range(from, to)
  )
  if (error) throw new Error(`Duplikatprüfung: Buchungen nicht lesbar (${error.message})`)
  return data
}

/**
 * Vergleicht die Buchungen einer Datei mit allen gespeicherten des Portfolios:
 * Welche sind schon da, und welchen fehlt ein Split, den das Depot schon
 * verrechnet hat?
 */
export async function compareWithDepot(
  portfolioId: string,
  transactions: NewBooking[]
): Promise<DepotComparison> {
  const stored = await loadStoredBookings(portfolioId)
  const matches = matchStoredBookings(stored, transactions)
  const splits = planDepotSplits(stored, transactions, matches)
  return { duplicates: new Set([...matches.keys(), ...splits.redundant.keys()]), splits }
}

/** Nur die Indizes der Buchungen, die das Depot schon kennt. */
export async function checkBulkDuplicates(
  portfolioId: string,
  transactions: NewBooking[]
): Promise<Set<number>> {
  return new Set(matchStoredBookings(await loadStoredBookings(portfolioId), transactions).keys())
}
