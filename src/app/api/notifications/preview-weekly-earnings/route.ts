// src/app/api/notifications/preview-weekly-earnings/route.ts
// Preview route to see the weekly earnings email without sending it
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

interface EarningsEvent {
  symbol: string
  date: string
  time: string
}

interface GroupedEarnings {
  [date: string]: EarningsEvent[]
}

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

function generateEmailHtml(earnings: GroupedEarnings, weekRange: string, isPreview: boolean): string {
  const dates = Object.keys(earnings).sort()

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
        <div style="padding: 14px 16px; ${borderBottom} display: flex; align-items: center; justify-content: space-between;">
          <div>
            <strong style="color: #111827; font-size: 15px;">${earning.symbol}</strong>
          </div>
          <div style="color: #6b7280; font-size: 13px;">
            ${timeLabel}
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
          ${isPreview ? '<p style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin: 8px auto; display: inline-block;">👁️ PREVIEW - wird nicht gesendet</p>' : ''}
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

export async function GET(request: Request) {
  // Only allow in development or with secret
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (process.env.NODE_ENV !== 'development' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized - add ?secret=YOUR_CRON_SECRET or run in development' }, { status: 401 })
  }

  try {
    // Calculate week range
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const fromDate = startOfWeek.toISOString().split('T')[0]
    const toDate = endOfWeek.toISOString().split('T')[0]
    const weekRange = formatWeekRange(startOfWeek, endOfWeek)

    // Fetch earnings calendar
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${process.env.FMP_API_KEY}`
    )
    const earningsData = await response.json()

    if (!Array.isArray(earningsData)) {
      return NextResponse.json({ error: 'Invalid FMP response' }, { status: 500 })
    }

    // Get some sample tickers from watchlists
    const { data: watchlistItems } = await supabase
      .from('watchlists')
      .select('ticker')
      .limit(100)

    const tickers = [...new Set(watchlistItems?.map(w => w.ticker) || [])]

    // Filter earnings for watchlist tickers
    const filteredEarnings = earningsData.filter((e: any) => tickers.includes(e.symbol))

    // If no earnings found for watchlist, show some sample data
    let earningsToShow = filteredEarnings
    if (filteredEarnings.length === 0) {
      // Take first 5 earnings as sample
      earningsToShow = earningsData.slice(0, 5)
    }

    // Group earnings by date
    const groupedEarnings: GroupedEarnings = {}
    for (const earning of earningsToShow) {
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

    // Sort within each day
    for (const date of Object.keys(groupedEarnings)) {
      groupedEarnings[date].sort((a, b) => a.symbol.localeCompare(b.symbol))
    }

    const html = generateEmailHtml(groupedEarnings, weekRange, true)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('[Preview] Error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
