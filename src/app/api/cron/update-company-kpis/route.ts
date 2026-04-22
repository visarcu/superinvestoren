// src/app/api/cron/update-company-kpis/route.ts
// Täglicher Cron Job: lädt neue SEC 8-K Earnings Filings für alle Pilot-
// Unternehmen und extrahiert die Operating KPIs via OpenAI.
//
// Schedule in vercel.json: "0 6 * * *" (täglich 06:00 UTC)
//
// Optimierung: nur FILINGS verarbeiten, deren URL noch nicht in der DB ist.
// Bei keinen neuen Filings (Normalfall): ~5-10s pro Ticker → <60s total.
// Bei neuen Earnings: ~30-45s pro Filing (EDGAR fetch + OpenAI call).

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { PILOT_COMPANIES, processCompany, type ProcessResult } from '@/lib/edgarKpiService'

// Vercel Pro erlaubt bis 5 Min bei Cron-Jobs. Fx-level tier hängt ab.
export const maxDuration = 300 // 5 Minuten
export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function handleCron() {
  const started = Date.now()
  console.log('[EDGAR KPIs] Starting daily KPI update for all pilot companies')

  const results: ProcessResult[] = []
  const logs: string[] = []

  const tickers = Object.keys(PILOT_COMPANIES)

  for (const ticker of tickers) {
    try {
      // --limit 3 reicht für den täglichen Check: neueste ~1 Quartale
      // + ein paar Puffer falls etwas vom Vortag nachkommt
      const result = await processCompany(openai, ticker, {
        limit: 3,
        skipExistingFilings: true,
        onLog: (msg) => {
          logs.push(msg)
          console.log(msg)
        },
      })
      results.push(result)

      // Safety break: falls wir dem 5-Min-Limit nahekommen
      const elapsed = Date.now() - started
      if (elapsed > 270_000) {
        console.warn(`[EDGAR KPIs] Time budget almost exhausted (${elapsed}ms), stopping early`)
        break
      }
    } catch (err) {
      console.error(`[EDGAR KPIs] Fatal error processing ${ticker}:`, err)
      results.push({
        ticker,
        filingsFound: 0,
        filingsProcessed: 0,
        filingsSkipped: 0,
        kpisSaved: 0,
        newKpis: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      })
    }
  }

  const totalNewKpis = results.reduce((s, r) => s + r.newKpis, 0)
  const totalProcessed = results.reduce((s, r) => s + r.filingsProcessed, 0)
  const tickersWithNewData = results.filter((r) => r.newKpis > 0).map((r) => r.ticker)
  const errors = results.flatMap((r) => r.errors.map((e) => `${r.ticker}: ${e}`))

  const summary = {
    success: true,
    durationMs: Date.now() - started,
    tickersChecked: results.length,
    filingsProcessed: totalProcessed,
    newKpis: totalNewKpis,
    tickersWithNewData,
    errors,
    details: results.map((r) => ({
      ticker: r.ticker,
      filings: r.filingsProcessed,
      skipped: r.filingsSkipped,
      newKpis: r.newKpis,
      errors: r.errors.length,
    })),
  }

  console.log(
    `[EDGAR KPIs] Done: ${results.length} tickers checked, ${totalNewKpis} new KPIs saved across ${tickersWithNewData.length} tickers in ${summary.durationMs}ms`
  )

  return NextResponse.json(summary)
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCron()
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCron()
}
