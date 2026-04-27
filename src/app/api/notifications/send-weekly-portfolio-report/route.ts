// src/app/api/notifications/send-weekly-portfolio-report/route.ts
// Cron: Every Sunday at 18:00 UTC — sends a weekly portfolio performance report via email + push
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

// TEST MODE: Set TEST_USER_ID_PORTFOLIO env var to a valid UUID to only send to yourself
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID_PORTFOLIO || process.env.TEST_USER_ID || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

interface FmpQuote {
  symbol: string
  price: number
  changesPercentage: number
  change: number
  previousClose: number
  name?: string
}

interface HoldingWithPerf {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  previousClose: number
  currentValue: number
  previousValue: number
  weeklyChangeAbs: number
  weeklyChangePct: number
}

interface PortfolioReport {
  totalCurrentValue: number
  totalPreviousValue: number
  totalWeeklyChangeAbs: number
  totalWeeklyChangePct: number
  topGainers: HoldingWithPerf[]
  topLosers: HoldingWithPerf[]
  holdings: HoldingWithPerf[]
}

interface EarningsPreviewItem {
  symbol: string
  date: string
  time: string
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
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

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`
}

function formatShares(quantity: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(quantity)
}

function generatePerformerCard(holding: HoldingWithPerf, type: 'gainer' | 'loser'): string {
  const isGainer = type === 'gainer'
  const color = isGainer ? '#059669' : '#dc2626'
  const bgColor = isGainer ? '#f0fdf4' : '#fef2f2'
  const borderColor = isGainer ? '#bbf7d0' : '#fecaca'
  const emoji = isGainer ? '▲' : '▼'
  const pctDisplay = formatPercent(holding.weeklyChangePct)
  const absDisplay = isGainer
    ? `+${formatCurrency(holding.weeklyChangeAbs)}`
    : formatCurrency(holding.weeklyChangeAbs)

  return `
    <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px 20px; flex: 1; min-width: 0;">
      <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
        ${isGainer ? 'Top Performer' : 'Flop Performer'}
      </p>
      <p style="margin: 0 0 6px 0; color: #111827; font-size: 20px; font-weight: 700;">${holding.symbol}</p>
      <p style="margin: 0; color: ${color}; font-size: 18px; font-weight: 700;">${emoji} ${pctDisplay}</p>
      <p style="margin: 4px 0 0 0; color: ${color}; font-size: 13px;">${absDisplay} diese Woche</p>
      <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">${formatShares(holding.quantity)} Anteile · Kurs: ${formatCurrency(holding.currentPrice)}</p>
    </div>
  `
}

function generateHoldingsRows(holdings: HoldingWithPerf[]): string {
  return holdings
    .sort((a, b) => b.currentValue - a.currentValue)
    .map(h => {
      const color = h.weeklyChangePct >= 0 ? '#059669' : '#dc2626'
      const sign = h.weeklyChangePct >= 0 ? '+' : ''
      return `
        <tr>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600;">${h.symbol}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; text-align: right;">${formatShares(h.quantity)}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; text-align: right; white-space: nowrap;">${formatCurrency(h.currentPrice)}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; font-weight: 600; text-align: right; white-space: nowrap;">${formatCurrency(h.currentValue)}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: ${color}; font-size: 13px; font-weight: 600; text-align: right; white-space: nowrap;">
            ${sign}${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(h.weeklyChangePct)}%
          </td>
        </tr>
      `
    })
    .join('')
}

function generateEarningsPreviewSection(earnings: EarningsPreviewItem[]): string {
  if (earnings.length === 0) return ''

  const rows = earnings.slice(0, 5).map(e => {
    const date = new Date(e.date)
    const day = date.getUTCDate()
    const month = MONTHS[date.getUTCMonth()]
    const timeLabel = e.time === 'bmo' ? 'vor Börsenöffnung' : e.time === 'amc' ? 'nach Börsenschluss' : ''

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #111827; font-size: 14px;">${e.symbol}</strong>
        <span style="color: #6b7280; font-size: 13px;">${day}. ${month}${timeLabel ? ' · ' + timeLabel : ''}</span>
      </div>
    `
  }).join('')

  const moreCount = earnings.length > 5 ? earnings.length - 5 : 0

  return `
    <div style="margin-top: 28px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <h3 style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">📅 Earnings nächste Woche</h3>
      </div>
      <div style="padding: 0 16px;">
        ${rows}
        ${moreCount > 0 ? `<p style="color: #9ca3af; font-size: 12px; margin: 10px 0; text-align: center;">+${moreCount} weitere</p>` : ''}
      </div>
    </div>
  `
}

function generateEmailHtml(
  report: PortfolioReport,
  weekNumber: number,
  weekRange: string,
  earningsPreview: EarningsPreviewItem[],
  isTest: boolean
): string {
  const changeColor = report.totalWeeklyChangePct >= 0 ? '#059669' : '#dc2626'
  const changeBg = report.totalWeeklyChangePct >= 0 ? '#f0fdf4' : '#fef2f2'
  const changeBorder = report.totalWeeklyChangePct >= 0 ? '#bbf7d0' : '#fecaca'
  const changeArrow = report.totalWeeklyChangePct >= 0 ? '▲' : '▼'

  const topGainer = report.topGainers[0]
  const topLoser = report.topLosers[0]

  const performerCards = [
    topGainer ? generatePerformerCard(topGainer, 'gainer') : '',
    topLoser ? generatePerformerCard(topLoser, 'loser') : ''
  ].filter(Boolean).join('')

  const holdingsRows = generateHoldingsRows(report.holdings)
  const earningsSection = generateEarningsPreviewSection(earningsPreview)

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Portfolio-Bericht KW ${weekNumber} | Finclue</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111827; background-color: #f9fafb;">

      <!-- Header -->
      <div style="max-width: 620px; margin: 0 auto; padding: 32px 20px 16px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #374151; margin: 0; font-size: 24px; font-weight: 700;">Finclue</h1>
          <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;">Wöchentlicher Portfolio-Bericht</p>
          ${isTest ? '<p style="background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin: 8px auto; display: inline-block;">🧪 TEST E-MAIL</p>' : ''}
        </div>
      </div>

      <!-- Main Content -->
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <div style="padding: 32px;">

          <!-- Title -->
          <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 6px 0; line-height: 1.3;">
            📊 Dein wöchentlicher Portfolio-Bericht
          </h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Kalenderwochen-Zusammenfassung · KW ${weekNumber} · ${weekRange}</p>

          <!-- Portfolio Total Value -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Gesamtwert Portfolio</p>
            <p style="margin: 0; color: #111827; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">${formatCurrency(report.totalCurrentValue)}</p>
          </div>

          <!-- Weekly Performance Badge -->
          <div style="background: ${changeBg}; border: 1px solid ${changeBorder}; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px; font-weight: 500;">Wochenperformance</p>
              <p style="margin: 0; color: ${changeColor}; font-size: 22px; font-weight: 700;">${changeArrow} ${formatPercent(report.totalWeeklyChangePct)}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px; font-weight: 500;">Absolute Änderung</p>
              <p style="margin: 0; color: ${changeColor}; font-size: 16px; font-weight: 600;">${report.totalWeeklyChangeAbs >= 0 ? '+' : ''}${formatCurrency(report.totalWeeklyChangeAbs)}</p>
            </div>
          </div>

          <!-- Performer Cards -->
          ${performerCards ? `
          <div style="display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap;">
            ${performerCards}
          </div>
          ` : ''}

          <!-- Holdings Table -->
          ${holdingsRows ? `
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 4px;">
            <div style="background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Alle Positionen</h3>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Symbol</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Anteile</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Kurs</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Wert</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Woche</th>
                </tr>
              </thead>
              <tbody>
                ${holdingsRows}
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- Earnings Preview for next week -->
          ${earningsSection}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="https://finclue.de/analyse/portfolio/dashboard"
               target="_blank"
               rel="noopener noreferrer"
               style="display: inline-block; background: #059669; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
              Zur App →
            </a>
          </div>

          <!-- Disclaimer -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
              Die Wochenperformance basiert auf dem Schlusskurs des Vortages als Näherungswert.
              Alle Angaben ohne Gewähr. Keine Anlageberatung.
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
            Du erhältst diesen Bericht jeden Sonntag für dein Portfolio auf Finclue.
          </p>
          <div style="text-align: center;">
            <a href="https://finclue.de/analyse/portfolio/dashboard" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Portfolio</a>
            <span style="color: #d1d5db;">•</span>
            <a href="https://finclue.de/settings" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Einstellungen</a>
            <span style="color: #d1d5db;">•</span>
            <a href="https://finclue.de" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">finclue.de</a>
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

  return handleWeeklyPortfolioReport()
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleWeeklyPortfolioReport()
}

async function handleWeeklyPortfolioReport() {
  try {
    console.log('[Weekly Portfolio Report] Starting weekly portfolio report...')
    console.log(`[Weekly Portfolio Report] Test mode: ${TEST_USER_ID ? 'ON (user: ' + TEST_USER_ID + ')' : 'OFF'}`)

    // 1. Calculate KW and week range
    const today = new Date()
    const weekNumber = getISOWeekNumber(today)

    // Next week range (Mon-Sun) for earnings preview
    const nextMonday = new Date(today)
    const dayOfWeek = today.getUTCDay()
    const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    nextMonday.setUTCDate(today.getUTCDate() + daysToNextMonday)
    nextMonday.setUTCHours(0, 0, 0, 0)
    const nextSunday = new Date(nextMonday)
    nextSunday.setUTCDate(nextMonday.getUTCDate() + 6)

    // Current week range for the report subject
    const thisMonday = new Date(today)
    const daysToThisMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    thisMonday.setUTCDate(today.getUTCDate() + daysToThisMonday)
    thisMonday.setUTCHours(0, 0, 0, 0)
    const thisSunday = new Date(thisMonday)
    thisSunday.setUTCDate(thisMonday.getUTCDate() + 6)

    const weekRange = formatWeekRange(thisMonday, thisSunday)
    const nextWeekFrom = nextMonday.toISOString().split('T')[0]
    const nextWeekTo = nextSunday.toISOString().split('T')[0]

    console.log(`[Weekly Portfolio Report] KW ${weekNumber} · ${weekRange}`)

    // 2. Get all portfolios (or just the test user's)
    let portfoliosQuery = supabase
      .from('portfolios')
      .select('id, user_id')

    if (TEST_USER_ID) {
      portfoliosQuery = portfoliosQuery.eq('user_id', TEST_USER_ID)
    }

    const { data: portfolios, error: portfoliosError } = await portfoliosQuery

    if (portfoliosError || !portfolios || portfolios.length === 0) {
      console.log('[Weekly Portfolio Report] No portfolios found')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No portfolios found', emailsSent: 0 })
    }

    const portfolioIds = portfolios.map(p => p.id)
    const portfolioUserMap = new Map<string, string>()
    for (const p of portfolios) {
      portfolioUserMap.set(p.id, p.user_id)
    }

    // 3. Get all holdings across those portfolios
    const { data: allHoldings, error: holdingsError } = await supabase
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, quantity, average_price')
      .in('portfolio_id', portfolioIds)
      .gt('quantity', 0)

    if (holdingsError || !allHoldings || allHoldings.length === 0) {
      console.log('[Weekly Portfolio Report] No holdings found')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No holdings found', emailsSent: 0 })
    }

    // 4. Check premium status and group holdings by user
    const uniqueUserIds = [...new Set(portfolios.map(p => p.user_id))]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, is_premium')
      .in('user_id', uniqueUserIds)

    const premiumUserIds = new Set<string>()
    for (const profile of profiles || []) {
      if (profile.is_premium) premiumUserIds.add(profile.user_id)
    }

    // Group holdings by user (symbol → {quantity, averagePrice})
    const userHoldings = new Map<string, Map<string, { quantity: number; averagePrice: number }>>()

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
      const existing = symbolMap.get(holding.symbol)
      if (existing) {
        // Aggregate multiple lots: weighted average price
        const totalQty = existing.quantity + holding.quantity
        const weightedAvg = (existing.averagePrice * existing.quantity + holding.average_price * holding.quantity) / totalQty
        symbolMap.set(holding.symbol, { quantity: totalQty, averagePrice: weightedAvg })
      } else {
        symbolMap.set(holding.symbol, { quantity: holding.quantity, averagePrice: holding.average_price })
      }
    }

    if (userHoldings.size === 0) {
      console.log('[Weekly Portfolio Report] No eligible users with holdings')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No eligible users', emailsSent: 0 })
    }

    // 5. Fetch FMP quotes for all unique symbols in one batch call
    const allSymbols = [...new Set([...userHoldings.values()].flatMap(m => [...m.keys()]))]
    console.log(`[Weekly Portfolio Report] Fetching quotes for ${allSymbols.length} symbols...`)

    const quoteMap = new Map<string, FmpQuote>()

    // FMP supports comma-separated symbols in one call
    const BATCH_SIZE = 50
    for (let i = 0; i < allSymbols.length; i += BATCH_SIZE) {
      const batch = allSymbols.slice(i, i + BATCH_SIZE)
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${batch.join(',')}?apikey=${process.env.FMP_API_KEY}`
        )
        if (!res.ok) {
          console.error(`[Weekly Portfolio Report] FMP quote error: ${res.status}`)
          continue
        }
        const data: FmpQuote[] = await res.json()
        if (Array.isArray(data)) {
          for (const q of data) {
            quoteMap.set(q.symbol, q)
          }
        }
      } catch (e) {
        console.error('[Weekly Portfolio Report] FMP fetch error:', e)
      }
    }

    console.log(`[Weekly Portfolio Report] Got quotes for ${quoteMap.size} symbols`)

    // 6. Earnings preview for next week — DB-First aus earningsCalendar-Tabelle
    let earningsCalendar: EarningsPreviewItem[] = []
    try {
      const { getEarningsFromDb } = await import('@/lib/earningsCalendarDb')
      const dbRows = await getEarningsFromDb(nextWeekFrom, nextWeekTo, allSymbols)

      if (dbRows.length > 0) {
        earningsCalendar = dbRows.map(r => ({
          symbol: r.symbol,
          date: r.date,
          time: r.time || '',
        }))
      } else {
        // Fallback: DB leer → FMP
        console.warn('[Weekly Portfolio Report] DB empty, falling back to FMP')
        const earningsRes = await fetch(
          `https://financialmodelingprep.com/api/v3/earning_calendar?from=${nextWeekFrom}&to=${nextWeekTo}&apikey=${process.env.FMP_API_KEY}`
        )
        if (earningsRes.ok) {
          const earningsData = await earningsRes.json()
          if (Array.isArray(earningsData)) {
            earningsCalendar = earningsData
              .filter((e: any) => allSymbols.includes(e.symbol))
              .map((e: any) => ({ symbol: e.symbol, date: e.date, time: e.time || '' }))
          }
        }
      }
    } catch (e) {
      console.warn('[Weekly Portfolio Report] Could not fetch earnings calendar, skipping preview:', e)
    }

    // 7. Send emails per user
    let emailsSent = 0
    const userResults: Array<{ userId: string; email: string; totalValue: number; weeklyChangePct: number }> = []

    for (const [userId, symbolMap] of userHoldings) {
      // Build holdings with performance
      const holdings: HoldingWithPerf[] = []

      for (const [symbol, { quantity, averagePrice }] of symbolMap) {
        const quote = quoteMap.get(symbol)
        if (!quote || !quote.price) continue

        const currentPrice = quote.price
        const previousClose = quote.previousClose ?? (currentPrice / (1 + quote.changesPercentage / 100))
        const currentValue = quantity * currentPrice
        const previousValue = quantity * previousClose
        const weeklyChangeAbs = currentValue - previousValue
        const weeklyChangePct = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

        holdings.push({
          symbol,
          quantity,
          averagePrice,
          currentPrice,
          previousClose,
          currentValue,
          previousValue,
          weeklyChangeAbs,
          weeklyChangePct
        })
      }

      if (holdings.length === 0) {
        console.log(`[Weekly Portfolio Report] No valid quotes for user ${userId}, skipping`)
        continue
      }

      const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
      const totalPreviousValue = holdings.reduce((sum, h) => sum + h.previousValue, 0)
      const totalWeeklyChangeAbs = totalCurrentValue - totalPreviousValue
      const totalWeeklyChangePct = totalPreviousValue > 0
        ? ((totalCurrentValue - totalPreviousValue) / totalPreviousValue) * 100
        : 0

      const sortedByChange = [...holdings].sort((a, b) => b.weeklyChangePct - a.weeklyChangePct)
      const topGainers = sortedByChange.filter(h => h.weeklyChangePct > 0).slice(0, 3)
      const topLosers = [...sortedByChange].reverse().filter(h => h.weeklyChangePct < 0).slice(0, 3)

      const report: PortfolioReport = {
        totalCurrentValue,
        totalPreviousValue,
        totalWeeklyChangeAbs,
        totalWeeklyChangePct,
        topGainers,
        topLosers,
        holdings
      }

      // Filter earnings preview to this user's symbols
      const userSymbols = new Set(symbolMap.keys())
      const userEarningsPreview = earningsCalendar.filter(e => userSymbols.has(e.symbol))

      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      if (!user?.email) {
        console.log(`[Weekly Portfolio Report] No email for user ${userId}`)
        continue
      }

      const isTest = !!TEST_USER_ID
      const subject = isTest
        ? `[TEST] 📊 Dein Portfolio-Bericht: KW ${weekNumber}`
        : `📊 Dein Portfolio-Bericht: KW ${weekNumber}`

      const htmlContent = generateEmailHtml(report, weekNumber, weekRange, userEarningsPreview, isTest)

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Finclue <team@finclue.de>',
          to: [user.email],
          subject,
          html: htmlContent,
        })

        if (emailError) {
          console.error(`[Weekly Portfolio Report] Email error for ${user.email}:`, emailError)
          continue
        }

        emailsSent++
        userResults.push({
          userId,
          email: user.email,
          totalValue: totalCurrentValue,
          weeklyChangePct: totalWeeklyChangePct
        })

        console.log(
          `[Weekly Portfolio Report] 📧 Email sent to ${user.email} — ` +
          `${formatCurrency(totalCurrentValue)} · ${formatPercent(totalWeeklyChangePct)}`
        )

        // Send push notification
        try {
          const secret = process.env.INTERNAL_API_SECRET
          if (secret) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de'
            const topGainer = report.topGainers[0]
            const changeLabel = `${totalWeeklyChangePct >= 0 ? '+' : ''}${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalWeeklyChangePct)}%`
            const pushBody = topGainer
              ? `${changeLabel} diese Woche — ${topGainer.symbol} führt mit ${formatPercent(topGainer.weeklyChangePct)}`
              : `${changeLabel} diese Woche · ${formatCurrency(totalCurrentValue)} Gesamtwert`

            await fetch(`${baseUrl}/api/notifications/push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
              body: JSON.stringify({
                userIds: [userId],
                title: '📊 Dein Wochenbericht',
                body: pushBody,
                data: { screen: 'portfolio' }
              }),
            })
          }
        } catch (e) { console.error('[Weekly Portfolio Report] Push error:', e) }

        // Log to notification_log
        await supabase.from('notification_log').insert({
          user_id: userId,
          notification_type: 'weekly_portfolio_report',
          reference_id: `KW${weekNumber}`,
          content: {
            weekNumber,
            weekRange,
            totalCurrentValue,
            totalWeeklyChangePct,
            holdingCount: holdings.length,
            topGainer: report.topGainers[0]?.symbol ?? null,
            topLoser: report.topLosers[0]?.symbol ?? null
          },
          email_sent: true
        })

      } catch (emailError) {
        console.error(`[Weekly Portfolio Report] Failed to send email to ${user.email}:`, emailError)
      }
    }

    console.log(`[Weekly Portfolio Report] Complete: ${emailsSent} emails sent`)

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      weekNumber,
      weekRange,
      symbolsQueried: allSymbols.length,
      quotesReceived: quoteMap.size,
      earningsNextWeek: earningsCalendar.length,
      emailsSent,
      userResults
    })

  } catch (error) {
    console.error('[Weekly Portfolio Report] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send weekly portfolio report' }, { status: 500 })
  }
}
