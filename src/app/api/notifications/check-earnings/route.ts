// src/app/api/notifications/check-earnings/route.ts
// Creates IN-APP notifications for upcoming earnings based on user's earnings_days_before setting
// Email notifications are now handled separately by /api/notifications/send-weekly-earnings
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// TEST MODE: Set to your user ID to only send notifications to yourself
// Set to null to send to all users. Must be a valid UUID format.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Earnings Cron] Starting earnings check (in-app notifications only)...')
    console.log(`[Earnings Cron] Test mode: ${TEST_USER_ID ? 'ON (user: ' + TEST_USER_ID + ')' : 'OFF'}`)

    // 1. Get users with earnings notifications enabled (in-app)
    let settingsQuery = supabase
      .from('notification_settings')
      .select('user_id, earnings_enabled, earnings_days_before')
      .eq('earnings_enabled', true)

    if (TEST_USER_ID) {
      settingsQuery = settingsQuery.eq('user_id', TEST_USER_ID)
    }

    const { data: userSettings, error: settingsError } = await settingsQuery

    if (settingsError) {
      console.error('[Earnings Cron] Settings Error:', settingsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!userSettings || userSettings.length === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        message: 'No users with earnings notifications enabled',
        usersChecked: 0,
        tickersChecked: 0,
        earningsFoundInPeriod: 0,
        notificationsCreated: 0
      })
    }

    // Get all user IDs with earnings enabled
    const userIds = userSettings.map(s => s.user_id)

    // 2. Get watchlist items for these users
    let watchlistQuery = supabase
      .from('watchlists')
      .select('user_id, ticker')
      .in('user_id', userIds)

    const { data: watchlistItems, error: watchlistError } = await watchlistQuery

    if (watchlistError) {
      console.error('[Earnings Cron] Watchlist Error:', watchlistError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!watchlistItems || watchlistItems.length === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        message: 'No watchlist items found',
        usersChecked: userSettings.length,
        tickersChecked: 0,
        earningsFoundInPeriod: 0,
        notificationsCreated: 0,
        emailsSent: 0
      })
    }

    const tickers = [...new Set(watchlistItems.map(w => w.ticker))]
    console.log(`[Earnings Cron] Checking ${tickers.length} unique tickers for ${userSettings.length} users`)

    // 3. Fetch earnings calendar (max 7 days ahead to cover all user preferences)
    const today = new Date()
    const maxDaysAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const fromDate = today.toISOString().split('T')[0]
    const toDate = maxDaysAhead.toISOString().split('T')[0]

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${process.env.FMP_API_KEY}`
    )
    const earningsData = await response.json()

    if (!Array.isArray(earningsData)) {
      console.error('[Earnings Cron] Invalid FMP response:', earningsData)
      return NextResponse.json({ error: 'Invalid FMP response' }, { status: 500 })
    }

    // Filter to watchlist tickers
    const upcomingEarnings = earningsData.filter((e: any) =>
      tickers.includes(e.symbol)
    )

    console.log(`[Earnings Cron] Found ${upcomingEarnings.length} earnings events for watchlist tickers`)

    let notificationsCreated = 0

    // 4. Process each earning event - create IN-APP notifications only
    for (const earning of upcomingEarnings) {
      const earningsDate = new Date(earning.date)
      const daysUntil = Math.ceil((earningsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Find users who have this ticker and whose days_before setting matches
      const usersWithTicker = watchlistItems
        .filter(w => w.ticker === earning.symbol)
        .map(w => w.user_id)

      const uniqueUserIds = [...new Set(usersWithTicker)]

      for (const userId of uniqueUserIds) {
        const userSetting = userSettings.find(s => s.user_id === userId)
        if (!userSetting) continue

        // Check if earnings is within user's notification window
        const userDaysBefore = userSetting.earnings_days_before || 3
        if (daysUntil > userDaysBefore) {
          console.log(`[Earnings Cron] Skipping ${earning.symbol} for user ${userId}: ${daysUntil} days > ${userDaysBefore} days setting`)
          continue
        }

        // Check if we already sent a notification for this earning
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'earnings_alert')
          .ilike('title', `%${earning.symbol}%`)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle()

        if (!existing) {
          // Create in-app notification
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'earnings_alert',
            title: `${earning.symbol} Earnings in ${daysUntil} Tag${daysUntil !== 1 ? 'en' : ''}`,
            message: `${earning.symbol} veröffentlicht am ${earningsDate.toLocaleDateString('de-DE')} Quartalszahlen`,
            data: { symbol: earning.symbol, date: earning.date, daysUntil },
            href: `/analyse/stocks/${earning.symbol.toLowerCase()}/earnings`,
            read: false
          })
          notificationsCreated++
          console.log(`[Earnings Cron] ✅ Created in-app notification for ${earning.symbol} (${daysUntil} days) - User ${userId}`)
        }
      }
    }

    console.log(`[Earnings Cron] Complete: ${notificationsCreated} in-app notifications created`)

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      usersChecked: userSettings.length,
      tickersChecked: tickers.length,
      earningsFoundInPeriod: upcomingEarnings.length,
      notificationsCreated,
      earningsDetails: upcomingEarnings.map((e: any) => ({
        symbol: e.symbol,
        date: e.date
      }))
    })
  } catch (error) {
    console.error('[Earnings Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to check earnings' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to trigger earnings check', testMode: !!TEST_USER_ID })
}
