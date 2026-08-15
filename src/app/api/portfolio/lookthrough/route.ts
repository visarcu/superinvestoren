// src/app/api/portfolio/lookthrough/route.ts
// POST: Look-Through-Analyse eines Depots — ETFs werden in ihre
// Einzelaktien-Bestandteile zerlegt (effektives Portfolio, Regionen,
// Sektoren, ETF-Überschneidungen).
//
// Die Positionswerte (EUR) kommen aus dem Request, weil das Frontend die
// Live-Bewertung ohnehin schon hat. FMP-Daten werden serverseitig über den
// Next.js Data Cache wiederverwendet (Holdings 24h, Profile 7 Tage).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeLookthrough, type LookthroughInput } from '@/lib/portfolio/lookthrough'

export const runtime = 'nodejs'
export const maxDuration = 60

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
function parsePositions(raw: unknown): LookthroughInput[] | null {
  if (!Array.isArray(raw)) return null

  const positions: LookthroughInput[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null
    const { symbol, name, isin, value } = entry as Record<string, unknown>
    if (typeof symbol !== 'string' || symbol.length === 0 || symbol.length > 20) return null
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
    if (isin !== undefined && isin !== null && (typeof isin !== 'string' || isin.length > 12)) return null
    positions.push({
      symbol: symbol.toUpperCase(),
      name: typeof name === 'string' ? name : symbol,
      isin: typeof isin === 'string' && isin.length === 12 ? isin.toUpperCase() : null,
      value,
    })
  }
  return positions
}

export async function POST(request: NextRequest) {
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

  try {
    const result = await computeLookthrough(positions)
    return NextResponse.json(result, {
      // Nutzerspezifisch — nie in einen geteilten Cache.
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (err) {
    console.error('Lookthrough error:', err)
    return NextResponse.json({ error: 'Lookthrough computation failed' }, { status: 500 })
  }
}
