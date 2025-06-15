// src/app/api/debug/customer-portal/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'd5bd6951-6479-4279-afd6-a019d9f6f153';

    console.log('🔍 Debug Customer Portal for user:', userId);

    // 1. Environment Check
    const envCheck = {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      stripeSecretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    };
    console.log('🔧 Environment:', envCheck);

    // 2. Profile Check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('👤 Profile result:', { profile, profileError });

    if (profileError) {
      return NextResponse.json({
        step: 'profile_lookup',
        error: profileError.message,
        userId,
        envCheck
      }, { status: 500 });
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({
        step: 'customer_id_missing',
        profile,
        error: 'No stripe_customer_id in profile',
        userId,
        envCheck
      }, { status: 404 });
    }

    // 3. Stripe Customer Check
    let stripeCustomer = null;
    try {
      stripeCustomer = await stripe.customers.retrieve(profile.stripe_customer_id);
      console.log('💳 Stripe customer found:', stripeCustomer.id);
    } catch (stripeError: any) {
      console.error('❌ Stripe customer error:', stripeError);
      return NextResponse.json({
        step: 'stripe_customer_lookup',
        error: stripeError.message,
        customerId: profile.stripe_customer_id,
        stripeErrorType: stripeError.type,
        envCheck
      }, { status: 500 });
    }

    // 4. Try Creating Portal Session
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile`,
      });

      console.log('✅ Portal session created successfully');

      return NextResponse.json({
        success: true,
        userId,
        profile: {
          user_id: profile.user_id,
          stripe_customer_id: profile.stripe_customer_id,
          is_premium: profile.is_premium,
          subscription_status: profile.subscription_status
        },
        stripeCustomer: {
          id: (stripeCustomer as any).id,
          email: (stripeCustomer as any).email,
          created: (stripeCustomer as any).created
        },
        portalSession: {
          id: portalSession.id,
          url: portalSession.url
        },
        envCheck,
        timestamp: new Date().toISOString()
      });

    } catch (portalError: any) {
      console.error('❌ Portal session creation error:', portalError);
      return NextResponse.json({
        step: 'portal_session_creation',
        error: portalError.message,
        portalErrorType: portalError.type,
        customerId: profile.stripe_customer_id,
        envCheck
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Debug route error:', error);
    return NextResponse.json({
      step: 'general_error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}