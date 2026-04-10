// src/app/api/cron/check-analyst-ratings/route.ts
//
// Cron job: checks FMP for recent analyst upgrades/downgrades and notifies
// users who have the affected stock in their watchlist.
//
// Schedule: once daily at 08:00 UTC (after European/US pre-market)
// Auth: Bearer CRON_SECRET header

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const FMP_API_KEY = process.env.FMP_API_KEY

// Only notify for actions that actually change conviction.
// "Maintains", "Reiterates" with same grade = noise.
const NOTIFY_ACTIONS = new Set(['upgrade', 'downgrade', 'initiated', 'initiated coverage'])

function normalizeAction(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (s.includes('upgrade')) return 'upgrade'
  if (s.includes('downgrade')) return 'downgrade'
  if (s.includes('initiat')) return 'initiated'
  return s
}

function isNotifiableAction(raw: string): boolean {
  return NOTIFY_ACTIONS.has(normalizeAction(raw))
}

function actionLabel(raw: string): string {
  const a = normalizeAction(raw)
  if (a === 'upgrade') return 'Hochgestuft'
  if (a === 'downgrade') return 'Herabgestuft'
  if (a === 'initiated') return 'Neu abgedeckt'
  return raw
}

async function sendPushNotification(userId: string, title: string, body: string, data?: object) {
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
    console.error('[AnalystRatings] Push error:', e)
  }
}

async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  data: object,
  href: string
) {
  const { error } = await supabaseService.from('notifications').insert({
    user_id: userId,
    type: 'analyst_rating',
    title,
    message,
    data,
    href,
  })
  if (error) {
    console.error('[AnalystRatings] In-app notification error:', error)
    return
  }
  await sendPushNotification(userId, title, message, data)
}

interface FMPGrading {
  symbol: string
  publishedDate: string
  gradingCompany: string
  action: string
  previousGrade: string
  newGrade: string
  newsURL?: string
  newsTitle?: string
}

async function fetchRecentGradings(symbol: string, since: Date): Promise<FMPGrading[]> {
  const url = `https://financialmodelingprep.com/api/v4/upgrades-downgrades?symbol=${symbol}&apikey=${FMP_API_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    console.warn(`[AnalystRatings] FMP error for ${symbol}: ${res.status}`)
    return []
  }
  const data: FMPGrading[] = await res.json()
  if (!Array.isArray(data)) return []

  const sinceTime = since.getTime()
  return data.filter((g) => {
    if (!g.publishedDate) return false
    return new Date(g.publishedDate).getTime() >= sinceTime
  })
}

async function handleCheck() {
  console.log('[AnalystRatings] Starting check...')

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not set' }, { status: 500 })
  }

  // TEST MODE: wenn gesetzt, gehen Notifications nur an diesen einen User
  const testUserId = process.env.ANALYST_RATINGS_TEST_USER_ID || null
  if (testUserId) {
    console.log(`[AnalystRatings] TEST MODE — only notifying user ${testUserId}`)
  }

  // ── 1. Watchlist + Portfolio symbols grouped by user ─────────────────────
  let watchlistQuery = supabaseService.from('watchlists').select('user_id, ticker')
  if (testUserId) watchlistQuery = watchlistQuery.eq('user_id', testUserId)
  const { data: watchlistRows, error: wlError } = await watchlistQuery
  if (wlError) {
    console.error('[AnalystRatings] Watchlist fetch error:', wlError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // symbol → Set<user_id>
  const symbolToUsers = new Map<string, Set<string>>()

  // Add watchlist
  for (const row of (watchlistRows || [])) {
    const sym = (row.ticker as string).toUpperCase()
    if (!symbolToUsers.has(sym)) symbolToUsers.set(sym, new Set())
    symbolToUsers.get(sym)!.add(row.user_id as string)
  }

  // Add portfolio holdings
  let portfolioQuery = supabaseService.from('portfolios').select('id, user_id')
  if (testUserId) portfolioQuery = portfolioQuery.eq('user_id', testUserId)
  const { data: portfolios } = await portfolioQuery
  if (portfolios && portfolios.length > 0) {
    const portfolioIds = portfolios.map((p: any) => p.id)
    const portfolioMap = new Map(portfolios.map((p: any) => [p.id, p.user_id]))
    const { data: holdings } = await supabaseService
      .from('portfolio_holdings').select('portfolio_id, symbol').in('portfolio_id', portfolioIds)
    for (const h of (holdings || [])) {
      const sym = (h.symbol as string).toUpperCase()
      const userId = portfolioMap.get(h.portfolio_id) as string
      if (!userId) continue
      if (!symbolToUsers.has(sym)) symbolToUsers.set(sym, new Set())
      symbolToUsers.get(sym)!.add(userId)
    }
  }

  if (symbolToUsers.size === 0) {
    return NextResponse.json({ success: true, checked: 0, notified: 0 })
  }

  const allUserIds = [...new Set([...(watchlistRows || []).map((r) => r.user_id as string),
    ...(portfolios || []).map((p: any) => p.user_id as string)])]

  // ── 2. Load notification settings (analyst_ratings_enabled per user) ──────
  const { data: settingsRows } = await supabaseService
    .from('notification_settings')
    .select('user_id, analyst_ratings_enabled')
    .in('user_id', allUserIds)

  // Users who explicitly disabled analyst rating notifications
  const disabledUsers = new Set<string>()
  if (settingsRows) {
    for (const s of settingsRows) {
      if (s.analyst_ratings_enabled === false) disabledUsers.add(s.user_id as string)
    }
  }

  // ── 3. Determine lookback window ──────────────────────────────────────────
  // Test mode: 30 Tage, damit garantiert was gefunden wird
  // Production: 48h um Wochenenden/Feiertage abzudecken ohne Duplikate zu erzeugen
  const lookbackHours = testUserId ? 30 * 24 : 48
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)

  const symbols = [...symbolToUsers.keys()]
  console.log(`[AnalystRatings] Checking ${symbols.length} symbols since ${since.toISOString()}`)

  let totalNotified = 0
  let totalNew = 0

  // ── 4. Process each symbol ────────────────────────────────────────────────
  for (const symbol of symbols) {
    // Rate-limit: 150ms between FMP calls (stays well under 10 req/s)
    await new Promise((r) => setTimeout(r, 150))

    const gradings = await fetchRecentGradings(symbol, since)
    const notifiable = gradings.filter((g) => isNotifiableAction(g.action))

    if (notifiable.length === 0) continue

    for (const grading of notifiable) {
      // Build a stable deduplication key
      const dateStr = grading.publishedDate.slice(0, 10)
      const actionKey = `${symbol}_${grading.gradingCompany}_${dateStr}_${grading.action}`
        .toLowerCase()
        .replace(/\s+/g, '_')

      // Check if already seen
      const { data: existing } = await supabaseService
        .from('analyst_actions_seen')
        .select('action_key')
        .eq('action_key', actionKey)
        .maybeSingle()

      if (existing) continue // already notified

      totalNew++

      // Mark as seen immediately to avoid race conditions on concurrent runs
      await supabaseService.from('analyst_actions_seen').insert({
        action_key: actionKey,
        symbol,
        grading_company: grading.gradingCompany,
        action_type: normalizeAction(grading.action),
        new_grade: grading.newGrade,
        previous_grade: grading.previousGrade,
        published_date: dateStr,
      })

      // Build notification texts (German)
      const label = actionLabel(grading.action)
      const title = `${symbol}: ${label} von ${grading.gradingCompany}`

      const gradeChange =
        grading.previousGrade && grading.newGrade && grading.previousGrade !== grading.newGrade
          ? ` (${grading.previousGrade} → ${grading.newGrade})`
          : grading.newGrade
          ? ` → ${grading.newGrade}`
          : ''

      const message = `${grading.gradingCompany} hat ${symbol} ${label.toLowerCase()}${gradeChange}`

      const notifData = {
        symbol,
        action: normalizeAction(grading.action),
        gradingCompany: grading.gradingCompany,
        newGrade: grading.newGrade,
        previousGrade: grading.previousGrade,
        publishedDate: grading.publishedDate,
      }
      const href = `/analyse/stocks/${symbol.toLowerCase()}/ratings`

      // Notify each user who watches this symbol and hasn't disabled the feature
      const usersToNotify = [...(symbolToUsers.get(symbol) ?? [])]
        .filter((uid) => !disabledUsers.has(uid))

      for (const userId of usersToNotify) {
        await createInAppNotification(userId, title, message, notifData, href)
        totalNotified++
      }
    }
  }

  console.log(
    `[AnalystRatings] Done: ${symbols.length} symbols checked, ${totalNew} new actions, ${totalNotified} notifications sent`
  )

  return NextResponse.json({
    success: true,
    symbolsChecked: symbols.length,
    newActions: totalNew,
    notificationsSent: totalNotified,
  })
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
