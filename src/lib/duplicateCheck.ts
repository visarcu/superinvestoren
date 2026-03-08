// src/lib/duplicateCheck.ts — Duplikat-Erkennung für Portfolio-Transaktionen
import { supabase } from '@/lib/supabaseClient'

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
    .select('id, type, symbol, date, quantity, price, total_value')
    .eq('portfolio_id', portfolioId)
    .eq('type', type)
    .eq('symbol', symbol)
    .eq('date', date)
    .limit(20)

  if (!data || data.length === 0) return null

  // Menge und Preis mit Toleranz vergleichen
  const match = data.find((tx: any) => {
    const qtyMatch = Math.abs(tx.quantity - quantity) < 0.01
    const priceMatch = Math.abs(tx.price - price) < 0.02
    return qtyMatch && priceMatch
  })

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
  // Alle bestehenden Transaktionen des Portfolios laden
  const { data: existing } = await supabase
    .from('portfolio_transactions')
    .select('type, symbol, date, quantity, price')
    .eq('portfolio_id', portfolioId)

  if (!existing || existing.length === 0) return new Set()

  const duplicateIndices = new Set<number>()

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const isDuplicate = existing.some((ex: any) =>
      ex.type === tx.type &&
      ex.symbol === tx.symbol &&
      ex.date === tx.date &&
      Math.abs(ex.quantity - tx.quantity) < 0.01 &&
      Math.abs(ex.price - tx.price) < 0.02
    )
    if (isDuplicate) {
      duplicateIndices.add(i)
    }
  }

  return duplicateIndices
}
