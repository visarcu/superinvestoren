// src/app/api/admin/newsletter/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { subject, content, testEmail } = await request.json()

    if (!subject?.trim() || !content?.trim() || !testEmail?.trim()) {
      return NextResponse.json({ 
        error: 'Betreff, Inhalt und Test-E-Mail sind erforderlich' 
      }, { status: 400 })
    }

    // Newsletter-HTML generieren
    const newsletterHtml = generateNewsletterHtml(subject, content)

    // Test-Newsletter senden
    const { data, error } = await resend.emails.send({
      from: 'FinClue Newsletter <team@finclue.de>',
      to: [testEmail],
      subject: `[TEST] ${subject}`,
      html: newsletterHtml,
    })

    if (error) {
      console.error('Test newsletter send error:', error)
      return NextResponse.json({ error: 'Fehler beim Senden der Test-E-Mail' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test-Newsletter erfolgreich an ${testEmail} gesendet`,
      messageId: data?.id
    })

  } catch (error) {
    console.error('Test newsletter error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function generateNewsletterHtml(subject: string, content: string): string {
  // Vereinfachte Markdown-Ersetzungen
  let htmlContent = content
    // Headers
    .replace(/# (.*$)/gm, '<h1 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 20px 0 10px;">$1</h1>')
    .replace(/## (.*$)/gm, '<h2 style="color: #374151; font-size: 20px; font-weight: 600; margin: 15px 0 8px;">$1</h2>')
    .replace(/### (.*$)/gm, '<h3 style="color: #4b5563; font-size: 18px; font-weight: 600; margin: 12px 0 6px;">$1</h3>')
    
    // Text formatting
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Lists
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
        <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
                                <div style="display: inline-block; width: 50px; height: 50px; background-color: rgba(255,255,255,0.2); border-radius: 10px; margin-bottom: 15px; line-height: 50px;">
                                    <span style="color: white; font-size: 20px; font-weight: bold;">F</span>
                                </div>
                                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">FinClue Newsletter [TEST]</h1>
                                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
                                    Viele Grüße,<br>
                                    Dein FinClue Team
                                </p>
                                <div style="margin: 15px 0;">
                                    <a href="https://finclue.de" style="color: #3b82f6; text-decoration: none; font-size: 14px;">FinClue.de besuchen</a>
                                    <span style="color: #d1d5db; margin: 0 8px;">•</span>
                                    <a href="https://finclue.de/api/newsletter/unsubscribe?email=EMAIL_PLACEHOLDER" style="color: #6b7280; text-decoration: none; font-size: 12px;">Abmelden</a>
                                </div>
                                <p style="margin: 10px 0 0; color: #ef4444; font-size: 12px; font-weight: 600;">
                                    ⚠️ DIES IST EINE TEST-E-MAIL
                                </p>
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