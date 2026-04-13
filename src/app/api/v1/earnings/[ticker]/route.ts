// Finclue Data API v1 – Earnings Press Releases & Summaries
// GET /api/v1/earnings/{ticker}
// Source: SEC EDGAR 8-K Exhibit 99.1 + AI Summaries (GPT-4o-mini)
// Beat/Miss: Berechnet aus eigener Guidance (Vorquartal → Ist-Wert)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Guidance → Beat/Miss Berechnung ────────────────────────────────────────

interface BeatMissResult {
  revenue?: {
    actual: number          // in millions
    priorGuidance: number   // midpoint of guidance range, in millions
    beatMiss: 'beat' | 'miss' | 'inline'
    diffPct: number         // e.g. +3.8 or -2.1
  }
  eps?: {
    actual: number
    priorGuidance: number
    beatMiss: 'beat' | 'miss' | 'inline'
    diffPct: number
  }
  source: 'eigene-guidance'  // Transparenz: woher kommt der Vergleich
}

function parseGuidanceValue(val: any): number | null {
  if (val === null || val === undefined) return null
  // Array = Range → Midpoint
  if (Array.isArray(val) && val.length === 2) {
    const low = Number(val[0])
    const high = Number(val[1])
    if (!isNaN(low) && !isNaN(high)) return (low + high) / 2
  }
  // Single number
  const num = Number(val)
  return isNaN(num) ? null : num
}

function calculateBeatMiss(
  allEarnings: any[]
): Map<string, BeatMissResult> {
  const results = new Map<string, BeatMissResult>()

  // Sort chronologically (oldest first) for forward-looking guidance matching
  const sorted = [...allEarnings].sort((a, b) => {
    const dateA = a.filing_date || a.filingDate || ''
    const dateB = b.filing_date || b.filingDate || ''
    return dateA.localeCompare(dateB)
  })

  // For each quarter, the PREVIOUS quarter's guidance is for THIS quarter
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const previous = sorted[i - 1]

    const prevHighlights = previous.key_highlights || previous.highlights
    const currHighlights = current.key_highlights || current.highlights
    if (!prevHighlights || !currHighlights) continue

    const period = current.period

    // Revenue: vorheriges Quartal hat Guidance für dieses Quartal
    const guidanceRevenue = parseGuidanceValue(prevHighlights.guidance_revenue)
    const actualRevenue = Number(currHighlights.revenue_reported)

    // EPS
    const guidanceEps = parseGuidanceValue(prevHighlights.guidance_eps)
    const actualEps = Number(currHighlights.eps_reported)

    const result: BeatMissResult = { source: 'eigene-guidance' }

    if (guidanceRevenue && actualRevenue && !isNaN(actualRevenue) && guidanceRevenue > 0) {
      // Sanity check: beide Werte sollten in ähnlicher Größenordnung sein
      // (verhindert Vergleich von Quartals-Guidance vs. Jahres-Actual)
      const ratio = actualRevenue / guidanceRevenue
      if (ratio > 0.3 && ratio < 3.0) {
        const diffPct = ((actualRevenue - guidanceRevenue) / guidanceRevenue) * 100
        result.revenue = {
          actual: actualRevenue,
          priorGuidance: guidanceRevenue,
          beatMiss: diffPct > 1 ? 'beat' : diffPct < -1 ? 'miss' : 'inline',
          diffPct: Math.round(diffPct * 10) / 10,
        }
      }
    }

    if (guidanceEps && actualEps && !isNaN(actualEps) && guidanceEps !== 0) {
      const diffPct = ((actualEps - guidanceEps) / Math.abs(guidanceEps)) * 100
      result.eps = {
        actual: actualEps,
        priorGuidance: guidanceEps,
        beatMiss: diffPct > 2 ? 'beat' : diffPct < -2 ? 'miss' : 'inline',
        diffPct: Math.round(diffPct * 10) / 10,
      }
    }

    if (result.revenue || result.eps) {
      results.set(period, result)
    }
  }

  return results
}

// ─── Main Route ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const { searchParams } = new URL(request.url)

  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 40)
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : null
  const includePressRelease = searchParams.get('include_text') === 'true'

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Select fields – press_release_text is large, only include if requested
    const selectFields = [
      'ticker',
      'company_name',
      'period',
      'fiscal_quarter',
      'fiscal_year',
      'filing_date',
      'period_end_date',
      'filing_url',
      'ai_summary',
      'ai_summary_model',
      'key_highlights',
      'source',
      'created_at',
      ...(includePressRelease ? ['press_release_text'] : []),
    ].join(', ')

    let query = supabase
      .from('SecEarningsPressReleases')
      .select(selectFields)
      .eq('ticker', ticker)
      .order('filing_date', { ascending: false })
      .limit(limit)

    if (year) query = query.eq('fiscal_year', year)
    if (quarter) query = query.eq('fiscal_quarter', quarter)

    const { data: rawEarnings, error } = await query

    if (error) throw error

    const earnings = rawEarnings as any[] | null
    if (!earnings || earnings.length === 0) {
      return NextResponse.json({
        ticker,
        earnings: [],
        count: 0,
        source: 'sec-edgar-8k',
        message: `Keine Earnings-Daten für ${ticker}. Daten werden aus SEC EDGAR 8-K Press Releases extrahiert.`,
      }, { status: 404 })
    }

    // ── Beat/Miss aus eigener Guidance berechnen ──────────────────────────
    const beatMissMap = calculateBeatMiss(earnings)

    // Format response
    const formattedEarnings = earnings.map((e: any) => {
      const bm = beatMissMap.get(e.period)

      return {
        period: e.period,
        fiscalQuarter: e.fiscal_quarter,
        fiscalYear: e.fiscal_year,
        filingDate: e.filing_date,
        periodEndDate: e.period_end_date,
        filingUrl: e.filing_url,
        summary: e.ai_summary || null,
        summaryModel: e.ai_summary_model || null,
        highlights: e.key_highlights || null,
        // Guidance-basiertes Beat/Miss (nur wenn berechenbar)
        beatMiss: bm || null,
        source: e.source,
        ...(includePressRelease && e.press_release_text
          ? { pressReleaseText: e.press_release_text }
          : {}),
      }
    })

    return NextResponse.json({
      ticker,
      companyName: earnings[0]?.company_name || ticker,
      earnings: formattedEarnings,
      count: formattedEarnings.length,
      source: 'sec-edgar-8k',
      beatMissMethod: 'eigene-guidance',
      beatMissExplanation: 'Beat/Miss wird berechnet aus der eigenen Prognose des Vorquartals vs. tatsächliches Ergebnis. Keine Analysten-Schätzungen.',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=86400' },
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
