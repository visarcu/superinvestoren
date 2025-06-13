// src/components/ProfilePageClient.tsx - AUFGERÄUMT (weniger Redundanz)
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import StripeConnectButton from '@/components/StripeConnectButton';
import { usePremiumStatus } from '@/lib/premiumUtils';

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

  // URL-Parameter cleanup (aber kein Handling, das macht StripeConnectButton)
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

  // Loading State
  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Lade Profil...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-red-400 text-xl mb-4">⚠️ Fehler beim Laden</h1>
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
            <p className="text-gray-300 text-sm">{error}</p>
          </div>
          <div className="space-x-4">
            <button
              onClick={refreshUserData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Erneut versuchen
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-white mb-4">Nicht eingeloggt</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  // Main Profile UI - SAUBER & WENIGER REDUNDANT
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Mein Profil</h1>
          <p className="text-gray-400">Verwalte deinen Account und Premium-Zugang</p>
        </div>

        {/* Account Info - Kompakter */}
        <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-Mail</label>
              <div className="text-white bg-gray-700 px-3 py-2 rounded-lg">
                {user.email || 'Unbekannt'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  premiumStatus.isPremium
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {premiumStatus.isPremium ? '⭐ Premium' : '👤 Free'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Mitglied seit</label>
              <div className="text-gray-300">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Bereich - Vereinfacht durch StripeConnectButton */}
        <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Premium Zugang</h3>
          <StripeConnectButton onStatusChange={refreshUserData} />
        </div>

        {/* Premium Features Info - Nur wenn NICHT Premium */}
        {!premiumStatus.isPremium && (
          <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Was bringt dir Premium?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-400 mb-3">✅ Premium Features</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Vollständige Kennzahlen-Charts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Detaillierte Bewertungsmetriken
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Erweiterte Margenanalysen
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Interaktive Finanzdiagramme
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Priority Support
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-3">⚠️ Free Limitierungen</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-orange-400">•</span>
                    Nur Basis-Kennzahlen
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-400">•</span>
                    Begrenzte Chart-Funktionen
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-400">•</span>
                    Werbung wird angezeigt
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-400">•</span>
                    Kein Priority Support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Aktionen</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshUserData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Status aktualisieren
            </button>
            
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Abmelden
            </button>

            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              ← Zurück zur App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}