// src/components/ProfilePageClient.tsx - FEY STYLE REDESIGN V2 (NUR DESIGN, KEINE FUNKTIONALITÄT)
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import StripeConnectButton from '@/components/StripeConnectButton';
import { usePremiumStatus } from '@/lib/premiumUtils';
import Link from 'next/link';
import {
  UserIcon,
  ArrowPathIcon,
  ArrowLeftStartOnRectangleIcon,
  CreditCardIcon,
  BellIcon,
  SparklesIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
  ChartBarIcon
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

  // ALLE FUNKTIONEN BLEIBEN GLEICH - NUR DESIGN ÄNDERUNG
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

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Loading State
  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-secondary text-sm">Lade Profil...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="border-b border-theme pb-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShieldCheckIcon className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-medium text-theme-primary mb-1">Fehler beim Laden</h2>
                <p className="text-theme-muted text-sm mb-4">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={refreshUserData}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Erneut versuchen
                  </button>
                  <Link
                    href="/analyse"
                    className="px-4 py-2 text-theme-secondary hover:text-theme-primary text-sm transition-colors"
                  >
                    Zur Analyse
                  </Link>
                </div>
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
          <div className="border-b border-theme pb-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-theme-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-6 h-6 text-theme-muted" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-medium text-theme-primary mb-1">Nicht eingeloggt</h2>
                <p className="text-theme-muted text-sm mb-4">Bitte melden Sie sich an, um Ihr Profil zu verwalten.</p>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
                >
                  Zur Anmeldung
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Profile Design
  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8 max-w-4xl">

        {/* Header */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <UserIcon className="w-4 h-4 text-theme-muted" />
            <span className="text-sm text-theme-muted">Profil</span>
          </div>

          <h1 className="text-2xl font-semibold text-theme-primary mb-2">
            Account-Verwaltung
          </h1>
          <p className="text-theme-secondary text-sm">
            Verwalte dein Konto und deine Einstellungen
          </p>
        </div>

        {/* Profile Card */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Large Avatar */}
            <div className="relative flex-shrink-0">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                premiumStatus.isPremium
                  ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-2 border-emerald-500/30'
                  : 'bg-theme-secondary text-theme-primary border-2 border-theme'
              }`}>
                {getInitials()}
              </div>
              {premiumStatus.isPremium && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-theme-primary truncate">
                  {getDisplayName()}
                </h2>
                {premiumStatus.isPremium && (
                  <span className="flex-shrink-0 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className="text-theme-secondary text-sm mb-3">{user.email}</p>

              {/* Stats Row */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-theme-muted" />
                  <span className="text-xs text-theme-muted">Mitglied seit {getMemberSince()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckBadgeIcon className="w-4 h-4 text-theme-muted" />
                  <span className="text-xs text-theme-muted">
                    {profile?.email_verified ? 'E-Mail verifiziert' : 'E-Mail nicht verifiziert'}
                  </span>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={refreshUserData}
              className="p-2.5 text-theme-muted hover:text-theme-primary hover:bg-theme-secondary rounded-xl transition-all"
              title="Daten aktualisieren"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Left Column - Account Info */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <EnvelopeIcon className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-theme-primary uppercase tracking-wide">Account-Daten</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-theme-muted">E-Mail</span>
                <span className="text-sm text-theme-primary font-medium">{user.email}</span>
              </div>
              <div className="h-px bg-theme-secondary"></div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-theme-muted">Plan</span>
                <span className={`text-sm font-medium ${premiumStatus.isPremium ? 'text-emerald-400' : 'text-theme-primary'}`}>
                  {premiumStatus.isPremium ? 'Premium' : 'Free'}
                </span>
              </div>
              <div className="h-px bg-theme-secondary"></div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-theme-muted">Mitglied seit</span>
                <span className="text-sm text-theme-primary font-medium">{getMemberSince()}</span>
              </div>
              {premiumStatus.isPremium && premiumStatus.endDate && (
                <>
                  <div className="h-px bg-theme-secondary"></div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-theme-muted">Verlängert am</span>
                    <span className="text-sm text-theme-primary font-medium">
                      {new Date(premiumStatus.endDate).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Premium */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <CreditCardIcon className="w-4.5 h-4.5 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-theme-primary uppercase tracking-wide">Abonnement</h3>
            </div>

            <StripeConnectButton onStatusChange={refreshUserData} />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="border-t border-theme pt-8 mb-8">
          <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wide mb-4">Navigation</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/analyse"
              className="flex flex-col items-center gap-2 p-4 bg-theme-secondary hover:bg-theme-tertiary rounded-xl transition-all group"
            >
              <ChartBarIcon className="w-5 h-5 text-theme-muted group-hover:text-emerald-400 transition-colors" />
              <span className="text-xs font-medium text-theme-secondary group-hover:text-theme-primary transition-colors">Dashboard</span>
            </Link>

            <Link
              href="/inbox"
              className="flex flex-col items-center gap-2 p-4 bg-theme-secondary hover:bg-theme-tertiary rounded-xl transition-all group"
            >
              <BellIcon className="w-5 h-5 text-theme-muted group-hover:text-emerald-400 transition-colors" />
              <span className="text-xs font-medium text-theme-secondary group-hover:text-theme-primary transition-colors">Alerts</span>
            </Link>

            <Link
              href="/settings"
              className="flex flex-col items-center gap-2 p-4 bg-theme-secondary hover:bg-theme-tertiary rounded-xl transition-all group"
            >
              <Cog6ToothIcon className="w-5 h-5 text-theme-muted group-hover:text-emerald-400 transition-colors" />
              <span className="text-xs font-medium text-theme-secondary group-hover:text-theme-primary transition-colors">Settings</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex flex-col items-center gap-2 p-4 bg-theme-secondary hover:bg-red-500/10 rounded-xl transition-all group"
            >
              <ArrowLeftStartOnRectangleIcon className="w-5 h-5 text-theme-muted group-hover:text-red-400 transition-colors" />
              <span className="text-xs font-medium text-theme-secondary group-hover:text-red-400 transition-colors">Logout</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-xs text-theme-muted">
            Fragen? Kontaktiere uns unter{' '}
            <a href="mailto:support@finclue.de" className="text-emerald-400 hover:underline">
              support@finclue.de
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
