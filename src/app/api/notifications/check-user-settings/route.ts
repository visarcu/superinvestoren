// src/app/api/notifications/check-user-settings/route.ts
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

    const { userId } = await request.json()
    const targetUserId = userId || 'd5bd6951-6479-4279-afd6-a019d9f6f153' // Deine User-ID

    console.log(`[Check Settings] Checking settings for user ${targetUserId}`)

    // Aktuelle Notification Settings holen
    const { data: settings, error: settingsError } = await supabaseService
      .from('notification_settings')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (settingsError) {
      console.error('[Check Settings] Settings Error:', settingsError)
      return NextResponse.json({ error: 'Database error', details: settingsError }, { status: 500 })
    }

    // User Email holen
    const { data: { user }, error: userError } = await supabaseService.auth.admin.getUserById(targetUserId)
    
    if (userError) {
      console.error('[Check Settings] User Error:', userError)
      return NextResponse.json({ error: 'User lookup error', details: userError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      userEmail: user?.email,
      settings: settings || null,
      hasSpierSubscribed: settings?.preferred_investors?.includes('spier') || false,
      filingsEnabled: settings?.filings_enabled || false
    })

  } catch (error) {
    console.error('[Check Settings] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}