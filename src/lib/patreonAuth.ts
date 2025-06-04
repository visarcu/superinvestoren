// src/lib/patreonAuth.ts
interface PatreonTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }
  
  interface PatreonUser {
    id: string;
    attributes: {
      email: string;
      first_name: string;
      last_name: string;
      full_name: string;
      image_url: string;
    };
  }
  
  interface PatreonMember {
    id: string;
    attributes: {
      currently_entitled_amount_cents: number;
      lifetime_support_cents: number;
      patron_status: string;
    };
    relationships: {
      currently_entitled_tiers: {
        data: Array<{ id: string; type: string }>;
      };
    };
  }
  
  export class PatreonAuth {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;
  
    constructor() {
      this.clientId = process.env.NEXT_PUBLIC_PATREON_CLIENT_ID!;
      this.clientSecret = process.env.PATREON_CLIENT_SECRET!;
      this.redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/patreon/callback`;
    }
  
    // OAuth Authorization URL
    getAuthUrl(): string {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        scope: 'identity campaigns',
        state: crypto.randomUUID(),
      });
  
      return `https://www.patreon.com/oauth2/authorize?${params.toString()}`;
    }
  
    // Exchange code for tokens
    async exchangeCodeForTokens(code: string): Promise<PatreonTokenResponse> {
      console.log('🔄 Exchanging code for tokens...');
      
      const response = await fetch('https://www.patreon.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
        }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange failed:', errorText);
        throw new Error(`Failed to exchange code for tokens: ${response.status}`);
      }
  
      const tokens = await response.json();
      console.log('✅ Tokens received successfully');
      return tokens;
    }
  
    // Get user data from Patreon
    async getPatreonUser(accessToken: string): Promise<PatreonUser> {
      console.log('🔄 Fetching Patreon user data...');
      
      const response = await fetch(
        'https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=email,first_name,last_name,full_name,image_url',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'FinClue/1.0'
          },
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch user data:', errorText);
        throw new Error(`Failed to fetch Patreon user: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('✅ User data received:', data.data.attributes.email);
      return data.data;
    }
  
    // Get user's membership status
    async getPatreonMembership(accessToken: string, campaignId: string): Promise<PatreonMember | null> {
      console.log('🔄 Fetching membership status...');
      
      try {
        const response = await fetch(
          `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members?fields%5Bmember%5D=currently_entitled_amount_cents,lifetime_support_cents,patron_status&include=currently_entitled_tiers`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'User-Agent': 'FinClue/1.0'
            },
          }
        );
  
        if (!response.ok) {
          console.warn('⚠️ Could not fetch membership (maybe not a patron):', response.status);
          return null;
        }
  
        const data = await response.json();
        console.log('✅ Membership data received');
        return data.data?.[0] || null;
      } catch (error) {
        console.warn('⚠️ Membership fetch error:', error);
        return null;
      }
    }
  
    // Determine tier and premium status from membership
    calculateTierAndPremium(membership: PatreonMember | null): { tier: string; isPremium: boolean } {
      if (!membership || membership.attributes.patron_status !== 'active_patron') {
        console.log('📊 User is not an active patron');
        return { tier: 'free', isPremium: false };
      }
  
      const amountCents = membership.attributes.currently_entitled_amount_cents;
      console.log('📊 Current pledge amount:', amountCents, 'cents');
      
      // Define tier thresholds (in cents)
      if (amountCents >= 500) { // $5 or more
        console.log('🌟 Premium tier detected');
        return { tier: 'premium', isPremium: true };
      } else if (amountCents >= 300) { // $3 or more
        console.log('⭐ Supporter tier detected');
        return { tier: 'supporter', isPremium: true };
      } else {
        console.log('📊 Below minimum tier threshold');
        return { tier: 'free', isPremium: false };
      }
    }
  }