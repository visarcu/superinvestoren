// src/app/api/broker-sync/t212/sync/route.ts
// Abgleich mit Trading 212 anstoßen. Dauert ein bis zwei Minuten, die Oberfläche
// fragt den Stand währenddessen über GET /api/broker-sync/t212 ab.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authorizeT212 } from '@/lib/t212Access'
import { runT212Sync, t212ErrorMessage } from '@/lib/t212Sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const started = Date.now()
  const auth = await authorizeT212(request)
  if ('error' in auth) return auth.error
  const { data: row } = await supabaseAdmin.from('broker_t212_connections').select('user_id').eq('user_id', auth.user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Trading 212 ist nicht verbunden.' }, { status: 409 })
  try {
    const check = await runT212Sync(supabaseAdmin, auth.user.id, started + 285_000)
    return NextResponse.json(check ? { fertig: true, pruefung: check } : { fertig: false })
  } catch (err) {
    console.error('[t212] Abgleich:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: t212ErrorMessage(err) }, { status: 502 })
  }
}
