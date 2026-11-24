// /api/portfolio/missing-splits
// Welche Aktiensplits fehlen den Buchungen einer Broker-Datei? Der Import fragt
// hier für Papiere mit neuen Buchungen nach (src/lib/marketData/missingSplits.ts).
//
// Request:
//   POST { items: [{ symbol: 'L8I7.DE', from: '2025-04-16', trades: [{ date: '2025-07-15', price: 1260 }] }] }
// Response:
//   { splits: [{ symbol: 'L8I7.DE', date: '2026-07-09', ratio: 200, missing: true }], incomplete: false }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findMissingSplits, type TradeSample } from '@/lib/marketData/missingSplits'

export const maxDuration = 60

// Jedes Papier kostet mindestens einen Abruf beim Kursanbieter
const MAX_ITEMS = 250
const MAX_TRADES = 60

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

function isTrade(value: unknown): value is TradeSample {
  const trade = value as TradeSample | null
  return (
    isDate(trade?.date) &&
    typeof trade.price === 'number' && Number.isFinite(trade.price) && trade.price > 0
  )
}

export async function POST(request: Request) {
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

  try {
    const { items } = (await request.json()) as { items?: { symbol?: unknown; trades?: unknown; from?: unknown }[] }
    if (!Array.isArray(items) || items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Maximal ${MAX_ITEMS} Papiere pro Anfrage` }, { status: 400 })
    }
    const valid = items.flatMap(({ symbol, trades, from }) =>
      typeof symbol === 'string' && /^[A-Z0-9.^=-]{1,12}$/i.test(symbol) && Array.isArray(trades)
        ? [{ symbol, trades: trades.filter(isTrade).slice(0, MAX_TRADES), from: isDate(from) ? from : undefined }]
        : []
    )
    return NextResponse.json(await findMissingSplits(valid))
  } catch (error) {
    console.error('missing-splits error:', error)
    return NextResponse.json({ error: 'Splits konnten nicht geprüft werden' }, { status: 500 })
  }
}
