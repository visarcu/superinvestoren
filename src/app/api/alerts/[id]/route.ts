// src/app/api/alerts/[id]/route.ts
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

// DELETE /api/alerts/[id] - Delete an alert (must belong to authenticated user)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = params

    // Delete only if alert belongs to user
    const { error, count } = await supabaseService
      .from('price_alerts')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Alerts] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Alerts] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
