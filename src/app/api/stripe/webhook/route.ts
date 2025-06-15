// src/app/api/stripe/webhook/route.ts - VERBESSERTE DEBUG VERSION
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export async function POST(request: NextRequest) {
  console.log('🎯 ==> WEBHOOK CALLED <== ');
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  try {
    // 1. Environment Check
    const envCheck = {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length
    };
    console.log('🔧 Environment Check:', envCheck);

    // 2. Body und Signature extrahieren
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    console.log('📋 Request Details:', {
      hasBody: !!body,
      bodyLength: body.length,
      hasSignature: !!signature,
      signature: signature?.substring(0, 50) + '...'
    });

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // 3. Webhook Event konstruieren
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Webhook signature verified');
      console.log('📨 Event Type:', event.type);
      console.log('📨 Event ID:', event.id);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return NextResponse.json({ 
        error: 'Invalid signature', 
        details: err.message 
      }, { status: 400 });
    }

    // 4. Event-Handler
    let result;
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('💰 Processing checkout.session.completed');
        result = await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log('💸 Processing invoice.payment_succeeded');
        result = await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'customer.subscription.updated':
        console.log('🔄 Processing customer.subscription.updated');
        result = await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log('❌ Processing customer.subscription.deleted');
        result = await handleSubscriptionDeleted(event.data.object);
        break;

      case 'customer.subscription.created':
        console.log('🆕 Processing customer.subscription.created');
        result = await handleSubscriptionCreated(event.data.object);
        break;

      default:
        console.log(`🔍 Unhandled event type: ${event.type}`);
        result = { handled: false, message: `Event type ${event.type} not handled` };
    }

    console.log(`✅ Event ${event.type} processed:`, result);
    return NextResponse.json({ 
      received: true, 
      event_type: event.type,
      event_id: event.id,
      result 
    });

  } catch (error) {
    console.error('❌ ==> WEBHOOK PROCESSING ERROR <==');
    console.error(error);
    return NextResponse.json({ 
      error: 'Webhook processing failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// ============================================================================
// EVENT HANDLERS mit verbessertem Debugging
// ============================================================================

async function handleCheckoutSessionCompleted(sessionData: any) {
  console.log('💰 ==> CHECKOUT SESSION COMPLETED <==');
  
  try {
    console.log('📊 Session Data:', {
      sessionId: sessionData.id,
      customerId: sessionData.customer,
      subscriptionId: sessionData.subscription,
      metadata: sessionData.metadata
    });
    
    const userId = sessionData.metadata?.supabase_user_id;
    if (!userId) {
      console.error('❌ No supabase_user_id in session metadata');
      return { success: false, error: 'No userId in metadata' };
    }
    console.log('👤 Found userId in metadata:', userId);

    if (!sessionData.subscription) {
      console.error('❌ No subscription in checkout session');
      return { success: false, error: 'No subscription in session' };
    }

    // Subscription Details holen
    console.log('📋 Fetching subscription details...');
    const subscription = await stripe.subscriptions.retrieve(sessionData.subscription as string);
    
    console.log('📊 Subscription Details:', {
      id: subscription.id,
      status: subscription.status,
      current_period_end: (subscription as any).current_period_end,
      customer: subscription.customer
    });

    // Jetzt versuchen den User zu aktualisieren
    console.log('🔄 Attempting to update user premium status...');
    
    // Admin Client erstellen - FUNKTIONIERT JETZT!
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('✅ Admin client created successfully');

    // User Premium Status aktualisieren
    const subscriptionAny = subscription as any;
    const currentPeriodEnd = subscriptionAny?.current_period_end;

    if (!currentPeriodEnd || isNaN(currentPeriodEnd)) {
      throw new Error('Invalid or missing current_period_end');
    }
    
    const endDate = new Date(currentPeriodEnd * 1000);
    
    const updateData = {
      is_premium: true,
      stripe_customer_id: sessionData.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_end_date: endDate.toISOString(),
      premium_since: new Date().toISOString()
    };

    console.log('📝 Updating user with data:', updateData);

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('❌ Failed to update user premium status:', updateError);
      return { 
        success: false, 
        error: `Database update failed: ${updateError.message}`,
        code: updateError.code
      };
    }

    console.log('✅ User premium status updated successfully:', updateResult);
    
    return { 
      success: true, 
      message: `User ${userId} upgraded to Premium`,
      subscription_id: subscription.id,
      status: subscription.status,
      end_date: endDate.toISOString(),
      updated_profile: updateResult
    };

  } catch (error) {
    console.error('❌ Error in handleCheckoutSessionCompleted:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function handleSubscriptionCreated(subscriptionData: any) {
  console.log('🆕 ==> SUBSCRIPTION CREATED <==');
  console.log('📊 Subscription Data:', subscriptionData);
  
  try {
    // Dynamic import für Admin Client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Finde User über Customer ID  
    const customerId = subscriptionData.customer as string;
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (findError || !profile) {
      console.error('❌ No user found for customer:', customerId);
      return { success: false, error: 'User not found' };
    }

    const userId = profile.user_id;
    const isActive = subscriptionData.status === 'active' || subscriptionData.status === 'trialing';
    
    // Type-safe Zugriff auf current_period_end
    const subscriptionAny = subscriptionData as any;
    const currentPeriodEnd = subscriptionAny.current_period_end;
    const endDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const updateData = {
      is_premium: isActive,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionData.id,
      subscription_status: subscriptionData.status,
      subscription_end_date: endDate.toISOString(),
      premium_since: isActive ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('❌ Failed to update user premium status:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ User ${userId} subscription created: ${subscriptionData.status}`);
    return { 
      success: true, 
      message: `User ${userId} subscription created`,
      status: subscriptionData.status,
      updated_profile: updateResult
    };
  } catch (error) {
    console.error('❌ Error handling subscription creation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function handleInvoicePaymentSucceeded(invoiceData: any) {
  console.log('💸 ==> INVOICE PAYMENT SUCCEEDED <==');
  console.log('📊 Invoice Data:', invoiceData);
  
  try {
    if (!invoiceData.subscription) {
      console.log('ℹ️ Invoice not related to subscription, skipping');
      return { success: true, message: 'Non-subscription invoice, skipped' };
    }

    // Dynamic import für Admin Client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Hole Subscription von Stripe
    const subscription = await stripe.subscriptions.retrieve(invoiceData.subscription as string);
    
    // Finde User über Customer ID
    const customerId = subscription.customer as string;
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (findError || !profile) {
      console.error('❌ No user found for customer:', customerId);
      return { success: false, error: 'User not found' };
    }

    const userId = profile.user_id;
    
    // Type-safe Zugriff auf current_period_end
    const subscriptionAny = subscription as any;
    const currentPeriodEnd = subscriptionAny.current_period_end;
    const endDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Status aktualisieren (Verlängerung)
    const updateData = {
      is_premium: true,
      subscription_status: subscription.status,
      subscription_end_date: endDate.toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('❌ Failed to update user premium status:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ User ${userId} subscription renewed successfully`);
    return { 
      success: true, 
      message: `User ${userId} subscription renewed`,
      subscription_id: subscription.id,
      updated_profile: updateResult
    };
  } catch (error) {
    console.error('❌ Error handling payment success:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function handleSubscriptionUpdated(subscriptionData: any) {
  console.log('🔄 ==> SUBSCRIPTION UPDATED <==');
  console.log('📊 Subscription Data:', subscriptionData);
  
  try {
    // Dynamic import für Admin Client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Finde User über Customer ID
    const customerId = subscriptionData.customer as string;
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (findError || !profile) {
      console.error('❌ No user found for customer:', customerId);
      return { success: false, error: 'User not found' };
    }

    const userId = profile.user_id;
    const isActive = subscriptionData.status === 'active' || subscriptionData.status === 'trialing';
    
    // Type-safe Zugriff auf current_period_end
    const subscriptionAny = subscriptionData as any;
    const currentPeriodEnd = subscriptionAny.current_period_end;
    const endDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const updateData = {
      is_premium: isActive,
      subscription_status: subscriptionData.status,
      subscription_end_date: endDate.toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('❌ Failed to update user premium status:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ User ${userId} subscription updated: ${subscriptionData.status}`);
    return { 
      success: true, 
      message: `User ${userId} subscription updated to ${subscriptionData.status}`,
      is_active: isActive,
      updated_profile: updateResult
    };
  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function handleSubscriptionDeleted(subscriptionData: any) {
  console.log('❌ ==> SUBSCRIPTION DELETED <==');
  console.log('📊 Subscription Data:', subscriptionData);
  
  try {
    // Dynamic import für Admin Client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Finde User über Customer ID
    const customerId = subscriptionData.customer as string;
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (findError || !profile) {
      console.error('❌ No user found for customer:', customerId);
      return { success: false, error: 'User not found' };
    }

    const userId = profile.user_id;
    
    // Type-safe Zugriff auf current_period_end
    const subscriptionAny = subscriptionData as any;
    const currentPeriodEnd = subscriptionAny.current_period_end;
    const endDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : new Date();
    
    // Premium deaktivieren
    const updateData = {
      is_premium: false,
      subscription_status: 'canceled',
      subscription_end_date: endDate.toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('❌ Failed to update user premium status:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ User ${userId} subscription canceled`);
    return { 
      success: true, 
      message: `User ${userId} subscription canceled`,
      access_until: endDate.toISOString(),
      updated_profile: updateResult
    };
  } catch (error) {
    console.error('❌ Error handling subscription deletion:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// GET für Webhook-Tests
export async function GET(request: NextRequest) {
  console.log('🔍 Webhook GET endpoint called');
  
  return NextResponse.json({ 
    message: 'Stripe Webhook Endpoint - Improved Debug Version',
    timestamp: new Date().toISOString(),
    environment: {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
}