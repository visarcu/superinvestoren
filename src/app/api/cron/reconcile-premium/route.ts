// src/app/api/cron/reconcile-premium/route.ts
// Täglicher Abgleich: Profile mit is_premium=true, deren subscription_end_date
// überschritten ist, werden gegen Stripe verifiziert und ggf. heruntergestuft.
// Sicherheitsnetz für verlorene/fehlgeschlagene Webhooks (z.B. war
// customer.subscription.deleted bis Aug 2026 gar nicht am Webhook-Endpoint
// abonniert — 17 gekündigte Accounts behielten dadurch dauerhaft Premium).
//
// Profile ohne subscription_end_date (manuell vergebenes Premium) werden
// bewusst nicht angefasst.
//
// Absicherung: Nur mit CRON_SECRET Header erreichbar.
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export async function GET(request: NextRequest) {
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

  const { data: candidates, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_end_date')
    .eq('is_premium', true)
    .not('subscription_end_date', 'is', null)
    .lt('subscription_end_date', new Date().toISOString());

  if (error) {
    console.error('❌ Reconcile cron: DB query failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let downgraded = 0;
  let renewed = 0;
  let errors = 0;
  const details: Array<{ user_id: string; action: string }> = [];

  for (const profile of candidates || []) {
    try {
      let liveSub: Stripe.Subscription | undefined;

      if (profile.stripe_customer_id) {
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'all',
          limit: 10,
        });

        // Ab Stripe API 2025-04-30 liegt current_period_end auf den
        // Subscription-Items, nicht mehr auf der Subscription selbst.
        const periodEnd = (s: Stripe.Subscription): number | undefined => {
          const anyS = s as any;
          return anyS.current_period_end ?? anyS.items?.data?.[0]?.current_period_end;
        };

        // Laufendes Abo (auch: gekündigt, aber bezahlte Periode noch aktiv,
        // oder past_due während Stripe Zahlungen erneut versucht)
        liveSub =
          subs.data.find(s => s.status === 'active' || s.status === 'trialing') ||
          subs.data.find(s => (periodEnd(s) || 0) * 1000 > Date.now());
      }

      if (liveSub) {
        // Unser end_date war nur veraltet (Webhook verpasst) → auffrischen
        const subAny = liveSub as any;
        const endTs = liveSub.status === 'trialing' && subAny.trial_end
          ? subAny.trial_end
          : (subAny.current_period_end ?? subAny.items?.data?.[0]?.current_period_end);

        await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: true,
            subscription_status: liveSub.status,
            stripe_subscription_id: liveSub.id,
            subscription_end_date: endTs ? new Date(endTs * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.user_id);

        renewed++;
        details.push({ user_id: profile.user_id, action: 'refreshed' });
      } else {
        await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: false,
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.user_id);

        downgraded++;
        details.push({ user_id: profile.user_id, action: 'downgraded' });
      }
    } catch (err) {
      console.error(`❌ Reconcile failed for user ${profile.user_id}:`, err);
      errors++;
      details.push({ user_id: profile.user_id, action: 'error' });
    }
  }

  console.log(`✅ Reconcile premium: ${downgraded} downgraded, ${renewed} refreshed, ${errors} errors of ${candidates?.length || 0} candidates`);

  return NextResponse.json({
    checked: candidates?.length || 0,
    downgraded,
    refreshed: renewed,
    errors,
    details,
  });
}
