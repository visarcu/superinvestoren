// src/lib/resend.ts
import { Resend } from 'resend';

// API-Key Validierung
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'FinClue <team@finclue.de>',
      to: [email],
      subject: 'Willkommen bei FinClue! 📈',
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Willkommen bei FinClue</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; min-height: 100vh;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
                                    <div style="display: inline-block; width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 12px; margin-bottom: 20px; line-height: 60px;">
                                        <span style="color: white; font-size: 24px; font-weight: bold;">F</span>
                                    </div>
                                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">FinClue</h1>
                                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Willkommen im Team!</p>
                                </td>
                            </tr>

                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                                        Hallo! 👋
                                    </h2>
                                    
                                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                        Vielen Dank für deine Anmeldung zum FinClue Newsletter! Du bist jetzt Teil unserer Community von Investment-Enthusiasten.
                                    </p>
                                    
                                    <h3 style="margin: 30px 0 15px; color: #374151; font-size: 18px; font-weight: 600;">
                                        Das erwartet dich:
                                    </h3>
                                    
                                    <ul style="margin: 0 0 30px; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                                        <li><strong>Quartalsweise Updates</strong> über neue 13F-Filings</li>
                                        <li><strong>Marktbewegende Ereignisse</strong> und deren Analyse</li>
                                        <li><strong>Insights</strong> aus den Portfolios der besten Investoren</li>
                                        <li><strong>Neue Features</strong> auf FinClue.de</li>
                                    </ul>

                                    <!-- CTA Button -->
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="https://finclue.de" 
                                           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            🚀 FinClue erkunden
                                        </a>
                                    </div>

                                    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        Falls du Fragen hast oder Feedback loswerden möchtest, antworte einfach auf diese E-Mail. Wir freuen uns über jede Nachricht!
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                        Viele Grüße,<br>
                                        Dein FinClue Team
                                    </p>
                                    <p style="margin: 15px 0 0; color: #9ca3af; font-size: 12px;">
                                        <a href="https://finclue.de/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color: #6b7280;">Newsletter abmelden</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Welcome email error:', error);
      return { success: false, error };
    }

    console.log('✅ Welcome email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Welcome email exception:', error);
    return { success: false, error };
  }
}