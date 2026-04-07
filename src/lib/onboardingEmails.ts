// src/lib/onboardingEmails.ts
// Onboarding E-Mail Sequenz für neue Premium-Trial User
//
// Schutz vor ungewolltem Versand:
// Setze ONBOARDING_EMAILS_ENABLED=true in der Produktionsumgebung
// um automatische Mails (Webhook + Cron) zu aktivieren.
// Der Test-Endpoint /api/notifications/preview-onboarding-emails
// sendet immer, unabhängig von diesem Flag.

import { resend } from './resend';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de';

function isEnabled(): boolean {
  return process.env.ONBOARDING_EMAILS_ENABLED === 'true';
}

// ──────────────────────────────────────────────────────────
// MAIL 1: Willkommen nach Trial-Start
// ──────────────────────────────────────────────────────────
export async function sendPremiumWelcomeEmail(
  email: string,
  name?: string,
  { force = false } = {}
) {
  if (!force && !isEnabled()) {
    console.log('⏸️  Onboarding emails disabled (ONBOARDING_EMAILS_ENABLED != true). Skipping welcome mail for:', email);
    return { success: false, skipped: true };
  }

  const firstName = name?.split(' ')[0] || null;
  const greeting = firstName ? `Hey ${firstName},` : 'Hey,';

  try {
    const { data, error } = await resend.emails.send({
      from: 'Finclue <team@finclue.de>',
      to: [email],
      subject: 'Dein Finclue Premium Trial startet jetzt',
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#111827;">

          <!-- Header -->
          <div style="max-width:600px;margin:0 auto;padding:32px 20px 16px 20px;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="color:#374151;margin:0;font-size:24px;font-weight:700;">Finclue</h1>
              <p style="color:#9ca3af;margin:4px 0 0 0;font-size:14px;">Premium Trial</p>
            </div>
          </div>

          <!-- Card -->
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
            <div style="padding:32px;">

              <h2 style="color:#111827;font-size:20px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">
                Willkommen bei Finclue Premium
              </h2>

              <p style="color:#6b7280;font-size:15px;margin:0 0 8px 0;line-height:1.6;">
                ${greeting}
              </p>
              <p style="color:#6b7280;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                du hast jetzt <strong style="color:#111827;">14 Tage kostenlos</strong> Zugang zu allen Premium-Features. Hier ist das, womit die meisten direkt starten:
              </p>

              <!-- Feature Highlight -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #374151;border-radius:6px;padding:20px;margin:0 0 24px 0;">
                <p style="color:#111827;font-size:15px;font-weight:600;margin:0 0 8px 0;">
                  Superinvestor-Portfolios in Echtzeit
                </p>
                <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.6;">
                  Sieh genau was Warren Buffett, Bill Ackman, Michael Burry & Co. kaufen und verkaufen – basierend auf offiziellen 13F-Filings.
                </p>
              </div>

              <!-- Features List -->
              <div style="border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin:0 0 28px 0;background:#fafafa;">
                <p style="color:#374151;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px 0;">Was dich noch erwartet</p>
                <ul style="color:#374151;font-size:14px;line-height:1.7;margin:0;padding-left:18px;">
                  <li style="margin-bottom:4px;"><strong>Aktienanalyse</strong> – DCF, Kennzahlen, Analystenschätzungen</li>
                  <li style="margin-bottom:4px;"><strong>Portfolio-Tracker</strong> – Performance, Dividenden, Depot-Übersicht</li>
                  <li style="margin-bottom:4px;"><strong>Earnings-Kalender</strong> – Quartalsberichte deiner Aktien</li>
                  <li style="margin-bottom:0;"><strong>Finclue AI</strong> – KI-Analyse für jede Aktie</li>
                </ul>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin:0 0 8px 0;">
                <a href="${BASE_URL}/analyse"
                   style="display:inline-block;background:#374151;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:500;font-size:14px;border:1px solid #374151;">
                  Jetzt loslegen →
                </a>
              </div>

            </div>

            <!-- Footer -->
            <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:13px;margin:0 0 8px 0;text-align:center;">
                Fragen? Einfach auf diese Mail antworten.
              </p>
              <div style="text-align:center;">
                <a href="${BASE_URL}" style="color:#374151;text-decoration:none;font-weight:500;font-size:13px;margin:0 8px;">finclue.de</a>
                <span style="color:#d1d5db;">•</span>
                <a href="${BASE_URL}/pricing" style="color:#6b7280;text-decoration:none;font-size:13px;margin:0 8px;">Abo verwalten</a>
              </div>
            </div>

          </div>
          <div style="height:32px;"></div>

        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Premium welcome email error:', error);
      return { success: false, error };
    }

    console.log('✅ Premium welcome email sent to:', email);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Premium welcome email exception:', err);
    return { success: false, error: err };
  }
}

// ──────────────────────────────────────────────────────────
// MAIL 2: Trial läuft in 3 Tagen ab
// ──────────────────────────────────────────────────────────
export async function sendTrialEndingEmail(
  email: string,
  trialEndDate: Date,
  name?: string,
  { force = false } = {}
) {
  if (!force && !isEnabled()) {
    console.log('⏸️  Onboarding emails disabled. Skipping trial-ending mail for:', email);
    return { success: false, skipped: true };
  }

  const firstName = name?.split(' ')[0] || null;
  const greeting = firstName ? `Hey ${firstName},` : 'Hey,';

  const formattedDate = trialEndDate.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const shortDate = trialEndDate.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
  });

  try {
    const { data, error } = await resend.emails.send({
      from: 'Finclue <team@finclue.de>',
      to: [email],
      subject: `Dein Trial endet am ${shortDate}`,
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#111827;">

          <!-- Header -->
          <div style="max-width:600px;margin:0 auto;padding:32px 20px 16px 20px;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="color:#374151;margin:0;font-size:24px;font-weight:700;">Finclue</h1>
              <p style="color:#9ca3af;margin:4px 0 0 0;font-size:14px;">Kurze Info zu deinem Abo</p>
            </div>
          </div>

          <!-- Card -->
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
            <div style="padding:32px;">

              <h2 style="color:#111827;font-size:20px;font-weight:600;margin:0 0 16px 0;line-height:1.3;">
                Dein Trial läuft bald ab
              </h2>

              <p style="color:#6b7280;font-size:15px;margin:0 0 8px 0;line-height:1.6;">
                ${greeting}
              </p>
              <p style="color:#6b7280;font-size:15px;margin:0 0 8px 0;line-height:1.6;">
                dein 14-Tage-Trial endet am <strong style="color:#111827;">${formattedDate}</strong>. Danach wird dein Abo automatisch zum regulären Preis weitergeführt.
              </p>
              <p style="color:#6b7280;font-size:15px;margin:0 0 24px 0;line-height:1.6;">
                Falls du kündigen möchtest, kannst du das jederzeit in den Einstellungen tun.
              </p>

              <!-- Value Reminder -->
              <div style="border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin:0 0 28px 0;background:#fafafa;">
                <p style="color:#374151;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px 0;">Was du mit Premium hast</p>
                <ul style="color:#374151;font-size:14px;line-height:1.7;margin:0;padding-left:18px;">
                  <li style="margin-bottom:4px;">Alle Superinvestor-Portfolios + Benachrichtigungen</li>
                  <li style="margin-bottom:4px;">Vollständige Aktienanalyse (DCF, Kennzahlen, Schätzungen)</li>
                  <li style="margin-bottom:4px;">Portfolio-Tracker mit Performance & Dividenden</li>
                  <li style="margin-bottom:0;">Finclue AI – KI-Analyse für jede Aktie</li>
                </ul>
              </div>

              <!-- CTAs -->
              <div style="text-align:center;margin:0 0 16px 0;">
                <a href="${BASE_URL}/analyse"
                   style="display:inline-block;background:#374151;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:500;font-size:14px;border:1px solid #374151;">
                  Weiter zu Finclue →
                </a>
              </div>
              <div style="text-align:center;">
                <a href="${BASE_URL}/analyse/portfolio/einstellungen"
                   style="color:#9ca3af;text-decoration:none;font-size:13px;">
                  Abo kündigen
                </a>
              </div>

            </div>

            <!-- Footer -->
            <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:13px;margin:0 0 8px 0;text-align:center;">
                Fragen? Einfach auf diese Mail antworten.
              </p>
              <div style="text-align:center;">
                <a href="${BASE_URL}" style="color:#374151;text-decoration:none;font-weight:500;font-size:13px;">finclue.de</a>
              </div>
            </div>

          </div>
          <div style="height:32px;"></div>

        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Trial ending email error:', error);
      return { success: false, error };
    }

    console.log('✅ Trial ending email sent to:', email);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Trial ending email exception:', err);
    return { success: false, error: err };
  }
}
