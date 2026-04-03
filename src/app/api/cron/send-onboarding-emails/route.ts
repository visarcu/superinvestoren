// src/app/api/cron/send-onboarding-emails/route.ts
// Cron: täglich 09:00 UTC — sendet Onboarding-Mails an neue User
//
// TEST-MODUS: Setze ONBOARDING_TEST_EMAIL in Vercel env vars auf deine eigene
// E-Mail-Adresse. Dann werden NUR Mails an diese Adresse verschickt.
// Wenn die Variable leer ist oder fehlt → normaler Betrieb (alle User).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY)

// TEST-MODUS: Nur diese E-Mail-Adresse bekommt Onboarding-Mails
const TEST_EMAIL = process.env.ONBOARDING_TEST_EMAIL?.trim() || null

// Onboarding-Schritte: step → Tage nach Signup
const STEPS: Record<number, number> = {
  0: 0,   // Tag 0: Sofort nach Signup
  1: 2,   // Tag 2
  2: 5,   // Tag 5
  3: 10,  // Tag 10
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

// ─────────────────────────────────────────────
// E-MAIL TEMPLATES
// ─────────────────────────────────────────────

function emailWrapper(content: string, unsubscribeEmail: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;color:#111827;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#374151;">Finclue</p>
    </div>
    <div style="background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
      <div style="padding:32px 32px 24px;">
        ${content}
      </div>
      <div style="background:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          Viele Grüße, dein Finclue Team &nbsp;·&nbsp;
          <a href="https://finclue.de" style="color:#6b7280;text-decoration:none;">finclue.de</a>
          &nbsp;·&nbsp;
          <a href="https://finclue.de/api/newsletter/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}" style="color:#9ca3af;text-decoration:none;">Abmelden</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function ctaButton(text: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#111827;color:#fff;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;">${text} →</a>
  </div>`
}

function step0Html(email: string): string {
  // SCREENSHOT: Ersetze die URL unten mit einem echten Screenshot des Chart-Builders
  // z.B. nach Finclue hochladen und URL hier eintragen: https://finclue.de/images/chart-builder-preview.png
  const CHART_SCREENSHOT_URL = 'https://finclue.de/chart-preview.png'
  const hasScreenshot = false // Screenshot-Datei ersetzen, dann auf true setzen

  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;line-height:1.3;">So nutzt du den Chart-Builder — dein stärkstes Analyse-Tool</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
      Willkommen bei Finclue! Eines der mächtigsten Features ist der Chart-Builder: Vergleiche beliebige Aktien und Kennzahlen über Zeit — visuell, schnell, auf einen Blick.
    </p>
    ${hasScreenshot ? `
    <a href="https://finclue.de/analyse/compare" style="display:block;margin-bottom:20px;">
      <img src="${CHART_SCREENSHOT_URL}" alt="Finclue Chart-Builder" style="width:100%;border-radius:8px;border:1px solid #e5e7eb;" />
    </a>` : ''}
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Was du damit machen kannst</p>
      <div style="margin-bottom:12px;display:flex;gap:12px;">
        <span style="background:#f3f4f6;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">1</span>
        <div><strong style="font-size:14px;">Mehrere Aktien gleichzeitig</strong><br><span style="color:#6b7280;font-size:13px;">GOOGL vs. MSFT vs. META — KGV-Entwicklung der letzten 5 Jahre auf einem Chart</span></div>
      </div>
      <div style="margin-bottom:12px;display:flex;gap:12px;">
        <span style="background:#f3f4f6;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">2</span>
        <div><strong style="font-size:14px;">Jede Kennzahl kombinierbar</strong><br><span style="color:#6b7280;font-size:13px;">KGV, P/FCF, Marge, Umsatz — frei wählbar und kombinierbar</span></div>
      </div>
      <div style="display:flex;gap:12px;">
        <span style="background:#f3f4f6;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">3</span>
        <div><strong style="font-size:14px;">Vorlagen speichern</strong><br><span style="color:#6b7280;font-size:13px;">Einmal einrichten, jederzeit wieder aufrufen</span></div>
      </div>
    </div>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">Tipp: Vergleiche zwei Aktien aus derselben Branche — z.B. GOOGL und META.</p>
    ${ctaButton('Chart-Builder öffnen', 'https://finclue.de/analyse/compare')}
  `, email)
}

function step1Html(email: string): string {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;line-height:1.3;">Was kaufen Superinvestoren gerade?</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
      Warren Buffett, Bill Ackman, Michael Burry — sie alle müssen ihre Positionen quartalsweise offenlegen. Gesetzlich vorgeschrieben. Bei Finclue siehst du genau, was sie kaufen, verkaufen und halten.
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 20px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Woher kommen die Daten?</p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        Jeder Fonds mit mehr als 100 Mio. $ verwaltetem Vermögen muss seine Positionen über sogenannte <strong>13F-Filings</strong> bei der US-Börsenaufsicht SEC offenlegen — quartalsweise, öffentlich zugänglich. Finclue liest diese Daten direkt aus und bereitet sie übersichtlich auf.
      </p>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Das siehst du je Investor</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:14px;font-weight:500;">Komplettes Portfolio</span>
          <span style="font-size:13px;color:#6b7280;">Alle Positionen & Gewichtungen</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:14px;font-weight:500;">Neue Käufe & Verkäufe</span>
          <span style="font-size:13px;color:#6b7280;">Aus dem letzten Quartal</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:14px;font-weight:500;">Historische Entwicklung</span>
          <span style="font-size:13px;color:#6b7280;">Wie hat sich das Portfolio verändert?</span>
        </div>
      </div>
    </div>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">90+ der bekanntesten Investoren weltweit — kostenlos einsehbar.</p>
    ${ctaButton('Superinvestor-Portfolios ansehen', 'https://finclue.de/analyse/superinvestors')}
  `, email)
}

function step2Html(email: string): string {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;line-height:1.3;">Wer kauft die eigene Aktie — und was ist sie wirklich wert?</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
      Zwei der stärksten Signale beim Investieren: Insider-Käufe und der faire Wert einer Aktie. Beide findest du bei Finclue.
    </p>
    <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;">📊 Insider Trading</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
          Wenn CEOs und CFOs die eigene Aktie kaufen, ist das oft ein bullisches Signal. Du siehst wer kauft, wann und wie viel.
        </p>
      </div>
      <div style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;">🧮 Fairer Wert (DCF)</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
          Basierend auf dem freien Cashflow und Wachstumserwartungen berechnet Finclue, ob eine Aktie über- oder unterbewertet ist.
        </p>
      </div>
    </div>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">Probier es mit einer Aktie aus deiner Watchlist.</p>
    ${ctaButton('Aktie analysieren', 'https://finclue.de/analyse')}
  `, email)
}

function step3Html(email: string): string {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;line-height:1.3;">Du analysierst bereits wie ein Profi — ein Schritt fehlt noch</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
      In den letzten Tagen hast du Aktien analysiert, Superinvestoren beobachtet und Insider-Bewegungen verfolgt. Mit Premium holst du das Letzte raus.
    </p>
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Was Premium dazubringt</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#059669;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:14px;"><strong>20+ Jahre Finanzdaten</strong> — statt nur 5 Jahre</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#059669;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:14px;"><strong>KI-Zusammenfassung</strong> der Quartalszahlen</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#059669;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:14px;"><strong>Alerts</strong> bei Kursrückgängen & neuen SEC-Filings</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#059669;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:14px;"><strong>Wöchentlicher Portfolio-Report</strong> per E-Mail</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#059669;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:14px;"><strong>Dividenden-Kalender</strong> & unbegrenzte Watchlist</span>
        </div>
      </div>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#374151;">
        <strong>79 €/Jahr</strong> — entspricht <strong>6,58 €/Monat</strong>
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Monatlich auch verfügbar · Jederzeit kündbar</p>
    </div>
    ${ctaButton('Premium freischalten', 'https://finclue.de/pricing')}
    <p style="margin:0;text-align:center;font-size:12px;color:#9ca3af;">Fragen? Einfach auf diese E-Mail antworten.</p>
  `, email)
}

const STEP_SUBJECTS: Record<number, string> = {
  0: '📊 So nutzt du den Finclue Chart-Builder',
  1: '🏦 Was kaufen Superinvestoren gerade?',
  2: '🔍 Insider Trading + fairer Wert erklärt',
  3: '⭐ Ein Schritt fehlt noch — Finclue Premium',
}

const STEP_HTML: Record<number, (email: string) => string> = {
  0: step0Html,
  1: step1Html,
  2: step2Html,
  3: step3Html,
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth: nur Vercel Cron oder interner Aufruf
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isTestMode = !!TEST_EMAIL
  console.log(`[Onboarding Emails] Start — Test-Modus: ${isTestMode ? TEST_EMAIL : 'aus'}`)

  try {
    // Alle Auth-User laden (paginiert, max 1000 für jetzt)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) throw usersError

    // Im Test-Modus: nur der eigene Account
    const filtered = isTestMode
      ? users.filter(u => u.email === TEST_EMAIL)
      : users

    if (isTestMode && filtered.length === 0) {
      console.warn(`[Onboarding Emails] TEST_EMAIL ${TEST_EMAIL} nicht in Auth-Users gefunden`)
      return NextResponse.json({ ok: true, sent: 0, note: 'Test-Email nicht gefunden' })
    }

    // Bereits gesendete Logs laden (alle auf einmal, effizienter)
    const userIds = filtered.map(u => u.id)
    const { data: logs } = await supabase
      .from('onboarding_email_log')
      .select('user_id, step')
      .in('user_id', userIds)

    // Map: userId → Set<step>
    const sentMap = new Map<string, Set<number>>()
    for (const log of logs || []) {
      if (!sentMap.has(log.user_id)) sentMap.set(log.user_id, new Set())
      sentMap.get(log.user_id)!.add(log.step)
    }

    let totalSent = 0
    const errors: string[] = []

    for (const user of filtered) {
      if (!user.email) continue
      const createdAt = new Date(user.created_at)
      const days = daysSince(createdAt)
      const sentSteps = sentMap.get(user.id) || new Set()

      for (const [stepStr, minDays] of Object.entries(STEPS)) {
        const step = Number(stepStr)
        if (sentSteps.has(step)) continue   // bereits gesendet
        if (days < minDays) continue         // noch zu früh

        const subject = isTestMode
          ? `[TEST] ${STEP_SUBJECTS[step]}`
          : STEP_SUBJECTS[step]

        try {
          const { error: sendError } = await resend.emails.send({
            from: 'Finclue <team@finclue.de>',
            to: [user.email],
            subject,
            html: STEP_HTML[step](user.email),
          })

          if (sendError) {
            console.error(`[Onboarding Emails] Fehler Step ${step} → ${user.email}:`, sendError)
            errors.push(`${user.email} step ${step}: ${JSON.stringify(sendError)}`)
            continue
          }

          // Log eintragen
          const { error: insertError } = await supabase.from('onboarding_email_log').insert({
            user_id: user.id,
            step,
          })

          if (insertError) {
            console.error(`[Onboarding Emails] Insert-Fehler Step ${step} → ${user.email}:`, JSON.stringify(insertError))
          }

          console.log(`✅ Onboarding Step ${step} → ${user.email} (Tag ${days})`)
          totalSent++
        } catch (e) {
          console.error(`[Onboarding Emails] Exception Step ${step} → ${user.email}:`, e)
          errors.push(`${user.email} step ${step}: exception`)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sent: totalSent,
      testMode: isTestMode,
      testEmail: TEST_EMAIL,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Onboarding Emails] Fatal error:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

// POST für manuelle Trigger (z.B. aus der Konsole)
export const POST = GET
