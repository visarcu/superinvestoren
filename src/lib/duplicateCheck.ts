// src/lib/duplicateCheck.ts — Duplikat-Erkennung für Portfolio-Transaktionen
import { supabase } from '@/lib/supabaseClient'
import { hasSpinoffBasisTaken, valueBeforeSpinoff } from '@/lib/spinoffAdjustment'

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
 * Passt eine gespeicherte Transaktion preislich zu einer aus der Datei?
 *
 * Die Spin-off-Kostenaufteilung schreibt gespeicherte Preise nachträglich um
 * (siehe spinoffAdjustment.ts), die Broker-Datei enthält beim Re-Import aber
 * weiter den Originalpreis. Gegen den umgeschriebenen Preis verglichen galt
 * derselbe Kauf als neu: Bei einem Freedom24-Depot standen dadurch Honeywell,
 * die Aerospace-Abspaltung, S&P Global und Mobility nach dem zweiten Import
 * doppelt im Bestand — und die doppelten Käufe zogen den Cash ins Minus.
 */
function storedPriceMatches(stored: { price: unknown; notes?: string | null }, price: number): boolean {
  const storedPrice = Number(stored.price) || 0
  if (pricesMatch(storedPrice, price)) return true
  // Tochter-Einbuchung: Der Marktwert aus der Datei wurde durch einen Anteil an
  // der Mutter-Kostenbasis ersetzt und ist nicht rekonstruierbar. Gleiches
  // Symbol, Datum und Stückzahl beschreiben dann dieselbe Einbuchung.
  if (hasSpinoffBasisTaken(stored.notes)) return true
  return pricesMatch(valueBeforeSpinoff(storedPrice, stored.notes), price)
}

/** Beschreibt die gespeicherte Zeile dieselbe Transaktion wie die neue? */
export function matchesStoredTransaction(
  stored: { type: string; symbol: string; date: string; quantity: unknown; price: unknown; notes?: string | null },
  tx: { type: string; symbol: string; date: string; quantity: number; price: number }
): boolean {
  return (
    stored.type === tx.type &&
    stored.symbol === tx.symbol &&
    stored.date === tx.date &&
    quantitiesMatch(Number(stored.quantity), tx.quantity) &&
    storedPriceMatches(stored, tx.price)
  )
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
  // Alle bestehenden Transaktionen des Portfolios laden
  const { data: existing } = await supabase
    .from('portfolio_transactions')
    .select('type, symbol, date, quantity, price, notes')
    .eq('portfolio_id', portfolioId)

  if (!existing || existing.length === 0) return new Set()

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
