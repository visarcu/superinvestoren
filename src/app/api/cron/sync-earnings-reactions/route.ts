// Finclue Cron – Kursreaktion auf Quartalszahlen
//
// GET /api/cron/sync-earnings-reactions
//   from=YYYY-MM-DD   Default: heute − 10 Tage
//   to=YYYY-MM-DD     Default: heute
//
// Berechnet für vergangene Termine die Kursveränderung am Reaktionstag und
// daraus die typische Bewegung (auch für anstehende Termine). Logik in
// src/lib/earningsReaction.ts. Läuft nach dem Ist-Zahlen-Sync, weil die
// Ist-Zahlen mitentscheiden, welcher Termin eines Quartals der echte ist.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, isIsoDate, todayUtc } from '@/lib/earningsData'
import { syncEarningsReactions } from '@/lib/earningsReaction'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET
const DEFAULT_LOOKBACK_DAYS = 10
// Puffer zu maxDuration: offene Ticker bleiben für den nächsten Lauf
const TIME_BUDGET_MS = 240_000

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FMP_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Nicht konfiguriert' }, { status: 500 })
  }

  const today = todayUtc()
  const sp = request.nextUrl.searchParams
  const fromParam = sp.get('from')
  const toParam = sp.get('to')
  if ((fromParam && !isIsoDate(fromParam)) || (toParam && !isIsoDate(toParam))) {
    return NextResponse.json({ error: 'from/to müssen YYYY-MM-DD sein' }, { status: 400 })
  }
  const from = fromParam ?? addDays(today, -DEFAULT_LOOKBACK_DAYS)
  const to = toParam ?? today
  if (from > to) {
    return NextResponse.json({ error: 'from liegt nach to' }, { status: 400 })
  }

  const startedAt = Date.now()
  try {
    const result = await syncEarningsReactions(createClient(supabaseUrl, supabaseKey), apiKey, {
      from,
      to,
      deadline: startedAt + TIME_BUDGET_MS,
    })
    return NextResponse.json({ ok: true, from, to, ...result, elapsedMs: Date.now() - startedAt })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), elapsedMs: Date.now() - startedAt },
      { status: 500 }
    )
  }
}
