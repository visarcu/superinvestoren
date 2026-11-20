// POST /api/portfolio/sample: legt für den eingeloggten Nutzer das
// Beispieldepot an (Buffetts Top 10, vor drei Jahren für 10.000 € gekauft).
// Gibt es schon eins, wird dessen ID zurückgegeben statt ein zweites anzulegen.
// Authentifiziert per Supabase-Session-Token (Authorization: Bearer …).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildSampleDepotPlan } from '@/lib/sampleDepot'
import { SAMPLE_DEPOT_BROKER_NAME } from '@/lib/sampleDepotShared'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice('Bearer '.length))
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Schon vorhanden? Dann dorthin, statt ein zweites anzulegen
  const { data: existing } = await supabaseAdmin
    .from('portfolios')
    .select('id')
    .eq('user_id', user.id)
    .eq('broker_name', SAMPLE_DEPOT_BROKER_NAME)
    .limit(1)
    .maybeSingle()
  if (existing?.id) {
    return NextResponse.json({ portfolioId: existing.id, created: false })
  }

  const plan = await buildSampleDepotPlan()
  if (!plan) {
    return NextResponse.json({ error: 'Beispieldepot gerade nicht verfügbar' }, { status: 503 })
  }

  const { data: portfolio, error: portfolioError } = await supabaseAdmin
    .from('portfolios')
    .insert({
      user_id: user.id,
      name: `Beispieldepot: ${plan.investorName}`,
      currency: 'EUR',
      cash_position: 0,
      is_default: false,
      broker_name: SAMPLE_DEPOT_BROKER_NAME,
    })
    .select('id')
    .single()
  if (portfolioError || !portfolio) {
    console.error('[sample-depot] Depot anlegen fehlgeschlagen:', portfolioError?.message)
    return NextResponse.json({ error: 'Beispieldepot konnte nicht angelegt werden' }, { status: 500 })
  }

  const note = `Beispieldepot: Top 10 aus ${plan.investorName}s 13F (${plan.periodLabel})`
  const holdings = plan.positions.map(p => ({
    portfolio_id: portfolio.id,
    symbol: p.symbol,
    name: p.name,
    quantity: p.quantity,
    purchase_price: p.priceEur,
    purchase_date: plan.startDate,
    purchase_currency: 'EUR',
    purchase_fx_rate: p.fxRate,
  }))
  const transactions = plan.positions.map(p => ({
    portfolio_id: portfolio.id,
    type: 'buy',
    symbol: p.symbol,
    name: p.name,
    quantity: p.quantity,
    price: p.priceEur,
    total_value: Math.round(p.quantity * p.priceEur * 100) / 100,
    date: plan.startDate,
    notes: note,
  }))

  const [holdingsRes, txRes] = await Promise.all([
    supabaseAdmin.from('portfolio_holdings').insert(holdings),
    supabaseAdmin.from('portfolio_transactions').insert(transactions),
  ])
  if (holdingsRes.error || txRes.error) {
    console.error('[sample-depot] Positionen anlegen fehlgeschlagen:', holdingsRes.error?.message ?? txRes.error?.message)
    // Halbes Depot wieder entfernen
    await supabaseAdmin.from('portfolio_holdings').delete().eq('portfolio_id', portfolio.id)
    await supabaseAdmin.from('portfolio_transactions').delete().eq('portfolio_id', portfolio.id)
    await supabaseAdmin.from('portfolios').delete().eq('id', portfolio.id)
    return NextResponse.json({ error: 'Beispieldepot konnte nicht angelegt werden' }, { status: 500 })
  }

  return NextResponse.json({ portfolioId: portfolio.id, created: true })
}
