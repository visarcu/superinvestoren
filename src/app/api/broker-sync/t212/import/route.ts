// src/app/api/broker-sync/t212/import/route.ts
// Trading-212-Sync (Beta): Positionen + Cash in ein LEERES Depot übernehmen.
// Gleiche Semantik wie der finAPI-Import: pro Position ein synthetischer
// Kauf zur Broker-Kostenbasis. Kostenbasis kommt aus walletImpact.totalCost
// (Kontowährung) — v1 unterstützt daher nur EUR-Konten; bei anderen
// Kontowährungen wäre jeder Wert im Depot falsch denominiert.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAccountSummary, listPositions, totalFreeCash, T212ApiError } from '@/lib/trading212'
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

  // Nur leere Depots befüllen — verhindert Duplikate und Daten-Merge-Chaos
  const { count: holdingCount } = await supabase
    .from('portfolio_holdings')
    .select('id', { count: 'exact', head: true })
    .eq('portfolio_id', portfolio.id)
  if ((holdingCount ?? 0) > 0) {
    return NextResponse.json({ error: 'Depot ist nicht leer — Import nur in leere Depots möglich' }, { status: 409 })
  }

  const { data: row } = await supabase
    .from('broker_t212_connections')
    .select('api_key_enc, api_secret_enc')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Keine Trading-212-Verbindung' }, { status: 409 })

  try {
    const apiKey = decryptSecret(row.api_key_enc)
    const apiSecret = decryptSecret(row.api_secret_enc)
    const summary = await getAccountSummary(apiKey, apiSecret)
    if ((summary.currency || '').toUpperCase() !== 'EUR') {
      return NextResponse.json(
        { error: `Kontowährung ${summary.currency || 'unbekannt'} wird noch nicht unterstützt — aktuell nur EUR-Konten` },
        { status: 422 },
      )
    }

    const positions = (await listPositions(apiKey, apiSecret))
      .filter(p => p.instrument?.isin && p.quantity > 0)
    if (positions.length === 0) {
      return NextResponse.json({ error: 'Keine Positionen bei Trading 212 gefunden' }, { status: 409 })
    }

    // ISIN → Ticker über den bestehenden Resolver (gleiche Origin)
    const resolveUrl = new URL('/api/v1/isin-search', request.url)
    const resolveRes = await fetch(resolveUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs: positions.map(p => ({ isin: p.instrument.isin, name: p.instrument.name })) }),
    })
    if (!resolveRes.ok) throw new Error(`ISIN-Resolver ${resolveRes.status}`)
    const resolved: { data: { isin: string; ticker: string }[] } = await resolveRes.json()
    const tickerByIsin = new Map(resolved.data.map(r => [r.isin.toUpperCase(), r.ticker]))

    const today = new Date().toISOString().split('T')[0]
    const skipped: { isin: string; name: string | null }[] = []
    const holdingRows = []
    const txRows = []
    for (const pos of positions) {
      const isin = pos.instrument.isin!.toUpperCase()
      const ticker = tickerByIsin.get(isin)
      if (!ticker) {
        skipped.push({ isin, name: pos.instrument.name })
        continue
      }
      // Kostenbasis in EUR: walletImpact.totalCost (Kontowährung) je Anteil.
      // Fallback averagePricePaid nur, wenn das Instrument selbst in EUR notiert.
      const totalCost = pos.walletImpact?.totalCost
      let purchasePrice: number | null = null
      if (totalCost !== null && totalCost !== undefined && totalCost > 0) {
        purchasePrice = totalCost / pos.quantity
      } else if ((pos.instrument.currency || '').toUpperCase() === 'EUR' && pos.averagePricePaid) {
        purchasePrice = pos.averagePricePaid
      }
      if (!purchasePrice || !isFinite(purchasePrice)) {
        skipped.push({ isin, name: pos.instrument.name })
        continue
      }
      const purchaseDate = pos.createdAt ? pos.createdAt.split('T')[0] : today
      const name = pos.instrument.name || ticker
      holdingRows.push({
        portfolio_id: portfolio.id,
        symbol: ticker,
        name,
        isin,
        quantity: pos.quantity,
        purchase_price: Math.round(purchasePrice * 10000) / 10000,
        purchase_date: purchaseDate,
        purchase_currency: 'EUR',
      })
      txRows.push({
        portfolio_id: portfolio.id,
        type: 'buy',
        symbol: ticker,
        name,
        quantity: pos.quantity,
        price: Math.round(purchasePrice * 10000) / 10000,
        total_value: Math.round((totalCost || pos.quantity * purchasePrice) * 100) / 100,
        date: purchaseDate,
        notes: 'Broker-Import (Trading 212): Kostenbasis vom Broker übernommen',
      })
    }
    if (holdingRows.length === 0) {
      return NextResponse.json({ error: 'Keine ISIN konnte aufgelöst werden' }, { status: 422 })
    }

    const { error: insertError } = await supabase.from('portfolio_holdings').insert(holdingRows)
    if (insertError) throw insertError
    const { error: txError } = await supabase.from('portfolio_transactions').insert(txRows)
    if (txError) throw txError

    const cash = Math.round(totalFreeCash(summary) * 100) / 100
    if (cash !== 0) {
      await supabase.from('portfolios')
        .update({ cash_position: cash, updated_at: new Date().toISOString() })
        .eq('id', portfolio.id)
      await supabase.from('portfolio_transactions').insert({
        portfolio_id: portfolio.id,
        type: cash > 0 ? 'cash_deposit' : 'cash_withdrawal',
        symbol: 'CASH',
        name: 'Broker-Import (Trading 212): Verrechnungskonto',
        quantity: 1,
        price: Math.abs(cash),
        total_value: Math.abs(cash),
        date: today,
      })
    }

    await supabase
      .from('broker_t212_connections')
      .update({ status: 'imported', last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({
      portfolioName: portfolio.name,
      imported: holdingRows.length,
      skipped,
      cashPosition: cash,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    if (err instanceof T212ApiError && err.status === 429) {
      return NextResponse.json({ error: 'Trading-212-Rate-Limit erreicht — kurz warten und nochmal versuchen' }, { status: 429 })
    }
    console.error('t212 import error:', err)
    return NextResponse.json({ error: 'Import fehlgeschlagen' }, { status: 500 })
  }
}
