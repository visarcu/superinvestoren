// src/app/api/broker-sync/route.ts
// Broker-Sync (Beta): GET = Status, POST = Depot verbinden (WebForm-URL).
//
// Beta-Gate über BROKER_SYNC_BETA_ALLOWLIST (kommaseparierte E-Mails) —
// gleiches Muster wie die Fundamental-Alerts. Nicht gelistete Nutzer
// bekommen 403; das UI blendet die Karte dann aus.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createFinapiUser,
  createConnectWebForm,
  getUserToken,
  listConnections,
  FINAPI_BANKS,
} from '@/lib/finapi'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function authorize(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) return { error: NextResponse.json({ error: 'Not configured' }, { status: 500 }) }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
  }

  const allowlist = (process.env.BROKER_SYNC_BETA_ALLOWLIST || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  if (!allowlist.includes((user.email || '').toLowerCase())) {
    return { error: NextResponse.json({ error: 'Beta not enabled' }, { status: 403 }) }
  }

  return { supabase, user }
}

/** Verbindungs-Datensatz holen oder finAPI-User frisch anlegen */
async function ensureConnectionRow(supabase: ReturnType<typeof getSupabase> & {}, userId: string) {
  const { data: existing } = await supabase
    .from('broker_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) return existing

  const { finapiUserId, finapiUserPassword } = await createFinapiUser()
  const { data: inserted, error } = await supabase
    .from('broker_connections')
    .insert({ user_id: userId, finapi_user_id: finapiUserId, finapi_user_password: finapiUserPassword })
    .select('*')
    .single()
  if (error) throw error
  return inserted
}

// ===== GET: Status (verbundene Bank + verfügbare Banken) =====
export async function GET(request: NextRequest) {
  const auth = await authorize(request)
  if ('error' in auth) return auth.error

  try {
    const { data: row } = await auth.supabase
      .from('broker_connections')
      .select('connection_id, bank_name, status, last_synced_at, finapi_user_id, finapi_user_password')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    let connections: { id: number; bank: string | null; updateStatus: string }[] = []
    if (row) {
      try {
        const token = await getUserToken(row.finapi_user_id, row.finapi_user_password)
        connections = (await listConnections(token)).map(c => ({
          id: c.id,
          bank: c.bank?.name ?? c.name,
          updateStatus: c.updateStatus,
        }))
      } catch {
        // finAPI nicht erreichbar → Status aus der DB reicht
      }
    }

    return NextResponse.json({
      enabled: true,
      banks: FINAPI_BANKS,
      lastSyncedAt: row?.last_synced_at ?? null,
      connections,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('broker-sync status error:', err)
    return NextResponse.json({ error: 'Status failed' }, { status: 500 })
  }
}

// ===== POST: Verbindung starten → WebForm-URL =====
export async function POST(request: NextRequest) {
  const auth = await authorize(request)
  if ('error' in auth) return auth.error

  let body: { bankId?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const bankId = Number(body.bankId)
  if (!FINAPI_BANKS.some(b => b.id === bankId)) {
    return NextResponse.json({ error: 'Unbekannte Bank' }, { status: 400 })
  }

  try {
    const row = await ensureConnectionRow(auth.supabase, auth.user.id)
    const token = await getUserToken(row.finapi_user_id, row.finapi_user_password)
    const webForm = await createConnectWebForm(token, bankId)

    await auth.supabase
      .from('broker_connections')
      .update({ status: 'webform_created', bank_name: FINAPI_BANKS.find(b => b.id === bankId)?.name, updated_at: new Date().toISOString() })
      .eq('user_id', auth.user.id)

    return NextResponse.json({ webFormUrl: webForm.url }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('broker-sync connect error:', err)
    return NextResponse.json({ error: 'Verbindung konnte nicht gestartet werden' }, { status: 500 })
  }
}
