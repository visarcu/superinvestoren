// src/app/api/notifications/preview-onboarding-emails/route.ts
// Test-Endpoint: Schickt beide Onboarding-Mails an eine beliebige Adresse.
// Dieser Endpoint ignoriert ONBOARDING_EMAILS_ENABLED – er sendet immer.
//
// Aufruf:
//   GET /api/notifications/preview-onboarding-emails?email=deine@mail.de
//   GET /api/notifications/preview-onboarding-emails?email=deine@mail.de&type=welcome
//   GET /api/notifications/preview-onboarding-emails?email=deine@mail.de&type=trial-ending

import { NextRequest, NextResponse } from 'next/server';
import { sendPremiumWelcomeEmail, sendTrialEndingEmail } from '@/lib/onboardingEmails';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const type = searchParams.get('type'); // 'welcome' | 'trial-ending' | null (= beide)

  if (!email) {
    return NextResponse.json(
      { error: 'Query-Parameter "email" fehlt. Beispiel: ?email=deine@mail.de' },
      { status: 400 }
    );
  }

  const results: Record<string, unknown> = {};

  const sendWelcome = !type || type === 'welcome';
  const sendTrialEnding = !type || type === 'trial-ending';

  if (sendWelcome) {
    results.welcome = await sendPremiumWelcomeEmail(email, 'Test User', { force: true });
  }

  if (sendTrialEnding) {
    // Trial-Ende in 3 Tagen simulieren
    const mockTrialEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    results.trialEnding = await sendTrialEndingEmail(email, mockTrialEnd, 'Test User', { force: true });
  }

  const allSuccess = Object.values(results).every((r: any) => r.success);

  return NextResponse.json({
    sent_to: email,
    results,
    ok: allSuccess,
  });
}
