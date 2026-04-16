// src/app/api/notifications/daily-earnings-reminder/route.ts
// Daily cron at 08:00 UTC: notifies users with push if any portfolio stock reports earnings today or tomorrow
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface EarningsEvent {
  symbol: string
  name?: string
  date: string
  time?: string // 'bmo' = before market open, 'amc' = after market close
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  return handleDailyEarningsReminder(searchParams.get('testUserId'))
}

async function handleDailyEarningsReminder(testUserId: string | null = null) {
  try {
    if (testUserId) console.log(`[Daily Earnings Reminder] TEST MODE — only notifying ${testUserId}`)
    else console.log('[Daily Earnings Reminder] Starting...')

    // 1. Get users with push tokens (filtered to testUser if set)
    let tokenQuery = supabaseAdmin.from('device_tokens').select('user_id, token')
    if (testUserId) tokenQuery = tokenQuery.eq('user_id', testUserId)
    const { data: deviceTokenRows, error: tokenError } = await tokenQuery

    if (tokenError) {
      console.error('[Daily Earnings Reminder] device_tokens error:', tokenError)
      return NextResponse.json({ error: 'Database error', details: tokenError.message }, { status: 500 })
    }

    if (!deviceTokenRows || deviceTokenRows.length === 0) {
      console.log('[Daily Earnings Reminder] No users with device tokens')
      return NextResponse.json({ success: true, message: 'No device tokens found', notificationsSent: 0 })
    }

    // Collect unique user IDs that have push enabled
    const userIds = [...new Set(deviceTokenRows.map(r => r.user_id))]
    console.log(`[Daily Earnings Reminder] ${userIds.length} users with push tokens`)

    // 2. Get portfolio holdings for these users (via portfolios → portfolio_holdings)
    const { data: portfolios, error: portfoliosError } = await supabaseAdmin
      .from('portfolios')
      .select('id, user_id')
      .in('user_id', userIds)

    if (portfoliosError) {
      console.error('[Daily Earnings Reminder] portfolios error:', portfoliosError)
      return NextResponse.json({ error: 'Database error', details: portfoliosError.message }, { status: 500 })
    }

    if (!portfolios || portfolios.length === 0) {
      console.log('[Daily Earnings Reminder] No portfolios found')
      return NextResponse.json({ success: true, message: 'No portfolios found', notificationsSent: 0 })
    }

    const portfolioIds = portfolios.map(p => p.id)

    const { data: holdings, error: holdingsError } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, name')
      .in('portfolio_id', portfolioIds)

    if (holdingsError) {
      console.error('[Daily Earnings Reminder] portfolio_holdings error:', holdingsError)
      return NextResponse.json({ error: 'Database error', details: holdingsError.message }, { status: 500 })
    }

    if (!holdings || holdings.length === 0) {
      console.log('[Daily Earnings Reminder] No holdings found')
      return NextResponse.json({ success: true, message: 'No holdings found', notificationsSent: 0 })
    }

    // Build a map: user_id → Set<symbol>
    const portfolioMap = new Map<string, string>() // portfolio_id → user_id
    for (const p of portfolios) {
      portfolioMap.set(p.id, p.user_id)
    }

    const userSymbols = new Map<string, Set<string>>() // user_id → Set<symbol>
    const symbolNames = new Map<string, string>()      // symbol → company name from holdings
    for (const holding of holdings) {
      const userId = portfolioMap.get(holding.portfolio_id)
      if (!userId) continue
      if (!userSymbols.has(userId)) userSymbols.set(userId, new Set())
      userSymbols.get(userId)!.add(holding.symbol)
      if (holding.name) symbolNames.set(holding.symbol, holding.name)
    }

    // 3. Fetch earnings calendar for today and tomorrow from FMP
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const fromDate = today.toISOString().split('T')[0]
    const toDate = tomorrow.toISOString().split('T')[0]

    console.log(`[Daily Earnings Reminder] Fetching earnings from ${fromDate} to ${toDate}`)

    const fmpResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${process.env.FMP_API_KEY}`
    )
    const earningsData: EarningsEvent[] = await fmpResponse.json()

    if (!Array.isArray(earningsData)) {
      console.error('[Daily Earnings Reminder] Invalid FMP response:', earningsData)
      return NextResponse.json({ error: 'Invalid FMP response' }, { status: 500 })
    }

    console.log(`[Daily Earnings Reminder] FMP returned ${earningsData.length} earnings events`)

    // Separate today vs tomorrow events
    const todayEvents = earningsData.filter(e => e.date === fromDate)
    const tomorrowEvents = earningsData.filter(e => e.date === toDate)

    // 4. Process each user
    const secret = process.env.INTERNAL_API_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de'
    let notificationsSent = 0
    const results: Array<{ userId: string; symbols: string[]; when: string }> = []

    for (const userId of userIds) {
      try {
        const symbols = userSymbols.get(userId)
        if (!symbols || symbols.size === 0) continue

        // Find which portfolio stocks report earnings today or tomorrow
        const todayMatches = todayEvents.filter(e => symbols.has(e.symbol))
        const tomorrowMatches = tomorrowEvents.filter(e => symbols.has(e.symbol))

        // Prefer today's matches, fall back to tomorrow's
        const matchedEvents = todayMatches.length > 0 ? todayMatches : tomorrowMatches
        const when = todayMatches.length > 0 ? 'heute' : 'morgen'
        const matchedSymbols = matchedEvents.map(e => e.symbol)

        if (matchedSymbols.length === 0) continue

        // Clean up company name — remove common ADS/ETF suffixes
        const NOISE_SUFFIXES = [
          ' American Depositary Shares',
          ' American Depositary Share',
          ' Ordinary Shares',
          ' Common Stock',
          ' Class A',
          ' Class B',
          ' Inc.',
          ' Inc',
          ' Corp.',
          ' Corp',
          ' Ltd.',
          ' Ltd',
          ' plc',
          ' PLC',
          ' SE',
          ' AG',
          ' NV',
        ]
        const cleanName = (raw: string): string => {
          let name = raw.trim()
          // Remove suffixes iteratively (order matters — longer first)
          for (const suffix of NOISE_SUFFIXES) {
            if (name.endsWith(suffix)) {
              name = name.slice(0, -suffix.length).trim()
            }
          }
          return name
        }

        // Use company name from FMP response or fallback to holdings name or ticker
        const getName = (e: EarningsEvent) => {
          const raw = e.name || symbolNames.get(e.symbol) || e.symbol
          return cleanName(raw)
        }

        // Build time hint (bmo = vor Marktöffnung, amc = nach Börsenschluss)
        const timeHint = (e: EarningsEvent) => {
          if (e.time === 'bmo') return ' (vor Börseneröffnung)'
          if (e.time === 'amc') return ' (nach Börsenschluss)'
          return ''
        }

        // Notification text: company name + when + time hint
        let title: string
        let body: string

        if (matchedEvents.length === 1) {
          const e = matchedEvents[0]
          const hint = e.time === 'bmo' ? ' · vor Börseneröffnung' : e.time === 'amc' ? ' · nach Börsenschluss' : ''
          title = `Quartalszahlen ${when}${hint}`
          body = `${getName(e)} berichtet ${when}`
        } else if (matchedEvents.length === 2) {
          title = `Quartalszahlen ${when}`
          body = `${getName(matchedEvents[0])} & ${getName(matchedEvents[1])} berichten ${when}`
        } else {
          title = `Quartalszahlen ${when}`
          body = `${getName(matchedEvents[0])}, ${getName(matchedEvents[1])} & ${matchedEvents.length - 2} weitere berichten ${when}`
        }

        if (!secret) {
          console.warn('[Daily Earnings Reminder] INTERNAL_API_SECRET not set, skipping push')
          continue
        }

        // Deep link: single stock → stock detail, multiple → portfolio tab
        const notifData = matchedSymbols.length === 1
          ? { screen: 'stock', ticker: matchedSymbols[0] }
          : { screen: 'portfolio', symbols: matchedSymbols }

        // Create in-app notification
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          type: 'earnings_alert',
          title,
          message: body,
          data: notifData,
        })

        const pushResponse = await fetch(`${baseUrl}/api/notifications/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
          body: JSON.stringify({ userIds: [userId], title, body, data: notifData }),
        })

        if (!pushResponse.ok) {
          const errText = await pushResponse.text()
          console.error(`[Daily Earnings Reminder] Push failed for user ${userId}:`, errText)
          continue
        }

        notificationsSent++
        results.push({ userId, symbols: matchedSymbols, when })
        console.log(`[Daily Earnings Reminder] Sent push to ${userId}: ${matchedSymbols.join(', ')} (${when})`)
      } catch (userError) {
        console.error(`[Daily Earnings Reminder] Error processing user ${userId}:`, userError)
      }
    }

    console.log(`[Daily Earnings Reminder] Complete: ${notificationsSent} notifications sent`)

    return NextResponse.json({
      success: true,
      date: fromDate,
      earningsToday: todayEvents.length,
      earningsTomorrow: tomorrowEvents.length,
      usersChecked: userIds.length,
      notificationsSent,
      results,
    })
  } catch (error) {
    console.error('[Daily Earnings Reminder] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send daily earnings reminder' }, { status: 500 })
  }
}
