// src/components/ProfilePageClient.tsx - MODERNISIERTE VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import StripeConnectButton from '@/components/StripeConnectButton';
import { usePremiumStatus } from '@/lib/premiumUtils';
import { 
  UserIcon, 
  SparklesIcon, 
  ShieldCheckIcon, 
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  XMarkIcon
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

  // Loading State - Modernisiert
  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-gray-950 noise-bg">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Lade Profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State - Modernisiert
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 noise-bg">
        <div className="relative flex min-h-screen items-center justify-center py-12 px-4">
          <div className="w-full max-w-md">
            <div className="bg-gray-900/70 border border-red-500/20 rounded-xl p-8 backdrop-blur-xl shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XMarkIcon className="w-8 h-8 text-red-400" />
              </div>
              
              <h1 className="text-xl font-bold text-white mb-4">Fehler beim Laden</h1>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <p className="text-gray-300 text-sm">{error}</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={refreshUserData}
                  className="flex-1 px-4 py-2 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 transition"
                >
                  Erneut versuchen
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition"
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
      <div className="min-h-screen bg-gray-950 noise-bg">
        <div className="relative flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Nicht eingeloggt</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-6 py-3 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 transition"
            >
              Zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Profile UI - MODERNISIERT wie Pricing Page
  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      {/* Background Effects - Wie Pricing */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section - Wie Pricing */}
      <div className="bg-gray-950 noise-bg pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-6">
            
            {/* Back Button */}
            <div className="absolute left-0 top-0">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Zurück</span>
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center text-black font-bold text-2xl shadow-lg">
                  {getInitials()}
                </div>
                {premiumStatus.isPremium && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <SparklesIcon className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Mein Profil
              </h1>
              <p className="text-xl text-gray-400">
                Verwalte deinen Account und Premium-Zugang
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Wie Pricing */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative space-y-8">
        
        {/* Account Overview Card */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-white mb-6">Account Übersicht</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">E-Mail</label>
              <div className="text-white bg-gray-800/50 px-4 py-3 rounded-lg border border-gray-700/50">
                {user.email || 'Unbekannt'}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Status</label>
              <div className="flex items-center">
                {premiumStatus.isPremium ? (
                  <span className="inline-flex items-center gap-2 px-4 py-3 bg-green-500/20 text-green-400 rounded-lg font-medium">
                    <SparklesIcon className="w-4 h-4" />
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-3 bg-gray-700/50 text-gray-400 rounded-lg">
                    <UserIcon className="w-4 h-4" />
                    Free
                  </span>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Mitglied seit</label>
              <div className="text-gray-300 bg-gray-800/50 px-4 py-3 rounded-lg border border-gray-700/50">
                {getMemberSince()}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Section - Cleaner */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <SparklesIcon className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-semibold text-white">Premium Zugang</h3>
          </div>
          
          <StripeConnectButton onStatusChange={refreshUserData} />
        </div>

        {/* Premium Features - Subtiler */}
        {!premiumStatus.isPremium && (
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-6">Was bringt dir Premium?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Premium Features */}
              <div>
                <h4 className="font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  Premium Features
                </h4>
                <ul className="space-y-3">
                  {[
                    'Vollständige Kennzahlen-Charts',
                    'Detaillierte Bewertungsmetriken', 
                    'Erweiterte Margenanalysen',
                    'Interaktive Finanzdiagramme',
                    'Super-Investor Portfolios',
                    'Priority Support'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm text-gray-400">
                      <CheckIcon className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Free Limitations */}
              <div>
                <h4 className="font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <XMarkIcon className="w-4 h-4 text-gray-500" />
                  Free Limitierungen
                </h4>
                <ul className="space-y-3">
                  {[
                    'Nur Basis-Kennzahlen',
                    'Begrenzte Chart-Funktionen',
                    'Werbung wird angezeigt',
                    'Kein Priority Support',
                    'Begrenzte Watchlist',
                    'Community Support'
                  ].map((limitation, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm text-gray-500">
                      <XMarkIcon className="w-3 h-3 text-gray-600 flex-shrink-0" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions Card - Cleaner wie Pricing */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-6">Aktionen</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Refresh - Subtil */}
            <button
              onClick={refreshUserData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition font-medium border border-gray-700"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Status aktualisieren
            </button>

            {/* Back to App - Primary Action */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition font-medium"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Zurück zur App
            </button>

            {/* Sign Out - Subtil aber Rot on Hover */}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition font-medium border border-gray-700"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              Abmelden
            </button>
          </div>
        </div>

        {/* Trust Indicators - Wie auf Auth-Seiten */}
        <div className="flex items-center justify-center gap-8 text-xs text-gray-500 pt-8">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-green-400" />
            <span>Sicher verschlüsselt</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-green-400" />
            <span>DSGVO-konform</span>
          </div>
        </div>
      </div>
    </div>
  );
}