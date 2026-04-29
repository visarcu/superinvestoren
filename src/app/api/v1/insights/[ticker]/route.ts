// Finclue Data API v1 – Market Insights pro Aktie
// GET /api/v1/insights/{ticker}
// Source: KI-generierte deutschsprachige Premium-Analysen aus MarketInsights-DB-Tabelle.
// Werden nicht live generiert — nur ausgelesen. Generation läuft via Cron + bei Earnings-Detection.

import { NextRequest, NextResponse } from 'next/server'
import { getLatestInsight } from '@/lib/insightGenerator'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } },
) {
  const ticker = params.ticker?.toUpperCase()
  if (!ticker || !/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  try {
    const insight = await getLatestInsight(ticker)
    if (!insight) {
      return NextResponse.json(
        { ticker, insight: null, message: `Keine Market Insights für ${ticker}` },
        { status: 404, headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=3600' } },
      )
    }

    return NextResponse.json(
      {
        ticker: insight.ticker,
        insight: {
          text: insight.insightText,
          generatedAt: insight.generatedAt,
          modelUsed: insight.modelUsed,
          promptVersion: insight.promptVersion,
          triggerType: insight.triggerType,
          sourceUrl: insight.sourceUrl,
        },
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          // 30 Min Edge Cache, 6h SWR — Insights ändern sich selten (typisch 1× pro Quartal)
          'Cache-Control': 's-maxage=1800, stale-while-revalidate=21600',
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
