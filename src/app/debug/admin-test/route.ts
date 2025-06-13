import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .limit(1);
    
    return NextResponse.json({ 
      success: !error,
      data,
      error: error?.message 
    });
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: String(err) 
    });
  }
}