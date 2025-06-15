// src/components/ProfilePageClient.tsx - CLEAN VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import StripeConnectButton from '@/components/StripeConnectButton';
import { usePremiumStatus } from '@/lib/premiumUtils';
import { 
  UserIcon, 
  SparklesIcon, 
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
      <div className="min-h-screen bg-gray-950 noise-bg">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Lade Profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 noise-bg">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="w-full max-w-md">
            <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm text-center">
              <h1 className="text-xl font-semibold text-white mb-4">Fehler beim Laden</h1>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              
              <div className="space-y-3">
                <button
                  onClick={refreshUserData}
                  className="w-full px-4 py-2 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 transition"
                >
                  Erneut versuchen
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-2 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition border border-gray-700"
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
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
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

  // Main Profile UI - CLEAN VERSION
  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Hero Section - Gleicher Stil wie Pricing */}
      <div className="bg-gray-950 noise-bg pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            
            {/* Back Button - Subtil */}
            <div className="absolute left-4 top-4 lg:left-8 lg:top-8">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Zurück
              </button>
            </div>

            {/* Avatar - Einfacher */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center text-black font-bold text-xl">
                {getInitials()}
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                Mein Profil
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Verwalte deinen Account und Premium-Zugang
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Gleicher Container wie Pricing */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Account Info - Einfache Karte */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Account</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">E-Mail</label>
              <div className="text-white text-sm">
                {user.email || 'Unbekannt'}
              </div>
            </div>

            {/* Status - Nur Text */}
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Status</label>
              <div className="text-white text-sm">
                {premiumStatus.isPremium ? 'Premium' : 'Free'}
              </div>
            </div>

            {/* Member Since */}
            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Mitglied seit</label>
              <div className="text-white text-sm">
                {getMemberSince()}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Section - Minimalistisch */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm mb-8">
          <div className="flex items-center gap-2 mb-6">
            <SparklesIcon className="w-5 h-5 text-green-500" />
            <h3 className="text-2xl font-semibold text-white">Premium</h3>
          </div>
          
          <StripeConnectButton onStatusChange={refreshUserData} />
        </div>

        {/* Actions - Einfach */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm">
          <h3 className="text-2xl font-semibold text-white mb-6">Aktionen</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Refresh */}
            <button
              onClick={refreshUserData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition font-medium border border-gray-700"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Aktualisieren
            </button>

            {/* Back to App */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition font-medium"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Zur App
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition font-medium border border-gray-700"
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