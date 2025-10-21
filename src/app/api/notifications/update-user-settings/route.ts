// src/app/api/notifications/update-user-settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, action, investor } = await request.json()
    const targetUserId = userId || 'd5bd6951-6479-4279-afd6-a019d9f6f153' // Deine User-ID

    console.log(`[Update Settings] ${action} investor ${investor} for user ${targetUserId}`)

    // Aktuelle Settings holen
    const { data: currentSettings, error: fetchError } = await supabaseService
      .from('notification_settings')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (fetchError) {
      console.error('[Update Settings] Fetch Error:', fetchError)
      return NextResponse.json({ error: 'Database error', details: fetchError }, { status: 500 })
    }

    let updatedInvestors: string[]
    
    if (currentSettings) {
      // Settings existieren bereits
      const currentInvestors = currentSettings.preferred_investors || []
      
      if (action === 'add' && !currentInvestors.includes(investor)) {
        updatedInvestors = [...currentInvestors, investor]
      } else if (action === 'remove') {
        updatedInvestors = currentInvestors.filter((inv: string) => inv !== investor)
      } else {
        updatedInvestors = currentInvestors
      }

      // Update existierende Settings
      const { data: updatedSettings, error: updateError } = await supabaseService
        .from('notification_settings')
        .update({
          preferred_investors: updatedInvestors,
          filings_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (updateError) {
        console.error('[Update Settings] Update Error:', updateError)
        return NextResponse.json({ error: 'Update failed', details: updateError }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        settings: updatedSettings
      })

    } else {
      // Neue Settings erstellen
      updatedInvestors = action === 'add' ? [investor] : []

      const { data: newSettings, error: createError } = await supabaseService
        .from('notification_settings')
        .insert({
          user_id: targetUserId,
          preferred_investors: updatedInvestors,
          filings_enabled: true,
          watchlist_enabled: false,
          watchlist_threshold_percent: 10
        })
        .select()
        .single()

      if (createError) {
        console.error('[Update Settings] Create Error:', createError)
        return NextResponse.json({ error: 'Create failed', details: createError }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        settings: newSettings
      })
    }

  } catch (error) {
    console.error('[Update Settings] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}