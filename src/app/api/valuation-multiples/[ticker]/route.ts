// src/app/api/valuation-multiples/[ticker]/route.ts
// EV-Kennzahlen einer Aktie, heute und im Fünfjahresvergleich. Dieselbe Rechnung
// wie in Finclue AI (lib/ai/data/valuation). Öffentliche Marktdaten wie
// /api/quotes, keine Nutzerdaten.

import { NextResponse } from 'next/server'
import { normalizeSymbol, SYMBOL_PATTERN } from '@/lib/ai/data/fmp'
import { getValuationSeriesSet, hasOutliers, seriesStats, type ValuationSeries } from '@/lib/ai/data/valuation'
import type { EvMultiple, EvMultiples } from '@/hooks/useValuationMultiples'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const DAY = 86_400_000
/** Ein Jahr Handelstage, darunter ist ein Vergleichswert nicht belastbar */
const MIN_DAYS = 250

function multiple(series: ValuationSeries | undefined, today: string): EvMultiple {
  const stats = series ? seriesStats(series.points) : null
  if (!stats) return { current: null, compare: null, basis: null }
  // Letzter Wert zu alt: seither Verlust, es gibt derzeit keinen sinnvollen Wert
  const fresh = Date.parse(today) - Date.parse(stats.lastDate) <= 10 * DAY
  const median = hasOutliers(stats)
  const enough = stats.count >= MIN_DAYS
  return {
    current: fresh ? stats.last : null,
    compare: enough ? (median ? stats.median : stats.mean) : null,
    basis: enough ? (median ? 'median' : 'mittel') : null,
  }
}

export async function GET(_request: Request, { params }: { params: { ticker: string } }) {
  const symbol = normalizeSymbol(params.ticker)
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json({ error: 'Ungültiges Kürzel' }, { status: 400 })
  }
  const today = new Date().toISOString().slice(0, 10)
  const from = `${Number(today.slice(0, 4)) - 5}${today.slice(4)}`
  const set = await getValuationSeriesSet(symbol, ['ev_umsatz', 'ev_ebitda', 'ev_ebit'], from, today).catch(() => null)
  if (!set) {
    return NextResponse.json({ error: 'Keine Daten' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  const body: EvMultiples = {
    lender: set.ev_umsatz?.lender ?? false,
    evSales: multiple(set.ev_umsatz, today),
    evEbitda: multiple(set.ev_ebitda, today),
    evEbit: multiple(set.ev_ebit, today),
  }
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
