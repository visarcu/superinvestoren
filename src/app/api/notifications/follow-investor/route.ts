// src/app/api/notifications/follow-investor/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ Service Role Client nur für Backend-Operationen
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // ✅ Session Token aus Authorization Header extrahieren
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { investorSlug, action } = await request.json()

    // ⚠️ PREMIUM CHECK: Following investors is a Premium feature
    if (action === 'follow') {
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('is_premium')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.is_premium) {
        return NextResponse.json({
          error: 'Premium required',
          message: 'Investoren folgen ist ein Premium Feature'
        }, { status: 403 })
      }
    }
    
    if (!investorSlug || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // ✅ Service Role Client für DB-Operationen verwenden
    let { data: settings, error: fetchError } = await supabaseService
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching settings:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Falls keine Settings existieren, erstelle Default-Settings
    if (!settings) {
      const { data: newSettings, error: createError } = await supabaseService
        .from('notification_settings')
        .insert({
          user_id: user.id,
          watchlist_enabled: true,
          watchlist_threshold_percent: 15,
          filings_enabled: true,
          preferred_investors: action === 'follow' ? [investorSlug] : [],
          email_frequency: 'immediate'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating settings:', createError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        isFollowing: action === 'follow',
        followedInvestors: newSettings.preferred_investors || []
      })
    }

    // Preferred investors array updaten
    const currentInvestors = settings.preferred_investors || []
    let updatedInvestors: string[]

    if (action === 'follow') {
      // Hinzufügen falls nicht schon vorhanden
      updatedInvestors = currentInvestors.includes(investorSlug) 
        ? currentInvestors 
        : [...currentInvestors, investorSlug]
    } else {
      // Entfernen
      updatedInvestors = currentInvestors.filter((inv: string) => inv !== investorSlug)
    }

    // Settings updaten
    const { data: updatedSettings, error: updateError } = await supabaseService
      .from('notification_settings')
      .update({
        preferred_investors: updatedInvestors,
        filings_enabled: updatedInvestors.length > 0, // Auto-enable wenn Investoren gefolgt werden
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating settings:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      isFollowing: updatedInvestors.includes(investorSlug),
      followedInvestors: updatedInvestors
    })

  } catch (error) {
    console.error('Follow investor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}