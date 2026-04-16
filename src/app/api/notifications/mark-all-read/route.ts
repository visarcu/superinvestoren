// src/app/api/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/notifications/mark-all-read - Mark all as read
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // Verify JWT token (using anon client to validate user)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Use service role for the update (bypasses RLS)
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .select('id')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updatedCount: notifications?.length || 0
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}