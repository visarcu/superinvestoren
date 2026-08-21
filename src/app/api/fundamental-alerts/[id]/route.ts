// src/app/api/fundamental-alerts/[id]/route.ts
// PATCH: aktiv/inaktiv schalten · DELETE: Alert löschen
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseService.auth.getUser(token)
  return error ? null : user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'active (boolean) erwartet' }, { status: 400 })
    }

    // Beim Reaktivieren Zustand zurücksetzen — der nächste Cron-Lauf armiert
    // neu, ohne sofort für einen alten Zustand zu benachrichtigen
    const update: Record<string, unknown> = {
      active: body.active,
      updated_at: new Date().toISOString(),
    }
    if (body.active) {
      update.last_state = null
      update.last_event_marker = null
    }

    const { data: alert, error } = await supabaseService
      .from('fundamental_alerts')
      .update(update)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !alert) {
      return NextResponse.json({ error: 'Alert nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ alert })
  } catch (error) {
    console.error('[FundamentalAlerts] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabaseService
      .from('fundamental_alerts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[FundamentalAlerts] Delete error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[FundamentalAlerts] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
