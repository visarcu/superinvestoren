// src/app/api/broker-sync/t212/preview/route.ts
// Trading-212-Sync (Beta): Abgleich-VORSCHAU — T212-Positionen vs.
// Finclue-Depot. Read-only, Matching über ISIN; gleiche Row-Struktur wie
// der finAPI-Preview, damit das UI die Tabelle wiederverwenden kann.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAccountSummary, listPositions, T212ApiError } from '@/lib/trading212'
import { decryptSecret } from '@/lib/brokerSecrets'

export const runtime = 'nodejs'
export const maxDuration = 60

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
  if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const allowlist = (process.env.BROKER_SYNC_BETA_ALLOWLIST || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!allowlist.includes((user.email || '').toLowerCase())) {
    return NextResponse.json({ error: 'Beta not enabled' }, { status: 403 })
  }

  let body: { portfolioId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.portfolioId) return NextResponse.json({ error: 'portfolioId required' }, { status: 400 })

  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id, name, user_id')
    .eq('id', body.portfolioId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!portfolio) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: row } = await supabase
    .from('broker_t212_connections')
    .select('api_key_enc, api_secret_enc')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Keine Trading-212-Verbindung' }, { status: 409 })

  try {
    const apiKey = decryptSecret(row.api_key_enc)
    const apiSecret = decryptSecret(row.api_secret_enc)
    // summary zuerst (1 req/5s), positions danach (1 req/1s)
    const summary = await getAccountSummary(apiKey, apiSecret)
    const positions = await listPositions(apiKey, apiSecret)

    const { data: holdings } = await supabase
      .from('portfolio_holdings')
      .select('symbol, name, isin, quantity')
      .eq('portfolio_id', portfolio.id)

    const byIsin = new Map(
      (holdings || [])
        .filter(h => h.isin)
        .map(h => [String(h.isin).toUpperCase(), h]),
    )

    const rows = []
    const matchedIsins = new Set<string>()
    for (const pos of positions) {
      const isin = pos.instrument?.isin?.toUpperCase()
      if (!isin || !(pos.quantity > 0)) continue
      const holding = byIsin.get(isin)
      if (holding) matchedIsins.add(isin)
      const finclueQty = holding ? Number(holding.quantity) : 0
      const diff = Math.round((pos.quantity - finclueQty) * 1e6) / 1e6
      rows.push({
        isin,
        name: pos.instrument?.name || pos.instrument?.ticker || isin,
        symbol: holding?.symbol ?? null,
        brokerQty: pos.quantity,
        finclueQty,
        diff,
        state: !holding ? 'fehlt_in_finclue' : Math.abs(diff) < 1e-6 ? 'ok' : 'abweichung',
        entryQuote: pos.averagePricePaid,
        marketValue: pos.walletImpact?.currentValue ?? null,
      })
    }
    for (const [isin, holding] of Array.from(byIsin.entries())) {
      if (matchedIsins.has(isin)) continue
      rows.push({
        isin,
        name: holding.name,
        symbol: holding.symbol,
        brokerQty: 0,
        finclueQty: Number(holding.quantity),
        diff: -Number(holding.quantity),
        state: 'fehlt_beim_broker',
        entryQuote: null,
        marketValue: null,
      })
    }

    rows.sort((a, b) => (a.state === 'ok' ? 1 : 0) - (b.state === 'ok' ? 1 : 0))

    await supabase
      .from('broker_t212_connections')
      .update({ status: 'synced_preview', last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({
      portfolioName: portfolio.name,
      brokerTotal: rows.reduce((s, r) => s + (r.marketValue || 0), 0),
      accountCurrency: summary.currency ?? null,
      rows,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    if (err instanceof T212ApiError && err.status === 429) {
      return NextResponse.json({ error: 'Trading-212-Rate-Limit erreicht — kurz warten und nochmal versuchen' }, { status: 429 })
    }
    if (err instanceof T212ApiError && (err.status === 401 || err.status === 403)) {
      return NextResponse.json({ error: 'Key ungültig oder widerrufen — bitte neu verbinden' }, { status: 422 })
    }
    console.error('t212 preview error:', err)
    return NextResponse.json({ error: 'Abgleich fehlgeschlagen' }, { status: 500 })
  }
}
