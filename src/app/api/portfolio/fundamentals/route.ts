// src/app/api/portfolio/fundamentals/route.ts
// POST: Fundamentaldaten eines Depots, gewichtet nach Positionswert.
//
// Datenquelle ausschliesslich getFinancialData() — also eigene SEC-XBRL-Daten
// bzw. eigene DAX-Daten. Kein Vendor-Aufruf in dieser Route.
// Die Kurse kommen aus dem Request, weil das Frontend sie ohnehin schon geladen hat.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFinancialData } from '@/lib/sec/secDataStore'
import {
  computePositionFundamentals,
  aggregatePortfolioFundamentals,
  type PositionInput,
  type PositionFundamentals,
  type MissingPosition,
} from '@/lib/portfolio/fundamentals'
import { withSources } from '@/lib/dev/withSources'

export const runtime = 'nodejs'
export const maxDuration = 60

/** SEC mag keine Aufruf-Lawinen — mehr als das parallel bringt nichts. */
const CONCURRENCY = 5
const MAX_POSITIONS = 200

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Positionen aus dem Request-Body validieren — nichts Ungeprüftes weiterreichen. */
function parsePositions(raw: unknown): PositionInput[] | null {
  if (!Array.isArray(raw)) return null

  const positions: PositionInput[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null
    const { symbol, name, value, price } = entry as Record<string, unknown>
    if (typeof symbol !== 'string' || symbol.length === 0 || symbol.length > 20) return null
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
    positions.push({
      symbol: symbol.toUpperCase(),
      name: typeof name === 'string' ? name : symbol,
      value,
      price: typeof price === 'number' && Number.isFinite(price) ? price : 0,
    })
  }
  return positions
}

/** Verarbeitet die Symbole in Blöcken, statt alle gleichzeitig loszuschicken. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    results.push(...(await Promise.all(batch.map(fn))))
  }
  return results
}

async function handler(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const positions = parsePositions((body as { positions?: unknown })?.positions)
  if (!positions) {
    return NextResponse.json({ error: 'Invalid positions' }, { status: 400 })
  }
  if (positions.length > MAX_POSITIONS) {
    return NextResponse.json({ error: 'Too many positions' }, { status: 400 })
  }
  if (positions.length === 0) {
    return NextResponse.json(
      aggregatePortfolioFundamentals([], []),
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Gleiches Symbol kann in mehreren Depots liegen — Werte zusammenfassen,
  // damit die Fundamentaldaten nur einmal geholt werden.
  const bySymbol = new Map<string, PositionInput>()
  for (const p of positions) {
    const existing = bySymbol.get(p.symbol)
    if (existing) {
      existing.value += p.value
      if (existing.price === 0) existing.price = p.price
    } else {
      bySymbol.set(p.symbol, { ...p })
    }
  }

  const covered: PositionFundamentals[] = []
  const missing: MissingPosition[] = []

  await mapWithConcurrency(Array.from(bySymbol.values()), CONCURRENCY, async position => {
    if (position.price <= 0) {
      missing.push({ ...position, reason: 'kein-kurs' })
      return
    }

    try {
      const financials = await getFinancialData(position.symbol, { years: 5, period: 'annual' })

      if (financials.source === 'no-data' || financials.periods.length === 0) {
        missing.push({ ...position, reason: 'keine-fundamentaldaten' })
        return
      }

      covered.push(
        computePositionFundamentals(position, financials.periods, financials.source),
      )
    } catch {
      // Einzelne Ticker ohne CIK oder mit Parse-Fehler duerfen das Depot nicht kippen.
      missing.push({ ...position, reason: 'keine-fundamentaldaten' })
    }
  })

  return NextResponse.json(aggregatePortfolioFundamentals(covered, missing), {
    // Nutzerspezifisch — nie in einen geteilten Cache.
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export const POST = withSources('portfolio/fundamentals', handler)
