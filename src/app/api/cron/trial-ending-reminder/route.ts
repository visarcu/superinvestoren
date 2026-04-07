// src/app/api/cron/trial-ending-reminder/route.ts
// Täglich aufrufen (z.B. per Vercel Cron um 09:00 Uhr)
// Schickt Trial-Ende-Reminder an User deren Trial in 2-3 Tagen abläuft.
//
// Absicherung: Nur mit CRON_SECRET Header erreichbar (außer im Dev-Modus).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTrialEndingEmail } from '@/lib/onboardingEmails';

export async function GET(request: NextRequest) {
  // Cron-Authentifizierung
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // User finden deren Trial in 2–3 Tagen endet
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, subscription_end_date')
    .eq('subscription_status', 'trialing')
    .gte('subscription_end_date', twoDaysFromNow)
    .lte('subscription_end_date', threeDaysFromNow);

  if (error) {
    console.error('❌ Trial-ending cron: DB query failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    console.log('ℹ️ Trial-ending cron: No users to notify today');
    return NextResponse.json({ sent: 0, message: 'No trials ending in 2-3 days' });
  }

  console.log(`📬 Trial-ending cron: ${profiles.length} user(s) to notify`);

  let sent = 0;
  let failed = 0;

  for (const profile of profiles) {
    try {
      // E-Mail aus Supabase Auth holen
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

      if (userError || !userData?.user?.email) {
        console.error(`⚠️ Could not get email for user ${profile.user_id}:`, userError);
        failed++;
        continue;
      }

      const { email, user_metadata } = userData.user;
      const name = user_metadata?.full_name || user_metadata?.name || undefined;
      const trialEndDate = new Date(profile.subscription_end_date);

      const result = await sendTrialEndingEmail(email, trialEndDate, name);

      if (result.skipped) {
        console.log(`⏸️ Skipped (emails disabled): ${email}`);
      } else if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`❌ Failed to send trial-ending email for user ${profile.user_id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    sent,
    failed,
    total: profiles.length,
  });
}
