// Finclue Data API v1 – ISIN-Resolver
// GET /api/v1/isin-search?isin=DE000A1XYZ12
// POST /api/v1/isin-search { isins: ["DE...", "US..."] }
//
// Auflösungs-Reihenfolge:
//   1. DB-Cache (isin_resolutions) — einmal aufgelöst, nie wieder API-Call
//   2. Production-Master (isinResolver.resolveISINLocally) — handkuratierte ETFs
//   3. FMP-Suche per ISIN (alle Notierungen), sonst per Name aus dem Import
//
// Ergebnis wird in DB-Cache geschrieben, sodass jeder User-Import davon profitiert.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveISINLocally } from '@/lib/isinResolver'
import { stocks } from '@/data/stocks'
import { searchFmpByIsin, searchFmpByQuery, type FmpListing } from '@/lib/marketData/providers/fmpSearch'

interface ResolvedISIN {
  isin: string
  ticker: string
  name: string | null
  exchange: string | null
  currency: string | null
  type: string | null
  country: string | null
  source: 'cache' | 'master' | 'fmp' | 'unknown'
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// CUSIP-Map aus stocks.ts (DE/UK/US/JP — alle Aktien mit CUSIP-Feld).
// CUSIP = Zeichen 2-10 einer ISIN (9 Zeichen nach dem Ländercode, vor der
// Prüfziffer). Wird hier einmal beim ersten Request gebaut.
let _cusipMap: Map<string, { ticker: string; name: string }> | null = null
function getCusipMap() {
  if (_cusipMap) return _cusipMap
  _cusipMap = new Map()
  for (const s of stocks) {
    if (s.cusip) {
      _cusipMap.set(s.cusip.toUpperCase(), { ticker: s.ticker, name: s.name })
    }
  }
  return _cusipMap
}

function cusipFromIsin(isin: string): string | null {
  if (isin.length !== 12) return null
  return isin.substring(2, 11).toUpperCase()
}

async function resolveSingle(
  isin: string,
  hintName?: string
): Promise<ResolvedISIN> {
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

  // 2a) Production-Master (ETFs: etfMaster + xetraETFsComplete)
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

  // 2b) Aktien-Master (stocks.ts mit CUSIP) — für alle Aktien mit
  // bekannter CUSIP (US/DE/UK/JP). Deckt die meisten populären Aktien ab
  // und spart FMP-Calls.
  const cusip = cusipFromIsin(cleanIsin)
  if (cusip) {
    const stockMatch = getCusipMap().get(cusip)
    if (stockMatch) {
      const result: ResolvedISIN = {
        isin: cleanIsin,
        ticker: stockMatch.ticker,
        name: stockMatch.name,
        exchange: null,
        currency: null,
        type: 'Common Stock',
        country: cleanIsin.slice(0, 2),
        source: 'master',
      }
      if (supabase) {
        await supabase.from('isin_resolutions').upsert({
          isin: cleanIsin,
          ticker: result.ticker,
          name: result.name,
          type: 'Common Stock',
          country: result.country,
          source: 'master',
        })
      }
      return result
    }
  }

  // 3) FMP — zuerst Direktsuche per ISIN, dann Name-Fallback
  const direct = await searchFmpByIsin(cleanIsin)
  const pick = pickBestMatch(direct, cleanIsin)
  if (pick) {
    return await persistAndReturn(cleanIsin, pick, supabase)
  }

  // 3b) Name-Fallback: wenn CSV-Importer einen Namen mitgibt
  // (z.B. "Unilever", "Vonovia"), suche danach bei FMP
  if (hintName && hintName.trim().length >= 3) {
    const cleanedName = cleanNameForSearch(hintName)
    if (cleanedName) {
      const byName = await searchFmpByQuery(cleanedName)
      const isinCountry = cleanIsin.slice(0, 2)
      const pickByName = pickBestMatchByName(byName, isinCountry, cleanedName)
      if (pickByName) {
        return await persistAndReturn(cleanIsin, pickByName, supabase)
      }
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

// Name für die FMP-Suche vorbereiten: Corporate-Suffixes und Klammer-Zusätze
// rausstreichen, damit "Unilever" statt "Unilever (A)" gesucht wird.
function cleanNameForSearch(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '') // Klammer-Zusätze
    .replace(/\s+(AG|SE|NV|PLC|LTD|LIMITED|INC|CORP|CORPORATION|CO|GROUP|GRP|HOLDINGS|HOLDING|TRUST)\b.*$/i, '')
    .replace(/[-_,.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// FMP führt Börsen nicht in unserer Schreibweise; der Code kommt aus dem
// Ticker-Suffix (VOD.L → LSE, SAP.DE → XETRA, AAPL → US).

// Bei ISIN-Direktsuche: Heimatbörse (DE/US/GB) > Xetra > erste handelbare Notierung.
// Xetra vor fremden Heimatbörsen, weil deutsche Broker dort in EUR abrechnen.
function pickBestMatch(list: FmpListing[], isin: string): FmpListing | null {
  if (!list || list.length === 0) return null
  const country = isin.slice(0, 2)
  const homeExchange =
    country === 'DE' ? 'XETRA' : country === 'US' ? 'US' : country === 'GB' ? 'LSE' : null
  const matchingIsin = list.filter(r => r.isin === isin)
  const pool = matchingIsin.length > 0 ? matchingIsin : list
  for (const exchange of [homeExchange, 'XETRA']) {
    const byExchange = exchange && pool.find(r => r.exchange === exchange && r.activelyTrading && !r.otc)
    if (byExchange) return byExchange
  }
  // searchFmpByIsin sortiert handelbare und Nicht-OTC-Notierungen nach vorn.
  return pool[0]
}

// Bei Name-Suche: Match bevorzugt nach Country (aus ISIN-Prefix)
function pickBestMatchByName(
  list: FmpListing[],
  isinCountry: string,
  cleanedName: string
): FmpListing | null {
  if (!list || list.length === 0) return null
  const lowerQuery = cleanedName.toLowerCase()
  // OTC-Zweitlinien (ADRs, Pink Sheets) sind nie die Notierung aus dem Depot
  const candidates = list.filter(r => !r.otc && r.exchange)
  if (candidates.length === 0) return null

  // 1) passender Country aus ISIN-Prefix
  const countryMap: Record<string, string[]> = {
    DE: ['XETRA', 'F', 'DU', 'MU', 'HM', 'HA', 'BE', 'MI'],
    GB: ['LSE'],
    US: ['US'],
    IE: ['XETRA', 'LSE', 'US'], // IE-Fonds werden häufig multi-listed
    LU: ['XETRA', 'LSE'],
    FR: ['PA'],
    NL: ['AS'],
    CH: ['SW'],
  }
  const preferredExchanges = countryMap[isinCountry] ?? []

  for (const exch of preferredExchanges) {
    const found = candidates.find(r => r.exchange === exch)
    if (found) return found
  }

  // 2) Name-Start-Match als Sanity-Check
  const nameMatch = candidates.find(r => {
    const n = (r.name || '').toLowerCase()
    return n.startsWith(lowerQuery) || lowerQuery.startsWith(n.split(' ')[0])
  })
  if (nameMatch) return nameMatch

  return candidates[0]
}

async function persistAndReturn(
  isin: string,
  pick: FmpListing,
  supabase: ReturnType<typeof getSupabase>
): Promise<ResolvedISIN> {
  const result: ResolvedISIN = {
    isin,
    // FMP-Schreibweise = unser internes Ticker-Format (SAP.DE, VOD.L, AAPL)
    ticker: pick.symbol,
    name: pick.name ?? null,
    exchange: pick.exchange,
    currency: pick.currency,
    type: pick.type === 'unknown' ? null : pick.type,
    country: isin.slice(0, 2),
    source: 'fmp',
  }
  if (supabase) {
    await supabase.from('isin_resolutions').upsert({
      isin,
      ticker: result.ticker,
      name: result.name,
      exchange: result.exchange,
      currency: result.currency,
      type: result.type,
      country: result.country,
      source: 'fmp',
    })
  }
  return result
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
    // Zwei Eingabeformate unterstützen:
    //  1) { isins: [...] } — wie bisher
    //  2) { pairs: [{ isin, name }] } — mit optionalem Name für den Such-Fallback
    const isins: string[] = Array.isArray(body.isins) ? body.isins : []
    const pairs: { isin: string; name?: string }[] = Array.isArray(body.pairs)
      ? body.pairs
      : isins.map(isin => ({ isin }))
    if (pairs.length === 0) {
      return NextResponse.json({ error: 'Missing isins array' }, { status: 400 })
    }
    const limited = pairs.slice(0, 100)
    // Parallel auflösen
    const results = await Promise.all(
      limited.map(p => resolveSingle(p.isin, p.name))
    )

    return NextResponse.json({
      data: results,
      count: results.length,
      requested: isins.length,
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
