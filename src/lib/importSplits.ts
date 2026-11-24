// src/lib/importSplits.ts: Fehlende Splits für die Buchungen einer Datei abfragen (Browser)
//
// Welche Splits es gab und ob sie den Buchungen fehlen, entscheidet der Server an
// den Kursen (missingSplits.ts). Hier entsteht nur die Anfrage.

import { supabase } from '@/lib/supabaseClient'
import { appliedSplits } from '@/lib/splitAdjustment'
import { hasMarketPrice } from '@/lib/depotSplits'
import { SPLIT_TYPES, type NewBooking } from '@/lib/transactionMatch'
import type { SplitRequest, SplitVerdict } from '@/lib/marketData/missingSplits'

export interface ImportSplits {
  splits: SplitVerdict[]
  /** Nicht alle Papiere ließen sich prüfen */
  incomplete: boolean
}

const MAX_TRADES = 40
const MAX_SYMBOLS = 250

/** Je Papier höchstens 40 Kurse, über den Zeitraum verteilt, auf der Stückzahl der Datei. */
function requestItems(transactions: NewBooking[]): SplitRequest[] {
  const bySymbol = new Map<string, Required<SplitRequest>>()
  const today = new Date().toISOString().slice(0, 10)
  for (const tx of transactions) {
    if (!SPLIT_TYPES.has(tx.type) || tx.date >= today) continue
    const item = bySymbol.get(tx.symbol) ?? { symbol: tx.symbol, trades: [], from: tx.date }
    bySymbol.set(tx.symbol, item)
    if (tx.date < item.from) item.from = tx.date
    if (!hasMarketPrice(tx)) continue
    const factor = appliedSplits(tx.notes).reduce((product, split) => product * split.ratio, 1)
    item.trades.push({ date: tx.date, price: tx.price * factor })
  }
  return [...bySymbol.values()].map(({ symbol, trades, from }) => {
    trades.sort((a, b) => a.date.localeCompare(b.date))
    const every = Math.max(1, trades.length / MAX_TRADES)
    return { symbol, from, trades: trades.filter((_, i) => Math.floor(i / every) !== Math.floor((i - 1) / every)) }
  })
}

// Vorschau und Import fragen dasselbe, der Import soll nicht noch einmal warten
const answers = new Map<string, ImportSplits>()

/** Bei einer Störung leer und `incomplete`: Der Import läuft dann ohne Umrechnung. */
export async function loadImportSplits(transactions: NewBooking[]): Promise<ImportSplits> {
  const items = requestItems(transactions)
  if (items.length === 0) return { splits: [], incomplete: false }
  const body = JSON.stringify({ items: items.slice(0, MAX_SYMBOLS) })
  const known = answers.get(body)
  if (known) return known

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/portfolio/missing-splits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body,
      signal: AbortSignal.timeout(45_000),
    })
    if (!response.ok) throw new Error(`Status ${response.status}`)
    const { splits, incomplete } = (await response.json()) as ImportSplits
    const result = { splits: splits ?? [], incomplete: !!incomplete || items.length > MAX_SYMBOLS }
    if (!result.incomplete) answers.set(body, result)
    return result
  } catch (error) {
    console.error('Split-Prüfung fehlgeschlagen:', error)
    return { splits: [], incomplete: true }
  }
}
