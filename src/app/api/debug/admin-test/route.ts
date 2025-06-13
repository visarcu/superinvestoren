import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    console.log('🧪 Testing Supabase Admin access...');
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .limit(1);
    
    console.log('📊 Admin test result:', { data, error });
    
    return NextResponse.json({ 
      success: !error,
      data,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Admin test error:', err);
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    });
  }
}