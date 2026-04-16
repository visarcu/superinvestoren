// src/app/api/notifications/daily-portfolio-mover/route.ts
// Daily cron at 18:00 UTC (after market close): notifies users about the biggest mover in their portfolio
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const MOVE_THRESHOLD_PERCENT = 2 // minimum absolute % change to trigger a notification

interface FmpQuote {
  symbol: string
  name: string
  changesPercentage: number
  price: number
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const testUserId = searchParams.get('testUserId')
  return handleDailyPortfolioMover(testUserId)
}

async function handleDailyPortfolioMover(testUserId: string | null = null) {
  try {
    if (testUserId) console.log(`[Daily Portfolio Mover] TEST MODE — only notifying ${testUserId}`)
    else console.log('[Daily Portfolio Mover] Starting...')

    // 1. Get users with push tokens (filtered to testUser if set)
    let tokenQuery = supabaseAdmin.from('device_tokens').select('user_id, token')
    if (testUserId) tokenQuery = tokenQuery.eq('user_id', testUserId)
    const { data: deviceTokenRows, error: tokenError } = await tokenQuery

    if (tokenError) {
      console.error('[Daily Portfolio Mover] device_tokens error:', tokenError)
      return NextResponse.json({ error: 'Database error', details: tokenError.message }, { status: 500 })
    }

    if (!deviceTokenRows || deviceTokenRows.length === 0) {
      console.log('[Daily Portfolio Mover] No users with device tokens')
      return NextResponse.json({ success: true, message: 'No device tokens found', notificationsSent: 0 })
    }

    const userIds = [...new Set(deviceTokenRows.map(r => r.user_id))]
    console.log(`[Daily Portfolio Mover] ${userIds.length} users with push tokens`)

    // 2. Get portfolio holdings for these users
    const { data: portfolios, error: portfoliosError } = await supabaseAdmin
      .from('portfolios')
      .select('id, user_id')
      .in('user_id', userIds)

    if (portfoliosError) {
      console.error('[Daily Portfolio Mover] portfolios error:', portfoliosError)
      return NextResponse.json({ error: 'Database error', details: portfoliosError.message }, { status: 500 })
    }

    if (!portfolios || portfolios.length === 0) {
      console.log('[Daily Portfolio Mover] No portfolios found')
      return NextResponse.json({ success: true, message: 'No portfolios found', notificationsSent: 0 })
    }

    const portfolioIds = portfolios.map(p => p.id)

    const { data: holdings, error: holdingsError } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('portfolio_id, symbol')
      .in('portfolio_id', portfolioIds)

    if (holdingsError) {
      console.error('[Daily Portfolio Mover] portfolio_holdings error:', holdingsError)
      return NextResponse.json({ error: 'Database error', details: holdingsError.message }, { status: 500 })
    }

    if (!holdings || holdings.length === 0) {
      console.log('[Daily Portfolio Mover] No holdings found')
      return NextResponse.json({ success: true, message: 'No holdings found', notificationsSent: 0 })
    }

    // Build user → symbols map
    const portfolioMap = new Map<string, string>() // portfolio_id → user_id
    for (const p of portfolios) {
      portfolioMap.set(p.id, p.user_id)
    }

    const userSymbols = new Map<string, Set<string>>() // user_id → Set<symbol>
    for (const holding of holdings) {
      const userId = portfolioMap.get(holding.portfolio_id)
      if (!userId) continue
      if (!userSymbols.has(userId)) userSymbols.set(userId, new Set())
      userSymbols.get(userId)!.add(holding.symbol)
    }

    // 3. Collect all unique symbols across all users for a single batch FMP request
    const allSymbols = [...new Set(holdings.map(h => h.symbol))]
    console.log(`[Daily Portfolio Mover] Fetching quotes for ${allSymbols.length} unique symbols`)

    // FMP batch quote endpoint supports comma-separated symbols
    const symbolsParam = allSymbols.join(',')
    const fmpResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbolsParam)}?apikey=${process.env.FMP_API_KEY}`
    )
    const quotesData: FmpQuote[] = await fmpResponse.json()

    if (!Array.isArray(quotesData)) {
      console.error('[Daily Portfolio Mover] Invalid FMP response:', quotesData)
      return NextResponse.json({ error: 'Invalid FMP response' }, { status: 500 })
    }

    console.log(`[Daily Portfolio Mover] FMP returned ${quotesData.length} quotes`)

    // Build a lookup map: symbol → quote
    const quoteMap = new Map<string, FmpQuote>()
    for (const q of quotesData) {
      quoteMap.set(q.symbol, q)
    }

    // 4. Process each user
    const secret = process.env.INTERNAL_API_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de'
    let notificationsSent = 0
    const results: Array<{ userId: string; movers: string[] }> = []

    const fmtChange = (pct: number) => {
      const sign = pct >= 0 ? '+' : ''
      return sign + pct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
    }

    for (const userId of userIds) {
      try {
        const symbols = userSymbols.get(userId)
        if (!symbols || symbols.size === 0) continue

        // Get all quotes for user's symbols, sorted by absolute % change descending
        const userQuotes = [...symbols]
          .map(sym => quoteMap.get(sym))
          .filter((q): q is FmpQuote => !!q && q.changesPercentage != null)
          .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))

        // Skip if biggest mover doesn't exceed threshold
        if (userQuotes.length === 0 || Math.abs(userQuotes[0].changesPercentage) < MOVE_THRESHOLD_PERCENT) {
          console.log(`[Daily Portfolio Mover] No significant movers for user ${userId}`)
          continue
        }

        // Take top 5 movers (only those above threshold)
        const topMovers = userQuotes
          .filter(q => Math.abs(q.changesPercentage) >= MOVE_THRESHOLD_PERCENT)
          .slice(0, 5)

        // Format: "AMZN +5,4% · PDD -3,0% · AMD +2,0%"
        const moverParts = topMovers.map(q => `${q.symbol} ${fmtChange(q.changesPercentage)}`)
        const title = 'Top Mover in deinem Depot'
        const body = moverParts.join(' · ')

        if (!secret) {
          console.warn('[Daily Portfolio Mover] INTERNAL_API_SECRET not set, skipping push')
          continue
        }

        const pushResponse = await fetch(`${baseUrl}/api/notifications/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
          body: JSON.stringify({
            userIds: [userId],
            title,
            body,
            data: topMovers.length === 1
              ? { screen: 'stock', ticker: topMovers[0].symbol }
              : { screen: 'portfolio' },
          }),
        })

        if (!pushResponse.ok) {
          const errText = await pushResponse.text()
          console.error(`[Daily Portfolio Mover] Push failed for user ${userId}:`, errText)
          continue
        }

        notificationsSent++
        results.push({ userId, movers: moverParts })
        console.log(`[Daily Portfolio Mover] Sent to ${userId}: ${body}`)
      } catch (userError) {
        console.error(`[Daily Portfolio Mover] Error processing user ${userId}:`, userError)
      }
    }

    console.log(`[Daily Portfolio Mover] Complete: ${notificationsSent} notifications sent`)

    return NextResponse.json({
      success: true,
      symbolsChecked: allSymbols.length,
      usersChecked: userIds.length,
      notificationsSent,
      results: results.map(r => ({ userId: r.userId, movers: r.movers })),
    })
  } catch (error) {
    console.error('[Daily Portfolio Mover] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send daily portfolio mover' }, { status: 500 })
  }
}
