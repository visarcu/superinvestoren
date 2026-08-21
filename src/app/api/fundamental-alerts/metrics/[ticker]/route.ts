// src/app/api/fundamental-alerts/metrics/[ticker]/route.ts
// Aktuelle Werte der Alert-Metriken — für die Vorbefüllung des Alert-Formulars
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetricValues } from '@/lib/fundamentalAlerts'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user }, error } = await supabaseService.auth.getUser(authHeader.split(' ')[1])
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const ticker = params.ticker.toUpperCase()
    if (!/^[A-Z0-9.\-]{1,12}$/.test(ticker)) {
      return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
    }

    const values = await fetchMetricValues(ticker)
    return NextResponse.json(
      { ticker, values },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    )
  } catch (error) {
    console.error('[FundamentalAlerts] Metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
