// GET /api/feed – persönlicher "Für dich"-Feed für eingeloggte Nutzer.
// Authentifiziert per Supabase-Session-Token (Authorization: Bearer …).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildPersonalFeed } from '@/lib/personalFeed'
import { countedDepots } from '@/lib/sampleDepotShared'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice('Bearer '.length))
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [settingsRes, watchlistRes, portfoliosRes] = await Promise.all([
      supabaseAdmin.from('notification_settings').select('preferred_investors').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('watchlists').select('ticker').eq('user_id', user.id),
      supabaseAdmin.from('portfolios').select('id, broker_name').eq('user_id', user.id),
    ])

    const portfolioIds = countedDepots(portfoliosRes.data ?? []).map(p => p.id)
    const holdingsRes = portfolioIds.length
      ? await supabaseAdmin.from('portfolio_holdings').select('symbol').in('portfolio_id', portfolioIds)
      : { data: [] as { symbol: string | null }[] }

    const followedSlugs: string[] = Array.isArray(settingsRes.data?.preferred_investors)
      ? settingsRes.data.preferred_investors.filter((s: unknown): s is string => typeof s === 'string')
      : []
    const tickers = [
      ...(watchlistRes.data ?? []).map(w => w.ticker as string | null),
      ...(holdingsRes.data ?? []).map(h => h.symbol),
    ].filter((t): t is string => !!t && /^[A-Za-z0-9.\-]{1,15}$/.test(t) && t.toUpperCase() !== 'CASH')

    const feed = await buildPersonalFeed({ followedSlugs, tickers })
    return NextResponse.json(feed, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[feed] Fehler beim Erstellen des Feeds:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Feed konnte nicht geladen werden' }, { status: 500 })
  }
}
