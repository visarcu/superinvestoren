// src/lib/stripeAuth.ts - EINFACHE VERSION (weniger Admin-Client)
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export interface StripeSubscriptionStatus {
  isActive: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  endDate: Date | null;
}

export class StripeAuth {
  
  /**
   * Erstelle Checkout-Session für 9€/Monat Abo
   * Verwendet Session-Token für User-Authentifizierung
   */
  static async createCheckoutSession(userId: string, userEmail: string): Promise<string> {
    try {
      console.log(`💳 Creating checkout session for user ${userId}`);
      
      // Prüfe ob User bereits Customer ist (normaler supabase client)
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      let customerId: string | undefined = profile?.stripe_customer_id || undefined;

      // Erstelle neuen Customer falls nicht vorhanden
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabase_user_id: userId,
          },
        });
        customerId = customer.id;

        // Speichere Customer ID (normaler Client, da User authentifiziert ist)
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId);
      }

      // Erstelle Checkout Session
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
      });

      return session.url!;
    } catch (error) {
      console.error('❌ Stripe checkout session error:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Prüfe aktuellen Subscription-Status
   */
  static async checkSubscriptionStatus(userId: string): Promise<StripeSubscriptionStatus> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, stripe_subscription_id, subscription_status, subscription_end_date')
        .eq('user_id', userId)
        .single();

      if (!profile?.stripe_subscription_id) {
        return {
          isActive: false,
          customerId: profile?.stripe_customer_id || null,
          subscriptionId: null,
          status: null,
          endDate: null,
        };
      }

      // Hole aktuelle Subscription von Stripe
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      
      // Type-safe Zugriff auf current_period_end
      const subscriptionAny = subscription as any;
      const endTimestamp = subscriptionAny.current_period_end;
      const endDate = endTimestamp ? new Date(endTimestamp * 1000) : null;
      
      return {
        isActive,
        customerId: profile.stripe_customer_id,
        subscriptionId: subscription.id,
        status: subscription.status,
        endDate,
      };
    } catch (error) {
      console.error('❌ Stripe subscription check error:', error);
      return {
        isActive: false,
        customerId: null,
        subscriptionId: null,
        status: 'error',
        endDate: null,
      };
    }
  }

  /**
   * Customer Portal für Abo-Verwaltung
   */
  static async createCustomerPortalSession(userId: string): Promise<string> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (!profile?.stripe_customer_id) {
        throw new Error('No Stripe customer found');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
      });

      return session.url;
    } catch (error) {
      console.error('❌ Stripe portal session error:', error);
      throw new Error('Failed to create portal session');
    }
  }

  // ============================================================================
  // WEBHOOK-FUNKTIONEN (hier brauchen wir Admin Client, weil keine User-Session)
  // ============================================================================

  /**
   * Finde User für Webhooks (nur hier Admin Client nötig!)
   * ROBUST VERSION
   */
  static async findUserByCustomerIdOrEmail(customerId: string, email: string | null): Promise<string | null> {
    try {
      console.log(`🔍 Finding user by customer ID: ${customerId} or email: ${email}`);
      
      // Dynamic import nur wenn nötig (für Webhooks)
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
      
      // 1. Versuche über stripe_customer_id
      if (customerId) {
        console.log('🔍 Searching by stripe_customer_id...');
        const { data: profile, error } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle(); // maybeSingle statt single
        
        console.log('📊 Customer ID search result:', { profile, error });
        
        if (profile && profile.user_id) {
          console.log(`✅ User found by customer ID: ${profile.user_id}`);
          return profile.user_id;
        }
        
        if (error) {
          console.error('❌ Customer ID search error:', error);
        }
      }

      // 2. Fallback über Email in auth.users
      if (email) {
        console.log('🔍 Fallback: Searching by email...');
        
        try {
          const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            console.error('❌ Error listing users:', listError);
          } else {
            console.log(`📊 Found ${userList.users.length} users in auth`);
            const foundUser = userList.users.find(u => u.email === email);
            if (foundUser) {
              console.log(`✅ User found by email: ${foundUser.id}`);
              return foundUser.id;
            }
          }
        } catch (emailError) {
          console.error('❌ Email search error:', emailError);
        }
      }

      // 3. Debug: Alle profiles laden und schauen
      console.log('🔍 Debug: Checking all profiles...');
      try {
        const { data: allProfiles, error: allError } = await supabaseAdmin
          .from('profiles')
          .select('user_id, stripe_customer_id')
          .limit(5);
        
        console.log('📊 Sample profiles:', allProfiles);
        console.log('📊 Error if any:', allError);
      } catch (debugError) {
        console.error('❌ Debug error:', debugError);
      }

      console.warn('⚠️ No user found with any method');
      return null;
    } catch (error) {
      console.error('❌ Error finding user:', error);
      return null;
    }
  }

  /**
   * Update User Premium Status (nur für Webhooks!)
   */
  static async updateUserPremiumStatus(
    userId: string, 
    isPremium: boolean, 
    customerId?: string,
    subscriptionId?: string,
    status?: string,
    endDate?: Date
  ): Promise<void> {
    try {
      // Dynamic import nur für Webhooks nötig
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
      
      const updateData: any = {
        is_premium: isPremium,
        subscription_status: status || (isPremium ? 'active' : 'canceled'),
      };

      if (customerId) updateData.stripe_customer_id = customerId;
      if (subscriptionId) updateData.stripe_subscription_id = subscriptionId;
      if (endDate) updateData.subscription_end_date = endDate.toISOString();
      if (isPremium && !status) updateData.premium_since = new Date().toISOString();

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Failed to update user premium status:', error);
        throw error;
      }

      console.log(`✅ Updated premium status for user ${userId}: ${isPremium ? 'ACTIVE' : 'INACTIVE'}`);
    } catch (error) {
      console.error('❌ Error updating user premium status:', error);
      throw error;
    }
  }

  /**
   * Einfache Premium-Prüfung (verwendet normalen Client)
   */
  static async isPremiumUser(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, subscription_status, subscription_end_date')
        .eq('user_id', userId)
        .single();

      if (!profile) return false;

      // Prüfe ob noch gültig
      if (profile.subscription_end_date) {
        const endDate = new Date(profile.subscription_end_date);
        if (endDate < new Date()) {
          return false; // Abgelaufen
        }
      }

      return profile.is_premium && 
             (profile.subscription_status === 'active' || profile.subscription_status === 'trialing');
    } catch (error) {
      console.error('❌ Premium check error:', error);
      return false;
    }
  }
}