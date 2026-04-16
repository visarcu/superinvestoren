// src/app/api/notifications/check-economic-events/route.ts
// Daily cron at 07:00 UTC: checks economic calendar for major events today
// (Fed/ECB interest rate decisions) and notifies all users with push
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const FMP_API_KEY = process.env.FMP_API_KEY

// Keywords that identify interest rate decisions
const RATE_DECISION_KEYWORDS = [
  'interest rate decision',
  'fed funds rate',
  'ecb rate',
  'boe rate',
  'policy rate',
]

// Map country codes to German central bank names
const CENTRAL_BANKS: Record<string, { name: string; emoji: string }> = {
  US: { name: 'Fed', emoji: '🇺🇸' },
  EU: { name: 'EZB', emoji: '🇪🇺' },
  GB: { name: 'Bank of England', emoji: '🇬🇧' },
  JP: { name: 'Bank of Japan', emoji: '🇯🇵' },
  CN: { name: 'PBoC', emoji: '🇨🇳' },
  CA: { name: 'Bank of Canada', emoji: '🇨🇦' },
  AU: { name: 'RBA', emoji: '🇦🇺' },
  CH: { name: 'SNB', emoji: '🇨🇭' },
}

interface EconomicEvent {
  date: string
  country: string
  event: string
  impact: string
  actual: number | null
  previous: number | null
  estimate: number | null
}

function isRateDecision(event: string): boolean {
  const lower = event.toLowerCase()
  return RATE_DECISION_KEYWORDS.some(kw => lower.includes(kw))
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) + ' Uhr'
  } catch {
    return ''
  }
}

async function sendPush(userIds: string[], title: string, body: string, data?: object) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://finclue.de'
  await fetch(`${baseUrl}/api/notifications/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify({ userIds, title, body, data }),
  })
}

async function handleCheck(testUserId: string | null = null) {
  if (testUserId) console.log(`[EconomicEvents] TEST MODE — only notifying ${testUserId}`)
  else console.log('[EconomicEvents] Starting check...')

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not set' }, { status: 500 })
  }

  // 1. Fetch today's economic calendar
  const today = new Date().toISOString().slice(0, 10)
  const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${today}&to=${today}&apikey=${FMP_API_KEY}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    console.error('[EconomicEvents] FMP error:', res.status)
    return NextResponse.json({ error: 'FMP API error' }, { status: 500 })
  }

  const events: EconomicEvent[] = await res.json()
  if (!Array.isArray(events)) {
    return NextResponse.json({ success: true, message: 'No events', notificationsSent: 0 })
  }

  // 2. Filter for interest rate decisions
  const rateDecisions = events.filter(e =>
    e.impact === 'High' && isRateDecision(e.event)
  )

  if (rateDecisions.length === 0) {
    console.log('[EconomicEvents] No rate decisions today')
    return NextResponse.json({ success: true, message: 'No rate decisions today', notificationsSent: 0 })
  }

  console.log(`[EconomicEvents] Found ${rateDecisions.length} rate decision(s)`)

  // 3. Check deduplication — don't send twice for the same day (skip in test mode)
  const dedupeKey = `economic_event_${today}`
  if (!testUserId) {
    const { data: existing } = await supabaseAdmin
      .from('notification_log')
      .select('id')
      .eq('reference_id', dedupeKey)
      .eq('notification_type', 'economic_event')
      .maybeSingle()

    if (existing) {
      console.log('[EconomicEvents] Already notified today')
      return NextResponse.json({ success: true, message: 'Already notified today', notificationsSent: 0 })
    }
  }

  // 4. Build notification message
  const mainEvent = rateDecisions[0]
  const bank = CENTRAL_BANKS[mainEvent.country] || { name: mainEvent.country, emoji: '' }
  const timeStr = formatTime(mainEvent.date)
  const prevRate = mainEvent.previous != null ? `${mainEvent.previous}%` : null
  const estimate = mainEvent.estimate != null ? `${mainEvent.estimate}%` : null

  const title = `${bank.name}-Zinsentscheid heute`
  let message = `Heute ${timeStr ? `um ${timeStr} ` : ''}wird die ${bank.name} ihren Zinsentscheid bekanntgeben.`
  if (prevRate && estimate) {
    message += ` Aktuell: ${prevRate}, erwartet: ${estimate}.`
  } else if (prevRate) {
    message += ` Aktueller Leitzins: ${prevRate}.`
  }
  message += ' Mit erhöhter Volatilität ist zu rechnen.'

  // If multiple rate decisions today (rare), mention both
  if (rateDecisions.length > 1) {
    const others = rateDecisions.slice(1).map(e => {
      const b = CENTRAL_BANKS[e.country] || { name: e.country };
      return b.name;
    });
    message += ` Außerdem: ${others.join(', ')}-Zinsentscheid.`
  }

  // 5. Get users with push tokens (filtered to testUser if set)
  let tokenQuery = supabaseAdmin.from('device_tokens').select('user_id')
  if (testUserId) tokenQuery = tokenQuery.eq('user_id', testUserId)
  const { data: deviceTokenRows } = await tokenQuery

  const userIds = [...new Set((deviceTokenRows || []).map(r => r.user_id))]

  if (userIds.length === 0) {
    console.log('[EconomicEvents] No users with push tokens')
    return NextResponse.json({ success: true, message: 'No users with push tokens', notificationsSent: 0 })
  }

  // 6. Create in-app notifications + send push
  const notifications = userIds.map(userId => ({
    user_id: userId,
    type: 'economic_event',
    title,
    message,
    data: {
      screen: 'economic-calendar',
      country: mainEvent.country,
      event: mainEvent.event,
    },
  }))

  // Batch insert in-app notifications (max 500 at a time)
  for (let i = 0; i < notifications.length; i += 500) {
    const batch = notifications.slice(i, i + 500)
    await supabaseAdmin.from('notifications').insert(batch)
  }

  // Send push
  await sendPush(userIds, title, message)

  // 7. Log for deduplication (skip in test mode so we can re-test)
  if (!testUserId) {
    await supabaseAdmin.from('notification_log').insert({
      user_id: userIds[0],
      notification_type: 'economic_event',
      reference_id: dedupeKey,
      content: { events: rateDecisions.map(e => e.event), date: today },
    })
  }

  console.log(`[EconomicEvents] Notified ${userIds.length} users about ${rateDecisions.length} rate decision(s)`)

  return NextResponse.json({
    success: true,
    rateDecisions: rateDecisions.length,
    notificationsSent: userIds.length,
    title,
    message,
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  return handleCheck(searchParams.get('testUserId'))
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  return handleCheck(searchParams.get('testUserId'))
}
