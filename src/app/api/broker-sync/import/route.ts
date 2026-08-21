// src/app/api/broker-sync/import/route.ts
// Broker-Sync (Beta): Positionen einer finAPI-Bankverbindung in ein LEERES
// Finclue-Depot übernehmen. Schreibt portfolio_holdings + buy-Transaktionen
// (Kaufpreis = entryQuote des Brokers, Datum = heute) und setzt den Cash-
// Bestand aus dem Verrechnungskonto. Symbole werden über /api/v1/isin-search
// aufgelöst (DB-Cache → Master → EODHD); nicht auflösbare ISINs werden
// übersprungen und im Ergebnis gemeldet.
//
// Sicherung: Nur leere Depots (0 Positionen) dürfen befüllt werden — kein
// Merge, keine Duplikate. Nutzer bestätigt den Import explizit im UI.

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
  if (!body.portfolioId || !body.connectionId) {
    return NextResponse.json({ error: 'portfolioId und connectionId erforderlich' }, { status: 400 })
  }

  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id, name, user_id')
    .eq('id', body.portfolioId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!portfolio) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Nur leere Depots befüllen — verhindert Duplikate und Daten-Merge-Chaos
  const { count: holdingCount } = await supabase
    .from('portfolio_holdings')
    .select('id', { count: 'exact', head: true })
    .eq('portfolio_id', portfolio.id)
  if ((holdingCount ?? 0) > 0) {
    return NextResponse.json({ error: 'Depot ist nicht leer — Import nur in leere Depots möglich' }, { status: 409 })
  }

  const { data: row } = await supabase
    .from('broker_connections')
    .select('finapi_user_id, finapi_user_password')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Keine Broker-Verbindung' }, { status: 409 })

  try {
    const token = await getUserToken(row.finapi_user_id, row.finapi_user_password)
    const { securityIds, checkingBalance } = await accountIdsForConnection(token, Number(body.connectionId))
    if (securityIds.length === 0) {
      return NextResponse.json({ error: 'Kein Depot-Konto in dieser Verbindung gefunden' }, { status: 409 })
    }
    const securities = (await listSecurities(token, securityIds))
      .filter(s => s.isin && s.quantity !== null && s.quantity > 0)
    if (securities.length === 0) {
      return NextResponse.json({ error: 'Keine Positionen beim Broker gefunden' }, { status: 409 })
    }

    // ISIN → Ticker über den bestehenden Resolver (gleiche Origin)
    const resolveUrl = new URL('/api/v1/isin-search', request.url)
    const resolveRes = await fetch(resolveUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs: securities.map(s => ({ isin: s.isin, name: s.name })) }),
    })
    if (!resolveRes.ok) throw new Error(`ISIN-Resolver ${resolveRes.status}`)
    const resolved: { data: { isin: string; ticker: string }[] } = await resolveRes.json()
    const tickerByIsin = new Map(resolved.data.map(r => [r.isin.toUpperCase(), r.ticker]))

    const today = new Date().toISOString().split('T')[0]
    const skipped: { isin: string; name: string | null }[] = []
    const holdingRows = []
    const txRows = []
    for (const sec of securities) {
      const isin = sec.isin!.toUpperCase()
      const ticker = tickerByIsin.get(isin)
      if (!ticker) {
        skipped.push({ isin, name: sec.name })
        continue
      }
      const purchasePrice = sec.entryQuote ?? sec.quote ?? 0
      holdingRows.push({
        portfolio_id: portfolio.id,
        symbol: ticker,
        name: sec.name || ticker,
        isin,
        quantity: sec.quantity,
        purchase_price: purchasePrice,
        purchase_date: today,
        purchase_currency: 'EUR',
      })
      txRows.push({
        portfolio_id: portfolio.id,
        type: 'buy',
        symbol: ticker,
        name: sec.name || ticker,
        quantity: sec.quantity,
        price: purchasePrice,
        total_value: (sec.quantity || 0) * purchasePrice,
        date: today,
        notes: 'Broker-Import (finAPI): Einstandskurs vom Broker übernommen',
      })
    }
    if (holdingRows.length === 0) {
      return NextResponse.json({ error: 'Keine ISIN konnte aufgelöst werden' }, { status: 422 })
    }

    const { error: insertError } = await supabase.from('portfolio_holdings').insert(holdingRows)
    if (insertError) throw insertError
    const { error: txError } = await supabase.from('portfolio_transactions').insert(txRows)
    if (txError) throw txError

    if (checkingBalance !== 0) {
      await supabase.from('portfolios')
        .update({ cash_position: checkingBalance, updated_at: new Date().toISOString() })
        .eq('id', portfolio.id)
      await supabase.from('portfolio_transactions').insert({
        portfolio_id: portfolio.id,
        type: checkingBalance > 0 ? 'cash_deposit' : 'cash_withdrawal',
        symbol: 'CASH',
        name: 'Broker-Import (finAPI): Verrechnungskonto',
        quantity: 1,
        price: Math.abs(checkingBalance),
        total_value: Math.abs(checkingBalance),
        date: today,
      })
    }

    await supabase
      .from('broker_connections')
      .update({ status: 'imported', last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({
      portfolioName: portfolio.name,
      imported: holdingRows.length,
      skipped,
      cashPosition: checkingBalance,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('broker-sync import error:', err)
    return NextResponse.json({ error: 'Import fehlgeschlagen' }, { status: 500 })
  }
}
