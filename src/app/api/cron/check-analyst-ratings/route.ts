// src/app/api/cron/check-analyst-ratings/route.ts
//
// Cron job: checks FMP for recent analyst upgrades/downgrades and notifies
// users who have the affected stock in their watchlist.
//
// Schedule: once daily at 08:00 UTC (after European/US pre-market)
// Auth: Bearer CRON_SECRET header

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const FMP_API_KEY = process.env.FMP_API_KEY

// Only notify for actions that actually change conviction.
// "Initiated coverage", "Maintains", and "Reiterates" are too noisy for push/email.
const NOTIFY_ACTIONS = new Set(['upgrade', 'downgrade'])

function normalizeAction(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (s.includes('upgrade')) return 'upgrade'
  if (s.includes('downgrade')) return 'downgrade'
  // Match "initiated", "initiate coverage", "initialise" (British spelling FMP uses)
  if (s.includes('initiat') || s.includes('initial')) return 'initiated'
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

const ANALYST_EMAIL_TEST_MODE = false // set true to redirect all emails to ANALYST_EMAIL_TEST_ADDRESS
const ANALYST_EMAIL_TEST_ADDRESS = 'visi1@hotmail.de'

function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface AnalystDigestItem {
  symbol: string
  label: string
  grading: FMPGrading
  gradeChange: string
}

async function sendAnalystDigestEmail(
  userEmail: string,
  items: AnalystDigestItem[],
) {
  if (items.length === 0) return

  const toAddress = ANALYST_EMAIL_TEST_MODE ? ANALYST_EMAIL_TEST_ADDRESS : userEmail
  const title = items.length === 1
    ? `${items[0].symbol}: ${items[0].label} von ${items[0].grading.gradingCompany}`
    : `${items.length} Analysten-Änderungen in deiner Watchlist`

  const rows = items.map(({ symbol, label, grading, gradeChange }) => {
    const actionColor = label === 'Hochgestuft' ? '#059669' : '#DC2626'
    const actionBg = label === 'Hochgestuft' ? '#f0fdf4' : '#fef2f2'
    const actionBorder = label === 'Hochgestuft' ? '#bbf7d0' : '#fecaca'
    const stockUrl = `https://finclue.de/analyse/stocks/${symbol.toLowerCase()}/ratings`
    const date = new Date(grading.publishedDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    const articleLink = grading.newsURL
      ? `<a href="${escapeHtml(grading.newsURL)}" style="color:#6b7280;font-size:12px;text-decoration:underline;">Artikel lesen</a>`
      : ''

    return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;">
          <div>
            <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 4px;">${escapeHtml(symbol)}</h2>
            <p style="color:#6b7280;font-size:13px;margin:0;">${escapeHtml(grading.gradingCompany)} · ${escapeHtml(date)}</p>
          </div>
          <div style="background:${actionBg};border:1px solid ${actionBorder};border-radius:999px;padding:6px 10px;white-space:nowrap;">
            <span style="color:${actionColor};font-size:12px;font-weight:700;">${escapeHtml(label)}</span>
          </div>
        </div>

        <div style="font-size:13px;color:#374151;line-height:1.5;margin-bottom:10px;">
          ${grading.previousGrade && grading.newGrade && grading.previousGrade !== grading.newGrade ? `
            <span style="color:#9ca3af;text-decoration:line-through;">${escapeHtml(grading.previousGrade)}</span>
            <span style="color:#d1d5db;margin:0 8px;">→</span>
            <span style="color:${actionColor};font-weight:700;">${escapeHtml(grading.newGrade)}</span>
          ` : `
            <span style="color:${actionColor};font-weight:700;">${escapeHtml(grading.newGrade || gradeChange || label)}</span>
          `}
        </div>

        ${grading.newsTitle ? `
          <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 10px;">${escapeHtml(grading.newsTitle)}</p>
        ` : ''}

        <div style="display:flex;gap:14px;align-items:center;">
          <a href="${stockUrl}" style="color:#111827;font-size:13px;font-weight:600;text-decoration:underline;">In Finclue öffnen</a>
          ${articleLink}
        </div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} | Finclue</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">

  <div style="max-width:600px;margin:0 auto;padding:32px 20px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#374151;margin:0;font-size:24px;font-weight:700;">Finclue</h1>
      <p style="color:#9ca3af;margin:4px 0 0;font-size:14px;">Analysten-Updates</p>
      ${ANALYST_EMAIL_TEST_MODE ? '<p style="background:#fbbf24;color:#92400e;padding:6px 12px;border-radius:4px;font-size:12px;font-weight:500;margin:8px auto;display:inline-block;">🧪 TEST E-MAIL</p>' : ''}
    </div>
  </div>

  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
    <div style="padding:32px;">
      <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">${escapeHtml(title)}</h2>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Wir schicken nur noch Hoch- und Herabstufungen. Neue Coverage ohne Rating-Änderung wird nicht mehr per Mail oder Push gesendet.
      </p>
      ${rows}
    </div>
  </div>

  <!-- Footer -->
  <div style="max-width:600px;margin:16px auto;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">Du erhältst diese E-Mail, weil diese Aktien in deiner Watchlist oder deinem Portfolio sind.</p>
    <a href="https://finclue.de/einstellungen" style="color:#6b7280;font-size:12px;">Benachrichtigungen verwalten</a>
  </div>

</body></html>`

  await resend.emails.send({
    from: 'Finclue <noreply@finclue.de>',
    to: toAddress,
    subject: title,
    html,
  })
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

async function handleCheck(queryTestUserId: string | null = null) {
  console.log('[AnalystRatings] Starting check...')

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not set' }, { status: 500 })
  }

  // TEST MODE: query param overrides env var
  const testUserId = queryTestUserId || process.env.ANALYST_RATINGS_TEST_USER_ID || null
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

  // ── 2b. Load user emails ──────────────────────────────────────────────────
  const userEmailMap = new Map<string, string>()
  if (allUserIds.length > 0) {
    const { data: { users } } = await supabaseService.auth.admin.listUsers({ perPage: 1000 })
    for (const u of (users || [])) {
      if (u.email && allUserIds.includes(u.id)) userEmailMap.set(u.id, u.email)
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
  let totalEmailsSent = 0
  const emailDigestByUser = new Map<string, AnalystDigestItem[]>()

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

      // Check if already seen — skip dedupe in test mode so we can re-test
      if (!testUserId) {
        const { data: existing } = await supabaseService
          .from('analyst_actions_seen')
          .select('action_key')
          .eq('action_key', actionKey)
          .maybeSingle()

        if (existing) continue // already notified
      }

      totalNew++

      // Mark as seen (only in production mode, not during testing)
      if (!testUserId) {
        await supabaseService.from('analyst_actions_seen').insert({
          action_key: actionKey,
          symbol,
          grading_company: grading.gradingCompany,
          action_type: normalizeAction(grading.action),
          new_grade: grading.newGrade,
          previous_grade: grading.previousGrade,
          published_date: dateStr,
        })
      }

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
        // Mobile deep link → stock detail, estimates tab
        screen: 'stock',
        ticker: symbol,
        tab: 'estimates',
      }
      const href = `/analyse/stocks/${symbol.toLowerCase()}/ratings`

      // Notify each user who watches this symbol and hasn't disabled the feature
      const usersToNotify = [...(symbolToUsers.get(symbol) ?? [])]
        .filter((uid) => !disabledUsers.has(uid))

      for (const userId of usersToNotify) {
        await createInAppNotification(userId, title, message, notifData, href)

        // Send at most one analyst email per user and cron run.
        const email = userEmailMap.get(userId)
        if (email) {
          const items = emailDigestByUser.get(userId) || []
          items.push({ symbol, label, grading, gradeChange })
          emailDigestByUser.set(userId, items)
        }
        totalNotified++
      }
    }
  }

  for (const [userId, items] of emailDigestByUser) {
    const email = userEmailMap.get(userId)
    if (!email || items.length === 0) continue

    try {
      items.sort((a, b) => {
        const actionDiff = a.label.localeCompare(b.label)
        if (actionDiff !== 0) return actionDiff
        return a.symbol.localeCompare(b.symbol)
      })
      await sendAnalystDigestEmail(email, items)
      totalEmailsSent++
    } catch (e) {
      console.error(`[AnalystRatings] Digest email error for ${userId}:`, e)
    }
  }

  console.log(
    `[AnalystRatings] Done: ${symbols.length} symbols checked, ${totalNew} new actions, ${totalNotified} notifications sent, ${totalEmailsSent} emails sent`
  )

  return NextResponse.json({
    success: true,
    symbolsChecked: symbols.length,
    newActions: totalNew,
    notificationsSent: totalNotified,
    emailsSent: totalEmailsSent,
  })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCheck(new URL(request.url).searchParams.get('testUserId'))
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCheck(new URL(request.url).searchParams.get('testUserId'))
}
