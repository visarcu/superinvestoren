// src/app/api/portfolio/parse-trade/route.ts
// POST: Freitext ("hab für 500 Euro MSCI World gekauft") → Transaktions-
// Vorschlag inkl. Instrument-Kandidaten. Gespeichert wird NICHTS — das
// macht der Client erst nach expliziter Bestätigung des Nutzers.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseTradeEntry, resolveInstrument } from '@/lib/tradeParser'

export const runtime = 'nodejs'

const rateLimiter = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30
const WINDOW_MS = 10 * 60 * 1000

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
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

  const now = Date.now()
  const limit = rateLimiter.get(user.id)
  if (limit && now < limit.resetTime && limit.count >= RATE_LIMIT) {
    return NextResponse.json({ ok: false, reason: 'Zu viele Anfragen — kurz warten' }, { status: 429 })
  }
  if (!limit || now > (limit?.resetTime || 0)) {
    rateLimiter.set(user.id, { count: 1, resetTime: now + WINDOW_MS })
  } else {
    limit.count++
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, holdings } = body as { text?: unknown; holdings?: unknown }
  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  // Depot-Bestände für die Kandidaten-Priorisierung (nur Symbol+Name nötig)
  const userHoldings = Array.isArray(holdings)
    ? holdings
        .filter((h): h is { symbol: string; name: string } =>
          typeof h === 'object' && h !== null &&
          typeof (h as any).symbol === 'string' && typeof (h as any).name === 'string')
        .slice(0, 200)
    : []

  const parsed = await parseTradeEntry(text)
  if (!parsed.ok) {
    return NextResponse.json(parsed, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const candidates = resolveInstrument(parsed.query, userHoldings)
  return NextResponse.json(
    { ...parsed, candidates },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
