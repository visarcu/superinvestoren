// Finclue Data API v1 – Stock AI Analyst
// GET /api/v1/ai/stock/{ticker}
// Aggregiert ALLE eigenen Daten und generiert eine KI-Analyse
// Source: SEC XBRL + 13F + Form 4 + RSS + Finnhub + GPT-4o-mini

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// ─── Cache Check ────────────────────────────────────────────────────────────

async function getCachedAnalysis(supabase: any, ticker: string): Promise<string | null> {
  const { data } = await supabase
    .from('SecEarningsPressReleases') // Reuse table for AI cache? Or use separate
    .select('ai_summary')
    .limit(0) // Just checking structure

  // Simple in-memory cache for now
  return null
}

// ─── Data Aggregation ───────────────────────────────────────────────────────

async function aggregateStockData(ticker: string, baseUrl: string): Promise<string> {
  const results = await Promise.allSettled([
    fetch(`${baseUrl}/api/v1/financials/income-statement/${ticker}?years=3`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/financials/cash-flow/${ticker}?years=3`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/earnings/${ticker}?limit=2`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/kpis/${ticker}`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/insider-trades/${ticker}?limit=10`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/investors/stock/${ticker}`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/news/stock/${ticker}?limit=5`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/quotes/${ticker}`).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/api/v1/company/${ticker}`).then(r => r.ok ? r.json() : null),
  ])

  const [incomeR, cashflowR, earningsR, kpisR, insiderR, investorsR, newsR, quoteR, companyR] = results.map(
    r => r.status === 'fulfilled' ? r.value : null
  )

  const sections: string[] = []

  // Company Profile
  if (companyR?.name) {
    sections.push(`UNTERNEHMEN: ${companyR.name} (${ticker}), Sektor: ${companyR.sector || '?'}, Branche: ${companyR.industry || '?'}`)
  }

  // Current Price
  if (quoteR?.price) {
    sections.push(`AKTUELLER KURS: $${quoteR.price} (${quoteR.changePercent >= 0 ? '+' : ''}${quoteR.changePercent?.toFixed(2)}% heute), Marktkapitalisierung: $${quoteR.marketCap ? (quoteR.marketCap / 1e9).toFixed(1) + 'B' : '?'}`)
  }

  // Financials
  if (incomeR?.data) {
    const latest = incomeR.data[incomeR.data.length - 1]
    const prev = incomeR.data.length > 1 ? incomeR.data[incomeR.data.length - 2] : null
    if (latest) {
      const revGrowth = prev?.revenue ? ((latest.revenue - prev.revenue) / prev.revenue * 100).toFixed(1) : '?'
      const netMargin = latest.revenue ? ((latest.netIncome / latest.revenue) * 100).toFixed(1) : '?'
      const grossMargin = latest.revenue && latest.grossProfit ? ((latest.grossProfit / latest.revenue) * 100).toFixed(1) : '?'
      sections.push(`FINANZEN (${latest.period}): Umsatz $${(latest.revenue / 1e9).toFixed(1)}B (${revGrowth}% Wachstum), Nettogewinn $${(latest.netIncome / 1e9).toFixed(1)}B, EPS $${latest.eps?.toFixed(2)}, Bruttomarge ${grossMargin}%, Nettomarge ${netMargin}%`)
    }

    // 3-year trend
    const revs = incomeR.data.filter((d: any) => d.revenue).map((d: any) => `${d.period}: $${(d.revenue / 1e9).toFixed(1)}B`)
    if (revs.length > 1) sections.push(`UMSATZ-TREND: ${revs.join(' → ')}`)
  }

  // Cash Flow
  if (cashflowR?.data) {
    const latest = cashflowR.data[cashflowR.data.length - 1]
    if (latest) {
      sections.push(`CASHFLOW (${latest.period}): Op. CF $${latest.operatingCashFlow ? (latest.operatingCashFlow / 1e9).toFixed(1) + 'B' : '?'}, FCF $${latest.freeCashFlow ? (latest.freeCashFlow / 1e9).toFixed(1) + 'B' : '?'}`)
    }
  }

  // Latest Earnings
  if (earningsR?.earnings?.length > 0) {
    const e = earningsR.earnings[0]
    const h = e.highlights
    let earningsText = `LETZTES QUARTAL (${e.period}):`
    if (h?.revenue_reported) earningsText += ` Umsatz $${(h.revenue_reported / 1e3).toFixed(1)}B`
    if (h?.eps_reported) earningsText += `, EPS $${h.eps_reported}`
    if (h?.revenue_yoy_pct) earningsText += `, Umsatzwachstum ${h.revenue_yoy_pct}% YoY`
    if (h?.sentiment) earningsText += `, Sentiment: ${h.sentiment}`
    if (e.beatMiss?.revenue) earningsText += `, ${e.beatMiss.revenue.beatMiss.toUpperCase()} vs. eigene Guidance (${e.beatMiss.revenue.diffPct > 0 ? '+' : ''}${e.beatMiss.revenue.diffPct}%)`
    sections.push(earningsText)
  }

  // KPIs
  if (kpisR?.metrics) {
    const kpiTexts = Object.entries(kpisR.metrics).slice(0, 5).map(([key, m]: [string, any]) => {
      const latest = m.data?.[m.data.length - 1]
      if (!latest) return null
      return `${m.label}: ${latest.value} ${m.unit}`
    }).filter(Boolean)
    if (kpiTexts.length) sections.push(`OPERATING KPIS: ${kpiTexts.join(', ')}`)
  }

  // Insider Trades
  if (insiderR?.summary) {
    const s = insiderR.summary
    sections.push(`INSIDER-TRADES: ${s.totalBuys} Käufe ($${(s.buyVolume / 1e6).toFixed(1)}M), ${s.totalSells} Verkäufe ($${(s.sellVolume / 1e6).toFixed(1)}M), Signal: ${s.sentiment}`)
  }

  // Superinvestors
  if (investorsR?.investors?.length > 0) {
    const top = investorsR.investors.slice(0, 5).map((i: any) =>
      `${i.investor.name} (${i.valueFormatted}, ${i.activity})`
    ).join(', ')
    sections.push(`SUPERINVESTOREN (${investorsR.count}): ${top}`)
  }

  // News
  if (newsR?.articles?.length > 0) {
    const headlines = newsR.articles.slice(0, 3).map((a: any) => a.title).join('; ')
    sections.push(`AKTUELLE NEWS: ${headlines}`)
  }

  return sections.join('\n\n')
}

// ─── Main Route ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })
  }

  try {
    // Build base URL for internal API calls
    const proto = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${proto}://${host}`

    // Aggregate all data
    const context = await aggregateStockData(ticker, baseUrl)

    if (!context || context.length < 50) {
      return NextResponse.json({
        ticker,
        analysis: null,
        message: `Nicht genug Daten für eine AI-Analyse von ${ticker}`,
      }, { status: 404 })
    }

    // Generate AI analysis
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein erfahrener Aktienanalyst bei Finclue. Erstelle eine fundierte deutsche Aktienanalyse basierend auf den bereitgestellten Daten. Sei sachlich, datengetrieben und nutze NUR die bereitgestellten Zahlen.

REGELN:
- Alle Texte auf Deutsch
- NUR echte Zahlen aus den Daten verwenden
- Kein Finanzberatungshinweis nötig
- Maximal 400 Wörter
- Sei direkt und konkret, kein Fülltext

FORMAT (Markdown):

## Zusammenfassung
[3-4 Sätze: Was macht das Unternehmen, wie steht es finanziell da, was ist der Trend]

## Stärken
- [Konkret mit Zahlen]
- [Max 4 Punkte]

## Risiken
- [Konkret mit Zahlen]
- [Max 4 Punkte]

## Superinvestor-Signal
[Wer kauft/verkauft, was bedeutet das]

## Insider-Signal
[Kaufen oder verkaufen Insider, Volumen]

## Bewertung
[KGV-Einordnung, Wachstum vs. Bewertung, günstig/fair/teuer]`
        },
        {
          role: 'user',
          content: `Analysiere ${ticker} basierend auf folgenden Finclue-Daten:\n\n${context}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    })

    const analysis = completion.choices[0]?.message?.content || ''

    return NextResponse.json({
      ticker,
      analysis,
      model: 'gpt-4o-mini',
      dataPoints: context.split('\n\n').length,
      generatedAt: new Date().toISOString(),
      source: 'finclue-own-data',
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
