// src/app/api/notifications/daily-dividend-reminder/route.ts
// Daily cron at 07:30 UTC: notifies users if a portfolio stock pays dividend today
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const testUserId = searchParams.get('testUserId')
  return handleDailyDividendReminder(testUserId)
}

async function handleDailyDividendReminder(testUserId: string | null = null) {
  try {
    if (testUserId) console.log(`[Daily Dividend Reminder] TEST MODE — only notifying ${testUserId}`)
    else console.log('[Daily Dividend Reminder] Starting...')

    const todayStr = new Date().toISOString().split('T')[0]

    // 1. Get users with push tokens (filtered to testUser if set)
    let tokenQuery = supabaseAdmin.from('device_tokens').select('user_id, token')
    if (testUserId) tokenQuery = tokenQuery.eq('user_id', testUserId)
    const { data: deviceTokenRows, error: tokenError } = await tokenQuery

    if (tokenError || !deviceTokenRows || deviceTokenRows.length === 0) {
      console.log('[Daily Dividend Reminder] No device tokens found')
      return NextResponse.json({ success: true, notificationsSent: 0, testMode: !!testUserId })
    }

    const userIds = [...new Set(deviceTokenRows.map(r => r.user_id))]

    // 2. Get portfolio holdings per user
    const { data: portfolios } = await supabaseAdmin
      .from('portfolios')
      .select('id, user_id')
      .in('user_id', userIds)

    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json({ success: true, notificationsSent: 0 })
    }

    const portfolioIds = portfolios.map(p => p.id)
    const { data: holdings } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('portfolio_id, symbol')
      .in('portfolio_id', portfolioIds)

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({ success: true, notificationsSent: 0 })
    }

    // Map: userId → Set<symbol>
    const portfolioMap = new Map<string, string>()
    for (const p of portfolios) portfolioMap.set(p.id, p.user_id)

    const userSymbols = new Map<string, Set<string>>()
    for (const h of holdings) {
      const userId = portfolioMap.get(h.portfolio_id)
      if (!userId) continue
      if (!userSymbols.has(userId)) userSymbols.set(userId, new Set())
      userSymbols.get(userId)!.add(h.symbol)
    }

    // 3. Get all unique symbols and fetch dividend calendar from FMP
    const allSymbols = [...new Set(holdings.map(h => h.symbol))]
    console.log(`[Daily Dividend Reminder] Checking ${allSymbols.length} symbols for dividends on ${todayStr}`)

    // Fetch dividend history for each symbol in parallel (check paymentDate = today)
    const dividendChecks = await Promise.all(
      allSymbols.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${symbol}?apikey=${process.env.FMP_API_KEY}`
          )
          if (!res.ok) return null
          const data = await res.json()
          const todayDiv = (data.historical || []).find((d: any) => d.paymentDate === todayStr)
          if (!todayDiv) return null
          return { symbol, dividend: todayDiv.dividend || todayDiv.adjDividend || 0 }
        } catch {
          return null
        }
      })
    )

    // Symbols paying dividend today
    const payingToday = dividendChecks.filter(Boolean) as { symbol: string; dividend: number }[]
    console.log(`[Daily Dividend Reminder] ${payingToday.length} symbols pay dividend today: ${payingToday.map(p => p.symbol).join(', ')}`)

    if (payingToday.length === 0) {
      return NextResponse.json({ success: true, notificationsSent: 0, message: 'No dividends today' })
    }

    const payingSet = new Map(payingToday.map(p => [p.symbol, p.dividend]))

    // 3b. Fetch company names for paying symbols
    const nameMap = new Map<string, string>()
    try {
      const symbols = payingToday.map(p => p.symbol).join(',')
      const quoteRes = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${process.env.FMP_API_KEY}`)
      if (quoteRes.ok) {
        const quotes = await quoteRes.json()
        for (const q of (Array.isArray(quotes) ? quotes : [])) {
          if (q.symbol && q.name) nameMap.set(q.symbol, q.name)
        }
      }
    } catch { /* silent */ }

    function displayName(symbol: string) {
      const name = nameMap.get(symbol)
      return name ? `${name} (${symbol})` : symbol
    }

    // 4. Send push per user
    const secret  = process.env.INTERNAL_API_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de'
    let notificationsSent = 0

    for (const userId of userIds) {
      try {
        const symbols = userSymbols.get(userId)
        if (!symbols || symbols.size === 0) continue

        const userPayouts = payingToday.filter(p => symbols.has(p.symbol))
        if (userPayouts.length === 0) continue

        let title: string
        let body: string
        let data: Record<string, any>

        if (userPayouts.length === 1) {
          const { symbol, dividend } = userPayouts[0]
          const fmtDiv = dividend.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
          title = `Dividende heute`
          body  = `${displayName(symbol)} zahlt heute ${fmtDiv} $ pro Aktie`
          data  = { screen: 'stock', ticker: symbol }
        } else if (userPayouts.length === 2) {
          title = `Dividenden heute`
          body  = `${displayName(userPayouts[0].symbol)} & ${displayName(userPayouts[1].symbol)} zahlen heute Dividende`
          data  = { screen: 'portfolio' }
        } else {
          title = `Dividenden heute`
          body  = `${displayName(userPayouts[0].symbol)}, ${displayName(userPayouts[1].symbol)} & ${userPayouts.length - 2} weitere zahlen heute`
          data  = { screen: 'portfolio' }
        }

        if (!secret) continue

        // Create in-app notification
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          type: 'dividend_alert',
          title,
          message: body,
          data,
        })

        const pushRes = await fetch(`${baseUrl}/api/notifications/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
          body: JSON.stringify({ userIds: [userId], title, body, data }),
        })

        if (pushRes.ok) {
          notificationsSent++
          console.log(`[Daily Dividend Reminder] Sent to ${userId}: ${userPayouts.map(p => p.symbol).join(', ')}`)
        }
      } catch (err) {
        console.error(`[Daily Dividend Reminder] Error for user ${userId}:`, err)
      }
    }

    return NextResponse.json({ success: true, notificationsSent, payingToday: payingToday.map(p => p.symbol) })
  } catch (error) {
    console.error('[Daily Dividend Reminder] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
