// src/app/api/notifications/send-filing-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      userEmail, 
      investorSlug, 
      investorName,
      isTest = false 
    }: { 
      userEmail: string
      investorSlug: string
      investorName: string
      isTest?: boolean
    } = await request.json()

    const subject = isTest 
      ? `[TEST] Neues 13F-Filing von ${investorName}`
      : `📊 Neues 13F-Filing von ${investorName}`
    
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
            <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;">Neues Superinvestor-Filing</p>
            ${isTest ? '<p style="background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin: 8px auto; display: inline-block;">🧪 TEST E-MAIL</p>' : ''}
          </div>
        </div>

        <!-- Main Content -->
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <div style="padding: 32px;">
            <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">
              📊 ${investorName} hat neue Holdings veröffentlicht
            </h2>
            
            <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px 0; line-height: 1.5;">
              ${investorName} hat soeben ein neues 13F-Filing eingereicht. Das bedeutet, du kannst jetzt die neuesten Portfolio-Änderungen einsehen:
            </p>

            <!-- Features List -->
            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 24px 0; background: #fafafa;">
              <ul style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 18px;">
                <li style="margin-bottom: 6px;"><strong>Neue Käufe</strong> - Welche Aktien wurden hinzugefügt</li>
                <li style="margin-bottom: 6px;"><strong>Verkäufe</strong> - Was wurde aus dem Portfolio entfernt</li>
                <li style="margin-bottom: 6px;"><strong>Position-Änderungen</strong> - Auf- und Abstockungen</li>
                <li style="margin-bottom: 0;"><strong>Portfolio-Zusammensetzung</strong> - Aktuelle Gewichtung</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0 24px 0;">
              <a href="https://finclue.de/superinvestor/${investorSlug}" 
                 target="_blank"
                 rel="noopener noreferrer"
                 style="display: inline-block; background: #374151; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; border: 1px solid #374151;">
                Portfolio von ${investorName} ansehen →
              </a>
            </div>

            <div style="text-align: center; margin: 16px 0;">
              <a href="https://finclue.de/superinvestor" 
                 style="color: #6b7280; text-decoration: none; font-size: 13px;">
                Alle Superinvestoren vergleichen
              </a>
            </div>

            <!-- Disclaimer -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 24px 0 0 0;">
              <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.5;">
                <strong style="color: #374151;">Hinweis:</strong> 13F-Filings zeigen Holdings zum Stichtag Ende des Quartals. Die Daten können bis zu 45 Tage alt sein. Dies stellt keine Anlageberatung dar.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
              Du erhältst diese E-Mail, weil du ${investorName} folgst.
            </p>
            <div style="text-align: center;">
              <a href="https://finclue.de/notifications" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Einstellungen</a>
              <span style="color: #d1d5db;">•</span>
              <a href="https://finclue.de/superinvestor/${investorSlug}" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">${investorName}</a>
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
      console.error('[Filing Email] Send Error:', emailError)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: emailResult?.id })

  } catch (error) {
    console.error('[Filing Email] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}