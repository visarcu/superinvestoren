// src/app/api/portfolio/taxes/route.ts
// GET: Steuerschätzung über alle Depots des Nutzers (lib/portfolio/taxes),
//      dazu die gespeicherten Steuerangaben. Den Freibetrag rechnet die
//      Oberfläche selbst ein.
// PUT: Steuerangaben speichern (Veranlagung, Kirchensteuer, Freistellungsauftrag
//      je Depot).
//
// Steuern gelten je Bank, deshalb immer alle Depots, auch wenn der Workspace
// gerade ein einzelnes zeigt. Das Beispieldepot zählt wie überall nur mit,
// solange der Nutzer kein eigenes Depot hat.

import { NextResponse } from 'next/server'
import { getRequestUser, unauthorizedResponse } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { countedDepots } from '@/lib/sampleDepotShared'
import { getInstrumentsForSymbols } from '@/lib/marketData/instrumentStore'
import { classifyAll } from '@/lib/ai/depot/classify'
import {
  computeTaxReport,
  taxClassFor,
  DEFAULT_TAX_SETTINGS,
  type TaxClass,
  type TaxSettings,
  type TaxTransaction,
} from '@/lib/portfolio/taxes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PAGE = 1000
const MAX_TRANSACTIONS = 20_000
const MAX_ORDER = 2000

interface DepotRow {
  id: string
  name: string
  user_id: string
  broker_name: string | null
  broker_type: string | null
  broker_color: string | null
}

function berlinYear(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', year: 'numeric' }).format(new Date()))
}

async function loadDepots(userId: string): Promise<DepotRow[]> {
  const { data, error } = await supabaseAdmin
    .from('portfolios')
    .select('id, name, user_id, broker_name, broker_type, broker_color')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw new Error('Depots nicht lesbar')
  return countedDepots((data ?? []) as DepotRow[])
}

async function loadTransactions(ids: string[]): Promise<TaxTransaction[]> {
  const rows: TaxTransaction[] = []
  for (let offset = 0; offset < MAX_TRANSACTIONS; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('portfolio_transactions')
      .select('id, portfolio_id, type, symbol, name, quantity, price, total_value, fee, date, notes')
      .in('portfolio_id', ids)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error('Buchungen nicht lesbar')
    rows.push(...((data ?? []) as unknown as TaxTransaction[]))
    if (!data || data.length < PAGE) break
  }
  return rows
}

function parseSettings(row: any): TaxSettings {
  if (!row) return DEFAULT_TAX_SETTINGS
  const orders: Record<string, number> = {}
  const raw = row.exemption_orders && typeof row.exemption_orders === 'object' ? row.exemption_orders : {}
  for (const [id, value] of Object.entries(raw)) {
    const amount = Number(value)
    if (Number.isFinite(amount) && amount > 0) orders[id] = amount
  }
  const church = Number(row.church_tax_rate)
  return {
    joint: row.joint_assessment === true,
    churchTax: church === 8 || church === 9 ? church : 0,
    exemptionOrders: orders,
  }
}

export async function GET(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return unauthorizedResponse()

  try {
    const depots = await loadDepots(user.id)
    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from('tax_settings')
      .select('joint_assessment, church_tax_rate, exemption_orders')
      .eq('user_id', user.id)
      .maybeSingle()
    if (settingsError) throw new Error('Steuerangaben nicht lesbar')
    const settings = parseSettings(settingsRow)
    const throughYear = berlinYear()

    if (depots.length === 0) {
      return NextResponse.json({ depots: [], years: [throughYear], rows: [], privateLots: [], sales: [], classes: [], settings })
    }

    const ids = depots.map(depot => depot.id)
    const transactions = await loadTransactions(ids)

    const securityTypes = new Set(['buy', 'sell', 'transfer_in', 'transfer_out', 'dividend'])
    const names = new Map<string, string>()
    for (const tx of transactions) {
      const symbol = (tx.symbol || '').trim().toUpperCase()
      if (!symbol || symbol === 'CASH' || !securityTypes.has(tx.type)) continue
      if (!names.has(symbol) || (tx.name && names.get(symbol) === symbol)) names.set(symbol, tx.name || symbol)
    }
    const symbols = [...names.keys()]
    const instruments = await getInstrumentsForSymbols(symbols)
    const securityClasses = await classifyAll(symbols.map(symbol => {
      const instrument = instruments.get(symbol)
      return { symbol, name: names.get(symbol) ?? symbol, isin: instrument?.isin, type: instrument?.type, instrumentName: instrument?.name }
    }))
    const taxClasses = new Map<string, TaxClass>()
    for (const symbol of symbols) taxClasses.set(symbol, taxClassFor(symbol, securityClasses.get(symbol)))
    const classOf = (symbol: string) => taxClasses.get(symbol.toUpperCase()) ?? taxClassFor(symbol, null)

    const report = computeTaxReport(transactions, classOf, ids, throughYear)

    // Nur geschätzte Einordnungen zeigt die Oberfläche als Hinweis
    const classes = symbols
      .map(symbol => ({ symbol, name: names.get(symbol) ?? symbol, ...taxClasses.get(symbol)! }))
      .filter(entry => entry.uncertain)

    return NextResponse.json({
      depots: depots.map(({ user_id: _owner, ...depot }) => depot),
      years: report.years,
      rows: report.rows,
      privateLots: report.privateLots,
      sales: report.sales,
      classes,
      settings,
    })
  } catch (error) {
    console.error('[portfolio/taxes] GET fehlgeschlagen:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Steuerübersicht nicht verfügbar' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return unauthorizedResponse()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const church = Number(body?.churchTax)
  if (![0, 8, 9].includes(church)) return NextResponse.json({ error: 'Kirchensteuer muss 0, 8 oder 9 sein' }, { status: 400 })
  const rawOrders = body?.exemptionOrders
  if (!rawOrders || typeof rawOrders !== 'object' || Array.isArray(rawOrders)) {
    return NextResponse.json({ error: 'Freistellungsaufträge fehlen' }, { status: 400 })
  }

  try {
    const { data: owned, error: ownedError } = await supabaseAdmin.from('portfolios').select('id').eq('user_id', user.id)
    if (ownedError) throw new Error('Depots nicht lesbar')
    const ownedIds = new Set((owned ?? []).map((row: { id: string }) => row.id))

    const orders: Record<string, number> = {}
    for (const [id, value] of Object.entries(rawOrders)) {
      if (!ownedIds.has(id)) continue
      const amount = Number(value)
      if (!Number.isFinite(amount) || amount < 0 || amount > MAX_ORDER) {
        return NextResponse.json({ error: 'Freistellungsauftrag zwischen 0 und 2.000 €' }, { status: 400 })
      }
      if (amount > 0) orders[id] = Math.round(amount * 100) / 100
    }

    const { error } = await supabaseAdmin.from('tax_settings').upsert(
      {
        user_id: user.id,
        joint_assessment: body?.joint === true,
        church_tax_rate: church,
        exemption_orders: orders,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw new Error('Steuerangaben nicht gespeichert')
    return NextResponse.json({ settings: parseSettings({ joint_assessment: body?.joint === true, church_tax_rate: church, exemption_orders: orders }) })
  } catch (error) {
    console.error('[portfolio/taxes] PUT fehlgeschlagen:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 })
  }
}
