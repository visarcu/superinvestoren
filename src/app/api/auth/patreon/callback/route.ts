// src/app/api/auth/patreon/callback/route.ts - Produktionsreife Version
import { NextRequest, NextResponse } from 'next/server';
import { PatreonAuth } from '@/lib/patreonAuth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('❌ Patreon OAuth Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=patreon_auth_failed&details=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=no_code`);
  }

  try {
    // 1. Initialize Patreon API
    const patreonAuth = new PatreonAuth();
    
    // 2. Exchange code for tokens
    const tokens = await patreonAuth.exchangeCodeForTokens(code);

    // 3. Get Patreon user data
    const patreonUser = await patreonAuth.getPatreonUser(tokens.access_token);

    // 4. Get membership status with fallback to alternative method
    const CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID!;
    
    let membership = await patreonAuth.getPatreonMembership(tokens.access_token, CAMPAIGN_ID);
    let membershipMethod = 'primary';
    
    // Fallback to alternative method if primary fails
    if (!membership) {
      membership = await patreonAuth.getPatreonMembershipAlternative(tokens.access_token);
      membershipMethod = 'alternative';
    }

    // 5. Calculate tier and premium status
    const { tier, isPremium } = patreonAuth.calculateTierAndPremium(membership);

    // 6. Prepare data for storage
    const patreonData = {
      patreonId: patreonUser.id,
      tier: tier,
      isPremium: isPremium,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      email: patreonUser.attributes.email,
      membershipMethod: membershipMethod
    };

    // Log successful connection (keep for analytics)
    console.log(`✅ Patreon connection successful: User ${patreonUser.id}, Tier: ${tier}, Premium: ${isPremium}`);

    const encodedData = encodeURIComponent(JSON.stringify(patreonData));
    
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patreon Verbindung erfolgreich</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            color: white;
            padding: 20px;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            max-width: 400px;
          }
          .success-icon {
            font-size: 64px;
            margin-bottom: 20px;
            animation: bounce 1s ease-in-out;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #4ade80;
          }
          .subtitle {
            color: #9ca3af;
            margin-bottom: 30px;
            line-height: 1.5;
          }
          .status {
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid #22c55e;
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
          }
          .status div {
            margin: 8px 0;
          }
          .countdown {
            color: #60a5fa;
            font-size: 14px;
          }
          .skip-hint {
            color: #6b7280;
            font-size: 12px;
            margin-top: 10px;
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-20px); }
            60% { transform: translateY(-10px); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">&#x1F389;</div>
          <div class="title">Patreon erfolgreich verbunden!</div>
          <div class="subtitle">
            ${isPremium ? 'Ihre Premium-Features wurden aktiviert und stehen Ihnen sofort zur Verfügung.' : 'Ihre Verbindung wurde hergestellt. Für Premium-Features benötigen Sie eine aktive Patreon-Mitgliedschaft.'}
          </div>
          
          <div class="status">
            <div><strong>Status:</strong> ${isPremium ? '&#x2B50; Premium aktiviert' : '&#x1F4CA; Basis-Zugang'}</div>
            <div><strong>Tier:</strong> ${tier.charAt(0).toUpperCase() + tier.slice(1)}</div>
            ${patreonUser.attributes.email ? `<div><strong>Email:</strong> ${patreonUser.attributes.email}</div>` : ''}
          </div>
          
          <div class="countdown">
            Weiterleitung zur Profil-Seite in <span id="countdown">3</span> Sekunden...
          </div>
          <div class="skip-hint">
            Klicken Sie irgendwo um sofort weiterzuleiten
          </div>
        </div>
        
        <script>
          sessionStorage.setItem('patreon_data', '${encodedData}');
          
          let seconds = 3;
          const countdownEl = document.getElementById('countdown');
          
          function redirect() {
            window.location.href = '${process.env.NEXT_PUBLIC_BASE_URL}/profile?patreon_success=1&auto_refresh=1';
          }
          
          const timer = setInterval(() => {
            seconds--;
            if (countdownEl) {
              countdownEl.textContent = seconds;
            }
            
            if (seconds <= 0) {
              clearInterval(timer);
              redirect();
            }
          }, 1000);
          
          document.addEventListener('click', () => {
            clearInterval(timer);
            redirect();
          });
          
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              clearInterval(timer);
              redirect();
            }
          });
        </script>
      </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    // Log errors for debugging
    console.error('❌ Patreon callback error:', {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/profile?error=patreon_oauth_failed&details=${encodeURIComponent(String(error))}`
    );
  }
}