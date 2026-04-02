// src/app/api/stripe/checkout/route.ts - FINAL VERSION mit Trial-Schutz
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Stripe Checkout POST with Trial: Starting...');
    
    // 1. Environment Check
    console.log('🔧 Environment Check:', {
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPriceId: !!process.env.STRIPE_PRICE_ID,
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      priceId: process.env.STRIPE_PRICE_ID
    });
    
    // 2. Parse request body
    const { userId, sessionToken, withTrial = true, plan = 'monthly' } = await request.json();

    if (!userId || !sessionToken) {
      return NextResponse.json(
        { error: 'User ID and session token are required' },
        { status: 400 }
      );
    }

    // Select price ID based on plan
    const priceId = plan === 'yearly'
      ? process.env.STRIPE_PRICE_ID_YEARLY!
      : process.env.STRIPE_PRICE_ID!;

    if (!priceId) {
      console.error(`❌ Missing price ID for plan: ${plan}`);
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${plan}` },
        { status: 500 }
      );
    }

    // No trial for yearly plan – user commits to a full year already
    const effectiveWithTrial = plan === 'yearly' ? false : withTrial;

    console.log('🎯 Plan:', plan, '| Price ID:', priceId, '| Trial:', effectiveWithTrial);

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
      await stripe.prices.retrieve(priceId);
      console.log('✅ Stripe connection and Price ID valid');
    } catch (stripeTestError) {
      console.error('❌ Stripe test failed:', stripeTestError);
      return NextResponse.json(
        { error: 'Stripe configuration error', details: String(stripeTestError) },
        { status: 500 }
      );
    }

    // 5. Check/Create Customer mit DUPLIKAT-VERMEIDUNG
    console.log('👤 Managing Stripe customer...');
    let customerId = '';
    
    // FIX 1: Erst in Stripe nach Email suchen um Duplikate zu vermeiden
    try {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 10
      });
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        console.log('✅ Found existing Stripe customer by email:', customerId);
        
        // Update die Supabase DB mit dieser Customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId);
      }
    } catch (searchError) {
      console.log('⚠️ Could not search for existing customers:', searchError);
    }
    
    // Falls kein Customer gefunden, dann normale Logik
    if (!customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (profile?.stripe_customer_id) {
        // Prüfe ob Customer in Stripe existiert
        try {
          await stripe.customers.retrieve(profile.stripe_customer_id);
          customerId = profile.stripe_customer_id;
          console.log('✅ Using existing customer:', customerId);
        } catch (customerError) {
          console.log('⚠️ Customer not found in Stripe, creating new one...');
          // Customer existiert nicht mehr in Stripe, erstelle neuen
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              supabase_user_id: userId,
            },
          });
          customerId = customer.id;
          
          // Update mit neuer Customer ID
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('user_id', userId);
          
          console.log('✅ New customer created and saved:', customerId);
        }
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
    }

    // 6. FIX 2: Trial-Check Logic - Prüfe ob Customer schon mal Trial hatte
    let trialDays = 14; // Standard Trial für alle
    let allowTrial = effectiveWithTrial; // Respektiere den effectiveWithTrial Parameter

    if (effectiveWithTrial) {
      // Check ob dieser Customer schon mal eine Trial hatte
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 100,
          status: 'all' // Wichtig: auch cancelled subscriptions
        });
        
        const hadTrial = subscriptions.data.some(sub => {
          // Check ob die Subscription jemals eine Trial hatte
          const subAny = sub as any;
          return subAny.trial_start || subAny.trial_end || sub.status === 'trialing';
        });
        
        if (hadTrial) {
          console.log('⚠️ Customer already had a trial, disabling trial period');
          allowTrial = false;
          trialDays = 0;
        } else {
          console.log('✅ Customer never had a trial, allowing trial period');
          
          // Special case für Eric
          if (user.email === 'goossens.eric@icloud.com') {
            trialDays = 30; // 4 Wochen für Eric als Entschuldigung
            console.log('🎁 Extended trial for Eric: 30 days');
          }
        }
      } catch (subError) {
        console.error('⚠️ Could not check trial history:', subError);
        // Im Zweifel: keine Trial wenn wir nicht sicher sind
        allowTrial = false;
        trialDays = 0;
      }
    }

    // 7. Create Checkout Session (MIT oder OHNE Trial basierend auf History)
    console.log(`🛒 Creating checkout session ${allowTrial ? `with ${trialDays}-day trial` : 'without trial (already used)'}...`);
    
    const sessionData: any = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?stripe_success=true${allowTrial ? '&trial=true' : ''}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?stripe_canceled=true`,
      metadata: {
        supabase_user_id: userId,
        had_trial: !allowTrial ? 'true' : 'false', // Tracking für Debugging
      },
    };

    // Trial nur hinzufügen wenn wirklich erlaubt
    if (allowTrial && trialDays > 0) {
      sessionData.subscription_data = {
        trial_period_days: trialDays,
        metadata: {
          supabase_user_id: userId,
        },
      };
      sessionData.metadata.trial_days = trialDays.toString();
    }
    
    const session = await stripe.checkout.sessions.create(sessionData);

    console.log('✅ Session created:', { 
      id: session.id, 
      hasUrl: !!session.url,
      trialAllowed: allowTrial,
      trialDays: allowTrial ? trialDays : 0
    });
    
    if (!session.url) {
      throw new Error('No checkout URL returned from Stripe');
    }

    return NextResponse.json({ 
      url: session.url,
      trial_days: allowTrial ? trialDays : 0
    });

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
      console.log('🎯 Portal requested for userId:', userId);
      
      // ✅ Admin Client für API Route verwenden
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
      
      const { data: profile, error: profileError } = await supabaseAdmin  // ← FIX HIER
        .from('profiles')
        .select('stripe_customer_id, user_id')
        .eq('user_id', userId)
        .single();
    
      console.log('📊 Database lookup result:', { 
        profile, 
        profileError,
        searchedUserId: userId 
      });
    
      if (!profile?.stripe_customer_id) {
        return NextResponse.json({ 
          error: 'No Stripe customer found',
          debug: { 
            userId, 
            profile,
            profileError: profileError?.message 
          }
        }, { status: 404 });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ 
      message: 'Status check not implemented yet',
      userId 
    });

  } catch (error) {
    console.error('❌ GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}