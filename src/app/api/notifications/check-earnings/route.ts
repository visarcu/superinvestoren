import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// TEST MODE: Set to your user ID to only send notifications to yourself
// Set to null to send to all users
const TEST_USER_ID = process.env.TEST_USER_ID || null

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Build query - filter by test user if set
    let query = supabase.from('watchlist_items').select('user_id, ticker')
    if (TEST_USER_ID) {
      query = query.eq('user_id', TEST_USER_ID)
    }

    const { data: watchlistItems } = await query

    if (!watchlistItems || watchlistItems.length === 0) {
      return NextResponse.json({ message: 'No watchlist items', testMode: !!TEST_USER_ID })
    }

    const tickers = [...new Set(watchlistItems.map(w => w.ticker))]

    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const fromDate = today.toISOString().split('T')[0]
    const toDate = nextWeek.toISOString().split('T')[0]

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${process.env.FMP_API_KEY}`
    )
    const earningsData = await response.json()

    const upcomingEarnings = earningsData.filter((e: any) =>
      tickers.includes(e.symbol)
    )

    let notificationsCreated = 0

    for (const earning of upcomingEarnings) {
      const usersWithTicker = watchlistItems
        .filter(w => w.ticker === earning.symbol)
        .map(w => w.user_id)

      const uniqueUsers = [...new Set(usersWithTicker)]

      for (const userId of uniqueUsers) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'earnings_alert')
          .ilike('title', `%${earning.symbol}%`)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle()

        if (!existing) {
          const earningsDate = new Date(earning.date)
          const daysUntil = Math.ceil((earningsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'earnings_alert',
            title: `${earning.symbol} Earnings in ${daysUntil} Tag${daysUntil > 1 ? 'en' : ''}`,
            message: `${earning.symbol} veröffentlicht am ${earningsDate.toLocaleDateString('de-DE')} Quartalszahlen`,
            data: { symbol: earning.symbol, date: earning.date },
            href: `/analyse/stocks/${earning.symbol.toLowerCase()}/earnings`,
            read: false
          })
          notificationsCreated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      notificationsCreated,
      upcomingEarnings: upcomingEarnings.length
    })
  } catch (error) {
    console.error('Error checking earnings:', error)
    return NextResponse.json({ error: 'Failed to check earnings' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to trigger earnings check', testMode: !!TEST_USER_ID })
}
