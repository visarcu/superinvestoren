// src/app/api/admin/newsletter/test/route.ts - ERWEITERTE TEST-VERSION
import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

interface TestEmail {
  email: string
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    const { subject, content, testEmails, singleEmail } = await request.json()

    if (!subject?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Betreff und Inhalt sind erforderlich' }, { status: 400 })
    }

    // Newsletter-HTML generieren
    const newsletterHtml = generateNewsletterHtml(subject, content)

    // Test-Modus bestimmen
    let recipients: TestEmail[] = []
    
    if (singleEmail) {
      // Einzelner Test (wie bisher)
      recipients = [{ email: singleEmail }]
    } else if (testEmails && Array.isArray(testEmails)) {
      // Multi-Test für Datenschutz-Check
      recipients = testEmails
    } else {
      return NextResponse.json({ error: 'Keine Test-E-Mails angegeben' }, { status: 400 })
    }

    console.log(`🧪 Teste Newsletter an ${recipients.length} E-Mail(s)`)

    // Einzelversand-Test (gleiche Logik wie im echten Versand)
    let sentCount = 0
    const errors: Array<{ email: string; error: any }> = []

    for (const recipient of recipients) {
      try {
        // Personalisierte E-Mail für jeden Empfänger
        const personalizedHtml = newsletterHtml.replace(
          'EMAIL_PLACEHOLDER', 
          encodeURIComponent(recipient.email)
        )

        const { data, error } = await resend.emails.send({
          from: 'Finclue Newsletter <team@finclue.de>',
          to: [recipient.email], // ✅ Nur ein Empfänger pro E-Mail
          subject: `[TEST] ${subject}`,
          html: personalizedHtml,
        })

        if (error) {
          console.error(`Test failed for ${recipient.email}:`, error)
          errors.push({ email: recipient.email, error })
        } else {
          sentCount++
          console.log(`✅ Test erfolgreich an ${recipient.email}`)
        }

        // Kurze Pause zwischen E-Mails
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`Test exception for ${recipient.email}:`, error)
        errors.push({ email: recipient.email, error })
      }
    }

    return NextResponse.json({ 
      success: true, 
      sentCount,
      totalRecipients: recipients.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Test-Newsletter erfolgreich an ${sentCount}/${recipients.length} E-Mail(s) gesendet`
    })

  } catch (error) {
    console.error('Test newsletter error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function generateNewsletterHtml(subject: string, content: string): string {
  // Vereinfachte Markdown-Ersetzungen (ES5 kompatibel)
  let htmlContent = content
    // Headers
    .replace(/# (.*$)/gm, '<h1 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 20px 0 10px;">$1</h1>')
    .replace(/## (.*$)/gm, '<h2 style="color: #374151; font-size: 20px; font-weight: 600; margin: 15px 0 8px;">$1</h2>')
    .replace(/### (.*$)/gm, '<h3 style="color: #4b5563; font-size: 18px; font-weight: 600; margin: 12px 0 6px;">$1</h3>')
    
    // Text formatting
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Lists (vereinfacht)
    .replace(/^- (.*$)/gm, '• $1<br>')
    
    // Paragraphs
    .replace(/\n\n/g, '<br><br>')
    
    // Horizontal rule
    .replace(/---/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">')

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[TEST] ${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); border-radius: 12px 12px 0 0;">
                                <div style="display: inline-block; width: 50px; height: 50px; background-color: rgba(255,255,255,0.2); border-radius: 10px; margin-bottom: 15px; line-height: 50px;">
                                    <span style="color: white; font-size: 20px; font-weight: bold;">🧪</span>
                                </div>
                                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">TEST - Finclue Newsletter</h1>
                                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">⚠️ Dies ist ein Test • ${new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <div style="color: #1f2937; line-height: 1.8; font-size: 16px;">
                                    ${htmlContent}
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px; border-top: 1px solid #e5e7eb; text-align: center; background-color: #f9fafb;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                    🧪 TEST-VERSION<br>
                                    Viele Grüße,<br>
                                    Dein Finclue Team
                                </p>
                                <div style="margin: 15px 0;">
                                    <a href="https://finclue.de" style="color: #3b82f6; text-decoration: none; font-size: 14px;">Finclue.de besuchen</a>
                                    <span style="color: #d1d5db; margin: 0 8px;">•</span>
                                    <a href="https://finclue.de/api/newsletter/unsubscribe?email=EMAIL_PLACEHOLDER" style="color: #6b7280; text-decoration: none; font-size: 12px;">Abmelden</a>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `
}