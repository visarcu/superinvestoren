// src/app/api/auth/patreon/callback/route.ts - Einfache Version ohne Service Key
import { NextRequest, NextResponse } from 'next/server';
import { PatreonAuth } from '@/lib/patreonAuth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('🔄 Patreon Callback received:', { 
    hasCode: !!code, 
    error
  });

  if (error) {
    console.error('❌ Patreon OAuth Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=patreon_auth_failed`);
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=no_code`);
  }

  try {
    console.log('🔄 Processing Patreon code...');
    
    // 1. Initialize Patreon API
    const patreonAuth = new PatreonAuth();
    
    // 2. Exchange code for tokens
    const tokens = await patreonAuth.exchangeCodeForTokens(code);
    console.log('✅ Tokens received');
    
    // 3. Get Patreon user data
    const patreonUser = await patreonAuth.getPatreonUser(tokens.access_token);
    console.log('✅ User data received');
    
    // 4. Get membership status
    const CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID!;
    const membership = await patreonAuth.getPatreonMembership(tokens.access_token, CAMPAIGN_ID);
    
    // 5. Calculate tier and premium status
    const { tier, isPremium } = patreonAuth.calculateTierAndPremium(membership);
    
    console.log('📊 Final status:', { tier, isPremium });
    
    // 6. Store in sessionStorage (JavaScript only, not in URL)
    const patreonData = {
      patreonId: patreonUser.id,
      tier: tier,
      isPremium: isPremium,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      email: patreonUser.attributes.email
    };

    // Create a special page that handles the data storage
    const encodedData = encodeURIComponent(JSON.stringify(patreonData));
    
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patreon Connection Success</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #1a1a1a; 
            color: white; 
          }
          .container { text-align: center; }
          .success { color: #4ade80; font-size: 24px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">🎉 Patreon erfolgreich verbunden!</div>
          <p>Tier: ${tier}</p>
          <p>Premium: ${isPremium ? 'Aktiviert' : 'Nicht aktiviert'}</p>
          <p>Weiterleitung...</p>
        </div>
        <script>
          // Store data in sessionStorage
          sessionStorage.setItem('patreon_data', '${encodedData}');
          
          // Redirect to profile
          setTimeout(() => {
            window.location.href = '${process.env.NEXT_PUBLIC_BASE_URL}/profile?patreon_success=1';
          }, 2000);
        </script>
      </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
  } catch (error) {
    console.error('❌ Patreon callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=patreon_oauth_failed&details=${encodeURIComponent(String(error))}`);
  }
}