// src/components/ProfilePageClient.tsx - CLEAN & MINIMAL VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import StripeConnectButton from '@/components/StripeConnectButton';
import { usePremiumStatus } from '@/lib/premiumUtils';
import { 
  UserIcon, 
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface UserProfile {
  user_id: string;
  updated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  is_premium?: boolean;
  premium_since?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email_verified?: boolean;
}

export default function ProfilePageClient() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { premiumStatus, loading: premiumLoading, refetch: refetchPremium } = usePremiumStatus(user?.id);

  const checkAuth = async () => {
    try {
      console.log('🔍 Checking auth...');
      setError(null);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Session Error: ${sessionError.message}`);
      }

      if (!session?.user) {
        console.log('❌ No session, redirecting...');
        router.push('/auth/signin');
        return;
      }

      console.log('✅ Session found:', session.user.id);
      setUser(session.user);
      await loadProfile(session.user.id);

    } catch (error) {
      console.error('❌ Auth Error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          updated_at,
          stripe_customer_id,
          stripe_subscription_id,
          subscription_status,
          subscription_end_date,
          is_premium,
          premium_since,
          first_name,
          last_name,
          email_verified
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('⚠️ Profile Error:', profileError.message);
        setProfile({
          user_id: userId,
          updated_at: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_status: null,
          subscription_end_date: null,
          is_premium: false
        });
      } else {
        setProfile(profileData);
      }

    } catch (error) {
      console.error('❌ Profile loading error:', error);
      setProfile({
        user_id: userId,
        updated_at: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: null,
        subscription_end_date: null,
        is_premium: false
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // URL-Parameter cleanup
  useEffect(() => {
    if (!searchParams || loading) return;

    const stripeSuccess = searchParams.get('stripe_success');
    const stripeCanceled = searchParams.get('stripe_canceled');
    
    if (stripeSuccess === 'true' || stripeCanceled === 'true') {
      console.log('🔧 ProfilePageClient: Cleaning up URL parameters');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, loading]);

  const refreshUserData = async () => {
    console.log('🔄 Refreshing user data...');
    setLoading(true);
    try {
      if (user?.id) {
        await loadProfile(user.id);
        refetchPremium();
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    return (user?.email || '').charAt(0).toUpperCase();
  };

  const getMemberSince = () => {
    try {
      return new Date(user?.created_at || '').toLocaleDateString('de-DE', { 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return 'Unbekannt';
    }
  };

  // ✅ CLEAN Loading State
  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-theme-muted">Lade Profil...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ CLEAN Error State
  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 text-center">
            <h1 className="text-xl font-semibold text-theme-primary mb-3">Fehler beim Laden</h1>
            <p className="text-theme-muted text-sm mb-6">{error}</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={refreshUserData}
                className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
              >
                Erneut versuchen
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-theme-tertiary hover:bg-theme-secondary text-theme-primary font-medium rounded-lg transition-colors border border-theme"
              >
                Zur Startseite
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 text-center">
            <p className="text-theme-muted mb-4">Nicht eingeloggt</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
            >
              Zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ CLEAN & MINIMAL Main Profile UI
  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* ✅ MINIMAL Header */}
        <div>
          <button
            onClick={() => router.push('/analyse')}
            className="flex items-center gap-2 text-theme-muted hover:text-theme-secondary transition-colors text-sm mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Zurück zur App
          </button>

          <div className="text-center">
            {/* Simple Avatar - No Gradient */}
            <div className="w-16 h-16 bg-theme-secondary rounded-xl flex items-center justify-center text-theme-primary font-semibold text-xl mx-auto mb-4 border border-theme">
              {getInitials()}
            </div>
            
            <h1 className="text-3xl font-bold text-theme-primary mb-2">Profil</h1>
            <p className="text-theme-muted">Account-Verwaltung</p>

            {/* Minimal Premium Badge */}
            {premiumStatus.isPremium && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm mt-3">
                <SparklesIcon className="w-3 h-3" />
                <span>Premium</span>
              </div>
            )}
          </div>
        </div>

        {/* ✅ CLEAN Account Section */}
        <div className="bg-theme-secondary border border-theme rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Account-Daten</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-theme-muted mb-2">E-Mail-Adresse</label>
              <div className="text-theme-primary bg-theme-tertiary/50 rounded-lg px-4 py-3 border border-theme">
                {user.email || 'Unbekannt'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-theme-muted mb-2">Status</label>
                <div className="bg-theme-tertiary/50 border border-theme rounded-lg px-4 py-3">
                  <span className="text-theme-primary font-medium">
                    {premiumStatus.isPremium ? 'Premium' : 'Free Plan'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-theme-muted mb-2">Mitglied seit</label>
                <div className="bg-theme-tertiary/50 border border-theme rounded-lg px-4 py-3">
                  <span className="text-theme-primary font-medium">
                    {getMemberSince()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ CLEAN Premium Section */}
        <div className="bg-theme-secondary border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Premium-Verwaltung</h3>
          <StripeConnectButton onStatusChange={refreshUserData} />
        </div>

        {/* ✅ MINIMAL Actions */}
        <div className="bg-theme-secondary border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Aktionen</h3>
          
          <div className="space-y-3">
            <button
              onClick={refreshUserData}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-tertiary/50 text-theme-primary rounded-lg hover:bg-theme-tertiary/70 transition-colors border border-theme"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Daten aktualisieren
            </button>

            <button
              onClick={() => router.push('/analyse')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors border border-green-500/30"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Zur Analyse
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-tertiary/50 text-theme-muted rounded-lg hover:bg-theme-tertiary/70 hover:text-theme-secondary transition-colors border border-theme"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}