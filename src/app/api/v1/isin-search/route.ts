// Finclue Data API v1 – ISIN-Resolver
// GET /api/v1/isin-search?isin=DE000A1XYZ12
// POST /api/v1/isin-search { isins: ["DE...", "US..."] }
// Header: Authorization: Bearer <Supabase access token>
//
// Auflösung und Speicherregeln: src/lib/isinSearch.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveIsin, resolveIsins, type IsinQuery } from '@/lib/isinSearch'

// Jede ISIN kostet bis zu zwei FMP-Suchen
const MAX_ITEMS = 100

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Auth: Die Route schreibt mit dem Service-Schlüssel in den ISIN-Cache aller
// Nutzer und verbraucht FMP-Kontingent. Sie war offen.
async function authorize(
  request: NextRequest
): Promise<{ supabase: SupabaseClient } | { denied: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  const supabase = getSupabase()
  if (!supabase) {
    return { denied: NextResponse.json({ error: 'Database not configured' }, { status: 500 }) }
  }
  if (!authHeader?.startsWith('Bearer ')) {
    return { denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
  if (authError || !user) {
    return { denied: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
  }
  return { supabase }
}

/** Nur Einträge mit ISIN. Namen, die kein Text sind, fallen weg. */
function readQueries(body: any): IsinQuery[] {
  // Zwei Eingabeformate unterstützen:
  //  1) { isins: [...] }, wie bisher
  //  2) { pairs: [{ isin, name }] }, mit optionalem Name für den Such-Fallback
  const raw: any[] = Array.isArray(body?.pairs)
    ? body.pairs
    : Array.isArray(body?.isins)
      ? body.isins.map((isin: unknown) => ({ isin }))
      : []
  return raw
    .filter(p => typeof p?.isin === 'string')
    .map(p => ({ isin: p.isin, name: typeof p.name === 'string' ? p.name : undefined }))
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request)
  if ('denied' in auth) return auth.denied

  const { searchParams } = new URL(request.url)
  const isin = searchParams.get('isin')
  if (!isin) {
    return NextResponse.json({ error: 'Missing isin parameter' }, { status: 400 })
  }
  const result = await resolveIsin(auth.supabase, { isin })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request)
  if ('denied' in auth) return auth.denied

  try {
    const queries = readQueries(await request.json())
    if (queries.length === 0) {
      return NextResponse.json({ error: 'Missing isins array' }, { status: 400 })
    }
    const results = await resolveIsins(auth.supabase, queries.slice(0, MAX_ITEMS))

    return NextResponse.json({
      data: results,
      count: results.length,
      requested: queries.length,
      stats: {
        cache: results.filter(r => r.source === 'cache').length,
        master: results.filter(r => r.source === 'master').length,
        fmp: results.filter(r => r.source === 'fmp').length,
        unknown: results.filter(r => r.source === 'unknown').length,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
