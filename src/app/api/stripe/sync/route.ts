// src/app/api/stripe/sync/route.ts
// Manueller Sync von Stripe Subscription Status zu Supabase
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

// Admin Supabase Client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId } = body;

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or userId required' }, { status: 400 });
    }

    console.log('🔄 Manual sync requested for:', { email, userId });

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Find user in Supabase
    let profile;
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'User not found by userId', details: error.message }, { status: 404 });
      }
      profile = data;
    } else {
      // Find by email - need to check auth.users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        return NextResponse.json({ error: 'Failed to search users', details: authError.message }, { status: 500 });
      }

      const authUser = authUsers.users.find(u => u.email === email);
      if (!authUser) {
        return NextResponse.json({ error: 'User not found by email' }, { status: 404 });
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Profile not found', details: error.message }, { status: 404 });
      }
      profile = data;
    }

    console.log('📊 Current profile:', profile);

    // 2. Search for customer in Stripe by email
    let stripeCustomer;
    let subscription;

    // First try existing stripe_customer_id
    if (profile.stripe_customer_id) {
      try {
        stripeCustomer = await stripe.customers.retrieve(profile.stripe_customer_id);
        console.log('✅ Found customer by stored ID:', stripeCustomer.id);
      } catch (e) {
        console.log('⚠️ Stored customer ID invalid, searching by email...');
      }
    }

    // If no customer found, search by email
    if (!stripeCustomer || (stripeCustomer as any).deleted) {
      // Get user email from auth
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers.users.find(u => u.id === profile.user_id);
      const userEmail = email || authUser?.email;

      if (userEmail) {
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1
        });

        if (customers.data.length > 0) {
          stripeCustomer = customers.data[0];
          console.log('✅ Found customer by email:', stripeCustomer.id);
        }
      }
    }

    if (!stripeCustomer || (stripeCustomer as any).deleted) {
      return NextResponse.json({
        error: 'No Stripe customer found',
        profile: {
          user_id: profile.user_id,
          is_premium: profile.is_premium,
          stripe_customer_id: profile.stripe_customer_id
        }
      }, { status: 404 });
    }

    // 3. Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: 'all',
      limit: 10
    });

    console.log('📋 Found subscriptions:', subscriptions.data.map(s => ({
      id: s.id,
      status: s.status,
      current_period_end: new Date((s as any).current_period_end * 1000).toISOString()
    })));

    // Find active or trialing subscription
    subscription = subscriptions.data.find(s =>
      s.status === 'active' || s.status === 'trialing'
    );

    // 4. Update Supabase profile
    let updateData: any = {
      stripe_customer_id: stripeCustomer.id,
      updated_at: new Date().toISOString()
    };

    if (subscription) {
      const subAny = subscription as any;
      let endDate: Date;

      if (subscription.status === 'trialing' && subAny.trial_end) {
        endDate = new Date(subAny.trial_end * 1000);
      } else if (subAny.current_period_end) {
        endDate = new Date(subAny.current_period_end * 1000);
      } else {
        endDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
      }

      updateData = {
        ...updateData,
        is_premium: true,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_end_date: endDate.toISOString(),
        premium_since: profile.premium_since || new Date().toISOString()
      };

      console.log('✅ Active subscription found, setting premium=true');
    } else {
      // Check if there's a canceled subscription that's still valid
      const canceledSub = subscriptions.data.find(s =>
        s.status === 'canceled' &&
        (s as any).current_period_end * 1000 > Date.now()
      );

      if (canceledSub) {
        const endDate = new Date((canceledSub as any).current_period_end * 1000);
        updateData = {
          ...updateData,
          is_premium: true, // Still valid until period end
          stripe_subscription_id: canceledSub.id,
          subscription_status: 'canceled',
          subscription_end_date: endDate.toISOString()
        };
        console.log('⚠️ Canceled but still valid subscription found');
      } else {
        updateData = {
          ...updateData,
          is_premium: false,
          subscription_status: 'none'
        };
        console.log('❌ No active subscription found');
      }
    }

    console.log('📝 Updating profile with:', updateData);

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', profile.user_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update profile',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Premium status synced successfully',
      before: {
        is_premium: profile.is_premium,
        stripe_customer_id: profile.stripe_customer_id,
        subscription_status: profile.subscription_status
      },
      after: {
        is_premium: updatedProfile.is_premium,
        stripe_customer_id: updatedProfile.stripe_customer_id,
        subscription_status: updatedProfile.subscription_status,
        subscription_end_date: updatedProfile.subscription_end_date
      },
      stripe: {
        customer_id: stripeCustomer.id,
        subscription_id: subscription?.id || null,
        subscription_status: subscription?.status || 'none'
      }
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// GET endpoint for easy testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({
      message: 'Stripe Sync Endpoint',
      usage: 'POST with { email: "user@example.com" } or { userId: "uuid" }',
      alternative: 'GET ?email=user@example.com'
    });
  }

  // Redirect to POST with email
  const response = await POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' }
  }));

  return response;
}
