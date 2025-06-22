// src/app/api/admin/newsletter/send/route.ts - DATENSCHUTZ-KORREKTE VERSION
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { resend } from '@/lib/resend'

interface Subscriber {
  email: string
}

interface SendResult {
  success: boolean
  email: string
  error?: any
  data?: any
}

export async function POST(request: NextRequest) {
  try {
    const { subject, content } = await request.json()

    if (!subject?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Betreff und Inhalt sind erforderlich' }, { status: 400 })
    }

    // Alle aktiven Abonnenten laden
    const { data: subscribers, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'confirmed')

    if (fetchError) {
      console.error('Subscribers fetch error:', fetchError)
      return NextResponse.json({ error: 'Fehler beim Laden der Abonnenten' }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ error: 'Keine aktiven Abonnenten gefunden' }, { status: 400 })
    }

    // Newsletter-HTML generieren
    const newsletterHtml = generateNewsletterHtml(subject, content)

    // 🔒 EINZELVERSAND - Jede E-Mail individuell senden
    let sentCount = 0
    const errors: Array<{ email: string; error: any }> = []
    const batchSize = 10 // Reduziert für bessere Rate-Limiting

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      // Promise.allSettled für parallelen Versand mit Fehlerbehandlung
      const promises = batch.map(async (subscriber: Subscriber): Promise<SendResult> => {
        try {
          // Personalisierte E-Mail für jeden Empfänger
          const personalizedHtml = newsletterHtml.replace(
            'EMAIL_PLACEHOLDER', 
            encodeURIComponent(subscriber.email)
          )

          const { data, error } = await resend.emails.send({
            from: 'FinClue Newsletter <team@finclue.de>',
            to: [subscriber.email], // ✅ Nur ein Empfänger pro E-Mail
            subject: subject,
            html: personalizedHtml,
          })

          if (error) {
            console.error(`Failed to send to ${subscriber.email}:`, error)
            return { success: false, email: subscriber.email, error }
          }

          return { success: true, email: subscriber.email, data }
        } catch (error) {
          console.error(`Exception sending to ${subscriber.email}:`, error)
          return { success: false, email: subscriber.email, error }
        }
      })

      // Warten auf alle E-Mails des Batches
      const results = await Promise.allSettled(promises)
      
      // Ergebnisse auswerten
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++
        } else {
          const email = batch[index].email
          const error = result.status === 'rejected' ? result.reason : result.value?.error
          errors.push({ email, error })
          console.error(`Failed for ${email}:`, error)
        }
      })

      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(subscribers.length/batchSize)} completed: ${sentCount}/${i + batch.length} sent`)

      // Pause zwischen Batches (wichtig für Rate-Limiting)
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return NextResponse.json({ 
      success: true, 
      sentCount,
      totalSubscribers: subscribers.length,
      errors: errors.length > 0 ? errors : undefined,
      failedCount: errors.length
    })

  } catch (error) {
    console.error('Newsletter send error:', error)
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
                                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">FinClue Newsletter</h1>
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