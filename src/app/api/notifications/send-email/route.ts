// src/app/api/notifications/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ✅ TypeScript Interfaces
interface DippedStock {
  ticker: string
  currentPrice: number
  dipPercent: string
  yearHigh: number
}

interface EmailData {
  dippedStocks: DippedStock[]
  threshold: number
}

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, userEmail, data }: { 
      type: string; 
      userEmail: string; 
      data: EmailData 
    } = await request.json()

    let emailContent = ''
    let subject = ''

    if (type === 'watchlist_dips') {
      subject = `${data.dippedStocks.length} Investment-Gelegenheiten in deiner Watchlist`
      
      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Watchlist Alert | FinClue</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb;">
          
          <!-- Header -->
          <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px 0 20px; text-align: center;">
            <h1 style="color: #374151; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.025em;">FinClue</h1>
            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Watchlist Benachrichtigung</p>
          </div>

          <!-- Main Content -->
          <div style="max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
            
            <div style="padding: 32px;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">
                Neue Korrekturen in deiner Watchlist
              </h2>
              
              <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px 0; line-height: 1.5;">
                Die folgenden Aktien sind um über ${data.threshold}% vom 52-Wochen-Hoch gefallen und könnten interessante Einstiegsgelegenheiten darstellen:
              </p>

              <!-- Stocks List -->
              <div style="margin: 24px 0;">
                ${data.dippedStocks.map((stock: DippedStock) => `
                  <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 0 0 12px 0; background: #fafafa;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                      <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;">${stock.ticker}</h3>
                      <span style="background: #fef2f2; color: #b91c1c; padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: 500; border: 1px solid #fecaca;">
                        ${stock.dipPercent}%
                      </span>
                    </div>
                    <div style="color: #6b7280; font-size: 14px; line-height: 1.4;">
                      <div style="margin-bottom: 4px;">
                        <span style="color: #374151; font-weight: 500;">Aktueller Kurs:</span> $${stock.currentPrice}
                      </div>
                      <div>
                        <span style="color: #374151; font-weight: 500;">52W-Hoch:</span> $${stock.yearHigh} 
                        <span style="color: #9ca3af;">(-${Math.abs(parseFloat(stock.dipPercent)).toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="https://finclue.de/analyse/watchlist?utm_source=email&utm_campaign=watchlist_alert" 
                   target="_blank"
                   rel="noopener noreferrer"
                   style="display: inline-block; background: #374151; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; border: 1px solid #374151;">
                  Watchlist analysieren →
                </a>
              </div>

              <!-- Disclaimer -->
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 24px 0 0 0;">
                <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.5;">
                  <strong style="color: #374151;">Hinweis:</strong> Diese Mitteilung stellt keine Anlageberatung dar. Kursrückgänge können verschiedene Ursachen haben. Bitte führe vor jeder Investitionsentscheidung eine gründliche Analyse durch.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                Du erhältst diese E-Mail aufgrund deiner Watchlist-Einstellungen.
              </p>
              <div style="text-align: center;">
                <a href="https://finclue.de/notifications/settings" style="color: #6b7280; text-decoration: none; font-size: 13px; margin: 0 8px;">Einstellungen</a>
                <span style="color: #d1d5db;">•</span>
                <a href="https://finclue.de" style="color: #6b7280; text-decoration: none; font-size: 13px; margin: 0 8px;">FinClue</a>
              </div>
            </div>

          </div>

          <!-- Spacer -->
          <div style="height: 32px;"></div>

        </body>
        </html>
      `
    }

    // Email senden via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'FinClue <team@finclue.de>',
      to: [userEmail],
      subject,
      html: emailContent,
    })

    if (emailError) {
      console.error('[Email] Send Error:', emailError)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: emailResult?.id })

  } catch (error) {
    console.error('[Email] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}