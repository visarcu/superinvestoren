// src/components/ProfilePageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PatreonConnectButton from '@/components/PatreonConnectButton';

export default function ProfilePageClient() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkAuth();
    
    // Handle OAuth redirect messages - ERWEITERT für alle neuen Parameter + sessionStorage
    const error = searchParams?.get('error');
    const success = searchParams?.get('success');
    const tier = searchParams?.get('tier');
    const premium = searchParams?.get('premium');
    const patreonId = searchParams?.get('patreon_id');
    const patreonEmail = searchParams?.get('patreon_email');
    const accessToken = searchParams?.get('access_token');
    const refreshToken = searchParams?.get('refresh_token');
    const details = searchParams?.get('details');
    const patreonSuccess = searchParams?.get('patreon_success'); // NEU für sessionStorage

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
          if (details) {
            message += `\n\nDetails: ${decodeURIComponent(details)}`;
          }
          break;
        case 'no_session':
          message = 'Session nicht gefunden. Bitte loggen Sie sich erneut ein.';
          break;
        case 'no_code':
          message = 'Kein Autorisierungscode von Patreon erhalten.';
          break;
      }
      alert(message);
      
      // Clean URL after showing message
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('details');
      window.history.replaceState({}, '', url.toString());
    }

    // NEUE sessionStorage-Behandlung (Option 2)
    if (patreonSuccess === '1') {
      console.log('🎉 Patreon success detected, checking sessionStorage...');
      
      // Daten aus sessionStorage laden
      const patreonDataStr = sessionStorage.getItem('patreon_data');
      
      if (patreonDataStr) {
        try {
          const patreonData = JSON.parse(decodeURIComponent(patreonDataStr));
          console.log('📦 Patreon data from sessionStorage:', patreonData);
          
          // Success-Meldung zeigen
          alert(`🎉 Patreon erfolgreich verbunden!\n\n✅ Tier: ${patreonData.tier}\n${patreonData.isPremium ? '⭐' : '📊'} Premium: ${patreonData.isPremium ? 'Aktiviert' : 'Nicht aktiviert'}`);
          
          // Daten speichern
          savePatreonDataFromSessionStorage(patreonData);
          
          // SessionStorage cleanup
          sessionStorage.removeItem('patreon_data');
          
          // URL cleanup
          const url = new URL(window.location.href);
          url.searchParams.delete('patreon_success');
          window.history.replaceState({}, '', url.toString());
          
        } catch (error) {
          console.error('❌ Error parsing patreon data from sessionStorage:', error);
          alert('Fehler beim Verarbeiten der Patreon-Daten');
        }
      } else {
        console.warn('⚠️ patreon_success=1 but no data in sessionStorage');
      }
    }

    // ERWEITERTE Success-Behandlung mit echten Patreon-Daten (Original URL-Parameter Methode)
    if (success === 'patreon_connected' && patreonId) {
      // Zeige detaillierte Success-Meldung
      const isPremiumUser = premium === 'true';
      alert(`🎉 Patreon erfolgreich verbunden!\n\n✅ Tier: ${tier}\n${isPremiumUser ? '⭐' : '📊'} Premium: ${isPremiumUser ? 'Aktiviert' : 'Nicht aktiviert'}\n📧 E-Mail: ${patreonEmail}`);
      
      // Speichere Patreon-Daten in Supabase
      savePatreonData({
        patreonId,
        tier: tier || 'free',
        isPremium: isPremiumUser,
        accessToken,
        refreshToken
      });
      
      // Clean URL von ALLEN Patreon-Parametern
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('tier');
      url.searchParams.delete('premium');
      url.searchParams.delete('patreon_id');
      url.searchParams.delete('patreon_email');
      url.searchParams.delete('access_token');
      url.searchParams.delete('refresh_token');
      window.history.replaceState({}, '', url.toString());
      
      // Refresh user data to show updated status
      setTimeout(() => {
        checkAuth();
      }, 1000);
    }
  }, [searchParams]);

  // KORRIGIERTE Funktion für sessionStorage-Daten (mit user_id)
  async function savePatreonDataFromSessionStorage(data: any) {
    try {
      console.log('💾 Saving Patreon data from sessionStorage...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.error('❌ No session for saving from sessionStorage');
        alert('Bitte loggen Sie sich erneut ein');
        router.push('/auth/signin');
        return;
      }

      console.log('✅ Session found for sessionStorage save:', session.user.id);

      // Prüfe ob Profile existiert (mit user_id!)
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', session.user.id) // user_id statt id!
        .maybeSingle();

      console.log('🔍 Existing profile check:', { existingProfile, selectError });

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const profileData = {
        patreon_id: data.patreonId,
        patreon_tier: data.tier,
        patreon_access_token: data.accessToken,
        patreon_refresh_token: data.refreshToken,
        patreon_expires_at: expiresAt,
        is_premium: data.isPremium,
        updated_at: new Date().toISOString()
      };

      let result;

      if (existingProfile) {
        // Update existing profile
        console.log('📝 Updating existing profile...');
        result = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', session.user.id); // user_id statt id!
      } else {
        // Insert new profile
        console.log('➕ Creating new profile...');
        result = await supabase
          .from('profiles')
          .insert({
            user_id: session.user.id, // user_id statt id!
            ...profileData
          });
      }

      if (result.error) {
        console.error('❌ Failed to save from sessionStorage:', result.error);
        alert(`Fehler beim Speichern: ${result.error.message}`);
      } else {
        console.log('✅ Saved from sessionStorage successfully');
        alert('✅ Patreon-Daten erfolgreich gespeichert!');
        // Refresh user data
        setTimeout(() => {
          checkAuth();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error saving from sessionStorage:', error);
      alert('Unerwarteter Fehler beim Speichern der Patreon-Daten');
    }
  }

  // KORRIGIERTE Funktion zum Speichern der Patreon-Daten (mit user_id)
  async function savePatreonData(data: {
    patreonId: string;
    tier: string;
    isPremium: boolean;
    accessToken: string | null;
    refreshToken: string | null;
  }) {
    try {
      console.log('💾 Saving Patreon data to Supabase...', {
        tier: data.tier,
        isPremium: data.isPremium,
        hasAccessToken: !!data.accessToken
      });
      
      // Mehrere Versuche für Session
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!session && attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Session attempt ${attempts}/${maxAttempts}`);
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn(`⚠️ Session error attempt ${attempts}:`, sessionError);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        } else if (sessionData.session?.user) {
          session = sessionData.session;
          break;
        }
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!session?.user) {
        console.error('❌ No valid session after multiple attempts');
        alert('Session abgelaufen. Bitte loggen Sie sich erneut ein und versuchen Sie es nochmal.');
        router.push('/auth/signin');
        return;
      }

      console.log('✅ Valid session found:', session.user.id);

      const expiresAt = data.accessToken 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: session.user.id, // user_id statt id!
          patreon_id: data.patreonId,
          patreon_tier: data.tier,
          patreon_access_token: data.accessToken,
          patreon_refresh_token: data.refreshToken,
          patreon_expires_at: expiresAt,
          is_premium: data.isPremium,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id' // user_id statt id!
        });

      if (error) {
        console.error('❌ Failed to save Patreon data:', error);
        alert(`Fehler beim Speichern: ${error.message}`);
      } else {
        console.log('✅ Patreon data saved successfully');
        alert('✅ Patreon-Daten erfolgreich gespeichert!');
      }
    } catch (error) {
      console.error('❌ Error saving Patreon data:', error);
      alert('Unerwarteter Fehler beim Speichern der Patreon-Daten');
    }
  }

  async function checkAuth() {
    try {
      setError(null);
      console.log('🔍 Checking auth...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Session Error:', sessionError);
        setError(`Session Error: ${sessionError.message}`);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        console.log('❌ No session, redirecting to signin');
        router.push('/auth/signin');
        return;
      }

      console.log('✅ User found:', session.user.id);

      // Versuche Profile zu laden - KORRIGIERT mit user_id
      try {
        console.log('🔍 Fetching profile...');
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id) // user_id statt id!
          .maybeSingle();

        if (profileError) {
          console.warn('⚠️ Profile Error:', profileError);
          // Trotzdem weitermachen, nur warnen
        }

        console.log('📄 Profile data:', profile);

        setUser({
          ...session.user,
          profile: profile || {}
        });

        console.log('✅ User set successfully');
        
      } catch (profileErr) {
        console.warn('⚠️ Profile Catch Error:', profileErr);
        // User ohne Profile setzen
        setUser({
          ...session.user,
          profile: {}
        });
      }

    } catch (error) {
      console.error('❌ Auth Check Error:', error);
      setError(`Auth Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  // Function to refresh user data (called from PatreonConnectButton)
  const refreshUserData = async () => {
    console.log('🔄 Refreshing user data...');
    setLoading(true);
    await checkAuth();
  };

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
              onClick={() => {
                setError(null);
                setLoading(true);
                checkAuth();
              }}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Mein Profil</h1>
          <p className="text-gray-400">Verwalten deine Account-Einstellungen</p>
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
                  user.profile?.is_premium 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {user.profile?.is_premium ? '⭐ Premium' : 'Free'}
                </span>
                {user.profile?.patreon_tier && user.profile.patreon_tier !== 'free' && (
                  <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded">
                    {user.profile.patreon_tier}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Additional Profile Info */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Registriert am</label>
              <p className="text-gray-400 text-sm">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Letzter Login</label>
              <p className="text-gray-400 text-sm">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('de-DE') : 'Unbekannt'}
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
                <li>• Detaillierte Bewertungsmetriken (KGV, KBV, etc.)</li>
                <li>• Erweiterte Margenanalysen</li>
                <li>• Interaktive Finanzdiagramme</li>
                <li>• Keine Werbung</li>
                <li>• Priority Support</li>
                <li>• Early Access zu neuen Features</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-400 mb-2">❌ Free-Version Limitierungen:</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Basis-Informationen only</li>
                <li>• Einige Kennzahlen sind gesperrt</li>
                <li>• Keine interaktiven Charts</li>
                <li>• Werbung wird angezeigt</li>
                <li>• Limitierter Support</li>
              </ul>
            </div>
          </div>
          
          {!user.profile?.is_premium && (
            <div className="mt-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-orange-400 text-xl">💡</span>
                <div>
                  <p className="text-orange-300 text-sm font-medium mb-1">
                    Upgrade zu Premium
                  </p>
                  <p className="text-orange-300 text-sm">
                    Verbinde dein Patreon-Konto um Premium-Features freizuschalten! 
                    Bereits ab $9/Monat Vollzugriff auf alle Features.
                  </p>
                  <div className="mt-2">
                    <a
                      href="/pricing"
                      className="text-orange-400 hover:text-orange-300 underline text-sm"
                    >
                      Alle Preise ansehen →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {user.profile?.is_premium && (
            <div className="mt-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">🎉</span>
                <div>
                  <p className="text-green-300 text-sm font-medium mb-1">
                    Premium aktiv!
                  </p>
                  <p className="text-green-300 text-sm">
                    Du hast Zugang zu allen Premium-Features. Vielen Dank für deine Unterstützung!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Account-Aktionen</h3>
          <div className="space-y-4">
            {/* Refresh Status */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Status aktualisieren</h4>
                <p className="text-gray-400 text-sm">
                  Synchronisiert deinen Premium-Status mit Patreon
                </p>
              </div>
              <button
                onClick={refreshUserData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Aktualisieren
              </button>
            </div>
            
            {/* Delete Account Warning */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-red-400 font-medium">Gefährliche Zone</h4>
                  <p className="text-gray-400 text-sm">
                    Account-Löschung und andere kritische Aktionen
                  </p>
                </div>
                <button
                  onClick={() => alert('Account-Löschung noch nicht implementiert')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                  disabled
                >
                  Account löschen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back to App */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition"
          >
            ← Zurück zur App
          </a>
        </div>
      </div>
    </div>
  );
}