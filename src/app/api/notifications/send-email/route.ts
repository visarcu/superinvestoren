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
          <title>Investment-Gelegenheiten | FinClue</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc;">
          
          <!-- Clean Header -->
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px 20px 20px; text-align: center;">
            <h1 style="color: #10b981; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">FinClue</h1>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">Investment-Gelegenheiten entdeckt</p>
          </div>

          <!-- Main Content -->
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
            
            <div style="padding: 32px;">
              <h2 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">
                📈 Neue Schnäppchen in deiner Watchlist
              </h2>
              
              <p style="color: #4a5568; font-size: 16px; margin: 0 0 32px 0;">
                Hi! 👋<br><br>
                Die folgenden Aktien aus deiner Watchlist zeigen signifikante Korrekturen von über ${data.threshold}% und könnten interessante Einstiegsmöglichkeiten darstellen:
              </p>

              <!-- Stocks Container -->
              <div style="margin: 32px 0;">
                ${data.dippedStocks.map((stock: DippedStock) => `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 0 0 16px 0; border-left: 4px solid #10b981; transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                      <h3 style="color: #1a202c; font-size: 20px; font-weight: 600; margin: 0;">${stock.ticker}</h3>
                      <span style="background: #fee2e2; color: #dc2626; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                        ${stock.dipPercent}%
                      </span>
                    </div>
                    <div style="color: #64748b; font-size: 15px; line-height: 1.5;">
                      <div style="margin-bottom: 6px;">
                        <strong style="color: #374151;">Aktueller Kurs:</strong> $${stock.currentPrice}
                      </div>
                      <div>
                        <strong style="color: #374151;">52W-Hoch:</strong> $${stock.yearHigh} 
                        <span style="color: #dc2626; font-weight: 500;">(-${Math.abs(parseFloat(stock.dipPercent)).toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/analyse/watchlist" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s; transform: translateY(0);">
                  📊 Watchlist analysieren
                </a>
              </div>

              <!-- Disclaimer -->
              <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 32px 0 0 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>💡 Wichtiger Hinweis:</strong> Diese Mitteilung stellt keine Anlageberatung dar. Kursrückgänge können verschiedene Ursachen haben. Bitte führe vor jeder Investitionsentscheidung eine gründliche Analyse durch.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0; text-align: center;">
                Du erhältst diese E-Mail aufgrund deiner Watchlist-Benachrichtigungseinstellungen.
              </p>
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/notifications" style="color: #10b981; text-decoration: none; font-weight: 500; margin: 0 12px;">⚙️ Einstellungen</a>
                <span style="color: #cbd5e0;">|</span>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="color: #10b981; text-decoration: none; font-weight: 500; margin: 0 12px;">🏠 FinClue</a>
              </div>
            </div>

          </div>

          <!-- Spacer -->
          <div style="height: 40px;"></div>

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