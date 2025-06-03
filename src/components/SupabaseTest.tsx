// Temporäre Test-Komponente - erstelle diese als src/components/SupabaseTest.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SupabaseTest() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runTests() {
      const testResults: any = {};

      try {
        // Test 1: Session
        console.log('🔍 Test 1: Session Check');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        testResults.session = {
          success: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          error: sessionError?.message
        };

        if (!session) {
          setResults(testResults);
          setLoading(false);
          return;
        }

        // Test 2: Direkte Tabellen-Abfrage (ohne WHERE)
        console.log('🔍 Test 2: Direct Table Access');
        const { data: allProfiles, error: tableError } = await supabase
          .from('profiles')
          .select('user_id, email_verified')
          .limit(5);

        testResults.tableAccess = {
          success: !tableError,
          profileCount: allProfiles?.length || 0,
          error: tableError?.message,
          errorCode: tableError?.code
        };

        // Test 3: Spezifische User-Abfrage
        console.log('🔍 Test 3: User Specific Query');
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        testResults.userProfile = {
          success: !userError,
          profile: userProfile,
          error: userError?.message,
          errorCode: userError?.code
        };

        // Test 4: Insert Test
        console.log('🔍 Test 4: Insert Test');
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .upsert({
            user_id: session.user.id,
            email_verified: true,
            first_name: 'Test',
            last_name: 'User',
            is_premium: false
          })
          .select()
          .single();

        testResults.insert = {
          success: !insertError,
          data: insertData,
          error: insertError?.message,
          errorCode: insertError?.code
        };

        // Test 5: Supabase URL/Key Check
        testResults.config = {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...'
        };

        // Test 6: Raw SQL Test
        console.log('🔍 Test 6: Raw SQL Test');
        const { data: rawData, error: rawError } = await supabase
          .rpc('get_current_user_id');
        
        testResults.rawSql = {
          success: !rawError,
          data: rawData,
          error: rawError?.message
        };

      } catch (error) {
        console.error('Test Error:', error);
        testResults.error = error;
      }

      setResults(testResults);
      setLoading(false);
    }

    runTests();
  }, []);

  if (loading) {
    return <div className="p-4 text-white">Running Supabase tests...</div>;
  }

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-6">🔬 Supabase Connection Test</h1>
      
      <div className="space-y-6">
        {Object.entries(results).map(([testName, result]: [string, any]) => (
          <div key={testName} className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-bold mb-2 capitalize">
              {testName.replace(/([A-Z])/g, ' $1')} 
              {result?.success ? ' ✅' : ' ❌'}
            </h2>
            <pre className="text-xs bg-gray-700 p-3 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500 rounded">
        <h3 className="font-bold mb-2">🎯 Nächste Schritte:</h3>
        <ul className="text-sm space-y-1">
          <li>1. Prüfe ob Session funktioniert</li>
          <li>2. Prüfe ob tableAccess erfolgreich ist</li>
          <li>3. Prüfe ob userProfile geladen wird</li>
          <li>4. Prüfe ob insert funktioniert</li>
        </ul>
      </div>
    </div>
  );
}