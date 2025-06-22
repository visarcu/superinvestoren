// src/components/ProfilePageClient.tsx - CLEAN & CONSISTENT VERSION
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
  ArrowRightOnRectangleIcon
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

  // Loading State
  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-theme-primary noise-bg">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary noise-bg">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="w-full max-w-md">
            <div className="bg-theme-card/70 border border-theme rounded-xl p-8 backdrop-blur-sm text-center">
              <h1 className="text-xl font-semibold text-theme-primary mb-4">Fehler beim Laden</h1>
              <p className="text-theme-secondary text-sm mb-6">{error}</p>
              
              <div className="space-y-3">
                <button
                  onClick={refreshUserData}
                  className="w-full px-4 py-2.5 bg-theme-secondary/50 text-theme-primary font-medium rounded-lg hover:bg-theme-secondary/70 transition border border-theme"
                >
                  Erneut versuchen
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-2.5 bg-theme-secondary/30 text-theme-secondary font-medium rounded-lg hover:bg-theme-secondary/50 transition border border-theme"
                >
                  Zur Startseite
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-primary noise-bg">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <p className="text-theme-secondary mb-4">Nicht eingeloggt</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-6 py-3 bg-theme-secondary/50 text-theme-primary font-medium rounded-lg hover:bg-theme-secondary/70 transition border border-theme"
            >
              Zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Profile UI - Clean & Professional
  return (
    <div className="min-h-screen bg-theme-primary noise-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Header - Clean */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors text-sm mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Zurück
          </button>

          <div className="text-center">
            {/* Clean Avatar - Minimal */}
            <div className="w-16 h-16 bg-theme-secondary/50 rounded-xl flex items-center justify-center text-theme-primary font-semibold text-xl mx-auto mb-4 border border-theme">
              {getInitials()}
            </div>
            
            <h1 className="text-3xl font-bold text-theme-primary mb-2">Profil</h1>
            <p className="text-theme-secondary">Account-Verwaltung</p>
          </div>
        </div>

        {/* Account Section - Clean */}
        <div className="bg-theme-card/70 border border-theme rounded-xl p-6 backdrop-blur-sm mb-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Account-Daten</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-theme-secondary mb-1">E-Mail</label>
              <div className="text-theme-primary text-sm bg-theme-secondary/20 rounded-lg px-3 py-2 border border-theme">
                {user.email || 'Unbekannt'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-theme-secondary mb-1">Status</label>
                <div className={`text-sm px-3 py-2 rounded-lg border ${
                  premiumStatus.isPremium 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-theme-secondary/20 border-theme text-theme-primary'
                }`}>
                  {premiumStatus.isPremium ? 'Premium' : 'Free'}
                </div>
              </div>

              <div>
                <label className="block text-sm text-theme-secondary mb-1">Mitglied seit</label>
                <div className="text-sm text-theme-primary bg-theme-secondary/20 rounded-lg px-3 py-2 border border-theme">
                  {getMemberSince()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Section - Clean */}
        <div className="bg-theme-card/70 border border-theme rounded-xl p-6 backdrop-blur-sm mb-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Premium-Verwaltung</h3>
          <StripeConnectButton onStatusChange={refreshUserData} />
        </div>

        {/* Actions - Clean */}
        <div className="bg-theme-card/70 border border-theme rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Aktionen</h3>
          
          <div className="space-y-3">
            <button
              onClick={refreshUserData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-theme-secondary/30 text-theme-primary rounded-lg hover:bg-theme-secondary/50 transition border border-theme"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Daten aktualisieren
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition border border-green-500/20"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Zur App
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-theme-secondary/30 text-theme-secondary rounded-lg hover:bg-theme-secondary/50 transition border border-theme"
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