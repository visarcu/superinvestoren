// src/app/api/debug/stripe-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    console.log('🔍 Debugging Stripe status for user:', userId);

    // 1. Prüfe User in profiles (normal client)
    const { data: profileNormal, error: profileNormalError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('👤 Profile (normal client):', { profileNormal, profileNormalError });

    // 2. Prüfe User in profiles (admin client)
    const { data: profileAdmin, error: profileAdminError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('👤 Profile (admin client):', { profileAdmin, profileAdminError });

    // 3. Prüfe Stripe Customer falls vorhanden
    let stripeCustomer = null;
    let stripeSubscriptions = null;
    
    if (profileNormal?.stripe_customer_id) {
      try {
        stripeCustomer = await stripe.customers.retrieve(profileNormal.stripe_customer_id);
        console.log('💳 Stripe Customer:', stripeCustomer);

        // Hole Subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: profileNormal.stripe_customer_id,
          limit: 5
        });
        stripeSubscriptions = subscriptions.data;
        console.log('📋 Stripe Subscriptions:', stripeSubscriptions);
      } catch (stripeError) {
        console.error('❌ Stripe error:', stripeError);
      }
    }

    // 4. Environment Check
    const envCheck = {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasPriceId: !!process.env.STRIPE_PRICE_ID,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length
    };

    console.log('🔧 Environment:', envCheck);

    // 5. Test Admin Connection
    let adminConnectionTest = false;
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .limit(1);
      
      adminConnectionTest = !testError;
      console.log('🧪 Admin connection test:', { success: adminConnectionTest, testError });
    } catch (adminTestError) {
      console.error('🧪 Admin connection failed:', adminTestError);
    }

    return NextResponse.json({
      success: true,
      userId,
      profileNormal: {
        data: profileNormal,
        error: profileNormalError?.message
      },
      profileAdmin: {
        data: profileAdmin,
        error: profileAdminError?.message
      },
      stripeCustomer: stripeCustomer ? {
        id: (stripeCustomer as any).id,
        email: (stripeCustomer as any).email,
        metadata: (stripeCustomer as any).metadata
      } : null,
      stripeSubscriptions: stripeSubscriptions?.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_end: (sub as any).current_period_end
      })),
      environment: envCheck,
      adminConnectionTest,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Debug route error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}