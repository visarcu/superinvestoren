// src/components/ProfilePageClient.tsx - THEME-COMPATIBLE VERSION
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
  BellIcon,
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

  // ALLE FUNKTIONEN BLEIBEN GLEICH
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

  // Loading State - MIT THEME CLASSES
  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-muted">Lade Profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State - MIT THEME CLASSES
  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-lg mx-auto px-4 py-24">
          <div className="bg-theme-card border border-theme/5 rounded-xl p-8 text-center">
            <h1 className="text-xl font-medium text-theme-primary mb-3">Fehler beim Laden</h1>
            <p className="text-theme-muted text-sm mb-6">{error}</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={refreshUserData}
                className="px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand transition-colors"
              >
                Erneut versuchen
              </button>
              <button
                onClick={() => router.push('/analyse')}
                className="px-4 py-2 bg-theme-card border border-theme/10 text-theme-primary font-medium rounded-lg hover:bg-theme-hover transition-colors"
              >
                Zur Analyse
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
        <div className="max-w-lg mx-auto px-4 py-24">
          <div className="bg-theme-card border border-theme/5 rounded-xl p-8 text-center">
            <h1 className="text-xl font-medium text-theme-primary mb-3">Nicht eingeloggt</h1>
            <p className="text-theme-muted mb-6">Bitte melden Sie sich an, um Ihr Profil zu verwalten.</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-6 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand transition-colors"
            >
              Zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ THEME-COMPATIBLE DESIGN
  return (
    <div className="min-h-screen bg-theme-primary">
      
      {/* Clean Header mit Theme Classes */}
      <div className="border-b border-theme/5">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/analyse')}
                className="p-2 hover:bg-theme-hover rounded-lg transition-colors group"
              >
                <ArrowLeftIcon className="w-5 h-5 text-theme-muted group-hover:text-theme-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-theme-primary">Profil</h1>
                <p className="text-sm text-theme-muted">Account-Verwaltung</p>
              </div>
            </div>
            
            {premiumStatus.isPremium && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand border border-brand/20 rounded-lg">
                <SparklesIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Premium</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content mit Theme Classes */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        
        {/* User Card */}
        <div className="bg-theme-card border border-theme/5 rounded-xl p-8">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center text-brand font-medium text-xl">
              {getInitials()}
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-theme-primary">
                {profile?.first_name && profile?.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : 'Willkommen'
                }
              </h2>
              <p className="text-theme-secondary">{user.email}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-theme-muted">
                <span>Mitglied seit {getMemberSince()}</span>
                <div className="w-1 h-1 bg-theme-muted/30 rounded-full"></div>
                <span className={premiumStatus.isPremium ? 'text-brand' : ''}>
                  {premiumStatus.isPremium ? 'Premium Account' : 'Free Plan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Account Daten */}
          <div className="bg-theme-card border border-theme/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Account-Daten</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-theme-muted mb-1.5">E-Mail-Adresse</label>
                <div className="text-theme-primary font-medium">{user.email || 'Unbekannt'}</div>
              </div>

              <div>
                <label className="block text-xs text-theme-muted mb-1.5">Status</label>
                <div className="text-theme-primary font-medium">
                  {premiumStatus.isPremium ? 'Premium' : 'Free Plan'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-theme-muted mb-1.5">Mitglied seit</label>
                <div className="text-theme-primary font-medium">{getMemberSince()}</div>
              </div>
            </div>
          </div>

          {/* Premium Management */}
          <div className="bg-theme-card border border-theme/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Premium-Verwaltung</h3>
            <StripeConnectButton onStatusChange={refreshUserData} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Notifications */}
          <button
            onClick={() => router.push('/notifications')}
            className="bg-theme-card border border-theme/5 rounded-xl p-4 hover:border-theme/10 hover:bg-theme-hover transition-all group text-center"
          >
            <BellIcon className="w-5 h-5 text-theme-muted group-hover:text-brand mb-2 mx-auto" />
            <div className="text-sm font-medium text-theme-primary">Alerts</div>
          </button>
          
          {/* Refresh */}
          <button
            onClick={refreshUserData}
            className="bg-theme-card border border-theme/5 rounded-xl p-4 hover:border-theme/10 hover:bg-theme-hover transition-all group text-center"
          >
            <ArrowPathIcon className="w-5 h-5 text-theme-muted group-hover:text-theme-primary mb-2 mx-auto" />
            <div className="text-sm font-medium text-theme-primary">Refresh</div>
          </button>

          {/* Back */}
          <button
            onClick={() => router.push('/analyse')}
            className="bg-theme-card border border-theme/5 rounded-xl p-4 hover:border-theme/10 hover:bg-theme-hover transition-all group text-center"
          >
            <ArrowLeftIcon className="w-5 h-5 text-theme-muted group-hover:text-brand mb-2 mx-auto" />
            <div className="text-sm font-medium text-theme-primary">Analyse</div>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="bg-theme-card border border-theme/5 rounded-xl p-4 hover:border-red-500/20 hover:bg-red-500/5 transition-all group text-center"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-theme-muted group-hover:text-red-500 mb-2 mx-auto" />
            <div className="text-sm font-medium text-theme-primary">Logout</div>
          </button>
        </div>
      </main>
    </div>
  );
}