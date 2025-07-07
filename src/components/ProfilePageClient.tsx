// src/components/ProfilePageClient.tsx - KONSISTENT MIT NEUEM DASHBOARD DESIGN
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

  // ✅ Loading State - konsistent mit Dashboard
  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center py-12 px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error State - konsistent mit Dashboard
  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-theme-card border border-theme/5 rounded-xl p-8 text-center">
              <h1 className="text-xl font-semibold text-theme-primary mb-3">Fehler beim Laden</h1>
              <p className="text-theme-muted text-sm mb-6">{error}</p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={refreshUserData}
                  className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg transition-colors hover:bg-green-600"
                >
                  Erneut versuchen
                </button>
                <button
                  onClick={() => router.push('/analyse')}
                  className="px-4 py-2 bg-theme-card border border-theme/10 text-theme-primary font-medium rounded-lg transition-colors hover:bg-theme-hover"
                >
                  Zur Analyse
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
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-theme-card border border-theme/5 rounded-xl p-8 text-center">
              <h1 className="text-xl font-semibold text-theme-primary mb-3">Nicht eingeloggt</h1>
              <p className="text-theme-muted mb-6">Bitte melden Sie sich an, um Ihr Profil zu verwalten.</p>
              <button
                onClick={() => router.push('/auth/signin')}
                className="px-6 py-3 bg-green-500 text-white font-medium rounded-lg transition-colors hover:bg-green-600"
              >
                Zur Anmeldung
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Haupt-UI - konsistent mit Dashboard Design
  return (
    <div className="min-h-screen bg-theme-primary">
      
      {/* Professional Header - wie Dashboard */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-8">
          



          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserIcon className="w-6 h-6 text-green-400" />
                <h1 className="text-3xl font-bold text-theme-primary">
                  Profil
                </h1>
              </div>
              <div className="flex items-center gap-4 text-theme-secondary">
                <span className="text-sm">Account-Verwaltung</span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm">
                  {premiumStatus.isPremium ? 'Premium Account' : 'Free Plan'}
                </span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm">Mitglied seit {getMemberSince()}</span>
              </div>
            </div>
            
            {/* Premium Badge */}
            {premiumStatus.isPremium && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
                <SparklesIcon className="w-4 h-4" />
                <span className="font-medium">Premium</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Profile Header Card */}
        <section>
          <div className="bg-theme-card border border-theme/5 rounded-xl p-8 text-center">
            {/* Avatar */}
            <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center text-green-400 font-bold text-2xl mx-auto mb-4">
              {getInitials()}
            </div>
            
            <h2 className="text-2xl font-bold text-theme-primary mb-2">
              {profile?.first_name && profile?.last_name 
                ? `${profile.first_name} ${profile.last_name}`
                : 'Willkommen'
              }
            </h2>
            <p className="text-theme-secondary">{user.email}</p>

            {/* Status Badge */}
            <div className="mt-4">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                premiumStatus.isPremium 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-theme-secondary text-theme-muted border border-theme/10'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  premiumStatus.isPremium ? 'bg-green-400' : 'bg-theme-muted'
                }`}></div>
                {premiumStatus.isPremium ? 'Premium Account' : 'Free Plan'}
              </span>
            </div>
          </div>
        </section>

        {/* Account Data Section */}
        <section>
          <h3 className="text-xl font-semibold text-theme-primary mb-6">Account-Daten</h3>
          
          <div className="bg-theme-card border border-theme/5 rounded-xl p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-2">E-Mail-Adresse</label>
                <div className="bg-theme-secondary border border-theme/5 rounded-lg px-4 py-3">
                  <span className="text-theme-primary font-medium">{user.email || 'Unbekannt'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-2">Status</label>
                  <div className="bg-theme-secondary border border-theme/5 rounded-lg px-4 py-3">
                    <span className="text-theme-primary font-medium">
                      {premiumStatus.isPremium ? 'Premium' : 'Free Plan'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-2">Mitglied seit</label>
                  <div className="bg-theme-secondary border border-theme/5 rounded-lg px-4 py-3">
                    <span className="text-theme-primary font-medium">
                      {getMemberSince()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Management Section */}
        <section>
          <h3 className="text-xl font-semibold text-theme-primary mb-6">Premium-Verwaltung</h3>
          <div className="bg-theme-card border border-theme/5 rounded-xl p-6">
            <StripeConnectButton onStatusChange={refreshUserData} />
          </div>
        </section>

        {/* Actions Section */}
        <section>
          <h3 className="text-xl font-semibold text-theme-primary mb-6">Aktionen</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Refresh Data */}
            <button
              onClick={refreshUserData}
              className="bg-theme-card border border-theme/5 rounded-xl p-6 hover:border-theme/10 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <ArrowPathIcon className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="font-semibold text-theme-primary">Daten aktualisieren</h4>
              </div>
              <p className="text-sm text-theme-muted">
                Account-Informationen neu laden
              </p>
            </button>

            {/* Back to App */}
            <button
              onClick={() => router.push('/analyse')}
              className="bg-theme-card border border-theme/5 rounded-xl p-6 hover:border-green-500/30 hover:bg-green-500/5 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <ArrowLeftIcon className="w-5 h-5 text-green-400" />
                </div>
                <h4 className="font-semibold text-theme-primary group-hover:text-green-400 transition-colors">Zur Analyse</h4>
              </div>
              <p className="text-sm text-theme-muted">
                Zurück zur Aktienanalyse
              </p>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="bg-theme-card border border-theme/5 rounded-xl p-6 hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-400" />
                </div>
                <h4 className="font-semibold text-theme-primary group-hover:text-red-400 transition-colors">Abmelden</h4>
              </div>
              <p className="text-sm text-theme-muted">
                Sicher aus dem Account ausloggen
              </p>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}