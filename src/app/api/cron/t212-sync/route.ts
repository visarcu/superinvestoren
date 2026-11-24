// src/app/api/cron/t212-sync/route.ts
// Mehrmals täglich: verbundene Trading-212-Depots aktualisieren, am längsten
// nicht aktualisierte zuerst. Was nicht mehr in die Zeit passt, kommt beim
// nächsten Lauf dran.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isT212Tester } from '@/lib/t212Access'
import { runT212Sync, t212ErrorMessage } from '@/lib/t212Sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** So lange braucht ein Abgleich, sonst gar nicht erst anfangen */
const NEEDED_MS = 130_000

export async function GET(request: Request) {
  const started = Date.now()
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows, error } = await supabaseAdmin
    .from('broker_t212_connections')
    .select('user_id')
    .not('portfolio_id', 'is', null)
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(50)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const deadline = started + 285_000
  const result = { aktualisiert: 0, neu: 0, fehler: [] as string[], offen: 0 }
  for (const { user_id } of rows ?? []) {
    if (Date.now() + NEEDED_MS > deadline) {
      result.offen++
      continue
    }
    const { data } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (!isT212Tester(data.user?.email)) continue
    try {
      const check = await runT212Sync(supabaseAdmin, user_id, deadline)
      if (check) {
        result.aktualisiert++
        result.neu += check.neu
      }
    } catch (err) {
      console.error('[t212] Abgleich:', err instanceof Error ? err.message : err)
      result.fehler.push(t212ErrorMessage(err))
    }
  }
  return NextResponse.json({ ok: true, ...result })
}
