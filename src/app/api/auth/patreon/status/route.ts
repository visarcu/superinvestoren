// src/app/api/auth/patreon/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { PatreonAuth } from '@/lib/patreonAuth';

export async function GET(request: NextRequest) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('patreon_id, patreon_tier, patreon_access_token, patreon_expires_at, is_premium')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.patreon_id || !profile.patreon_access_token) {
      return NextResponse.json({
        isConnected: false,
        isPremium: false,
        tier: null,
      });
    }

    // Optionally verify with Patreon API (for real-time status)
    try {
      const patreonAuth = new PatreonAuth();
      const CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID!;
      const membership = await patreonAuth.getPatreonMembership(profile.patreon_access_token, CAMPAIGN_ID);
      
      let isActive = false;
      let currentTier = 'free';
      
      if (membership && membership.attributes.patron_status === 'active_patron') {
        const amountCents = membership.attributes.currently_entitled_amount_cents;
        isActive = true;
        
        if (amountCents >= 500) {
          currentTier = 'premium';
        } else if (amountCents >= 300) {
          currentTier = 'supporter';
        }
      }

      // Update profile if status changed
      if (currentTier !== profile.patreon_tier || isActive !== profile.is_premium) {
        await supabase
          .from('profiles')
          .update({
            patreon_tier: currentTier,
            is_premium: isActive && (currentTier === 'premium' || currentTier === 'supporter'),
          })
          .eq('id', session.user.id);
      }

      return NextResponse.json({
        isConnected: true,
        isPremium: isActive && (currentTier === 'premium' || currentTier === 'supporter'),
        tier: currentTier,
        patronStatus: membership?.attributes.patron_status || 'unknown',
      });

    } catch (apiError) {
      console.warn('Failed to verify with Patreon API, using cached data:', apiError);
      
      // Fallback to cached data
      return NextResponse.json({
        isConnected: true,
        isPremium: profile.is_premium || false,
        tier: profile.patreon_tier,
        cached: true,
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}