// src/app/api/notifications/send-earnings-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EarningsData {
  symbol: string
  date: string
  daysUntil: number
}

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      userEmail,
      earnings,
      isTest = false
    }: {
      userEmail: string
      earnings: EarningsData[]
      isTest?: boolean
    } = await request.json()

    if (!earnings || earnings.length === 0) {
      return NextResponse.json({ error: 'No earnings data provided' }, { status: 400 })
    }

    const subject = isTest
      ? `[TEST] Earnings Reminder: ${earnings.map(e => e.symbol).join(', ')}`
      : `📅 Earnings Reminder: ${earnings.map(e => e.symbol).join(', ')}`

    // Format earnings list
    const earningsList = earnings.map(e => {
      const date = new Date(e.date)
      const formattedDate = date.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      })
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #111827; font-size: 15px;">${e.symbol}</strong>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            ${formattedDate}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <span style="background: ${e.daysUntil <= 1 ? '#fef2f2' : e.daysUntil <= 3 ? '#fffbeb' : '#f0fdf4'}; color: ${e.daysUntil <= 1 ? '#dc2626' : e.daysUntil <= 3 ? '#d97706' : '#16a34a'}; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 500;">
              ${e.daysUntil === 0 ? 'Heute' : e.daysUntil === 1 ? 'Morgen' : `in ${e.daysUntil} Tagen`}
            </span>
          </td>
        </tr>
      `
    }).join('')

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject} | FinClue</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111827; background-color: #f9fafb;">

        <!-- Header -->
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px 16px 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #374151; margin: 0; font-size: 24px; font-weight: 700;">FinClue</h1>
            <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;">Earnings Reminder</p>
            ${isTest ? '<p style="background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin: 8px auto; display: inline-block;">🧪 TEST E-MAIL</p>' : ''}
          </div>
        </div>

        <!-- Main Content -->
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="padding: 32px;">
            <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">
              📅 Earnings auf deiner Watchlist
            </h2>

            <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px 0; line-height: 1.5;">
              Die folgenden Aktien auf deiner Watchlist veröffentlichen bald ihre Quartalszahlen:
            </p>

            <!-- Earnings Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Aktie</th>
                  <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Datum</th>
                  <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Zeit</th>
                </tr>
              </thead>
              <tbody>
                ${earningsList}
              </tbody>
            </table>

            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 32px 0 24px 0;">
              <a href="https://finclue.de/watchlist"
                 target="_blank"
                 rel="noopener noreferrer"
                 style="display: inline-block; background: #374151; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; border: 1px solid #374151; margin-right: 8px;">
                Zur Watchlist →
              </a>
            </div>

            <!-- Disclaimer -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 24px 0 0 0;">
              <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.5;">
                <strong style="color: #374151;">Tipp:</strong> Die Kurse können vor und nach den Earnings stark schwanken. Prüfe deine Positionen und setze ggf. Stop-Loss Orders.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
              Du erhältst diese E-Mail, weil du Earnings-Benachrichtigungen aktiviert hast.
            </p>
            <div style="text-align: center;">
              <a href="https://finclue.de/notifications/settings" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Einstellungen</a>
              <span style="color: #d1d5db;">•</span>
              <a href="https://finclue.de/watchlist" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Watchlist</a>
            </div>
          </div>

        </div>

        <!-- Spacer -->
        <div style="height: 32px;"></div>

      </body>
      </html>
    `

    // Email senden via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'FinClue <team@finclue.de>',
      to: [userEmail],
      subject,
      html: emailContent,
    })

    if (emailError) {
      console.error('[Earnings Email] Send Error:', emailError)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: emailResult?.id })

  } catch (error) {
    console.error('[Earnings Email] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
