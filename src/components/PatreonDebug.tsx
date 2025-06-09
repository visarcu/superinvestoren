// src/components/PatreonDebug.tsx - Debug Tool für Patreon-Probleme
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PatreonDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const runPatreonDebug = async () => {
    if (!user) {
      alert('Bitte zuerst einloggen!');
      return;
    }

    setLoading(true);
    const info: any = { timestamp: new Date().toISOString() };

    try {
      // 1. Current Profile Data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      info.currentProfile = {
        success: !profileError,
        data: profile,
        error: profileError?.message
      };

      // 2. Patreon-spezifische Daten analysieren
      if (profile) {
        info.patreonAnalysis = {
          hasPatreonId: !!profile.patreon_id,
          patreonId: profile.patreon_id,
          patreonTier: profile.patreon_tier,
          isPremium: profile.is_premium,
          hasAccessToken: !!profile.patreon_access_token,
          hasRefreshToken: !!profile.patreon_refresh_token,
          expiresAt: profile.patreon_expires_at,
          updatedAt: profile.updated_at,
          
          // Analysiere Tier-Logik
          tierAnalysis: {
            tierString: profile.patreon_tier,
            isPremiumTier: ['premium', 'supporter'].includes(profile.patreon_tier),
            isPremiumFlag: profile.is_premium,
            isInconsistent: profile.is_premium !== ['premium', 'supporter'].includes(profile.patreon_tier)
          }
        };

        // 3. Session Storage Check (falls Patreon-Daten dort noch sind)
        const sessionStorageData = sessionStorage.getItem('patreon_data');
        if (sessionStorageData) {
          try {
            info.sessionStorageData = JSON.parse(decodeURIComponent(sessionStorageData));
          } catch {
            info.sessionStorageData = { error: 'Parse failed', raw: sessionStorageData };
          }
        } else {
          info.sessionStorageData = null;
        }

        // 4. URL Parameters Check
        const urlParams = new URLSearchParams(window.location.search);
        info.urlParameters = {
          patreonSuccess: urlParams.get('patreon_success'),
          tier: urlParams.get('tier'),
          premium: urlParams.get('premium'),
          patreonId: urlParams.get('patreon_id'),
          patreonEmail: urlParams.get('patreon_email')
        };

        // 5. Mögliche Datenquellen identifizieren
        info.dataSourceAnalysis = {
          likelyFromSessionStorage: !!sessionStorageData,
          likelyFromURL: Object.values(info.urlParameters).some(v => v !== null),
          hasRecentUpdate: profile.updated_at && 
            (new Date().getTime() - new Date(profile.updated_at).getTime()) < 300000, // 5 min
          
          suspiciousPatterns: {
            premiumWithoutPayment: profile.is_premium && !profile.patreon_access_token,
            missingPatreonId: profile.is_premium && !profile.patreon_id,
            inconsistentTier: profile.patreon_tier === 'premium' && !profile.patreon_access_token
          }
        };
      }

    } catch (error) {
      info.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const resetPatreonData = async () => {
    if (!user) return;

    const confirmReset = confirm('WARNUNG: Das wird alle Patreon-Daten löschen und auf Free zurücksetzen. Fortfahren?');
    if (!confirmReset) return;

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
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        alert('Fehler beim Reset: ' + error.message);
      } else {
        alert('✅ Patreon-Daten erfolgreich zurückgesetzt!');
        // Clear sessionStorage
        sessionStorage.removeItem('patreon_data');
        // Reload page
        window.location.reload();
      }
    } catch (error) {
      alert('Reset fehlgeschlagen: ' + error);
    }
  };

  const verifyPatreonAPI = async () => {
    if (!debugInfo?.currentProfile?.data?.patreon_access_token) {
      alert('Kein Access Token vorhanden!');
      return;
    }

    setLoading(true);
    
    try {
      // Echte Patreon API - User's aktive Pledges prüfen
      const response = await fetch('https://www.patreon.com/api/oauth2/v2/identity?' +
        'include=memberships,memberships.currently_entitled_tiers,memberships.campaign&' +
        'fields[user]=email,first_name,full_name&' +
        'fields[member]=currently_entitled_amount_cents,lifetime_support_cents,last_charge_status,last_charge_date,next_charge_date,will_pay_amount_cents&' +
        'fields[tier]=amount_cents,title,description',
        {
          headers: {
            'Authorization': `Bearer ${debugInfo.currentProfile.data.patreon_access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      console.log('🔍 Patreon API Raw Response:', data);
      
      if (response.ok) {
        const memberships = data.included?.filter((item: any) => item.type === 'member') || [];
        const totalPledgeAmount = memberships.reduce((total: number, member: any) => 
          total + (member.attributes.currently_entitled_amount_cents || 0), 0) / 100;
        
        let message = `🔍 PATREON API VERIFICATION:\n\n`;
        message += `✅ API Call: Successful\n`;
        message += `📧 Email: ${data.data?.attributes?.email || 'N/A'}\n`;
        message += `📊 Active Memberships: ${memberships.length}\n`;
        message += `💰 Total Pledge: ${totalPledgeAmount.toFixed(2)}\n\n`;
        
        if (memberships.length > 0) {
          message += `📋 Membership Details:\n`;
          memberships.forEach((membership: any, index: number) => {
            const amount = (membership.attributes.currently_entitled_amount_cents || 0) / 100;
            message += `  ${index + 1}. Amount: ${amount.toFixed(2)}\n`;
            message += `     Status: ${membership.attributes.last_charge_status || 'Unknown'}\n`;
            message += `     Next Charge: ${membership.attributes.next_charge_date || 'N/A'}\n\n`;
          });
        } else {
          message += `❌ NO ACTIVE MEMBERSHIPS FOUND!\n`;
          message += `❌ This user should be FREE, not Premium!\n\n`;
        }
        
        message += `🎯 CONCLUSION:\n`;
        if (totalPledgeAmount === 0 && memberships.length === 0) {
          message += `❌ BUG CONFIRMED: User has NO Patreon subscription but shows Premium!`;
        } else if (totalPledgeAmount >= 5) {
          message += `✅ User legitimately has Premium (${totalPledgeAmount.toFixed(2)} >= $5.00)`;
        } else {
          message += `⚠️ User has subscription but below Premium threshold (${totalPledgeAmount.toFixed(2)} < $5.00)`;
        }
        
        alert(message);
      } else {
        alert(`❌ API Error: ${response.status} ${response.statusText}\n\nResponse: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      alert(`❌ API Verification Failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkPatreonAppMode = () => {
    const currentUrl = window.location.origin;
    const isDevelopment = currentUrl.includes('localhost') || process.env.NODE_ENV === 'development';
    
    let message = `🔧 PATREON APP CONFIGURATION:\n\n`;
    message += `🌍 Current URL: ${currentUrl}\n`;
    message += `🛠️ Environment: ${process.env.NODE_ENV}\n`;
    message += `🧪 Is Development: ${isDevelopment ? 'YES' : 'NO'}\n\n`;
    
    message += `💡 LIKELY CAUSE:\n`;
    if (isDevelopment) {
      message += `⚠️ Your Patreon app is probably in DEVELOPMENT mode!\n`;
      message += `⚠️ Development mode often returns fake "Premium" for all users.\n\n`;
      message += `🎯 SOLUTION:\n`;
      message += `1. Go to patreon.com/portal/registration/register-clients\n`;
      message += `2. Check if your app is in "Development" mode\n`;
      message += `3. Either:\n`;
      message += `   - Switch to "Live" mode for real testing\n`;
      message += `   - Or add development-mode handling in your code`;
    } else {
      message += `✅ You're in production mode, so this might be a real API issue.`;
    }
    
    alert(message);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🔍 Patreon Integration Debug</h2>
      
      {!user && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-lg mb-6">
          <p className="text-yellow-300">⚠️ Bitte zuerst einloggen um Patreon-Daten zu debuggen!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <button
          onClick={runPatreonDebug}
          disabled={loading || !user}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 mr-4"
        >
          {loading ? 'Analysiere...' : 'Patreon Debug Ausführen'}
        </button>
        
        <button
          onClick={resetPatreonData}
          disabled={!user}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 mr-4"
        >
          🚨 Patreon-Daten Zurücksetzen
        </button>
        
        <button
          onClick={verifyPatreonAPI}
          disabled={loading || !debugInfo?.currentProfile?.data?.patreon_access_token}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-600 mr-4"
        >
          🔍 Echte Patreon API Prüfen
        </button>
        
        <button
          onClick={checkPatreonAppMode}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-4"
        >
          🔧 Patreon App Modus prüfen
        </button>
      </div>

      {user && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h3 className="font-bold mb-2">👤 Current User</h3>
          <div className="text-sm">
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Provider:</strong> {user.app_metadata?.provider}</div>
            <div><strong>User ID:</strong> {user.id}</div>
          </div>
        </div>
      )}

      {debugInfo && (
        <div className="space-y-6">
          {/* Current Profile */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-blue-400">📄 Current Profile Data</h3>
            <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
              {JSON.stringify(debugInfo.currentProfile, null, 2)}
            </pre>
          </div>

          {/* Patreon Analysis */}
          {debugInfo.patreonAnalysis && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-purple-400">🔍 Patreon Data Analysis</h3>
              
              {/* Suspicious Patterns */}
              <div className="mb-4">
                <h4 className="font-semibold text-red-400 mb-2">🚨 Suspicious Patterns:</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(debugInfo.patreonAnalysis.tierAnalysis.suspiciousPatterns || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className={value ? 'text-red-300' : 'text-green-300'}>
                      <span className={value ? '❌' : '✅'}></span> {key}: {value ? 'VERDÄCHTIG' : 'OK'}
                    </div>
                  ))}
                </div>
              </div>

              <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
                {JSON.stringify(debugInfo.patreonAnalysis, null, 2)}
              </pre>
            </div>
          )}

          {/* Data Source Analysis */}
          {debugInfo.dataSourceAnalysis && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-yellow-400">📊 Data Source Analysis</h3>
              <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
                {JSON.stringify(debugInfo.dataSourceAnalysis, null, 2)}
              </pre>
            </div>
          )}

          {/* Session Storage */}
          {debugInfo.sessionStorageData && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-orange-400">💾 Session Storage Data</h3>
              <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
                {JSON.stringify(debugInfo.sessionStorageData, null, 2)}
              </pre>
            </div>
          )}

          {/* URL Parameters */}
          {debugInfo.urlParameters && Object.values(debugInfo.urlParameters).some(v => v !== null) && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-cyan-400">🔗 URL Parameters</h3>
              <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
                {JSON.stringify(debugInfo.urlParameters, null, 2)}
              </pre>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-blue-400">💡 Diagnose</h3>
            <ul className="text-sm space-y-1 text-blue-200">
              {debugInfo.patreonAnalysis?.tierAnalysis?.isInconsistent && (
                <li>• 🚨 PROBLEM: is_premium und patreon_tier sind inkonsistent!</li>
              )}
              {debugInfo.dataSourceAnalysis?.suspiciousPatterns?.premiumWithoutPayment && (
                <li>• 🚨 PROBLEM: Premium Status ohne Access Token (keine echte Patreon-Verbindung)</li>
              )}
              {debugInfo.dataSourceAnalysis?.suspiciousPatterns?.missingPatreonId && (
                <li>• 🚨 PROBLEM: Premium ohne Patreon ID</li>
              )}
              {debugInfo.dataSourceAnalysis?.likelyFromSessionStorage && (
                <li>• 📦 Daten stammen wahrscheinlich aus SessionStorage</li>
              )}
              {debugInfo.dataSourceAnalysis?.likelyFromURL && (
                <li>• 🔗 Daten stammen wahrscheinlich aus URL-Parametern</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}