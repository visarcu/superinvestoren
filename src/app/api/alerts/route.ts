// src/app/api/alerts/route.ts
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

// GET /api/alerts - Get all active alerts for the authenticated user
export async function GET(request: NextRequest) {
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

    const { data: alerts, error } = await supabaseService
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Alerts] Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ alerts })

  } catch (error) {
    console.error('[Alerts] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/alerts - Create a new price alert
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { symbol, condition, targetPrice } = body

    if (!symbol || !condition || targetPrice === undefined) {
      return NextResponse.json({ error: 'Missing required fields: symbol, condition, targetPrice' }, { status: 400 })
    }

    if (!['above', 'below'].includes(condition)) {
      return NextResponse.json({ error: 'condition must be "above" or "below"' }, { status: 400 })
    }

    const numericPrice = parseFloat(targetPrice)
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json({ error: 'targetPrice must be a positive number' }, { status: 400 })
    }

    const { data: alert, error } = await supabaseService
      .from('price_alerts')
      .insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        condition,
        target_price: numericPrice,
        active: true,
        triggered: false
      })
      .select()
      .single()

    if (error) {
      console.error('[Alerts] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }

    return NextResponse.json({ alert }, { status: 201 })

  } catch (error) {
    console.error('[Alerts] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
