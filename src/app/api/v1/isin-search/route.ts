// Finclue Data API v1 – ISIN-Resolver
// GET /api/v1/isin-search?isin=DE000A1XYZ12
// POST /api/v1/isin-search { isins: ["DE...", "US..."] }
//
// Auflösungs-Reihenfolge:
//   1. DB-Cache (isin_resolutions) — einmal aufgelöst, nie wieder API-Call
//   2. Production-Master (isinResolver.resolveISINLocally) — handkuratierte ETFs
//   3. EODHD /api/search/{isin} — primär für unbekannte ISINs
//
// Ergebnis wird in DB-Cache geschrieben, sodass jeder User-Import davon profitiert.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveISINLocally } from '@/lib/isinResolver'

interface ResolvedISIN {
  isin: string
  ticker: string
  name: string | null
  exchange: string | null
  currency: string | null
  type: string | null
  country: string | null
  source: 'cache' | 'master' | 'eodhd' | 'unknown'
}

// EODHD-Suffix → FMP-Suffix (DB nutzt FMP-Format intern, EODHD-Calls per toEodhdSymbol)
function eodhdToFmpSuffix(exchange: string): string {
  const map: Record<string, string> = {
    XETRA: 'DE', // EODHD .XETRA → FMP .DE
    LSE: 'L',
    F: 'F',
    DU: 'DU',
    BE: 'BE',
    HM: 'HM',
    HA: 'HA',
    MU: 'MU',
    PA: 'PA',
    AS: 'AS',
    MI: 'MI',
    MC: 'MC',
    BR: 'BR',
    LI: 'LI',
    VI: 'VI',
    CO: 'CP',
    HE: 'HE',
    SW: 'SW',
    HK: 'HK',
    TO: 'TO',
    ST: 'ST',
    OL: 'OL',
    PR: 'PR',
    WAR: 'WA',
    BUD: 'BD',
    JK: 'JK',
    BSE: 'BO',
    NSE: 'NS',
    US: '', // US bekommt keinen Suffix im FMP-Format
  }
  return map[exchange] ?? exchange
}

function eodhdResultToTicker(code: string, exchange: string): string {
  const fmpSuffix = eodhdToFmpSuffix(exchange)
  return fmpSuffix ? `${code}.${fmpSuffix}` : code
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function resolveSingle(isin: string): Promise<ResolvedISIN> {
  const cleanIsin = isin.trim().toUpperCase()
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(cleanIsin)) {
    return {
      isin: cleanIsin,
      ticker: '',
      name: null,
      exchange: null,
      currency: null,
      type: null,
      country: null,
      source: 'unknown',
    }
  }

  const supabase = getSupabase()

  // 1) DB-Cache
  if (supabase) {
    const { data: cached } = await supabase
      .from('isin_resolutions')
      .select('*')
      .eq('isin', cleanIsin)
      .maybeSingle()
    if (cached?.ticker) {
      return {
        isin: cleanIsin,
        ticker: cached.ticker,
        name: cached.name,
        exchange: cached.exchange,
        currency: cached.currency,
        type: cached.type,
        country: cached.country,
        source: 'cache',
      }
    }
  }

  // 2) Production-Master
  const local = resolveISINLocally(cleanIsin)
  if (local?.symbol) {
    const result: ResolvedISIN = {
      isin: cleanIsin,
      ticker: local.symbol,
      name: local.name ?? null,
      exchange: null,
      currency: null,
      type: null,
      country: null,
      source: 'master',
    }
    // In DB-Cache schreiben für nächstes Mal
    if (supabase) {
      const { error: upErr } = await supabase
        .from('isin_resolutions')
        .upsert({
          isin: cleanIsin,
          ticker: result.ticker,
          name: result.name,
          source: 'master',
        })
      if (upErr) console.error('[isin-search] master cache write failed:', upErr.message)
    }
    return result
  }

  // 3) EODHD
  const apiKey = process.env.EODHD_API_KEY
  if (apiKey) {
    try {
      const url = `https://eodhd.com/api/search/${encodeURIComponent(cleanIsin)}?api_token=${apiKey}&fmt=json`
      const res = await fetch(url, { next: { revalidate: 86400 } })
      if (res.ok) {
        const list = await res.json()
        if (Array.isArray(list) && list.length > 0) {
          // Bevorzugt: XETRA-Listing (EUR), sonst US, sonst erstes Ergebnis
          const xetra = list.find((r: any) => r.Exchange === 'XETRA')
          const us = list.find((r: any) => r.Exchange === 'US')
          const pick = xetra ?? us ?? list[0]

          const result: ResolvedISIN = {
            isin: cleanIsin,
            ticker: eodhdResultToTicker(pick.Code, pick.Exchange),
            name: pick.Name ?? null,
            exchange: pick.Exchange ?? null,
            currency: pick.Currency ?? null,
            type: pick.Type ?? null,
            country: pick.Country ?? null,
            source: 'eodhd',
          }
          if (supabase) {
            await supabase.from('isin_resolutions').upsert({
              isin: cleanIsin,
              ticker: result.ticker,
              name: result.name,
              exchange: result.exchange,
              currency: result.currency,
              type: result.type,
              country: result.country,
              source: 'eodhd',
            })
          }
          return result
        }
      }
    } catch (err) {
      console.error('[isin-search] EODHD error:', err)
    }
  }

  return {
    isin: cleanIsin,
    ticker: '',
    name: null,
    exchange: null,
    currency: null,
    type: null,
    country: null,
    source: 'unknown',
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const isin = searchParams.get('isin')
  if (!isin) {
    return NextResponse.json({ error: 'Missing isin parameter' }, { status: 400 })
  }
  const result = await resolveSingle(isin)
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const isins: string[] = Array.isArray(body.isins) ? body.isins : []
    if (isins.length === 0) {
      return NextResponse.json({ error: 'Missing isins array' }, { status: 400 })
    }
    const limited = isins.slice(0, 100) // Sanity-Limit
    // Parallel auflösen
    const results = await Promise.all(limited.map(resolveSingle))

    return NextResponse.json({
      data: results,
      count: results.length,
      requested: isins.length,
      stats: {
        cache: results.filter(r => r.source === 'cache').length,
        master: results.filter(r => r.source === 'master').length,
        eodhd: results.filter(r => r.source === 'eodhd').length,
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
