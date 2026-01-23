// src/app/api/notifications/send-weekly-earnings/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const resend = new Resend(process.env.RESEND_API_KEY)

// TEST MODE: Set to your user ID to only send notifications to yourself
// Must be a valid UUID format, otherwise test mode is disabled
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

interface EarningsEvent {
  symbol: string
  date: string
  time: string // "bmo" | "amc" | ""
}

interface GroupedEarnings {
  [date: string]: EarningsEvent[]
}

// German weekday names
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function formatGermanDate(dateStr: string): string {
  const date = new Date(dateStr)
  const weekday = WEEKDAYS[date.getDay()]
  const day = date.getDate()
  const month = MONTHS[date.getMonth()]
  return `${weekday}, ${day}. ${month}`
}

function formatWeekRange(startDate: Date, endDate: Date): string {
  const startDay = startDate.getDate()
  const startMonth = MONTHS[startDate.getMonth()]
  const endDay = endDate.getDate()
  const endMonth = MONTHS[endDate.getMonth()]

  if (startMonth === endMonth) {
    return `${startDay}. - ${endDay}. ${endMonth}`
  }
  return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`
}

function getTimeLabel(time: string): string {
  switch (time) {
    case 'bmo':
      return 'vor Börsenöffnung'
    case 'amc':
      return 'nach Börsenschluss'
    default:
      return 'Uhrzeit nicht bekannt'
  }
}

function generateEmailHtml(earnings: GroupedEarnings, weekRange: string, isTest: boolean): string {
  const dates = Object.keys(earnings).sort()

  // Generate calendar view HTML
  let calendarHtml = ''

  for (const date of dates) {
    const dayEarnings = earnings[date]
    const formattedDate = formatGermanDate(date)

    calendarHtml += `
      <div style="margin-bottom: 24px;">
        <div style="background: #f9fafb; padding: 10px 16px; border-radius: 6px 6px 0 0; border: 1px solid #e5e7eb; border-bottom: none;">
          <h3 style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">${formattedDate}</h3>
        </div>
        <div style="border: 1px solid #e5e7eb; border-radius: 0 0 6px 6px; overflow: hidden;">
    `

    dayEarnings.forEach((earning, index) => {
      const borderBottom = index < dayEarnings.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''
      const timeLabel = getTimeLabel(earning.time)

      calendarHtml += `
        <div style="padding: 14px 16px; ${borderBottom}">
          <div style="display: flex; align-items: center; gap: 12px;">
            <strong style="color: #111827; font-size: 15px;">${earning.symbol}</strong>
            <span style="color: #9ca3af; font-size: 12px;">•</span>
            <span style="color: #6b7280; font-size: 13px;">${timeLabel}</span>
          </div>
        </div>
      `
    })

    calendarHtml += `
        </div>
      </div>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Earnings diese Woche | Finclue</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111827; background-color: #f9fafb;">

      <!-- Header -->
      <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px 16px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #374151; margin: 0; font-size: 24px; font-weight: 700;">Finclue</h1>
          <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;">Wöchentliche Earnings-Übersicht</p>
          ${isTest ? '<p style="background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin: 8px auto; display: inline-block;">🧪 TEST E-MAIL</p>' : ''}
        </div>
      </div>

      <!-- Main Content -->
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <div style="padding: 32px;">
          <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">
            📅 Earnings diese Woche
          </h2>

          <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px 0; line-height: 1.5;">
            Übersicht der anstehenden Quartalszahlen für Aktien auf deiner Watchlist (${weekRange}):
          </p>

          <!-- Calendar View -->
          ${calendarHtml}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="https://finclue.de/analyse/watchlist"
               target="_blank"
               rel="noopener noreferrer"
               style="display: inline-block; background: #374151; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; border: 1px solid #374151;">
              Zur Watchlist →
            </a>
          </div>

          <!-- Tip -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 24px 0 0 0;">
            <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.5;">
              <strong>Tipp:</strong> Die Kurse können vor und nach den Earnings stark schwanken. Prüfe deine Positionen und setze ggf. Stop-Loss Orders.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
            Du erhältst diese E-Mail jeden Montag, weil du Earnings-Benachrichtigungen aktiviert hast.
          </p>
          <div style="text-align: center;">
            <a href="https://finclue.de/notifications/settings" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Einstellungen</a>
            <span style="color: #d1d5db;">•</span>
            <a href="https://finclue.de/analyse/watchlist" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Watchlist</a>
          </div>
        </div>

      </div>

      <!-- Spacer -->
      <div style="height: 32px;"></div>

    </body>
    </html>
  `
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleWeeklyEarnings()
}

export async function GET(request: Request) {
  // Vercel Cron Jobs use GET requests, so we need to handle auth differently
  const authHeader = request.headers.get('authorization')

  // Check for Vercel Cron secret (sent automatically by Vercel)
  // Or manual trigger with Bearer token
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Reuse the same logic as POST
  return handleWeeklyEarnings()
}

async function handleWeeklyEarnings() {
  try {
    console.log('[Weekly Earnings] Starting weekly earnings digest...')
    console.log(`[Weekly Earnings] Test mode: ${TEST_USER_ID ? 'ON (user: ' + TEST_USER_ID + ')' : 'OFF'}`)

    // 1. Get users with weekly earnings email enabled
    let settingsQuery = supabase
      .from('notification_settings')
      .select('user_id, earnings_email_enabled')
      .eq('earnings_email_enabled', true)

    if (TEST_USER_ID) {
      settingsQuery = settingsQuery.eq('user_id', TEST_USER_ID)
    }

    const { data: userSettings, error: settingsError } = await settingsQuery

    if (settingsError) {
      console.error('[Weekly Earnings] Settings Error:', settingsError)
      return NextResponse.json({ error: 'Database error', details: 'notification_settings query failed', message: settingsError.message }, { status: 500 })
    }

    if (!userSettings || userSettings.length === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        message: 'No users with weekly earnings email enabled',
        usersChecked: 0,
        emailsSent: 0
      })
    }

    const userIds = userSettings.map(s => s.user_id)
    console.log(`[Weekly Earnings] Found ${userIds.length} users with earnings emails enabled`)

    // 2. Get watchlist items for these users
    const { data: watchlistItems, error: watchlistError } = await supabase
      .from('watchlists')
      .select('user_id, ticker')
      .in('user_id', userIds)

    if (watchlistError) {
      console.error('[Weekly Earnings] Watchlist Error:', watchlistError)
      return NextResponse.json({ error: 'Database error', details: 'watchlists query failed', message: watchlistError.message }, { status: 500 })
    }

    if (!watchlistItems || watchlistItems.length === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        message: 'No watchlist items found',
        usersChecked: userSettings.length,
        emailsSent: 0
      })
    }

    // 3. Calculate week range (Monday to Sunday)
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday

    const fromDate = startOfWeek.toISOString().split('T')[0]
    const toDate = endOfWeek.toISOString().split('T')[0]
    const weekRange = formatWeekRange(startOfWeek, endOfWeek)

    console.log(`[Weekly Earnings] Checking earnings from ${fromDate} to ${toDate}`)

    // 4. Fetch earnings calendar for the week
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${process.env.FMP_API_KEY}`
    )
    const earningsData = await response.json()

    if (!Array.isArray(earningsData)) {
      console.error('[Weekly Earnings] Invalid FMP response:', earningsData)
      return NextResponse.json({ error: 'Invalid FMP response' }, { status: 500 })
    }

    console.log(`[Weekly Earnings] FMP returned ${earningsData.length} total earnings events`)

    // 5. Process each user
    let emailsSent = 0
    const userResults: Array<{ userId: string; email: string; earningsCount: number }> = []

    for (const userSetting of userSettings) {
      const userId = userSetting.user_id

      // Get user's watchlist tickers
      const userTickers = watchlistItems
        .filter(w => w.user_id === userId)
        .map(w => w.ticker)

      if (userTickers.length === 0) continue

      // Filter earnings for this user's tickers
      const userEarnings = earningsData.filter((e: any) =>
        userTickers.includes(e.symbol)
      )

      if (userEarnings.length === 0) {
        console.log(`[Weekly Earnings] No earnings for user ${userId} this week`)
        continue
      }

      // Group earnings by date
      const groupedEarnings: GroupedEarnings = {}
      for (const earning of userEarnings) {
        const date = earning.date
        if (!groupedEarnings[date]) {
          groupedEarnings[date] = []
        }
        groupedEarnings[date].push({
          symbol: earning.symbol,
          date: earning.date,
          time: earning.time || ''
        })
      }

      // Sort earnings within each day alphabetically
      for (const date of Object.keys(groupedEarnings)) {
        groupedEarnings[date].sort((a, b) => a.symbol.localeCompare(b.symbol))
      }

      // Check if user is Premium (email notifications are Premium-only)
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, is_premium')
        .eq('user_id', userId)
        .maybeSingle()

      const isPremiumUser = profile?.is_premium || false
      const bypassPremiumCheck = !!TEST_USER_ID && userId === TEST_USER_ID

      if (!isPremiumUser && !bypassPremiumCheck) {
        console.log(`[Weekly Earnings] Skipping non-Premium user ${userId}`)
        continue
      }

      if (bypassPremiumCheck && !isPremiumUser) {
        console.log(`[Weekly Earnings] Test mode: Bypassing premium check for user ${userId}`)
      }

      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)

      if (!user?.email) {
        console.log(`[Weekly Earnings] No email for user ${userId}`)
        continue
      }

      // Generate and send email
      const isTest = !!TEST_USER_ID
      const subject = isTest
        ? `[TEST] 📅 Deine Earnings-Woche: ${weekRange}`
        : `📅 Deine Earnings-Woche: ${weekRange}`

      const htmlContent = generateEmailHtml(groupedEarnings, weekRange, isTest)

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Finclue <team@finclue.de>',
          to: [user.email],
          subject,
          html: htmlContent,
        })

        if (emailError) {
          console.error(`[Weekly Earnings] Email error for ${user.email}:`, emailError)
          continue
        }

        emailsSent++
        userResults.push({
          userId,
          email: user.email,
          earningsCount: userEarnings.length
        })

        console.log(`[Weekly Earnings] 📧 Email sent to ${user.email} with ${userEarnings.length} earnings`)

        // Log to notification_log
        await supabase.from('notification_log').insert({
          user_id: userId,
          notification_type: 'weekly_earnings_digest',
          reference_id: Object.keys(groupedEarnings).join(','),
          content: {
            earnings: groupedEarnings,
            weekRange,
            earningsCount: userEarnings.length
          },
          email_sent: true
        })

      } catch (emailError) {
        console.error(`[Weekly Earnings] Failed to send email to ${user.email}:`, emailError)
      }
    }

    console.log(`[Weekly Earnings] Complete: ${emailsSent} emails sent`)

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      weekRange,
      usersChecked: userSettings.length,
      emailsSent,
      userResults
    })

  } catch (error) {
    console.error('[Weekly Earnings] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send weekly earnings digest' }, { status: 500 })
  }
}
