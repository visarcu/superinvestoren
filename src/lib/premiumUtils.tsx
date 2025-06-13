// src/lib/premiumUtils.tsx - EINFACHE VERSION (nur Sessions, kein Admin)
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import React from 'react';

export interface PremiumStatus {
  isPremium: boolean;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired' | null;
  endDate: Date | null;
  daysRemaining: number | null;
  customerId: string | null;
  subscriptionId: string | null;
}

/**
 * Prüft Premium-Status eines Users (nur Sessions)
 */
export async function checkPremiumStatus(userId: string): Promise<PremiumStatus> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        is_premium, 
        subscription_status, 
        subscription_end_date,
        stripe_customer_id,
        stripe_subscription_id
      `)
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return {
        isPremium: false,
        status: null,
        endDate: null,
        daysRemaining: null,
        customerId: null,
        subscriptionId: null,
      };
    }

    const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    const now = new Date();
    
    // Berechne verbleibende Tage
    let daysRemaining: number | null = null;
    if (endDate) {
      const diffTime = endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Wenn abgelaufen, Status automatisch aktualisieren
      if (daysRemaining <= 0 && profile.is_premium) {
        await supabase
          .from('profiles')
          .update({ 
            is_premium: false,
            subscription_status: 'expired'
          })
          .eq('user_id', userId);
        
        return {
          isPremium: false,
          status: 'expired',
          endDate,
          daysRemaining: 0,
          customerId: profile.stripe_customer_id,
          subscriptionId: profile.stripe_subscription_id,
        };
      }
    }

    return {
      isPremium: profile.is_premium || false,
      status: profile.subscription_status as any,
      endDate,
      daysRemaining,
      customerId: profile.stripe_customer_id,
      subscriptionId: profile.stripe_subscription_id,
    };
  } catch (error) {
    console.error('❌ Premium status check error:', error);
    return {
      isPremium: false,
      status: null,
      endDate: null,
      daysRemaining: null,
      customerId: null,
      subscriptionId: null,
    };
  }
}

/**
 * React Hook für Premium-Status
 */
export function usePremiumStatus(userId: string | null) {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({
    isPremium: false,
    status: null,
    endDate: null,
    daysRemaining: null,
    customerId: null,
    subscriptionId: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    checkPremiumStatus(userId).then(status => {
      setPremiumStatus(status);
      setLoading(false);
    });
  }, [userId]);

  const refetch = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const status = await checkPremiumStatus(userId);
      setPremiumStatus(status);
    } finally {
      setLoading(false);
    }
  };

  return { premiumStatus, loading, refetch };
}

/**
 * Premium-Feature-Guard Komponente
 */
interface PremiumGuardProps {
  userId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

export function PremiumGuard({ userId, children, fallback, showUpgrade = true }: PremiumGuardProps) {
  const { premiumStatus, loading } = usePremiumStatus(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!premiumStatus.isPremium) {
    if (fallback) return <React.Fragment>{fallback}</React.Fragment>;
    
    if (showUpgrade) {
      return (
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <h3 className="text-xl font-semibold text-white mb-2">Premium Feature</h3>
          <p className="text-gray-300 mb-4">
            Diese erweiterte Analyse ist nur für Premium-Nutzer verfügbar.
          </p>
          <button
            onClick={() => window.location.href = '/profile'}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-semibold"
          >
            Jetzt upgraden für 9€/Monat
          </button>
        </div>
      );
    }
    
    return null;
  }

  return <React.Fragment>{children}</React.Fragment>;
}

/**
 * Quick Premium Check (für UI-Komponenten)
 */
export async function quickPremiumCheck(userId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, subscription_status, subscription_end_date')
      .eq('user_id', userId)
      .single();

    if (!profile?.is_premium) return false;

    // Prüfe Ablauf
    if (profile.subscription_end_date) {
      const endDate = new Date(profile.subscription_end_date);
      if (endDate < new Date()) return false;
    }

    return ['active', 'trialing'].includes(profile.subscription_status);
  } catch {
    return false;
  }
}