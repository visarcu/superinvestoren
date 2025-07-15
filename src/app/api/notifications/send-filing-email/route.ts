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
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc;">
        
        <!-- Clean Header -->
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px 20px 20px; text-align: center;">
          <h1 style="color: #10b981; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">FinClue</h1>
          <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">Neues Superinvestor-Filing</p>
          ${isTest ? '<p style="background: #fbbf24; color: #92400e; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 12px auto; display: inline-block;">🧪 TEST E-MAIL</p>' : ''}
        </div>

        <!-- Main Content -->
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <div style="padding: 32px;">
            <h2 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">
              📊 ${investorName} hat neue Holdings veröffentlicht
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; margin: 0 0 24px 0;">
              Hi! 👋<br><br>
              ${investorName} hat soeben ein neues 13F-Filing eingereicht. Das bedeutet, du kannst jetzt sehen:
            </p>

            <!-- Features List -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <ul style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Neue Käufe</strong> - Welche Aktien wurden hinzugefügt</li>
                <li style="margin-bottom: 8px;"><strong>Verkäufe</strong> - Was wurde aus dem Portfolio entfernt</li>
                <li style="margin-bottom: 8px;"><strong>Position-Änderungen</strong> - Auf- und Abstockungen</li>
                <li style="margin-bottom: 0;"><strong>Portfolio-Zusammensetzung</strong> - Aktuelle Gewichtung</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/superinvestor/${investorSlug}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s;">
                📈 Portfolio von ${investorName} ansehen
              </a>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/superinvestor" 
                 style="color: #64748b; text-decoration: none; font-size: 14px;">
                🔍 Alle Superinvestoren vergleichen
              </a>
            </div>

            <!-- Disclaimer -->
            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 32px 0 0 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>💡 Hinweis:</strong> 13F-Filings zeigen Holdings zum Stichtag Ende des Quartals. Die Daten können bis zu 45 Tage alt sein. Dies stellt keine Anlageberatung dar.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0; text-align: center;">
              Du erhältst diese E-Mail, weil du ${investorName} folgst.
            </p>
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/notifications" style="color: #10b981; text-decoration: none; font-weight: 500; margin: 0 12px;">⚙️ Einstellungen</a>
              <span style="color: #cbd5e0;">|</span>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/superinvestor/${investorSlug}" style="color: #10b981; text-decoration: none; font-weight: 500; margin: 0 12px;">👤 ${investorName}</a>
            </div>
          </div>

        </div>

        <!-- Spacer -->
        <div style="height: 40px;"></div>

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