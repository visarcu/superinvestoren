// src/lib/resend.ts - KOMPLETTE DATEI
import { Resend } from 'resend';

// Lazy initialization - wird erst bei erster Nutzung initialisiert
// Dies verhindert Build-Fehler wenn RESEND_API_KEY nicht gesetzt ist
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Export als Proxy-Objekt für Abwärtskompatibilität
export const resend = {
  emails: {
    send: async (options: Parameters<Resend['emails']['send']>[0]) => {
      return getResend().emails.send(options);
    }
  }
};

// ✅ WILLKOMMENS-EMAIL FUNKTION
export async function sendWelcomeEmail(email: string) {
  try {
    console.log('🎉 Sending welcome email to:', email);

    const { data, error } = await resend.emails.send({
      from: 'Finclue <team@finclue.de>',
      to: [email],
      subject: '🎉 Willkommen bei Finclue! Nie wieder ein Update verpassen',
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Willkommen bei Finclue</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; min-height: 100vh;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);">
                            
                            <!-- Header mit Website-ähnlichem Design -->
                            <tr>
                                <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
                                    <div style="display: inline-block; width: 64px; height: 64px; background-color: rgba(255,255,255,0.15); border-radius: 16px; margin-bottom: 20px; line-height: 64px; backdrop-filter: blur(10px);">
                                        <span style="color: white; font-size: 28px; font-weight: 800;">F</span>
                                    </div>
                                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">Finclue</h1>
                                    <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 18px; font-weight: 500;">Nie wieder ein Update verpassen</p>
                                </td>
                            </tr>

                            <!-- Content mit Dark Theme -->
                            <tr>
                                <td style="padding: 40px; background-color: #1e293b;">
                                    <h2 style="margin: 0 0 24px; color: #f8fafc; font-size: 28px; font-weight: 700;">
                                        Willkommen! 🚀
                                    </h2>
                                    
                                    <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 17px; line-height: 1.7;">
                                        <strong style="color: #10b981;">Danke für deine Anmeldung!</strong> Du bist jetzt Teil unserer exklusiven Community von Investment-Enthusiasten und bekommst quartalsweise die besten Insights.
                                    </p>
                                    
                                    <!-- Feature Grid -->
                                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 24px; margin: 32px 0;">
                                        <h3 style="margin: 0 0 16px; color: white; font-size: 20px; font-weight: 700; text-align: center;">
                                            📊 Das erwartet dich:
                                        </h3>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                    <strong>🔍 Super-Investor Updates:</strong> Warren Buffett, Bill Ackman & Co.
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                    <strong>📈 Markt-Highlights:</strong> Die wichtigsten Bewegungen des Quartals
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                    <strong>💡 Investment-Insights:</strong> Fundierte Analysen & Trends
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                    <strong>🚀 Neue Features:</strong> Exklusive Updates zu Finclue
                                                </td>
                                            </tr>
                                        </table>
                                    </div>

                                    <!-- CTA Button -->
                                    <div style="text-align: center; margin: 36px 0;">
                                        <a href="https://finclue.de" 
                                           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 18px 36px; border-radius: 12px; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); transition: all 0.2s;">
                                            🚀 Finclue jetzt erkunden
                                        </a>
                                    </div>

                                    <div style="background: #334155; border-radius: 8px; padding: 20px; margin: 32px 0;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 15px; line-height: 1.6; text-align: center;">
                                            <strong style="color: #10b981;">💬 Fragen oder Feedback?</strong><br>
                                            Antworte einfach auf diese E-Mail - wir freuen uns über jede Nachricht!
                                        </p>
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 32px 40px; border-top: 1px solid #334155; text-align: center; background-color: #0f172a; border-radius: 0 0 16px 16px;">
                                    <p style="margin: 0 0 12px; color: #64748b; font-size: 15px; font-weight: 600;">
                                        Viele Grüße,<br>
                                        <span style="color: #10b981;">Dein Finclue Team</span>
                                    </p>
                                    <div style="margin: 20px 0 0;">
                                        <a href="https://finclue.de" style="color: #10b981; text-decoration: none; font-size: 14px; font-weight: 500; margin-right: 16px;">finclue.de</a>
                                        <span style="color: #475569; margin: 0 8px;">•</span>
                                        <a href="https://finclue.de/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color: #64748b; text-decoration: none; font-size: 14px;">Abmelden</a>
                                    </div>
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
      console.error('❌ Welcome email error:', error);
      return { success: false, error };
    }

    console.log('✅ Welcome email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Welcome email exception:', error);
    return { success: false, error };
  }
}

// ✅ OPTIONAL: Test-Funktion
export async function testWelcomeEmail(email: string = 'test@example.com') {
  console.log('🧪 Testing welcome email...');
  const result = await sendWelcomeEmail(email);
  console.log('Test result:', result);
  return result;
}