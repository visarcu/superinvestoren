// src/app/api/portfolio-history/route.ts
// Anmeldung und Premium-Status prüfen, gerechnet wird in lib/portfolio/history.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasPremiumAccess, PREMIUM_PROFILE_SELECT } from '@/lib/premiumAccess'
import { computePortfolioHistory, type PortfolioHistoryInput } from '@/lib/portfolio/history'

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Auth: die Route liest Transaktionen zu übergebenen Portfolio-IDs —
    // ohne Login-Check könnte jeder mit erratenen UUIDs fremde Depots abfragen.
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Premium-Status (für die Risiko-Kennzahlen — Chart/Benchmarks bleiben frei)
    const { data: premiumProfile } = await supabase
      .from('profiles')
      .select(PREMIUM_PROFILE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle()

    const input = (await request.json()) as PortfolioHistoryInput
    const result = await computePortfolioHistory({ id: user.id, isPremium: hasPremiumAccess(premiumProfile) }, input)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Portfolio-History API Fehler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Portfolio-Historie', success: false },
      { status: 500 }
    )
  }
}
