// src/app/api/cron/check-fundamental-alerts/route.ts
// Täglicher Check aller Fundamental-Alerts.
//
// Kernprinzip Hysterese: benachrichtigt wird NUR beim Zustandswechsel
// ok → breached. Ein KGV, das um die Schwelle oszilliert, spammt nicht;
// der Alert bleibt aktiv und re-armt sich, sobald der Zustand zurückwechselt.
// Erster Lauf nach Erstellung/Reaktivierung armiert nur (last_state == null),
// damit ein bereits verletzter Zustand nicht sofort feuert.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { alertsBetaAllowlist } from '@/lib/fundamentalAlerts.server'
import {
  evaluateState,
  fetchMetricValues,
  formatMetricValue,
  isValueMetric,
  METRIC_INFO,
  type FundamentalAlertRow,
  type FundamentalMetric,
} from '@/lib/fundamentalAlerts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  try {
    const secret = process.env.INTERNAL_API_SECRET
    if (!secret) return
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://finclue.de'
    await fetch(`${baseUrl}/api/notifications/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ userIds: [userId], title, body, data }),
    })
  } catch (e) {
    console.error('[FundamentalAlerts] Failed to send push notification:', e)
  }
}

async function notify(userId: string, title: string, message: string, symbol: string) {
  try {
    const { error } = await supabaseService.from('notifications').insert({
      user_id: userId,
      type: 'fundamental_alert',
      title,
      message,
      data: { symbol },
      href: `/analyse/stocks/${symbol}`,
    })
    if (!error) await sendPushNotification(userId, title, message, { symbol })
    else console.error('[FundamentalAlerts] Error creating notification:', error)
  } catch (e) {
    console.error('[FundamentalAlerts] notify failed:', e)
  }
}

async function handleCheck() {
  const { data: alerts, error } = await supabaseService
    .from('fundamental_alerts')
    .select('*')
    .eq('active', true)

  if (error) {
    console.error('[FundamentalAlerts] Error fetching alerts:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ success: true, alertsChecked: 0, alertsTriggered: 0 })
  }

  let rows = alerts as FundamentalAlertRow[]

  // Private Beta: nur Alerts von Allowlist-Nutzern verarbeiten
  const allowlist = alertsBetaAllowlist()
  if (allowlist) {
    const { data: allowedProfiles } = await supabaseService
      .from('profiles')
      .select('user_id')
      .in('email', allowlist)
    const allowedIds = new Set((allowedProfiles ?? []).map((p: any) => p.user_id))
    rows = rows.filter(a => allowedIds.has(a.user_id))
    if (rows.length === 0) {
      return NextResponse.json({ success: true, alertsChecked: 0, alertsTriggered: 0, betaFiltered: true })
    }
  }
  const symbols = [...new Set(rows.map(a => a.symbol))]

  // Pro Symbol nur laden, was wirklich gebraucht wird
  const needsValues = new Set(rows.filter(a => isValueMetric(a.metric)).map(a => a.symbol))
  const needsSuper = new Set(rows.filter(a => a.metric === 'superinvestor_action').map(a => a.symbol))
  const needsInsider = new Set(rows.filter(a => a.metric === 'insider_cluster_buy').map(a => a.symbol))

  // Smart-Money-Lib nur dynamisch laden (zieht die 38-MB-Holdings-Historie)
  const smartMoney = (needsSuper.size > 0 || needsInsider.size > 0)
    ? await import('@/lib/smartMoney')
    : null

  const valueCache = new Map<string, Awaited<ReturnType<typeof fetchMetricValues>>>()
  const superCache = new Map<string, ReturnType<NonNullable<typeof smartMoney>['getSuperinvestorEvents']>>()
  const insiderCache = new Map<string, Awaited<ReturnType<NonNullable<typeof smartMoney>['getInsiderEvents']>>>()

  for (const symbol of symbols) {
    if (needsValues.has(symbol)) valueCache.set(symbol, await fetchMetricValues(symbol))
    if (smartMoney && needsSuper.has(symbol)) superCache.set(symbol, smartMoney.getSuperinvestorEvents(symbol))
    if (smartMoney && needsInsider.has(symbol)) insiderCache.set(symbol, await smartMoney.getInsiderEvents(symbol))
  }

  let triggered = 0
  const now = new Date().toISOString()

  for (const alert of rows) {
    const update: Record<string, unknown> = { updated_at: now }

    if (isValueMetric(alert.metric)) {
      const current = valueCache.get(alert.symbol)?.[alert.metric as FundamentalMetric]
      if (current == null || alert.condition == null || alert.threshold == null) continue

      const newState = evaluateState(alert.condition, Number(alert.threshold), current)
      update.last_value = current
      update.last_state = newState

      // last_state == null → erster Lauf: nur armieren
      if (alert.last_state === 'ok' && newState === 'breached') {
        const info = METRIC_INFO[alert.metric]
        const dir = alert.condition === 'below' ? 'unter' : 'über'
        const emoji = alert.condition === 'below' ? '📉' : '📈'
        await notify(
          alert.user_id,
          `${emoji} ${alert.symbol}: ${info.label} ${dir} Schwelle`,
          `${info.label} liegt bei ${formatMetricValue(alert.metric, current)} — ${dir} deiner Schwelle von ${formatMetricValue(alert.metric, Number(alert.threshold))}`,
          alert.symbol
        )
        update.triggered_at = now
        triggered++
      }
    } else if (alert.metric === 'superinvestor_action') {
      const events = superCache.get(alert.symbol) ?? []
      const latestQuarter = events.length ? events[events.length - 1].reportQuarter : null

      if (!alert.last_event_marker) {
        // Armieren ohne Benachrichtigung
        update.last_event_marker = latestQuarter ?? '0000-Q0'
      } else {
        const fresh = events.filter(e => e.reportQuarter > alert.last_event_marker!)
        if (fresh.length > 0 && latestQuarter) {
          const buys = fresh.filter(e => e.action === 'new' || e.action === 'add')
          const sells = fresh.length - buys.length
          const names = [...new Set(fresh.map(e => e.actor.name.split(' - ')[0]))].slice(0, 3).join(', ')
          const quarter = latestQuarter.replace(/^(\d{4})-Q([1-4])$/, 'Q$2 $1')
          await notify(
            alert.user_id,
            `🧠 ${alert.symbol}: Superinvestoren-Update ${quarter}`,
            `${buys.length} Käufe, ${sells} Verkäufe — u. a. ${names}`,
            alert.symbol
          )
          update.last_event_marker = latestQuarter
          update.triggered_at = now
          triggered++
        }
      }
    } else if (alert.metric === 'insider_cluster_buy') {
      const clusterBuys = (insiderCache.get(alert.symbol) ?? []).filter(e => e.clusterBuy)
      const latestDate = clusterBuys.length ? clusterBuys[clusterBuys.length - 1].date : null

      if (!alert.last_event_marker) {
        update.last_event_marker = latestDate ?? new Date().toISOString().slice(0, 10)
      } else {
        const fresh = clusterBuys.filter(e => e.date > alert.last_event_marker!)
        if (fresh.length > 0 && latestDate) {
          const insiders = [...new Set(fresh.map(e => e.actor.name))]
          await notify(
            alert.user_id,
            `🔥 ${alert.symbol}: Insider-Cluster-Buy`,
            `${insiders.length} Insider kauften binnen 30 Tagen — u. a. ${insiders.slice(0, 3).join(', ')}`,
            alert.symbol
          )
          update.last_event_marker = latestDate
          update.triggered_at = now
          triggered++
        }
      }
    }

    if (Object.keys(update).length > 1) {
      const { error: updateError } = await supabaseService
        .from('fundamental_alerts')
        .update(update)
        .eq('id', alert.id)
      if (updateError) console.error('[FundamentalAlerts] Update error:', updateError)
    }
  }

  console.log(`[FundamentalAlerts] Checked ${rows.length} alerts, triggered ${triggered}`)
  return NextResponse.json({ success: true, alertsChecked: rows.length, alertsTriggered: triggered })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCheck()
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCheck()
}
