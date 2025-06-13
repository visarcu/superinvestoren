// src/app/api/debug/manual-premium-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { userId, makePremium = true } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    console.log('🧪 Manual Premium Update Test for user:', userId);
    console.log('🧪 Action:', makePremium ? 'ACTIVATE' : 'DEACTIVATE');

    // 1. Prüfe ob User existiert (normal client)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('👤 Existing profile check:', { existingProfile, checkError });

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ 
        error: 'Failed to check user', 
        details: checkError.message 
      }, { status: 500 });
    }

    // 2. Test Admin Connection
    console.log('🧪 Testing admin connection...');
    try {
      const { data: adminTestData, error: adminTestError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .limit(1);
      
      console.log('🧪 Admin test result:', { 
        success: !adminTestError, 
        error: adminTestError?.message 
      });
      
      if (adminTestError) {
        return NextResponse.json({
          error: 'Admin connection failed',
          details: adminTestError.message
        }, { status: 500 });
      }
    } catch (adminConnectionError) {
      console.error('❌ Admin connection error:', adminConnectionError);
      return NextResponse.json({
        error: 'Admin connection error',
        details: String(adminConnectionError)
      }, { status: 500 });
    }

    // 3. Update Premium Status
    const updateData = makePremium ? {
      is_premium: true,
      subscription_status: 'active',
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Tage
      premium_since: new Date().toISOString(),
      stripe_customer_id: existingProfile?.stripe_customer_id || 'manual_test_customer',
      stripe_subscription_id: 'manual_test_subscription'
    } : {
      is_premium: false,
      subscription_status: 'canceled',
      subscription_end_date: new Date().toISOString()
    };

    console.log('📝 Updating with data:', updateData);

    // Erst versuchen mit UPSERT falls User nicht existiert
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        ...updateData
      })
      .select();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return NextResponse.json({
        error: 'Update failed',
        details: updateError.message,
        code: updateError.code
      }, { status: 500 });
    }

    console.log('✅ Update successful:', updateResult);

    // 4. Verify update (normal client)
    const { data: verifyResult, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('🔍 Verification result:', { verifyResult, verifyError });

    return NextResponse.json({
      success: true,
      action: makePremium ? 'ACTIVATED' : 'DEACTIVATED',
      userId,
      updateResult,
      verifyResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual premium update error:', error);
    return NextResponse.json({
      error: 'Manual update failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Manual Premium Update Test Endpoint',
    usage: 'POST with { "userId": "your-user-id", "makePremium": true/false }',
    timestamp: new Date().toISOString()
  });
}