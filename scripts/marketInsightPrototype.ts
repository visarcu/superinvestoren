/**
 * marketInsightPrototype.ts
 *
 * Prototyp für Scalable-Capital-style "Market Insights" auf Aktien-Detailseiten.
 * Liest die latest Earnings aus der DB (SecEarningsPressReleases) und generiert
 * eine 3-Absatz-Premium-Analyse via OpenAI – einmal mit gpt-4o-mini, einmal mit
 * gpt-4o, für direkten Qualitäts- und Kosten-Vergleich.
 *
 * Usage:
 *   npx tsx scripts/marketInsightPrototype.ts AMZN
 *   npx tsx scripts/marketInsightPrototype.ts NVDA
 *   npx tsx scripts/marketInsightPrototype.ts SPOT
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Worktree-Setup: .env.local liegt im Hauptrepo, nicht im Worktree.
// Erst lokal versuchen, dann zum Hauptrepo hochwandern.
const envCandidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../../.env.local'),
  path.resolve(process.cwd(), '../../../../.env.local'),
  '/Users/visar/Projects/superinvestoren/.env.local',
]
for (const p of envCandidates) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Prompt-Engineering ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Du bist ein deutscher Finanzjournalist im Stil der "Market Insights" von Scalable Capital. Du verfasst kompakte, hochwertige 3-Absatz-Analysen zu Quartalsereignissen einer Aktie für eine Premium-Investment-App.

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

interface EarningsRow {
  ticker: string
  company_name: string
  period: string
  filing_date: string
  ai_summary: string | null
  key_highlights: any
}

function buildContext(latest: EarningsRow, prior: EarningsRow | null): string {
  const h = latest.key_highlights || {}
  const ph = prior?.key_highlights || {}

  const lines: string[] = []
  lines.push(`Unternehmen: ${latest.company_name} (${latest.ticker})`)
  lines.push(`Berichtsperiode: ${latest.period}`)
  lines.push(`Filing-Datum: ${latest.filing_date}`)
  lines.push('')
  lines.push('AKTUELLES QUARTAL (aus SEC 8-K Press Release):')
  if (h.revenue_reported != null) lines.push(`- Umsatz: ${h.revenue_reported} Mio. (Einheit: USD bzw. lokale Konzernwährung)`)
  if (h.revenue_yoy_pct != null) lines.push(`- Umsatz YoY: ${h.revenue_yoy_pct} %`)
  if (h.eps_reported != null) lines.push(`- EPS: ${h.eps_reported}`)
  if (h.eps_yoy_pct != null) lines.push(`- EPS YoY: ${h.eps_yoy_pct} %`)
  if (h.net_income != null) lines.push(`- Nettogewinn: ${h.net_income} Mio.`)
  if (h.sentiment) lines.push(`- Sentiment: ${h.sentiment}`)
  if (h.beat_or_miss) lines.push(`- Beat/Miss vs. eigene Vorquartal-Guidance: ${h.beat_or_miss}`)
  if (h.guidance_revenue) lines.push(`- Guidance Umsatz nächstes Quartal: ${JSON.stringify(h.guidance_revenue)} Mio.`)
  if (h.guidance_eps) lines.push(`- Guidance EPS nächstes Quartal: ${h.guidance_eps}`)

  if (prior) {
    lines.push('')
    lines.push(`VORQUARTAL ${prior.period} (zum Vergleich):`)
    if (ph.revenue_reported != null) lines.push(`- Umsatz: ${ph.revenue_reported} Mio.`)
    if (ph.revenue_yoy_pct != null) lines.push(`- Umsatz YoY damals: ${ph.revenue_yoy_pct} %`)
    if (ph.guidance_revenue) lines.push(`- Damals abgegebene Guidance fürs aktuelle Quartal: ${JSON.stringify(ph.guidance_revenue)} Mio.`)
  }

  if (latest.ai_summary) {
    lines.push('')
    lines.push('BESTEHENDE STRUKTURIERTE ZUSAMMENFASSUNG (aus SEC-8K-Press-Release-Extraktion):')
    lines.push(latest.ai_summary)
  }

  return lines.join('\n')
}

async function generateInsight(model: string, context: string) {
  const t0 = Date.now()
  const res = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: context },
    ],
    temperature: 0.3,
    max_tokens: 600,
  })
  const ms = Date.now() - t0
  const text = res.choices[0]?.message?.content?.trim() || ''
  const usage = res.usage!

  // OpenAI-Pricing (Stand April 2026)
  const pricing: Record<string, { in: number; out: number }> = {
    'gpt-4o-mini': { in: 0.15 / 1_000_000, out: 0.60 / 1_000_000 },
    'gpt-4o': { in: 2.50 / 1_000_000, out: 10.00 / 1_000_000 },
  }
  const p = pricing[model]
  const cost = p ? usage.prompt_tokens * p.in + usage.completion_tokens * p.out : 0

  return { text, ms, usage, cost }
}

async function main() {
  const ticker = (process.argv[2] || 'AMZN').toUpperCase()

  console.log(`\n📊 Market Insight Prototype – ${ticker}\n${'─'.repeat(60)}`)

  const { data, error } = await supabase
    .from('SecEarningsPressReleases')
    .select('ticker, company_name, period, filing_date, ai_summary, key_highlights')
    .eq('ticker', ticker)
    .order('filing_date', { ascending: false })
    .limit(2)

  if (error || !data?.length) {
    console.error(`❌ Keine Earnings für ${ticker} in DB. Bekannt sind aktuell: AMZN, NVDA, SPOT, AAPL, MSFT, GOOGL, META, TSLA, ...`)
    process.exit(1)
  }

  const [latest, prior] = data as EarningsRow[]
  console.log(`✓ Latest: ${latest.period} (Filing ${latest.filing_date})`)
  if (prior) console.log(`✓ Prior:  ${prior.period} (Filing ${prior.filing_date})`)

  const context = buildContext(latest, prior || null)
  console.log(`\n📋 Kontext-Länge: ${context.length} Zeichen / ~${Math.round(context.length / 4)} Tokens\n`)

  for (const model of ['gpt-4o-mini', 'gpt-4o']) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`▶  MODELL: ${model}`)
    console.log('═'.repeat(60))
    try {
      const r = await generateInsight(model, context)
      console.log(r.text)
      console.log(`\n--- Stats ---`)
      console.log(`Tokens: ${r.usage.prompt_tokens} in / ${r.usage.completion_tokens} out`)
      console.log(`Latenz: ${r.ms} ms`)
      console.log(`Kosten: $${r.cost.toFixed(6)} (≈ ${(r.cost * 100).toFixed(4)} ¢)`)
    } catch (e: any) {
      console.error(`❌ ${model}:`, e.message)
    }
  }

  console.log('\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
