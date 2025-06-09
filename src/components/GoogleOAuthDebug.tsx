// src/components/GoogleOAuthDebug.tsx - Debug Tool für OAuth-Probleme
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GoogleOAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    const info: any = {};

    try {
      // 1. Environment Check
      info.environment = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        currentOrigin: window.location.origin,
        currentUrl: window.location.href,
        userAgent: navigator.userAgent.split(' ')[0]
      };

      // 2. Current Session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      info.currentSession = {
        hasSession: !!session,
        provider: session?.user?.app_metadata?.provider,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError?.message
      };

      // 3. Test OAuth URL Generation
      try {
        const testRedirectTo = window.location.origin + '/auth/callback';
        
        info.oauthTest = {
          redirectTo: testRedirectTo,
          supabaseProjectId: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0],
          expectedOAuthUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(testRedirectTo)}`
        };
      } catch (error) {
        info.oauthTest = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // 4. Browser/Cache Info
      info.browserInfo = {
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        isPrivateMode: await detectPrivateMode()
      };

      // 5. Network Connectivity Test
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD'
        });
        info.connectivity = {
          supabaseReachable: response.ok,
          status: response.status,
          statusText: response.statusText
        };
      } catch (error) {
        info.connectivity = { 
          supabaseReachable: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }

      // 6. Google OAuth Simulation (ohne redirect)
      try {
        // Simuliere OAuth ohne tatsächliche Weiterleitung
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/auth/callback',
            skipBrowserRedirect: true  // Verhindert tatsächliche Weiterleitung
          }
        });

        info.oauthSimulation = {
          success: !error,
          data: data,
          error: error?.message,
          url: data?.url
        };

        // Analysiere die generierte URL
        if (data?.url) {
          const url = new URL(data.url);
          info.urlAnalysis = {
            host: url.host,
            isSupabaseHost: url.host.includes('supabase.co'),
            isLocalhost: url.host.includes('localhost'),
            redirectParam: url.searchParams.get('redirect_to'),
            allParams: Object.fromEntries(url.searchParams.entries())
          };
        }
      } catch (error) {
        info.oauthSimulation = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }

    } catch (error) {
      info.generalError = error instanceof Error ? error.message : 'Unknown error';
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const clearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear specific OAuth-related items
      const keysToRemove = [
        'supabase.auth.token',
        'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      alert('Cache geleert! Lade die Seite neu und teste OAuth erneut.');
    } catch (error) {
      alert('Fehler beim Cache leeren: ' + error);
    }
  };

  const testOAuthDirect = () => {
    // Direkte OAuth-URL mit aktueller Konfiguration
    const redirectTo = window.location.origin + '/auth/callback';
    const oauthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    
    console.log('🔗 Direct OAuth URL:', oauthUrl);
    window.open(oauthUrl, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🔍 Google OAuth Debug Tool</h2>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={runDebug}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 mr-4"
        >
          {loading ? 'Analysiere...' : 'OAuth Debug Ausführen'}
        </button>
        
        <button
          onClick={clearCache}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 mr-4"
        >
          Cache Leeren
        </button>
        
        <button
          onClick={testOAuthDirect}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          OAuth Direct Testen
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-6">
          {/* Environment Info */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-blue-400">🌍 Environment</h3>
            <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
              {JSON.stringify(debugInfo.environment, null, 2)}
            </pre>
          </div>

          {/* Current Session */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-green-400">👤 Current Session</h3>
            <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
              {JSON.stringify(debugInfo.currentSession, null, 2)}
            </pre>
          </div>

          {/* OAuth Test */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-purple-400">🔗 OAuth Configuration</h3>
            <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
              {JSON.stringify(debugInfo.oauthTest, null, 2)}
            </pre>
          </div>

          {/* OAuth Simulation */}
          {debugInfo.oauthSimulation && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-yellow-400">🧪 OAuth Simulation</h3>
              <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
                {JSON.stringify(debugInfo.oauthSimulation, null, 2)}
              </pre>
            </div>
          )}

          {/* URL Analysis */}
          {debugInfo.urlAnalysis && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-red-400">🔍 OAuth URL Analysis</h3>
              <div className="text-sm space-y-2">
                <div className={`p-2 rounded ${debugInfo.urlAnalysis.isSupabaseHost ? 'bg-red-900' : 'bg-green-900'}`}>
                  <strong>Host:</strong> {debugInfo.urlAnalysis.host}
                  {debugInfo.urlAnalysis.isSupabaseHost && <span className="ml-2 text-red-300">⚠️ Problem: Zeigt Supabase-Domain!</span>}
                  {debugInfo.urlAnalysis.isLocalhost && <span className="ml-2 text-green-300">✅ Gut: Zeigt localhost!</span>}
                </div>
                <div>
                  <strong>Redirect URL:</strong> {debugInfo.urlAnalysis.redirectParam}
                </div>
              </div>
              <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto mt-2">
                {JSON.stringify(debugInfo.urlAnalysis, null, 2)}
              </pre>
            </div>
          )}

          {/* Browser Info */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-orange-400">🌐 Browser Info</h3>
            <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
              {JSON.stringify(debugInfo.browserInfo, null, 2)}
            </pre>
          </div>

          {/* Connectivity */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-cyan-400">📡 Connectivity</h3>
            <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
              {JSON.stringify(debugInfo.connectivity, null, 2)}
            </pre>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-blue-400">💡 Recommendations</h3>
            <ul className="text-sm space-y-1 text-blue-200">
              {debugInfo.urlAnalysis?.isSupabaseHost && (
                <li>• 🚨 OAuth zeigt Supabase-Domain - Google OAuth App muss neu konfiguriert werden</li>
              )}
              {!debugInfo.currentSession?.hasSession && (
                <li>• 📝 Keine aktive Session - normaler Zustand für nicht-angemeldete User</li>
              )}
              {!debugInfo.connectivity?.supabaseReachable && (
                <li>• 📡 Supabase nicht erreichbar - Netzwerk-Problem</li>
              )}
              {debugInfo.browserInfo?.isPrivateMode && (
                <li>• 🕵️ Private-Modus erkannt - kann OAuth-Probleme verursachen</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to detect private mode
async function detectPrivateMode() {
  try {
    const storage = window.sessionStorage;
    storage.setItem('test', 'test');
    storage.removeItem('test');
    return false;
  } catch {
    return true;
  }
}