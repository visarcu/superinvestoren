// src/lib/duplicateCheck.ts — Duplikat-Erkennung für Portfolio-Transaktionen
import { supabase } from '@/lib/supabaseClient'
import { matchesStoredTransaction, quantitiesMatch, storedPriceMatches } from '@/lib/transactionMatch'
import { loadAllRows } from '@/lib/portfolioReconcile'

export { matchesStoredTransaction, pricesMatch, quantitiesMatch } from '@/lib/transactionMatch'

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
  const match = data.find((tx: any) =>
    quantitiesMatch(Number(tx.quantity), quantity) && storedPriceMatches(tx, price)
  )

  return match || null
}

/**
 * Bulk-Duplikatprüfung für CSV-Import.
 * Lädt alle bestehenden Transaktionen des Portfolios und prüft gegen die Import-Liste.
 * Gibt die Indizes der Duplikate zurück.
 */
export async function checkBulkDuplicates(
  portfolioId: string,
  transactions: Array<{
    type: string
    symbol: string
    date: string
    quantity: number
    price: number
  }>
): Promise<Set<number>> {
  // Alle bestehenden Transaktionen des Portfolios laden — seitenweise: Ein
  // Depot mit 1926 Buchungen kam sonst nur mit 1000 zurück, und ein erneuter
  // Upload hätte die übrigen als neu importiert.
  const { data: existing, error } = await loadAllRows((from, to) =>
    supabase
      .from('portfolio_transactions')
      .select('type, symbol, date, quantity, price, notes')
      .eq('portfolio_id', portfolioId)
      .order('id', { ascending: true })
      .range(from, to)
  )
  if (error) throw new Error(`Duplikatprüfung: Buchungen nicht lesbar (${error.message})`)

  if (existing.length === 0) return new Set()

  const duplicateIndices = new Set<number>()

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const isDuplicate = existing.some((ex: any) => matchesStoredTransaction(ex, tx))
    if (isDuplicate) {
      duplicateIndices.add(i)
    }
  }

  return duplicateIndices
}
