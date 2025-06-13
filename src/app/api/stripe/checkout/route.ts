// src/app/api/stripe/checkout/route.ts - EINFACHE FUNKTIONIERENDE VERSION
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Stripe Checkout POST: Starting...');
    
    // 1. Environment Check
    console.log('🔧 Environment Check:', {
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPriceId: !!process.env.STRIPE_PRICE_ID,
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      priceId: process.env.STRIPE_PRICE_ID
    });
    
    // 2. Parse request body
    const { userId, sessionToken } = await request.json();

    if (!userId || !sessionToken) {
      return NextResponse.json(
        { error: 'User ID and session token are required' },
        { status: 400 }
      );
    }

    // 3. Validiere Session-Token
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    
    if (authError || !user?.email) {
      console.error('❌ Invalid session token:', authError);
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    console.log('✅ Valid session, user email:', user.email);

    // 4. Test Stripe Connection
    console.log('🧪 Testing Stripe connection...');
    try {
      await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
      console.log('✅ Stripe connection and Price ID valid');
    } catch (stripeTestError) {
      console.error('❌ Stripe test failed:', stripeTestError);
      return NextResponse.json(
        { error: 'Stripe configuration error', details: String(stripeTestError) },
        { status: 500 }
      );
    }

    // 5. Check/Create Customer (vereinfacht)
    console.log('👤 Managing Stripe customer...');
    let customerId = '';
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
      console.log('✅ Using existing customer:', customerId);
    } else {
      console.log('📝 Creating new customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;
      
      // Save to database
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
      
      console.log('✅ Customer created and saved:', customerId);
    }

    // 6. Create Checkout Session (mit expliziten Typen)
    console.log('🛒 Creating checkout session...');
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?stripe_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?stripe_canceled=true`,
      metadata: {
        supabase_user_id: userId,
      },
    } as any); // Type-Cast um TypeScript-Probleme zu umgehen

    console.log('✅ Session created:', { id: session.id, hasUrl: !!session.url });
    
    if (!session.url) {
      throw new Error('No checkout URL returned from Stripe');
    }

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('❌ Checkout error:', error);
    return NextResponse.json(
      { 
        error: 'Checkout failed', 
        details: error?.message || String(error),
        type: error?.type || 'unknown'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'portal') {
      // Customer Portal
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (!profile?.stripe_customer_id) {
        return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
      });

      return NextResponse.json({ url: session.url });
    }

    // Status check (vereinfacht)
    return NextResponse.json({ 
      message: 'Status check not implemented yet',
      userId 
    });

  } catch (error) {
    console.error('❌ GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}