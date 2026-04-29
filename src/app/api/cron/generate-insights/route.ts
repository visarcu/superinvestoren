// Vercel Cron: Generiert Market Insights für alle Earnings ohne Insight.
// Schedule: alle 6h (siehe vercel.json).
//
// Ablauf:
//   1. Findet Earnings der letzten 14 Tage in SecEarningsPressReleases
//   2. Filtert auf Earnings ohne aktiven MarketInsight (per LEFT JOIN)
//   3. Generiert pro Ticker Insight via insightGenerator
//   4. Speichert in MarketInsights
//
// Idempotent: bei Wiederholung skippen wenn Insight bereits existiert
// (Idempotenz-Check liegt in generateInsightFromEarnings).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInsightFromEarnings, PROMPT_VERSION } from '@/lib/insightGenerator'

export const runtime = 'nodejs'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Hole Earnings, die kürzlich gefilt wurden
  const { data: earnings, error } = await supabase
    .from('SecEarningsPressReleases')
    .select('id, ticker, period, filing_date')
    .gte('filing_date', since)
    .not('ai_summary', 'is', null) // nur mit existierender Strukturierung
    .order('filing_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!earnings?.length) {
    return NextResponse.json({ message: 'Keine Earnings in den letzten 14 Tagen', generated: 0 })
  }

  // Filter: bereits generierte Insights raus
  const earningsIds = earnings.map((e) => e.id)
  const { data: existing } = await supabase
    .from('MarketInsights')
    .select('trigger_event_id')
    .eq('trigger_type', 'earnings')
    .eq('prompt_version', PROMPT_VERSION)
    .in('trigger_event_id', earningsIds)

  const existingSet = new Set(existing?.map((r) => r.trigger_event_id) ?? [])
  const todo = earnings.filter((e) => !existingSet.has(e.id))

  console.log(`📰 Insights-Cron: ${earnings.length} earnings (last 14d), ${todo.length} to generate`)

  const results: { ticker: string; period: string; status: string; cost?: number }[] = []
  let totalCost = 0
  let generated = 0
  let failed = 0

  for (const e of todo) {
    try {
      const r = await generateInsightFromEarnings(e.id)
      results.push({ ticker: e.ticker, period: e.period, status: 'generated', cost: r.costUsd ?? 0 })
      totalCost += r.costUsd ?? 0
      generated++
      // Rate-Limit OpenAI: 400ms zwischen Calls
      await new Promise((r) => setTimeout(r, 400))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      results.push({ ticker: e.ticker, period: e.period, status: `error: ${msg}` })
      failed++
    }
  }

  return NextResponse.json({
    message: 'Insights-Cron complete',
    earningsConsidered: earnings.length,
    skipped: earnings.length - todo.length,
    generated,
    failed,
    totalCostUsd: Number(totalCost.toFixed(6)),
    results,
  })
}
