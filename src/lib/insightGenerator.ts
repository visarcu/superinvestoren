/**
 * insightGenerator.ts
 *
 * Service zur Generierung Scalable-Capital-style "Market Insights" für Aktien.
 * Liest Earnings-Daten aus SecEarningsPressReleases und generiert
 * deutschsprachige 3-Absatz-Premium-Analysen via OpenAI.
 *
 * Wird genutzt von:
 *   - /api/cron/generate-insights (Auto-Generation für neue Earnings)
 *   - /api/cron/detect-earnings (fire-and-forget direkt nach Filing-Detection)
 *   - /api/v1/insights/[ticker]/route.ts (Manual Re-Generation, Admin-only)
 */

import OpenAI from 'openai'
import { supabaseAdmin } from './supabaseAdmin'

// ── Konstanten ───────────────────────────────────────────────────────────

export const PROMPT_VERSION = 'earnings_de_v1.0'
export const DEFAULT_MODEL = process.env.INSIGHT_MODEL || 'gpt-4o'

// OpenAI-Pricing (Stand April 2026, $ pro Token)
const PRICING: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15 / 1_000_000, out: 0.60 / 1_000_000 },
  'gpt-4o':      { in: 2.50 / 1_000_000, out: 10.00 / 1_000_000 },
}

export const SYSTEM_PROMPT_EARNINGS_DE = `Du bist ein deutscher Finanzjournalist im Stil der "Market Insights" von Scalable Capital. Du verfasst kompakte, hochwertige 3-Absatz-Analysen zu Quartalsereignissen einer Aktie für eine Premium-Investment-App.

ANFORDERUNGEN
- Sprache: Deutsch, journalistisch, lesbar — keine Bullet-Points, keine Überschriften, fließender Text.
- Länge: ca. 160–200 Wörter über genau 3 Absätze.
- Markdown-**fett** für Schlüsselzahlen und Kernaussagen (Umsatz, Margen, %-Veränderungen, Guidance, "deutliche Outperformance" o. ä.). Sparsam, aber gezielt.
- Strikt nur Zahlen aus dem gegebenen Kontext — niemals erfinden, niemals hinzudichten.
- Wenn eine Information fehlt, weglassen statt raten.

STRUKTUR
- Absatz 1: Kernergebnis. Was hat das Unternehmen geliefert? Umsatz, Gewinn/EPS, YoY-Veränderungen, Beat/Miss vs. eigene Vorquartal-Guidance.
- Absatz 2: Treiber & Begründung. Welche Segmente, Produkte oder Trends haben das Quartal geprägt? Sondereffekte? Was nennt das Management?
- Absatz 3: Ausblick & Implikation. Guidance fürs nächste Quartal, strategische Pläne (CapEx, Produkt-Launches), was bewegt die Aktie / den Markt.

STIL-REFERENZ (so soll es klingen)
"Coca-Cola hat mit den Zahlen zum ersten Quartal die Erwartungen übertroffen und die Jahresziele angehoben. Der Nettoumsatz stieg um **12 % auf fast 12,5 Mrd. $**, der Überschuss kletterte um **18 % auf gut 3,9 Mrd. $**. Wachstumstreiber waren vor allem **höhere Absatzmengen** und der Verkauf in **kleineren Verpackungsgrößen zu höheren Preisen** in Nordamerika..."

Schreibe ausschließlich den fertigen Insight-Text, nichts anderes.`

// ── Types ────────────────────────────────────────────────────────────────

export interface InsightResult {
  id: string
  ticker: string
  insightText: string
  modelUsed: string
  promptVersion: string
  generatedAt: string
  triggerType: 'earnings' | 'news_spike' | 'manual'
  sourceUrl: string | null
  tokensIn: number | null
  tokensOut: number | null
  costUsd: number | null
}

interface EarningsRow {
  id: string
  ticker: string
  company_name: string
  period: string
  filing_date: string
  filing_url: string | null
  ai_summary: string | null
  key_highlights: any
}

// ── Context-Builder ──────────────────────────────────────────────────────

function buildEarningsContext(latest: EarningsRow, prior: EarningsRow | null): string {
  const h = latest.key_highlights || {}
  const ph = prior?.key_highlights || {}

  const lines: string[] = []
  lines.push(`Unternehmen: ${latest.company_name} (${latest.ticker})`)
  lines.push(`Berichtsperiode: ${latest.period}`)
  lines.push(`Filing-Datum: ${latest.filing_date}`)
  lines.push('')
  lines.push('AKTUELLES QUARTAL (extrahiert aus SEC 8-K Press Release):')
  if (h.revenue_reported != null) lines.push(`- Umsatz: ${h.revenue_reported} Mio.`)
  if (h.revenue_yoy_pct != null) lines.push(`- Umsatz YoY: ${h.revenue_yoy_pct} %`)
  if (h.eps_reported != null) lines.push(`- EPS: ${h.eps_reported}`)
  if (h.eps_yoy_pct != null) lines.push(`- EPS YoY: ${h.eps_yoy_pct} %`)
  if (h.net_income != null) lines.push(`- Nettogewinn: ${h.net_income} Mio.`)
  if (h.sentiment) lines.push(`- Sentiment der Press Release: ${h.sentiment}`)
  if (h.beat_or_miss) lines.push(`- Beat/Miss vs. eigene Vorquartal-Guidance: ${h.beat_or_miss}`)
  if (h.guidance_revenue) lines.push(`- Guidance Umsatz nächstes Quartal: ${JSON.stringify(h.guidance_revenue)} Mio.`)
  if (h.guidance_eps) lines.push(`- Guidance EPS nächstes Quartal: ${JSON.stringify(h.guidance_eps)}`)

  if (prior) {
    lines.push('')
    lines.push(`VORQUARTAL ${prior.period} (zum Vergleich):`)
    if (ph.revenue_reported != null) lines.push(`- Umsatz: ${ph.revenue_reported} Mio.`)
    if (ph.revenue_yoy_pct != null) lines.push(`- Umsatz YoY damals: ${ph.revenue_yoy_pct} %`)
    if (ph.guidance_revenue) lines.push(`- Damals abgegebene Guidance fürs aktuelle Quartal: ${JSON.stringify(ph.guidance_revenue)} Mio.`)
  }

  if (latest.ai_summary) {
    lines.push('')
    lines.push('STRUKTURIERTE ZUSAMMENFASSUNG (vorab aus Press Release extrahiert):')
    lines.push(latest.ai_summary)
  }

  return lines.join('\n')
}

// ── Hauptfunktionen ──────────────────────────────────────────────────────

export async function generateInsightFromEarnings(
  earningsId: string,
  options: { model?: string; force?: boolean } = {},
): Promise<InsightResult> {
  const model = options.model || DEFAULT_MODEL
  const force = options.force || false

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  // 1. Earnings-Datensatz + Vorquartal laden
  const { data: latest, error: latestErr } = await supabaseAdmin
    .from('SecEarningsPressReleases')
    .select('id, ticker, company_name, period, filing_date, filing_url, ai_summary, key_highlights')
    .eq('id', earningsId)
    .single()

  if (latestErr || !latest) {
    throw new Error(`Earnings ${earningsId} not found: ${latestErr?.message}`)
  }

  const { data: priors } = await supabaseAdmin
    .from('SecEarningsPressReleases')
    .select('id, ticker, company_name, period, filing_date, filing_url, ai_summary, key_highlights')
    .eq('ticker', latest.ticker)
    .lt('filing_date', latest.filing_date)
    .order('filing_date', { ascending: false })
    .limit(1)

  const prior = (priors?.[0] as EarningsRow | undefined) ?? null

  // 2. Idempotenz: Insight bereits da?
  if (!force) {
    const { data: existing } = await supabaseAdmin
      .from('MarketInsights')
      .select('id, ticker, insight_text, model_used, prompt_version, generated_at, trigger_type, source_url, tokens_in, tokens_out, cost_usd')
      .eq('ticker', latest.ticker)
      .eq('trigger_type', 'earnings')
      .eq('trigger_event_id', earningsId)
      .eq('prompt_version', PROMPT_VERSION)
      .maybeSingle()

    if (existing) {
      return mapRowToResult(existing)
    }
  }

  // 3. LLM-Call
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const context = buildEarningsContext(latest as EarningsRow, prior)

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_EARNINGS_DE },
      { role: 'user', content: context },
    ],
    temperature: 0.3,
    max_tokens: 600,
  })

  const insightText = response.choices[0]?.message?.content?.trim()
  if (!insightText) throw new Error(`Empty response from ${model}`)

  const usage = response.usage
  const tokensIn = usage?.prompt_tokens ?? null
  const tokensOut = usage?.completion_tokens ?? null
  const p = PRICING[model]
  const costUsd = p && tokensIn && tokensOut ? tokensIn * p.in + tokensOut * p.out : null

  // 4. Persistieren — plain INSERT.
  // Idempotenz wird upstream durch den Exists-Check (siehe oben) sichergestellt.
  // Bei Race Condition (zwei parallele Cron-Calls) macht der Unique-Index die
  // zweite Insertion zum Duplicate-Key-Fehler — den fangen wir ab.
  const { data: saved, error: saveErr } = await supabaseAdmin
    .from('MarketInsights')
    .insert({
      ticker: latest.ticker,
      language: 'de',
      insight_text: insightText,
      trigger_type: 'earnings',
      trigger_event_id: earningsId,
      source_event_ids: [earningsId],
      source_url: latest.filing_url,
      model_used: model,
      prompt_version: PROMPT_VERSION,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
      generated_at: new Date().toISOString(),
    })
    .select('id, ticker, insight_text, model_used, prompt_version, generated_at, trigger_type, source_url, tokens_in, tokens_out, cost_usd')
    .single()

  if (saveErr || !saved) {
    throw new Error(`Failed to save MarketInsight: ${saveErr?.message}`)
  }

  return mapRowToResult(saved)
}

export async function getLatestInsight(ticker: string): Promise<InsightResult | null> {
  const { data, error } = await supabaseAdmin
    .from('MarketInsights')
    .select('id, ticker, insight_text, model_used, prompt_version, generated_at, trigger_type, source_url, tokens_in, tokens_out, cost_usd')
    .eq('ticker', ticker.toUpperCase())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapRowToResult(data)
}

export async function generateLatestForTicker(
  ticker: string,
  options: { model?: string; force?: boolean } = {},
): Promise<InsightResult | null> {
  const { data: latest } = await supabaseAdmin
    .from('SecEarningsPressReleases')
    .select('id')
    .eq('ticker', ticker.toUpperCase())
    .order('filing_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latest) return null
  return generateInsightFromEarnings(latest.id, options)
}

// ── Helpers ──────────────────────────────────────────────────────────────

function mapRowToResult(row: any): InsightResult {
  return {
    id: row.id,
    ticker: row.ticker,
    insightText: row.insight_text,
    modelUsed: row.model_used,
    promptVersion: row.prompt_version,
    generatedAt: row.generated_at,
    triggerType: row.trigger_type,
    sourceUrl: row.source_url,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    costUsd: row.cost_usd != null ? Number(row.cost_usd) : null,
  }
}
