// src/app/api/earnings-quality/[ticker]/route.ts
// Öffentliche Marktdaten wie /api/quotes: Sondereinfluss im Gewinn der letzten
// zwölf Monate, für die KGV-Zeilen der Aktienseiten. Keine Nutzerdaten.

import { NextResponse } from 'next/server'
import { normalizeSymbol, SYMBOL_PATTERN } from '@/lib/ai/data/fmp'
import { loadEarningsQuality } from '@/lib/earningsQuality'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { ticker: string } }) {
  const symbol = normalizeSymbol(params.ticker)
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json({ error: 'Ungültiges Kürzel' }, { status: 400 })
  }
  const quality = await loadEarningsQuality(symbol)
  if (quality === undefined) {
    return NextResponse.json({ error: 'Keine Daten' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json(
    { quality },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  )
}
