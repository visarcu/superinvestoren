// src/components/SupabaseDebug.tsx - VEREINFACHTES DEBUG TOOL
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SupabaseDebug() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runTests() {
      const testResults: any = {};

      try {
        // Test 1: Environment Variables
        console.log('🔧 Test 1: Environment Check');
        testResults.environment = {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
          domain: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ? 'supabase.co' : 'custom'
        };

        // Test 2: Session Check
        console.log('🔍 Test 2: Session Check');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        testResults.session = {
          success: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          provider: session?.user?.app_metadata?.provider,
          error: sessionError?.message
        };

        // Test 3: Connection Test (nur wenn session vorhanden)
        if (session) {
          console.log('🔍 Test 3: Database Connection');
          try {
            const { data: connectionTest, error: connectionError } = await supabase
              .from('profiles')
              .select('count(*)', { count: 'exact', head: true });

            testResults.database = {
              success: !connectionError,
              error: connectionError?.message,
              errorCode: connectionError?.code
            };
          } catch (dbError) {
            testResults.database = {
              success: false,
              error: 'Database connection failed',
              details: dbError
            };
          }

          // Test 4: Profile Check
          console.log('🔍 Test 4: Profile Check');
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            testResults.profile = {
              success: !profileError,
              hasProfile: !!profileData,
              profileData: profileData,
              error: profileError?.message,
              errorCode: profileError?.code
            };
          } catch (profileErr) {
            testResults.profile = {
              success: false,
              error: 'Profile query failed',
              details: profileErr
            };
          }
        }

      } catch (error) {
        console.error('Test Error:', error);
        testResults.generalError = error;
      }

      setResults(testResults);
      setLoading(false);
    }

    runTests();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-white bg-gray-900 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Running Supabase diagnostics...
        </div>
      </div>
    );
  }

  const getStatusIcon = (success: boolean) => success ? '✅' : '❌';
  const getStatusColor = (success: boolean) => success ? 'text-green-400' : 'text-red-400';

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg space-y-4">
      <h2 className="text-xl font-bold mb-4">🔬 Supabase Debug Report</h2>
      
      {/* Environment Check */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          Environment Variables 
          {getStatusIcon(results.environment?.hasUrl && results.environment?.hasKey)}
        </h3>
        <div className="text-sm space-y-1">
          <div className={getStatusColor(results.environment?.hasUrl)}>
            SUPABASE_URL: {results.environment?.hasUrl ? '✓ Set' : '✗ Missing'}
          </div>
          <div className={getStatusColor(results.environment?.hasKey)}>
            SUPABASE_ANON_KEY: {results.environment?.hasKey ? '✓ Set' : '✗ Missing'}
          </div>
          {results.environment?.urlPreview && (
            <div className="text-gray-400">
              URL Preview: {results.environment.urlPreview}
            </div>
          )}
        </div>
      </div>

      {/* Session Check */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          User Session {getStatusIcon(results.session?.success)}
        </h3>
        <div className="text-sm space-y-1">
          {results.session?.success ? (
            <>
              <div className="text-green-400">✓ User logged in</div>
              <div className="text-gray-400">Email: {results.session.email}</div>
              <div className="text-gray-400">Provider: {results.session.provider || 'email'}</div>
              <div className="text-gray-400">User ID: {results.session.userId}</div>
            </>
          ) : (
            <div className="text-red-400">✗ No active session</div>
          )}
          {results.session?.error && (
            <div className="text-red-400">Error: {results.session.error}</div>
          )}
        </div>
      </div>

      {/* Database Connection */}
      {results.database && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            Database Connection {getStatusIcon(results.database.success)}
          </h3>
          <div className="text-sm">
            {results.database.success ? (
              <div className="text-green-400">✓ Can connect to profiles table</div>
            ) : (
              <div className="text-red-400">
                ✗ Database connection failed
                {results.database.error && <div>Error: {results.database.error}</div>}
                {results.database.errorCode && <div>Code: {results.database.errorCode}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Check */}
      {results.profile && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            User Profile {getStatusIcon(results.profile.success)}
          </h3>
          <div className="text-sm space-y-1">
            {results.profile.success ? (
              <>
                <div className="text-green-400">✓ Profile query successful</div>
                <div className={getStatusColor(results.profile.hasProfile)}>
                  Profile exists: {results.profile.hasProfile ? 'Yes' : 'No'}
                </div>
                {results.profile.hasProfile && results.profile.profileData && (
                  <div className="mt-2">
                    <div className="text-gray-400">Profile data:</div>
                    <pre className="text-xs bg-gray-700 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(results.profile.profileData, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-red-400">
                ✗ Profile query failed
                {results.profile.error && <div>Error: {results.profile.error}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Error */}
      {results.generalError && (
        <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
          <h3 className="font-bold mb-2 text-red-400">General Error</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(results.generalError, null, 2)}
          </pre>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg">
        <h3 className="font-bold mb-2 text-blue-400">🎯 Next Steps</h3>
        <ul className="text-sm space-y-1 text-blue-200">
          {!results.environment?.hasUrl && <li>• Set NEXT_PUBLIC_SUPABASE_URL in .env.local</li>}
          {!results.environment?.hasKey && <li>• Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local</li>}
          {!results.session?.success && <li>• Try signing in to test authentication</li>}
          {results.database && !results.database.success && <li>• Check database connection and RLS policies</li>}
          {results.profile && !results.profile.success && <li>• Create profiles table or check permissions</li>}
        </ul>
      </div>
    </div>
  );
}