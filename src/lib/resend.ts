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
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111827; background-color: #f9fafb;">

          <!-- Header -->
          <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px 16px 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #374151; margin: 0; font-size: 24px; font-weight: 700;">Finclue</h1>
              <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;">Willkommen in der Community</p>
            </div>
          </div>

          <!-- Main Content -->
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

            <div style="padding: 32px;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">
                Danke für deine Anmeldung!
              </h2>
              <p style="color: #6b7280; font-size: 15px; margin: 0 0 28px 0; line-height: 1.6;">
                Du bekommst ab jetzt quartalsweise die besten Insights zu den Portfolios der weltweit erfolgreichsten Investoren.
              </p>

              <!-- Features -->
              <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 28px;">
                <div style="background: #f9fafb; padding: 10px 16px; border-bottom: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Das erwartet dich</p>
                </div>
                <div style="padding: 0 16px;">
                  <div style="padding: 14px 0; border-bottom: 1px solid #f3f4f6; display: flex;">
                    <span style="color: #111827; font-size: 14px; font-weight: 600; min-width: 160px;">Super-Investor Updates</span>
                    <span style="color: #6b7280; font-size: 14px;">Warren Buffett, Bill Ackman & Co.</span>
                  </div>
                  <div style="padding: 14px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #111827; font-size: 14px; font-weight: 600; min-width: 160px;">Markt-Highlights</span>
                    <span style="color: #6b7280; font-size: 14px;">Die wichtigsten Bewegungen des Quartals</span>
                  </div>
                  <div style="padding: 14px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #111827; font-size: 14px; font-weight: 600; min-width: 160px;">Investment-Insights</span>
                    <span style="color: #6b7280; font-size: 14px;">Fundierte Analysen & Trends</span>
                  </div>
                  <div style="padding: 14px 0;">
                    <span style="color: #111827; font-size: 14px; font-weight: 600; min-width: 160px;">Neue Features</span>
                    <span style="color: #6b7280; font-size: 14px;">Exklusive Updates zu Finclue</span>
                  </div>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 0 0 24px 0;">
                <a href="https://finclue.de"
                   style="display: inline-block; background: #374151; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                  Finclue erkunden →
                </a>
              </div>

              <!-- Note -->
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
                  Fragen oder Feedback? Antworte einfach auf diese E-Mail – wir freuen uns über jede Nachricht.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                Viele Grüße, dein Finclue Team
              </p>
              <div style="text-align: center;">
                <a href="https://finclue.de" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">finclue.de</a>
                <span style="color: #d1d5db;">•</span>
                <a href="https://finclue.de/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color: #9ca3af; text-decoration: none; font-size: 13px; margin: 0 8px;">Abmelden</a>
              </div>
            </div>

          </div>

          <div style="height: 32px;"></div>

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