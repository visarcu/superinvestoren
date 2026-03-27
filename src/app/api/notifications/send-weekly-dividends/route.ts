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

// TEST MODE: Set TEST_USER_ID_DIVIDENDS env var to a valid UUID to only send to yourself
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID_DIVIDENDS || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

interface FmpDividendEntry {
  date: string          // ex-dividend date
  dividend: number
  recordDate: string
  paymentDate: string
  declarationDate: string
}

interface DividendEvent {
  symbol: string
  exDividendDate: string
  paymentDate: string
  dividend: number
  quantity: number
  totalPayout: number
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
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; font-weight: 600; white-space: nowrap;">
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
            <a href="https://finclue.de/analyse/portfolio/dashboard"
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
            <a href="https://finclue.de/analyse/portfolio/dashboard" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Portfolio</a>
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

// Fetch dividend history for a single symbol from FMP
async function fetchDividendForSymbol(symbol: string): Promise<{ symbol: string; entry: FmpDividendEntry | null }> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${symbol}?apikey=${process.env.FMP_API_KEY}`
    )
    if (!res.ok) return { symbol, entry: null }
    const data = await res.json()
    if (!data.historical || !Array.isArray(data.historical) || data.historical.length === 0) {
      return { symbol, entry: null }
    }
    // Most recent dividend is first in the array
    return { symbol, entry: data.historical[0] as FmpDividendEntry }
  } catch {
    return { symbol, entry: null }
  }
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

    console.log(`[Weekly Dividends] Payment week: ${fromDate} to ${toDate}`)

    // 2. Get all portfolios (filtered to test user if TEST_USER_ID is set)
    let portfoliosQuery = supabase
      .from('portfolios')
      .select('id, user_id')

    if (TEST_USER_ID) {
      portfoliosQuery = portfoliosQuery.eq('user_id', TEST_USER_ID)
    }

    const { data: portfolios, error: portfoliosError } = await portfoliosQuery

    if (portfoliosError || !portfolios || portfolios.length === 0) {
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekRange, message: 'No portfolios found', emailsSent: 0 })
    }

    const portfolioIds = portfolios.map(p => p.id)
    const portfolioUserMap = new Map<string, string>()
    for (const p of portfolios) {
      portfolioUserMap.set(p.id, p.user_id)
    }

    // 3. Get all holdings across those portfolios
    const { data: allHoldings, error: holdingsError } = await supabase
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, quantity')
      .in('portfolio_id', portfolioIds)
      .gt('quantity', 0)

    if (holdingsError || !allHoldings || allHoldings.length === 0) {
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekRange, message: 'No holdings found', emailsSent: 0 })
    }

    // 4. Check premium status for each user and group holdings by user
    const userHoldings = new Map<string, Map<string, number>>() // userId → symbol → totalQuantity

    // Get unique user IDs
    const uniqueUserIds = [...new Set(portfolios.map(p => p.user_id))]

    // Check premium for all users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, is_premium')
      .in('user_id', uniqueUserIds)

    const premiumUserIds = new Set<string>()
    for (const profile of profiles || []) {
      if (profile.is_premium) premiumUserIds.add(profile.user_id)
    }

    // Group holdings by user, only for premium users (or test user)
    for (const holding of allHoldings) {
      const userId = portfolioUserMap.get(holding.portfolio_id)
      if (!userId) continue

      const isTestUser = TEST_USER_ID && userId === TEST_USER_ID
      const isPremium = premiumUserIds.has(userId)

      if (!isPremium && !isTestUser) continue

      if (!userHoldings.has(userId)) {
        userHoldings.set(userId, new Map())
      }
      const symbolMap = userHoldings.get(userId)!
      symbolMap.set(holding.symbol, (symbolMap.get(holding.symbol) || 0) + holding.quantity)
    }

    if (userHoldings.size === 0) {
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekRange, message: 'No eligible users', emailsSent: 0 })
    }

    // 5. Get unique symbols across all eligible users and fetch FMP dividend data per symbol
    const allSymbols = [...new Set([...userHoldings.values()].flatMap(m => [...m.keys()]))]
    console.log(`[Weekly Dividends] Fetching dividend data for ${allSymbols.length} unique symbols...`)

    const dividendBySymbol = new Map<string, FmpDividendEntry>()
    const BATCH_SIZE = 10

    for (let i = 0; i < allSymbols.length; i += BATCH_SIZE) {
      const batch = allSymbols.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(fetchDividendForSymbol))

      for (const { symbol, entry } of results) {
        if (!entry || !entry.paymentDate || entry.dividend <= 0) continue
        // Only include if paymentDate falls in this week
        if (entry.paymentDate >= fromDate && entry.paymentDate <= toDate) {
          dividendBySymbol.set(symbol, entry)
        }
      }
    }

    console.log(`[Weekly Dividends] ${dividendBySymbol.size} symbols have a payment this week`)

    if (dividendBySymbol.size === 0) {
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekRange, message: 'No dividend payments this week for any held symbol', emailsSent: 0 })
    }

    // 6. Send emails per user
    let emailsSent = 0
    const userResults: Array<{ userId: string; email: string; dividendCount: number; totalPayout: number }> = []

    for (const [userId, symbolMap] of userHoldings) {
      // Build dividend events for this user — only symbols paying this week
      const userDividends: DividendEvent[] = []

      for (const [symbol, quantity] of symbolMap) {
        const entry = dividendBySymbol.get(symbol)
        if (!entry) continue

        userDividends.push({
          symbol,
          exDividendDate: entry.date,
          paymentDate: entry.paymentDate,
          dividend: entry.dividend,
          quantity,
          totalPayout: entry.dividend * quantity,
          currency: 'USD'
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

        // Send push notification
        try {
          const secret = process.env.INTERNAL_API_SECRET
          if (secret) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de'
            const symbols = userDividends.map(d => d.symbol).join(', ')
            const pushBody = userDividends.length === 1
              ? `${symbols} zahlt ${formatCurrency(totalBrutto)} diese Woche`
              : `${userDividends.length} Dividenden diese Woche · ${formatCurrency(totalBrutto)} gesamt`
            await fetch(`${baseUrl}/api/notifications/push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
              body: JSON.stringify({
                userIds: [userId],
                title: '💰 Dividenden diese Woche',
                body: pushBody,
                data: { screen: 'portfolio' }
              }),
            })
          }
        } catch (e) { console.error('[Weekly Dividends] Push error:', e) }

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
      symbolsChecked: allSymbols.length,
      symbolsPayingThisWeek: dividendBySymbol.size,
      emailsSent,
      userResults
    })

  } catch (error) {
    console.error('[Weekly Dividends] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send weekly dividend digest' }, { status: 500 })
  }
}
