// src/app/api/broker-sync/preview/route.ts
// Broker-Sync (Beta): Abgleich-VORSCHAU — finAPI-Bestand vs. Finclue-Depot.
// Bewusst read-only: Es wird NICHTS geschrieben; die Route zeigt nur
// Abweichungen (Stückzahlen, fehlende/neue Positionen). Matching über ISIN.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserToken, listSecurities, accountIdsForConnection } from '@/lib/finapi'

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

  let body: { portfolioId?: string; connectionId?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.portfolioId) return NextResponse.json({ error: 'portfolioId required' }, { status: 400 })

  // Depot muss dem Nutzer gehören
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id, name, user_id')
    .eq('id', body.portfolioId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!portfolio) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: row } = await supabase
    .from('broker_connections')
    .select('finapi_user_id, finapi_user_password')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Keine Broker-Verbindung' }, { status: 409 })

  try {
    const token = await getUserToken(row.finapi_user_id, row.finapi_user_password)
    // Bei mehreren Bankverbindungen: nur die Wertpapiere DIESER Verbindung
    // abgleichen, sonst vermischen sich z.B. Scalable- und TR-Bestände
    let accountIds: number[] | undefined
    if (body.connectionId) {
      const { securityIds } = await accountIdsForConnection(token, Number(body.connectionId))
      accountIds = securityIds
    }
    const securities = await listSecurities(token, accountIds)

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
    for (const sec of securities) {
      if (!sec.isin || sec.quantity === null) continue
      const isin = sec.isin.toUpperCase()
      const holding = byIsin.get(isin)
      if (holding) matchedIsins.add(isin)
      const finclueQty = holding ? Number(holding.quantity) : 0
      const diff = Math.round(((sec.quantity ?? 0) - finclueQty) * 1e6) / 1e6
      rows.push({
        isin,
        name: sec.name,
        symbol: holding?.symbol ?? null,
        brokerQty: sec.quantity,
        finclueQty,
        diff,
        state: !holding ? 'fehlt_in_finclue' : Math.abs(diff) < 1e-6 ? 'ok' : 'abweichung',
        entryQuote: sec.entryQuote,
        marketValue: sec.marketValue,
      })
    }
    // Positionen, die Finclue kennt, der Broker aber nicht (verkauft/übertragen?)
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
      .from('broker_connections')
      .update({ status: 'synced_preview', last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({
      portfolioName: portfolio.name,
      brokerTotal: securities.reduce((s, x) => s + (x.marketValue || 0), 0),
      rows,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('broker-sync preview error:', err)
    return NextResponse.json({ error: 'Abgleich fehlgeschlagen' }, { status: 500 })
  }
}
