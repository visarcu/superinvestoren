// src/app/api/notifications/send-weekly-dividends/route.ts
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

// TEST MODE: Set TEST_USER_ID env var to a valid UUID to only send to yourself
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

interface DividendEvent {
  symbol: string
  name?: string
  exDividendDate: string
  paymentDate: string
  dividend: number // per share
  quantity: number // user's shares
  totalPayout: number // dividend * quantity
  currency: string
}

function formatGermanDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getUTCDate()
  const month = MONTHS[date.getUTCMonth()]
  return `${day}. ${month}`
}

function formatWeekRange(startDate: Date, endDate: Date): string {
  const startDay = startDate.getUTCDate()
  const startMonth = MONTHS[startDate.getUTCMonth()]
  const endDay = endDate.getUTCDate()
  const endMonth = MONTHS[endDate.getUTCMonth()]

  if (startMonth === endMonth) {
    return `${startDay}. - ${endDay}. ${endMonth}`
  }
  return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`
}

function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function formatShares(quantity: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(quantity)
}

function generateEmailHtml(
  dividends: DividendEvent[],
  weekRange: string,
  totalBrutto: number,
  isTest: boolean
): string {
  const sortedDividends = [...dividends].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  )

  let tableRows = ''
  for (const div of sortedDividends) {
    tableRows += `
      <tr>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600;">
          ${div.symbol}
        </td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; white-space: nowrap;">
          ${formatGermanDate(div.exDividendDate)}
        </td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; white-space: nowrap;">
          ${formatGermanDate(div.paymentDate)}
        </td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; text-align: right;">
          ${formatShares(div.quantity)}
        </td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #059669; font-size: 14px; font-weight: 600; text-align: right; white-space: nowrap;">
          ${formatCurrency(div.totalPayout, div.currency)}
        </td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dividenden diese Woche | Finclue</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111827; background-color: #f9fafb;">

      <!-- Header -->
      <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px 16px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #374151; margin: 0; font-size: 24px; font-weight: 700;">Finclue</h1>
          <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;">Wöchentliche Dividenden-Übersicht</p>
          ${isTest ? '<p style="background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin: 8px auto; display: inline-block;">🧪 TEST E-MAIL</p>' : ''}
        </div>
      </div>

      <!-- Main Content -->
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <div style="padding: 32px;">
          <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">
            💰 Deine Dividenden diese Woche
          </h2>

          <p style="color: #6b7280; font-size: 15px; margin: 0 0 8px 0; line-height: 1.5;">
            Basierend auf deinem aktuellen Portfolio erwarten dich diese Woche
            Bruttodividendenerträge in Höhe von:
          </p>

          <!-- Total Highlight -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin: 16px 0 28px 0; text-align: center;">
            <span style="color: #059669; font-size: 28px; font-weight: 700;">${formatCurrency(totalBrutto)}</span>
            <p style="color: #166534; font-size: 12px; margin: 4px 0 0 0;">Brutto-Dividenden (${weekRange})</p>
          </div>

          <!-- Dividend Table -->
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Unternehmen</th>
                  <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Ex-Tag</th>
                  <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Zahltag</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Anteile</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Ausschüttung</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 0 0 24px 0;">
            <a href="https://finclue.de/portfolio"
               target="_blank"
               rel="noopener noreferrer"
               style="display: inline-block; background: #374151; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; border: 1px solid #374151;">
              Zum Portfolio →
            </a>
          </div>

          <!-- Disclaimer -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
              Bitte beachte, dass du die Aktien vor dem Ex-Dividenden-Datum halten musst, um die Dividende zu erhalten.
              In den meisten Fällen benötigt deine Bank einige Tage, um den Betrag zu verbuchen.
              Alle Angaben ohne Gewähr.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
            Du erhältst diese E-Mail jeden Montag für Dividenden aus deinem Portfolio.
          </p>
          <div style="text-align: center;">
            <a href="https://finclue.de/portfolio" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Portfolio</a>
            <span style="color: #d1d5db;">•</span>
            <a href="https://finclue.de/settings" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Einstellungen</a>
          </div>
        </div>

      </div>

      <!-- Spacer -->
      <div style="height: 32px;"></div>

    </body>
    </html>
  `
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleWeeklyDividends()
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleWeeklyDividends()
}

async function handleWeeklyDividends() {
  try {
    console.log('[Weekly Dividends] Starting weekly dividend digest...')
    console.log(`[Weekly Dividends] Test mode: ${TEST_USER_ID ? 'ON (user: ' + TEST_USER_ID + ')' : 'OFF'}`)

    // 1. Calculate week range (Monday to Sunday)
    const today = new Date()
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getUTCDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setUTCDate(today.getUTCDate() + daysToMonday)
    startOfWeek.setUTCHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6)

    const fromDate = startOfWeek.toISOString().split('T')[0]
    const toDate = endOfWeek.toISOString().split('T')[0]
    const weekRange = formatWeekRange(startOfWeek, endOfWeek)

    console.log(`[Weekly Dividends] Week: ${fromDate} to ${toDate}`)

    // 2. Fetch dividend calendar from FMP for this week
    const fmpRes = await fetch(
      `https://financialmodelingprep.com/api/v3/stock_dividend_calendar?from=${fromDate}&to=${toDate}&apikey=${process.env.FMP_API_KEY}`
    )
    const dividendCalendar: Array<{
      symbol: string
      date: string          // ex-dividend date
      dividend: number
      recordDate: string
      paymentDate: string
      declarationDate: string
    }> = await fmpRes.json()

    if (!Array.isArray(dividendCalendar)) {
      console.error('[Weekly Dividends] Invalid FMP response:', dividendCalendar)
      return NextResponse.json({ error: 'Invalid FMP response' }, { status: 500 })
    }

    console.log(`[Weekly Dividends] FMP returned ${dividendCalendar.length} dividend events this week`)

    if (dividendCalendar.length === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        weekRange,
        message: 'No dividend events this week',
        emailsSent: 0
      })
    }

    // Build a quick lookup: symbol → dividend event
    const dividendBySymbol = new Map<string, typeof dividendCalendar[0]>()
    for (const event of dividendCalendar) {
      if (event.dividend > 0) {
        dividendBySymbol.set(event.symbol, event)
      }
    }

    // 3. Get all users who have portfolios with holdings that match this week's dividend symbols
    // First: get all relevant portfolio holdings
    const dividendSymbols = Array.from(dividendBySymbol.keys())

    let holdingsQuery = supabase
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, quantity')
      .in('symbol', dividendSymbols)
      .gt('quantity', 0)

    const { data: allMatchingHoldings, error: holdingsError } = await holdingsQuery

    if (holdingsError) {
      console.error('[Weekly Dividends] Holdings error:', holdingsError)
      return NextResponse.json({ error: 'Database error', message: holdingsError.message }, { status: 500 })
    }

    if (!allMatchingHoldings || allMatchingHoldings.length === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        weekRange,
        message: 'No portfolio holdings match this week\'s dividends',
        emailsSent: 0
      })
    }

    // Get unique portfolio IDs
    const portfolioIds = [...new Set(allMatchingHoldings.map(h => h.portfolio_id))]

    // 4. Get portfolios with user_id
    let portfoliosQuery = supabase
      .from('portfolios')
      .select('id, user_id')
      .in('id', portfolioIds)

    if (TEST_USER_ID) {
      portfoliosQuery = portfoliosQuery.eq('user_id', TEST_USER_ID)
    }

    const { data: portfolios, error: portfoliosError } = await portfoliosQuery

    if (portfoliosError) {
      console.error('[Weekly Dividends] Portfolios error:', portfoliosError)
      return NextResponse.json({ error: 'Database error', message: portfoliosError.message }, { status: 500 })
    }

    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        weekRange,
        message: TEST_USER_ID ? 'Test user has no matching portfolio holdings' : 'No users found',
        emailsSent: 0
      })
    }

    // Map portfolio_id → user_id
    const portfolioUserMap = new Map<string, string>()
    for (const p of portfolios) {
      portfolioUserMap.set(p.id, p.user_id)
    }

    // 5. Group holdings by user_id, aggregate quantities across portfolios
    const userHoldings = new Map<string, Map<string, number>>() // userId → symbol → totalQuantity

    for (const holding of allMatchingHoldings) {
      const userId = portfolioUserMap.get(holding.portfolio_id)
      if (!userId) continue
      if (TEST_USER_ID && userId !== TEST_USER_ID) continue

      if (!userHoldings.has(userId)) {
        userHoldings.set(userId, new Map())
      }
      const symbolMap = userHoldings.get(userId)!
      symbolMap.set(holding.symbol, (symbolMap.get(holding.symbol) || 0) + holding.quantity)
    }

    if (userHoldings.size === 0) {
      return NextResponse.json({
        success: true,
        testMode: !!TEST_USER_ID,
        weekRange,
        message: 'No matching user holdings after filtering',
        emailsSent: 0
      })
    }

    // 6. Send emails per user
    let emailsSent = 0
    const userResults: Array<{ userId: string; email: string; dividendCount: number; totalPayout: number }> = []

    for (const [userId, symbolMap] of userHoldings) {
      // Check Premium status (bypass for test user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, is_premium')
        .eq('user_id', userId)
        .maybeSingle()

      const isPremiumUser = profile?.is_premium || false
      const bypassPremiumCheck = !!TEST_USER_ID && userId === TEST_USER_ID

      if (!isPremiumUser && !bypassPremiumCheck) {
        console.log(`[Weekly Dividends] Skipping non-Premium user ${userId}`)
        continue
      }

      if (bypassPremiumCheck && !isPremiumUser) {
        console.log(`[Weekly Dividends] Test mode: Bypassing premium check for user ${userId}`)
      }

      // Build dividend events for this user
      const userDividends: DividendEvent[] = []

      for (const [symbol, quantity] of symbolMap) {
        const event = dividendBySymbol.get(symbol)
        if (!event) continue

        userDividends.push({
          symbol,
          exDividendDate: event.date,
          paymentDate: event.paymentDate || event.date,
          dividend: event.dividend,
          quantity,
          totalPayout: event.dividend * quantity,
          currency: 'USD' // FMP returns USD for US stocks; we show as-is
        })
      }

      if (userDividends.length === 0) continue

      const totalBrutto = userDividends.reduce((sum, d) => sum + d.totalPayout, 0)

      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)

      if (!user?.email) {
        console.log(`[Weekly Dividends] No email for user ${userId}`)
        continue
      }

      const isTest = !!TEST_USER_ID
      const subject = isTest
        ? `[TEST] 💰 Deine Dividenden-Woche: ${weekRange}`
        : `💰 Deine Dividenden-Woche: ${weekRange}`

      const htmlContent = generateEmailHtml(userDividends, weekRange, totalBrutto, isTest)

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Finclue <team@finclue.de>',
          to: [user.email],
          subject,
          html: htmlContent,
        })

        if (emailError) {
          console.error(`[Weekly Dividends] Email error for ${user.email}:`, emailError)
          continue
        }

        emailsSent++
        userResults.push({
          userId,
          email: user.email,
          dividendCount: userDividends.length,
          totalPayout: totalBrutto
        })

        console.log(`[Weekly Dividends] 📧 Email sent to ${user.email} — ${userDividends.length} dividends, ${formatCurrency(totalBrutto)}`)

        // Log to notification_log
        await supabase.from('notification_log').insert({
          user_id: userId,
          notification_type: 'weekly_dividend_digest',
          reference_id: userDividends.map(d => d.symbol).join(','),
          content: {
            dividends: userDividends,
            weekRange,
            totalBrutto,
            dividendCount: userDividends.length
          },
          email_sent: true
        })

      } catch (emailError) {
        console.error(`[Weekly Dividends] Failed to send email to ${user.email}:`, emailError)
      }
    }

    console.log(`[Weekly Dividends] Complete: ${emailsSent} emails sent`)

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      weekRange,
      dividendEventsThisWeek: dividendCalendar.length,
      emailsSent,
      userResults
    })

  } catch (error) {
    console.error('[Weekly Dividends] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send weekly dividend digest' }, { status: 500 })
  }
}
