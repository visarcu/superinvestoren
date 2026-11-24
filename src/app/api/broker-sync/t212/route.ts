// src/app/api/broker-sync/t212/route.ts
// Trading-212-Direktanbindung (Beta): GET = Stand, POST = Schlüssel prüfen und
// verschlüsselt speichern, DELETE = Verbindung löschen (Buchungen bleiben).
//
// Der Nutzer erzeugt Schlüssel und Secret selbst in der T212-App und sollte nur
// Leserechte geben. Finclue ruft keine Order-Endpunkte auf.

import { NextResponse } from 'next/server'
import { encryptSecret } from '@/lib/brokerSecrets'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authorizeT212 } from '@/lib/t212Access'
import { t212ErrorMessage } from '@/lib/t212Sync'
import { getAccountSummary, isPracticeKey, T212ApiError, type T212AccountSummary } from '@/lib/trading212'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STALE_MS = 6 * 60_000

export async function GET(request: Request) {
  const auth = await authorizeT212(request)
  if ('error' in auth) return auth.error
  const { data: row } = await supabaseAdmin
    .from('broker_t212_connections')
    .select('portfolio_id, currency, sync_state, sync_message, sync_started_at, last_synced_at, last_check')
    .eq('user_id', auth.user.id)
    .maybeSingle()
  const interrupted = row?.sync_state === 'laeuft' && (!row.sync_started_at || Date.now() - Date.parse(row.sync_started_at) > STALE_MS)
  return NextResponse.json({
    verbunden: !!row,
    portfolioId: row?.portfolio_id ?? null,
    stand: interrupted ? 'fehler' : row?.sync_state ?? null,
    meldung: interrupted ? 'Der letzte Abgleich wurde unterbrochen.' : row?.sync_message ?? null,
    aktualisiert: row?.last_synced_at ?? null,
    pruefung: row?.last_check ?? null,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  const auth = await authorizeT212(request)
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null) as { apiKey?: unknown; apiSecret?: unknown; portfolioId?: unknown } | null
  let apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
  let apiSecret = typeof body?.apiSecret === 'string' ? body.apiSecret.trim() : ''
  const portfolioId = typeof body?.portfolioId === 'string' ? body.portfolioId : ''
  if (!apiKey || !apiSecret || apiKey.length > 300 || apiSecret.length > 300) return NextResponse.json({ error: 'Bitte Schlüssel und Secret eintragen.' }, { status: 400 })

  const { data: portfolio } = await supabaseAdmin.from('portfolios').select('id').eq('id', portfolioId).eq('user_id', auth.user.id).maybeSingle()
  if (!portfolio) return NextResponse.json({ error: 'Depot nicht gefunden.' }, { status: 404 })

  try {
    // Erst bei Trading 212 prüfen: Schlägt das fehl, wird nichts gespeichert
    let summary: T212AccountSummary
    try {
      summary = await getAccountSummary(apiKey, apiSecret)
    } catch (err) {
      if (!(err instanceof T212ApiError) || err.status !== 401) throw err
      // Häufigster Grund: Schlüssel und Secret vertauscht
      const swapped = await getAccountSummary(apiSecret, apiKey).catch(() => null)
      if (!swapped) {
        const practice = await isPracticeKey(apiKey, apiSecret)
        return NextResponse.json({
          error: practice
            ? 'Dieser Schlüssel gehört zu deinem Übungskonto. Wechsle in der App zum echten Invest-Konto und erzeuge dort einen neuen.'
            : 'Trading 212 kennt dieses Paar nicht (auch nicht vertauscht). Der Schlüssel ist falsch kopiert, gelöscht oder auf andere IP-Adressen beschränkt.',
        }, { status: 422 })
      }
      summary = swapped
      ;[apiKey, apiSecret] = [apiSecret, apiKey]
    }
    if ((summary.currency || '').toUpperCase() !== 'EUR') return NextResponse.json({ error: `Kontowährung ${summary.currency || 'unbekannt'} wird noch nicht unterstützt, nur EUR.` }, { status: 422 })
    const { error } = await supabaseAdmin.from('broker_t212_connections').upsert({
      user_id: auth.user.id, api_key_enc: encryptSecret(apiKey), api_secret_enc: encryptSecret(apiSecret), account_id: summary.id ?? null,
      currency: summary.currency ?? null, status: 'connected', portfolio_id: portfolio.id, sync_state: 'bereit', sync_message: null,
      sync_started_at: null, synced_until: null, last_check: null, last_synced_at: null, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) throw error
    return NextResponse.json({ verbunden: true })
  } catch (err) {
    if (err instanceof T212ApiError) return NextResponse.json({ error: t212ErrorMessage(err) }, { status: 422 })
    console.error('[t212] Verbinden fehlgeschlagen:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Verbindung fehlgeschlagen.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeT212(request)
  if ('error' in auth) return auth.error
  const { error } = await supabaseAdmin.from('broker_t212_connections').delete().eq('user_id', auth.user.id)
  if (error) return NextResponse.json({ error: 'Trennen fehlgeschlagen.' }, { status: 500 })
  return NextResponse.json({ verbunden: false })
}
