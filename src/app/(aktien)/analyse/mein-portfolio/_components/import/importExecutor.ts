// Import-Execute-Logik:
// Aus selektierten NormalizedTransactions → Holdings rekonstruieren + Transactions inserten.
//
// Strategie (analog Production-Wizard):
//   1. Alle Transactions in portfolio_transactions inserten
//   2. Holdings aus den kumulierten Buy/Sell/Transfer-Transaktionen neu aufbauen
//      → average-cost + quantity pro Symbol
//   3. Bei Cash-Transaktionen zusätzlich portfolios.cash_position updaten

import { supabase } from '@/lib/supabaseClient'
import type { NormalizedTransaction } from './types'

export interface ImportResult {
  insertedTransactions: number
  upsertedHoldings: number
  cashUpdated: number
  errors: string[]
}

interface HoldingAcc {
  symbol: string
  name: string
  quantity: number
  totalCost: number
  firstBuyDate: string
}

export async function executeImport(
  portfolioId: string,
  transactions: NormalizedTransaction[]
): Promise<ImportResult> {
  const result: ImportResult = {
    insertedTransactions: 0,
    upsertedHoldings: 0,
    cashUpdated: 0,
    errors: [],
  }

  if (transactions.length === 0) return result

  // 1) Transactions in DB inserten
  const txRows = transactions.map(t => {
    const symbol = (t.resolvedTicker || t.symbol || '').toUpperCase()
    return {
      portfolio_id: portfolioId,
      type: t.type,
      symbol,
      name: t.name,
      quantity: t.quantity,
      price: t.price,
      total_value: t.quantity * t.price,
      date: t.date,
      notes: t.notes || null,
    }
  })

  // Chunk-Insert (Supabase-Limit: 1000 Zeilen/Insert, wir bleiben bei 500)
  const CHUNK = 500
  for (let i = 0; i < txRows.length; i += CHUNK) {
    const chunk = txRows.slice(i, i + CHUNK)
    const { error } = await supabase.from('portfolio_transactions').insert(chunk)
    if (error) {
      result.errors.push(`Transaction-Insert: ${error.message}`)
      return result
    }
    result.insertedTransactions += chunk.length
  }

  // 2) Cash-Position aktualisieren
  const cashDelta = transactions.reduce((sum, t) => {
    const v = t.quantity * t.price
    if (t.type === 'cash_deposit') return sum + v
    if (t.type === 'cash_withdrawal') return sum - v
    return sum
  }, 0)

  if (cashDelta !== 0) {
    const { data: pf } = await supabase
      .from('portfolios')
      .select('cash_position')
      .eq('id', portfolioId)
      .maybeSingle()
    const newCash = (pf?.cash_position ?? 0) + cashDelta
    const { error } = await supabase
      .from('portfolios')
      .update({ cash_position: newCash })
      .eq('id', portfolioId)
    if (error) result.errors.push(`Cash-Update: ${error.message}`)
    else result.cashUpdated = 1
  }

  // 3) Holdings rekonstruieren — aus ALLEN Transaktionen des Portfolios (nicht nur imported),
  //    weil wir sonst bei Teil-Importen falsche Avg-Cost berechnen.
  const { data: allTxs } = await supabase
    .from('portfolio_transactions')
    .select('type, symbol, name, quantity, price, date')
    .eq('portfolio_id', portfolioId)
    .in('type', ['buy', 'sell', 'transfer_in', 'transfer_out'])
    .order('date', { ascending: true })

  if (!allTxs) return result

  const accBySymbol = new Map<string, HoldingAcc>()
  for (const tx of allTxs) {
    if (!tx.symbol) continue
    const sym = tx.symbol.toUpperCase()
    let acc = accBySymbol.get(sym)
    if (!acc) {
      acc = { symbol: sym, name: tx.name ?? sym, quantity: 0, totalCost: 0, firstBuyDate: tx.date }
      accBySymbol.set(sym, acc)
    }
    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      acc.quantity += tx.quantity
      acc.totalCost += tx.quantity * tx.price
      if (tx.date < acc.firstBuyDate) acc.firstBuyDate = tx.date
      if (tx.name) acc.name = tx.name
    } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
      if (acc.quantity > 0) {
        const avgCost = acc.totalCost / acc.quantity
        acc.quantity -= tx.quantity
        acc.totalCost -= tx.quantity * avgCost
        if (acc.quantity <= 0.0001) {
          acc.quantity = 0
          acc.totalCost = 0
        }
      }
    }
  }

  // 4) Bestehende Holdings für dieses Portfolio laden und diffen
  const { data: existingHoldings } = await supabase
    .from('portfolio_holdings')
    .select('id, symbol')
    .eq('portfolio_id', portfolioId)

  const existingBySymbol = new Map<string, string>()
  for (const h of existingHoldings ?? []) {
    existingBySymbol.set(h.symbol.toUpperCase(), h.id)
  }

  // Upsert / delete je nach rekonstruierter Position
  for (const [sym, acc] of accBySymbol) {
    const id = existingBySymbol.get(sym)
    if (acc.quantity <= 0) {
      // Vollverkauf — bestehendes Holding löschen
      if (id) {
        await supabase.from('portfolio_holdings').delete().eq('id', id)
      }
      continue
    }

    const avgPrice = acc.totalCost / acc.quantity
    if (id) {
      await supabase
        .from('portfolio_holdings')
        .update({
          quantity: acc.quantity,
          purchase_price: avgPrice,
          name: acc.name,
          purchase_date: acc.firstBuyDate,
        })
        .eq('id', id)
    } else {
      await supabase.from('portfolio_holdings').insert({
        portfolio_id: portfolioId,
        symbol: sym,
        name: acc.name,
        quantity: acc.quantity,
        purchase_price: avgPrice,
        purchase_date: acc.firstBuyDate,
        purchase_currency: 'EUR',
      })
    }
    result.upsertedHoldings++
  }

  return result
}
