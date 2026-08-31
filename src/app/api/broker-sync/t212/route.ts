// src/app/api/broker-sync/t212/route.ts
// Trading-212-Direktanbindung (Beta): GET = Status, POST = Key-Paar
// validieren + verschlüsselt speichern, DELETE = Verbindung löschen.
//
// Gleiches Beta-Gate wie der finAPI-Sync (BROKER_SYNC_BETA_ALLOWLIST).
// Der Nutzer erzeugt Key+Secret selbst in der T212-App und sollte dabei
// NUR Lese-Berechtigungen aktivieren — Orders ruft Finclue nie auf.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAccountSummary, T212ApiError } from '@/lib/trading212'
import { encryptSecret } from '@/lib/brokerSecrets'

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

// ===== GET: Verbindungs-Status =====
export async function GET(request: NextRequest) {
  const auth = await authorize(request)
  if ('error' in auth) return auth.error

  const { data: row } = await auth.supabase
    .from('broker_t212_connections')
    .select('account_id, currency, status, last_synced_at, created_at')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  return NextResponse.json(
    {
      enabled: true,
      connected: !!row,
      accountId: row?.account_id ?? null,
      currency: row?.currency ?? null,
      status: row?.status ?? null,
      lastSyncedAt: row?.last_synced_at ?? null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}

// ===== POST: Key-Paar validieren und verschlüsselt speichern =====
export async function POST(request: NextRequest) {
  const auth = await authorize(request)
  if ('error' in auth) return auth.error

  let body: { apiKey?: string; apiSecret?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const apiKey = (body.apiKey || '').trim()
  const apiSecret = (body.apiSecret || '').trim()
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'API-Key und API-Secret erforderlich' }, { status: 400 })
  }

  try {
    // Validierung gegen die T212-API — schlägt der Call fehl, wird nichts gespeichert
    const summary = await getAccountSummary(apiKey, apiSecret)

    const { error: upsertError } = await auth.supabase
      .from('broker_t212_connections')
      .upsert(
        {
          user_id: auth.user.id,
          api_key_enc: encryptSecret(apiKey),
          api_secret_enc: encryptSecret(apiSecret),
          account_id: summary.id ?? null,
          currency: summary.currency ?? null,
          status: 'connected',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
    if (upsertError) throw upsertError

    return NextResponse.json({
      connected: true,
      accountId: summary.id ?? null,
      currency: summary.currency ?? null,
    })
  } catch (err) {
    if (err instanceof T212ApiError && (err.status === 401 || err.status === 403)) {
      return NextResponse.json(
        { error: 'Trading 212 lehnt den Key ab — Key/Secret prüfen (und ggf. IP-Beschränkung des Keys)' },
        { status: 422 },
      )
    }
    if (err instanceof T212ApiError && err.status === 429) {
      return NextResponse.json({ error: 'Trading-212-Rate-Limit erreicht — kurz warten und nochmal versuchen' }, { status: 429 })
    }
    console.error('t212 connect error:', err)
    return NextResponse.json({ error: 'Verbindung fehlgeschlagen' }, { status: 500 })
  }
}

// ===== DELETE: Verbindung (inkl. gespeicherter Keys) löschen =====
export async function DELETE(request: NextRequest) {
  const auth = await authorize(request)
  if ('error' in auth) return auth.error

  const { error } = await auth.supabase
    .from('broker_t212_connections')
    .delete()
    .eq('user_id', auth.user.id)
  if (error) {
    console.error('t212 disconnect error:', error)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 })
  }
  return NextResponse.json({ connected: false })
}
