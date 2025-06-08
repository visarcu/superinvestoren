// src/components/PatreonConnectButton.tsx - Erweiterte Version mit Datenbankdaten
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface PatreonStatus {
  isConnected: boolean;
  tier: string | null;
  isPremium: boolean;
  patronStatus?: string;
  patreonId?: string;
}

interface PatreonConnectButtonProps {
  onStatusChange?: () => void;
}

export default function PatreonConnectButton({ onStatusChange }: PatreonConnectButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [patreonStatus, setPatreonStatus] = useState<PatreonStatus>({
    isConnected: false,
    tier: null,
    isPremium: false,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAuthAndPatreonStatus();
  }, []);

  async function checkAuthAndPatreonStatus() {
    try {
      console.log('🔍 PatreonConnectButton: Checking auth and status...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('❌ PatreonConnectButton: No session');
        setLoading(false);
        return;
      }

      setUser(session.user);
      console.log('✅ PatreonConnectButton: User found:', session.user.id);

      // Check Patreon status from profiles (mit user_id!)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('patreon_id, patreon_tier, is_premium, patreon_access_token')
        .eq('user_id', session.user.id) // user_id statt id!
        .maybeSingle();

      console.log('📄 PatreonConnectButton: Profile data:', profile);

      if (profileError) {
        console.warn('⚠️ PatreonConnectButton: Profile error:', profileError);
      }

      if (profile) {
        const newStatus = {
          isConnected: !!profile.patreon_id,
          tier: profile.patreon_tier,
          isPremium: profile.is_premium || false,
          patreonId: profile.patreon_id
        };
        
        console.log('📊 PatreonConnectButton: New status:', newStatus);
        setPatreonStatus(newStatus);
      } else {
        console.log('📊 PatreonConnectButton: No profile found, using defaults');
        setPatreonStatus({
          isConnected: false,
          tier: null,
          isPremium: false,
        });
      }
    } catch (error) {
      console.error('❌ PatreonConnectButton: Error checking status:', error);
    } finally {
      setLoading(false);
    }
  }

  // Funktion um Status von außen zu aktualisieren
  async function refreshStatus() {
    console.log('🔄 PatreonConnectButton: Refreshing status...');
    // Kein setLoading(true) mehr - verhindert UI-Flackern
    try {
      await checkAuthAndPatreonStatus();
    } catch (error) {
      console.error('❌ PatreonConnectButton: Refresh error:', error);
    }
  }

  useEffect(() => {
    // Nur refreshen wenn explizit durch Patreon-Callback ausgelöst
    if (onStatusChange && window.location.search.includes('patreon_success')) {
      console.log('🔄 Patreon success detected, refreshing once...');
      
      // Nur EINMAL nach 2 Sekunden refreshen
      const timeout = setTimeout(() => {
        refreshStatus();
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [onStatusChange]);

  async function handlePatreonConnect() {
    if (!user) {
      alert('Bitte loggen Sie sich zuerst ein.');
      return;
    }

    setActionLoading(true);
    
    try {
      // Generate Patreon OAuth URL
      const clientId = process.env.NEXT_PUBLIC_PATREON_CLIENT_ID;
      const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/patreon/callback`;
      const state = crypto.randomUUID();
      
      const authUrl = `https://www.patreon.com/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=identity campaigns&` +
        `state=${state}`;
      
      console.log('🔗 PatreonConnectButton: Redirecting to:', authUrl);
      
      // Store state in sessionStorage for validation
      sessionStorage.setItem('patreon_oauth_state', state);
      
      // Redirect to Patreon OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ PatreonConnectButton: Error generating URL:', error);
      alert('Fehler beim Erstellen der Patreon-Verbindung');
      setActionLoading(false);
    }
  }

  // Ersetze die handlePatreonDisconnect Funktion in PatreonConnectButton.tsx:

async function handlePatreonDisconnect() {
  if (!confirm('Möchten Sie die Patreon-Verbindung wirklich trennen? Sie verlieren dadurch Ihre Premium-Features.')) {
    return;
  }

  setActionLoading(true);
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        patreon_id: null,
        patreon_tier: null,
        patreon_access_token: null,
        patreon_refresh_token: null,
        patreon_expires_at: null,
        is_premium: false,
      })
      .eq('user_id', user.id);

    if (error) throw error;

    // ZUERST lokalen State aktualisieren
    const newStatus = {
      isConnected: false,
      tier: null,
      isPremium: false,
    };
    setPatreonStatus(newStatus);

    // DANN Success-Message zeigen
    alert('Patreon-Verbindung wurde erfolgreich getrennt.');

    // OPTIONAL: Parent benachrichtigen nur wenn nötig
    // (Meist nicht nötig da UI bereits korrekt ist)
    if (onStatusChange && window.location.pathname === '/profile') {
      setTimeout(() => {
        onStatusChange();
      }, 500); // 500ms Verzögerung für DB-Commit
    }

  } catch (error) {
    console.error('❌ PatreonConnectButton: Error disconnecting:', error);
    alert('Fehler beim Trennen der Patreon-Verbindung.');
  } finally {
    setActionLoading(false);
  }
}

  if (loading) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
        <div className="text-center p-4">
          <p className="text-gray-300">Loggen Sie sich ein, um Patreon zu verbinden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">Patreon Integration</h3>
      
      <div className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <h4 className="text-white font-medium mb-1">Verbindungsstatus</h4>
            {patreonStatus.isConnected ? (
              <div className="space-y-1">
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Verbunden
                </p>
                {patreonStatus.tier && (
                  <p className="text-gray-300 text-sm">
                    Tier: <span className="font-medium capitalize">{patreonStatus.tier}</span>
                  </p>
                )}
                {patreonStatus.isPremium && (
                  <p className="text-yellow-400 text-sm flex items-center gap-1">
                    <span>⭐</span>
                    Premium aktiv
                  </p>
                )}
                {patreonStatus.patreonId && (
                  <p className="text-gray-400 text-xs">
                    ID: {patreonStatus.patreonId.slice(0, 8)}...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                Nicht verbunden
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {patreonStatus.isConnected ? (
              <>
                <button
                  onClick={refreshStatus}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition text-sm"
                >
                  {actionLoading ? '...' : 'Aktualisieren'}
                </button>
                <button
                  onClick={handlePatreonDisconnect}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition text-sm"
                >
                  {actionLoading ? '...' : 'Trennen'}
                </button>
              </>
            ) : (
              <button
                onClick={handlePatreonConnect}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition text-sm flex items-center gap-2"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 .48v23.04h4.22V.48H0zm15.385 0c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623C24 4.36 20.136.48 15.385.48z"/>
                  </svg>
                )}
                Mit Patreon verbinden
              </button>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-gray-700/30 rounded-lg">
          <h5 className="text-white font-medium mb-2">Wie funktioniert es?</h5>
          <ol className="text-sm text-gray-300 space-y-1">
            <li>1. Klicken Sie auf "Mit Patreon verbinden"</li>
            <li>2. Loggen Sie sich bei Patreon ein</li>
            <li>3. Unterstützen Sie unser Projekt mit einer Patreon-Mitgliedschaft</li>
            <li>4. Premium-Features werden automatisch freigeschaltet</li>
          </ol>
          
          <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/50 rounded">
            <p className="text-blue-300 text-sm">
              <strong>💡 Tipp:</strong> Sie können Ihre Unterstützung jederzeit über Patreon verwalten oder beenden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}