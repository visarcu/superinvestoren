// src/app/api/debug/comprehensive-fix/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'd5bd6951-6479-4279-afd6-a019d9f6f153';
    
    console.log('🔍 Comprehensive Debug for user:', userId);
    
    const results: any = {
      userId,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Environment Check
    results.environment = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      serviceRolePrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30),
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40)
    };

    // Test 2: Normal Client (User Context)
    try {
      console.log('🧪 Testing normal client...');
      
      // Versuche alle Profile zu finden (nicht nur single)
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId);

      results.tests.normalClient = {
        success: !allError,
        error: allError?.message,
        profileCount: allProfiles?.length || 0,
        profiles: allProfiles
      };
      
      console.log('👤 Normal client result:', results.tests.normalClient);
    } catch (error) {
      results.tests.normalClient = {
        success: false,
        error: String(error)
      };
    }

    // Test 3: Admin Client mit dynamischem Import
    try {
      console.log('🧪 Testing admin client...');
      
      // Erstelle Admin Client direkt hier
      const { createClient } = await import('@supabase/supabase-js');
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase environment variables');
      }
      
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Test Admin Connection
      const { data: adminTest, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, is_premium, stripe_customer_id')
        .eq('user_id', userId);

      results.tests.adminClient = {
        success: !adminError,
        error: adminError?.message,
        profileCount: adminTest?.length || 0,
        profiles: adminTest
      };
      
      console.log('🔑 Admin client result:', results.tests.adminClient);

      // Test Admin Auth
      try {
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1
        });
        
        results.tests.adminAuth = {
          success: !authError,
          error: authError?.message,
          canListUsers: !!users
        };
      } catch (authTestError) {
        results.tests.adminAuth = {
          success: false,
          error: String(authTestError)
        };
      }

      // Test: Profile erstellen falls nicht existiert
      if (results.tests.adminClient.success && results.tests.adminClient.profileCount === 0) {
        console.log('📝 Creating missing profile...');
        
        const { data: createdProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: userId,
            is_premium: false,
            created_at: new Date().toISOString()
          })
          .select();

        results.tests.profileCreation = {
          success: !createError,
          error: createError?.message,
          createdProfile
        };
      }

    } catch (error) {
      results.tests.adminClient = {
        success: false,
        error: String(error)
      };
    }

    // Test 4: Database Schema Check
    try {
      console.log('🧪 Testing database schema...');
      
      // Versuche herauszufinden was mit der Tabelle los ist
      const { data: schemaInfo, error: schemaError } = await supabase.rpc('get_table_info', {
        table_name: 'profiles'
      }).single();

      results.tests.schema = {
        success: !schemaError,
        error: schemaError?.message,
        info: schemaInfo
      };
    } catch (schemaTestError) {
      results.tests.schema = {
        success: false,
        error: String(schemaTestError),
        note: 'RPC function might not exist - this is normal'
      };
    }

    // Zusammenfassung und Empfehlungen
    results.summary = {
      mainIssues: [],
      recommendations: []
    };

    if (!results.tests.adminClient?.success) {
      results.summary.mainIssues.push('Admin client permissions failed');
      results.summary.recommendations.push('Check RLS policies or disable RLS for profiles table');
    }

    if (results.tests.normalClient?.profileCount === 0 && results.tests.adminClient?.profileCount === 0) {
      results.summary.mainIssues.push('No profile exists for this user');
      results.summary.recommendations.push('Profile needs to be created');
    }

    if (results.tests.normalClient?.profileCount > 1) {
      results.summary.mainIssues.push('Multiple profiles found for same user_id');
      results.summary.recommendations.push('Data integrity issue - remove duplicate profiles');
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('❌ Comprehensive debug failed:', error);
    return NextResponse.json({
      error: 'Comprehensive debug failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST endpoint um automatische Fixes zu versuchen
export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    console.log(`🔧 Attempting fix: ${action} for user: ${userId}`);

    // Erstelle Admin Client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let result: any = { success: false };

    switch (action) {
      case 'create_profile':
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: userId,
            is_premium: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        result = {
          success: !createError,
          error: createError?.message,
          profile: newProfile
        };
        break;

      case 'make_premium':
        const { data: premiumUpdate, error: premiumError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: true,
            subscription_status: 'active',
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            premium_since: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select();

        result = {
          success: !premiumError,
          error: premiumError?.message,
          profile: premiumUpdate
        };
        break;

      default:
        result = { success: false, error: 'Unknown action' };
    }

    return NextResponse.json({
      action,
      userId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Fix attempt failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}