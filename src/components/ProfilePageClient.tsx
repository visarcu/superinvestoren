// src/components/ProfilePageClient.tsx - OPTIMIERTE VERSION mit Patreon
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PatreonConnectButton from '@/components/PatreonConnectButton';

interface UserProfile {
  user_id: string;
  updated_at: string | null;
  patreon_id: string | null;
  patreon_tier: string | null;
  patreon_access_token: string | null;
  patreon_refresh_token: string | null;
  patreon_expires_at: string | null;
  is_premium?: boolean;
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

  // Separate Auth Check Function
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

      // Load profile
      await loadProfile(session.user.id);

    } catch (error) {
      console.error('❌ Auth Error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Separate Profile Loading Function
  const loadProfile = async (userId: string) => {
    try {
      console.log('📄 Loading profile for:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('⚠️ Profile Error:', profileError.message);
        // Create default profile if not exists
        setProfile({
          user_id: userId,
          updated_at: null,
          patreon_id: null,
          patreon_tier: null,
          patreon_access_token: null,
          patreon_refresh_token: null,
          patreon_expires_at: null,
          is_premium: false
        });
      } else {
        console.log('✅ Profile loaded:', profileData);
        setProfile(profileData);
      }

    } catch (error) {
      console.error('❌ Profile loading error:', error);
      // Fallback profile
      setProfile({
        user_id: userId,
        updated_at: null,
        patreon_id: null,
        patreon_tier: null,
        patreon_access_token: null,
        patreon_refresh_token: null,
        patreon_expires_at: null,
        is_premium: false
      });
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle Patreon OAuth Redirects (only after user is loaded)
  useEffect(() => {
    if (user && !loading) {
      handlePatreonRedirects();
    }
  }, [searchParams, user, loading]);

  const handlePatreonRedirects = async () => {
    if (!searchParams) return;

    const error = searchParams.get('error');
    const success = searchParams.get('success');
    const patreonSuccess = searchParams.get('patreon_success');
    
    // Handle errors
    if (error) {
      let message = 'Ein Fehler ist aufgetreten.';
      switch (error) {
        case 'patreon_auth_failed':
          message = 'Patreon-Authentifizierung fehlgeschlagen.';
          break;
        case 'not_authenticated':
          message = 'Sie müssen eingeloggt sein.';
          break;
        case 'patreon_oauth_failed':
          message = 'Verbindung zu Patreon fehlgeschlagen.';
          break;
        case 'no_session':
          message = 'Session nicht gefunden. Bitte loggen Sie sich erneut ein.';
          break;
      }
      
      alert(message);
      cleanupUrl(['error', 'details']);
      return;
    }

    // Handle sessionStorage success (your preferred method)
    if (patreonSuccess === '1') {
      console.log('🎉 Patreon success detected, checking sessionStorage...');
      
      const patreonDataStr = sessionStorage.getItem('patreon_data');
      if (patreonDataStr) {
        try {
          const patreonData = JSON.parse(decodeURIComponent(patreonDataStr));
          console.log('📦 Patreon data from sessionStorage:', patreonData);
          
          alert(`🎉 Patreon erfolgreich verbunden!\n\n✅ Tier: ${patreonData.tier}\n${patreonData.isPremium ? '⭐' : '📊'} Premium: ${patreonData.isPremium ? 'Aktiviert' : 'Nicht aktiviert'}`);
          
          await savePatreonData(patreonData);
          sessionStorage.removeItem('patreon_data');
          cleanupUrl(['patreon_success']);
          
        } catch (error) {
          console.error('❌ Error parsing patreon data:', error);
          alert('Fehler beim Verarbeiten der Patreon-Daten');
        }
      }
      return;
    }

    // Handle URL parameter success (fallback method)
    if (success === 'patreon_connected') {
      const tier = searchParams.get('tier');
      const premium = searchParams.get('premium');
      const patreonId = searchParams.get('patreon_id');
      const patreonEmail = searchParams.get('patreon_email');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (patreonId) {
        const isPremiumUser = premium === 'true';
        alert(`🎉 Patreon erfolgreich verbunden!\n\n✅ Tier: ${tier}\n${isPremiumUser ? '⭐' : '📊'} Premium: ${isPremiumUser ? 'Aktiviert' : 'Nicht aktiviert'}\n📧 E-Mail: ${patreonEmail}`);
        
        savePatreonData({
          patreonId,
          tier: tier || 'free',
          isPremium: isPremiumUser,
          accessToken,
          refreshToken
        });
        
        cleanupUrl(['success', 'tier', 'premium', 'patreon_id', 'patreon_email', 'access_token', 'refresh_token']);
        
        // Refresh after saving
        setTimeout(() => checkAuth(), 1000);
      }
    }
  };

  const cleanupUrl = (params: string[]) => {
    const url = new URL(window.location.href);
    params.forEach(param => url.searchParams.delete(param));
    window.history.replaceState({}, '', url.toString());
  };

  const savePatreonData = async (data: any) => {
    if (!user?.id) {
      console.error('❌ No user ID for saving Patreon data');
      return;
    }

    try {
      console.log('💾 Saving Patreon data...');
      
      const expiresAt = data.accessToken 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          patreon_id: data.patreonId,
          patreon_tier: data.tier,
          patreon_access_token: data.accessToken,
          patreon_refresh_token: data.refreshToken,
          patreon_expires_at: expiresAt,
          is_premium: data.isPremium,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Failed to save Patreon data:', error);
        alert(`Fehler beim Speichern: ${error.message}`);
      } else {
        console.log('✅ Patreon data saved successfully');
        alert('✅ Patreon-Daten erfolgreich gespeichert!');
        // Refresh profile after successful save
        await loadProfile(user.id);
      }
    } catch (error) {
      console.error('❌ Error saving Patreon data:', error);
      alert('Unerwarteter Fehler beim Speichern der Patreon-Daten');
    }
  };

  const refreshUserData = async () => {
    console.log('🔄 Refreshing user data...');
    setLoading(true);
    try {
      // Refresh both user session and profile
      await checkAuth();
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
  if (loading) {
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

  // No User State
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

  // Main Profile UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Mein Profil</h1>
          <p className="text-gray-400">Verwalte deinen Account</p>
        </div>

        {/* Account Info */}
        <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-Mail</label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-lg border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  profile?.is_premium 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {profile?.is_premium ? '⭐ Premium' : 'Free'}
                </span>
                {profile?.patreon_tier && profile.patreon_tier !== 'free' && (
                  <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded">
                    {profile.patreon_tier}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Registriert am</label>
              <p className="text-gray-400 text-sm">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Patreon Status</label>
              <p className="text-gray-400 text-sm">
                {profile?.patreon_id ? `Verbunden (${profile.patreon_tier})` : 'Nicht verbunden'}
              </p>
            </div>
          </div>
        </div>

        {/* Patreon Connection */}
        <PatreonConnectButton onStatusChange={refreshUserData} />

        {/* Premium Features Info */}
        <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Premium Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-400 mb-2">✅ Mit Premium erhältst du:</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Vollständige Kennzahlen-Charts</li>
                <li>• Detaillierte Bewertungsmetriken</li>
                <li>• Erweiterte Margenanalysen</li>
                <li>• Interaktive Finanzdiagramme</li>
                <li>• Keine Werbung</li>
                <li>• Priority Support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-400 mb-2">❌ Free-Version Limitierungen:</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Basis-Informationen only</li>
                <li>• Einige Kennzahlen gesperrt</li>
                <li>• Keine interaktiven Charts</li>
                <li>• Werbung wird angezeigt</li>
              </ul>
            </div>
          </div>
          
          {!profile?.is_premium && (
            <div className="mt-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-orange-400 text-xl">💡</span>
                <div>
                  <p className="text-orange-300 text-sm font-medium mb-1">
                    Upgrade zu Premium
                  </p>
                  <p className="text-orange-300 text-sm">
                    Verbinde dein Patreon-Konto um Premium-Features freizuschalten! 
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Aktionen</h3>
          <div className="space-y-4">
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
          </div>
        </div>

        {/* Back to App */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition"
          >
            ← Zurück zur App
          </a>
        </div>
      </div>
    </div>
  );
}