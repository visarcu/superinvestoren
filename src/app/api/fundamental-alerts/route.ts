// src/app/api/fundamental-alerts/route.ts
// CRUD für Fundamental-Alerts (Kennzahlen + Smart-Money-Events).
// Bewusst leichtgewichtig: Erstinitialisierung von last_state/last_event_marker
// übernimmt der tägliche Cron (erster Lauf armiert nur, ohne zu benachrichtigen).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasPremiumAccess, PREMIUM_PROFILE_SELECT } from '@/lib/premiumAccess'
import { isAlertsBetaUser } from '@/lib/fundamentalAlerts.server'
import {
  METRIC_INFO,
  isValueMetric,
  type AlertCondition,
  type FundamentalMetric,
} from '@/lib/fundamentalAlerts'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Free-Tier: max. 3 aktive Fundamental-Alerts, Premium unbegrenzt
const FREE_ALERT_LIMIT = 3

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseService.auth.getUser(token)
  return error ? null : user
}

// GET /api/fundamental-alerts?symbol=AAPL
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const symbol = new URL(request.url).searchParams.get('symbol')

    let query = supabaseService
      .from('fundamental_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (symbol) query = query.eq('symbol', symbol.toUpperCase())

    const { data: alerts, error } = await query
    if (error) {
      console.error('[FundamentalAlerts] Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ alerts, enabled: isAlertsBetaUser(user.email) })
  } catch (error) {
    console.error('[FundamentalAlerts] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/fundamental-alerts - { symbol, metric, condition?, threshold? }
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isAlertsBetaUser(user.email)) {
      return NextResponse.json(
        { error: 'Fundamental-Alerts sind aktuell in einer privaten Beta', beta: true },
        { status: 403 }
      )
    }

    const body = await request.json()
    const symbol = String(body.symbol || '').toUpperCase().trim()
    const metric = body.metric as FundamentalMetric
    const condition = (body.condition ?? null) as AlertCondition | null
    const threshold = body.threshold != null ? parseFloat(body.threshold) : null

    if (!symbol || !/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
      return NextResponse.json({ error: 'Ungültiges Symbol' }, { status: 400 })
    }
    if (!METRIC_INFO[metric]) {
      return NextResponse.json({ error: 'Unbekannte Metrik' }, { status: 400 })
    }
    if (isValueMetric(metric)) {
      if (condition !== 'below' && condition !== 'above') {
        return NextResponse.json({ error: 'condition muss below/above sein' }, { status: 400 })
      }
      if (threshold == null || !Number.isFinite(threshold)) {
        return NextResponse.json({ error: 'threshold muss eine Zahl sein' }, { status: 400 })
      }
    }

    // Duplikat-Check
    const { data: existing } = await supabaseService
      .from('fundamental_alerts')
      .select('id')
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .eq('metric', metric)
      .eq('active', true)
    if (isValueMetric(metric)) {
      // gleiche Metrik mehrfach ok (z. B. KGV < 25 und KGV > 40) — nur exakte Dublette blocken
      const { data: dupe } = await supabaseService
        .from('fundamental_alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .eq('metric', metric)
        .eq('condition', condition)
        .eq('threshold', threshold)
        .eq('active', true)
        .limit(1)
      if (dupe && dupe.length > 0) {
        return NextResponse.json({ error: 'Diesen Alert gibt es schon' }, { status: 409 })
      }
    } else if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Diesen Alert gibt es schon' }, { status: 409 })
    }

    // Free-Tier-Limit
    const { data: profile } = await supabaseService
      .from('profiles')
      .select(PREMIUM_PROFILE_SELECT)
      .eq('user_id', user.id)
      .single()
    if (!hasPremiumAccess(profile as any)) {
      const { count } = await supabaseService
        .from('fundamental_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('active', true)
      if ((count ?? 0) >= FREE_ALERT_LIMIT) {
        return NextResponse.json(
          { error: `Im Free-Plan sind maximal ${FREE_ALERT_LIMIT} aktive Alerts möglich`, premiumRequired: true },
          { status: 403 }
        )
      }
    }

    const { data: alert, error } = await supabaseService
      .from('fundamental_alerts')
      .insert({
        user_id: user.id,
        symbol,
        metric,
        condition: isValueMetric(metric) ? condition : null,
        threshold: isValueMetric(metric) ? threshold : null,
      })
      .select()
      .single()

    if (error) {
      console.error('[FundamentalAlerts] Insert error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ alert }, { status: 201 })
  } catch (error) {
    console.error('[FundamentalAlerts] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
