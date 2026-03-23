// src/app/api/notifications/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { token, platform, userId, sessionToken } = await request.json();

    if (!token || !platform || !userId || !sessionToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Session validieren
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Token in Supabase upserten (gleicher Token wird nicht doppelt gespeichert)
    const { error } = await supabaseAdmin
      .from('device_tokens')
      .upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'token' }
      );

    if (error) {
      console.error('Device token upsert error:', error);
      return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
