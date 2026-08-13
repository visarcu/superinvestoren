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
  const match = data.find((tx: any) =>
    quantitiesMatch(tx.quantity, quantity) && pricesMatch(tx.price, price)
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
      quantitiesMatch(ex.quantity, tx.quantity) &&
      pricesMatch(ex.price, tx.price)
    )
    if (isDuplicate) {
      duplicateIndices.add(i)
    }
  }

  return duplicateIndices
}
