// src/lib/news/recapGenerator.ts
// Morgen- und Abendbericht (Fey-Style) aus den relevantesten Artikeln.
// Schreibt Claude. Indexbewegungen kommen ausschließlich aus echten Kursen mit
// Zeitstempel, damit an Feiertagen oder vor Handelsbeginn nichts erfunden wird
// (Thanksgiving 2026: gpt-4o-mini meldete einen S&P 500 „unter Druck“, die
// US-Börsen waren geschlossen).

import type Anthropic from '@anthropic-ai/sdk'
import { ProcessedArticle } from './newsProcessor'
import { getAnthropicClient } from '../ai/client'
import { withoutDashes } from '../ai/webSearch'
import { getQuotes } from '../marketData/quoteService'

const RECAP_MODEL = 'claude-sonnet-5-5'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewsRecap {
  type: 'morning' | 'evening'
  contentDe: string
  contentEn: string | null
  tickers: string[]
  articleCount: number
}

// ─── Kurse als Faktenbasis ───────────────────────────────────────────────────

const INDICES = [
  { symbol: '^GSPC', label: 'S&P 500', timeZone: 'America/New_York' },
  { symbol: '^IXIC', label: 'Nasdaq Composite', timeZone: 'America/New_York' },
  { symbol: '^DJI', label: 'Dow Jones', timeZone: 'America/New_York' },
  { symbol: '^GDAXI', label: 'DAX', timeZone: 'Europe/Berlin' },
] as const

function dayKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone })
}

/** Eine Zeile je Index mit Veränderung und Stand. Leer, wenn keine Kurse da sind. */
async function marketFacts(now: Date): Promise<string> {
  try {
    const quotes = await getQuotes(INDICES.map(i => i.symbol))
    const lines: string[] = []
    for (const index of INDICES) {
      const quote = quotes.get(index.symbol)
      const seconds = Number(quote?.raw?.timestamp)
      if (!quote || !Number.isFinite(quote.changePercent) || !Number.isFinite(seconds) || seconds <= 0) continue
      const at = new Date(seconds * 1000)
      const tradedToday = dayKey(at, index.timeZone) === dayKey(now, index.timeZone)
      const pct = `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2).replace('.', ',')} %`
      const stand = at.toLocaleString('de-DE', {
        weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
      })
      lines.push(tradedToday
        ? `- ${index.label}: ${pct} heute (Stand ${stand} Uhr deutscher Zeit)`
        : `- ${index.label}: heute bisher kein Handel. Letzter Handelstag ${stand} Uhr deutscher Zeit, damals ${pct}`)
    }
    return lines.join('\n')
  } catch (error) {
    console.warn('⚠️ [Recap] Indexkurse nicht verfügbar:', error instanceof Error ? error.message : error)
    return ''
  }
}

// ─── Recap via Claude ────────────────────────────────────────────────────────

export async function generateAIRecap(
  articles: ProcessedArticle[],
  type: 'morning' | 'evening' = 'morning'
): Promise<NewsRecap> {
  // Top 15 relevanteste Artikel
  const top = articles
    .filter(a => a.relevanceScore >= 0.3)
    .slice(0, 15)

  const allTickers = [...new Set(top.flatMap(a => a.tickers).filter(t => !['SPX', 'QQQ', 'DAX', 'DJI'].includes(t)))]

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️ [Recap] Kein ANTHROPIC_API_KEY – nutze Simple Recap')
    return generateSimpleRecapFromArticles(top, type, allTickers)
  }

  // Artikel als Input. Die Ticker stammen aus einer groben Stichwortsuche und
  // liegen oft daneben, deshalb nur als Hinweis.
  const articleSummaries = top.map((a, i) => {
    const tickers = a.tickers.length > 0 ? `\n   Mögliche Ticker (ungeprüft): ${a.tickers.join(', ')}` : ''
    const desc = (a.summaryDe || a.summaryEn || '').slice(0, 200)
    return `${i + 1}. Quelle: ${a.sourceName}\n   ${a.title}\n   ${desc}${tickers}`
  }).join('\n\n')

  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
  const facts = await marketFacts(now)

  const prompt = `Erstelle den ${type === 'morning' ? 'Morgenbericht' : 'Abendbericht'} für ${dateStr}, ${timeStr} Uhr deutscher Zeit.

KURSE (die einzige Quelle für Indexbewegungen):
${facts || '- keine Kursdaten verfügbar'}

NACHRICHTEN:
${articleSummaries}

Aufbau, genau mit diesen drei Überschriften:

**Marktüberblick**
Zwei bis drei Sätze: Wie laufen die Märkte und was bewegt sie konkret? Richtung und Prozentwerte von Indizes NUR aus KURSE. Steht dort "heute bisher kein Handel", war der Markt heute (noch) nicht offen: sag das und beschreibe höchstens den letzten Handelstag als solchen. Ohne Kursdaten nennst du keine Indexbewegungen.

**Top-Themen**
Drei bis fünf Aufzählungspunkte mit "- ". Jeder endet mit der Quelle in runden Klammern, genau wie oben angegeben, etwa (Handelsblatt). Ticker in eckigen Klammern, etwa [NVDA], nur für Unternehmen, um die es in dem Punkt wirklich geht. Die "möglichen Ticker" sind oft falsch, übernimm sie nicht ungeprüft.

**Was das für Anleger bedeutet**
Zwei bis drei Sätze neutrale Einordnung. Keine Handlungsempfehlungen, keine Formulierungen wie "Anleger sollten", "ratsam" oder "empfiehlt sich".

Regeln: Deutsch, sachlich, höchstens 250 Wörter, keine Emojis, keine Gedankenstriche, keine Fakten außerhalb von KURSE und NACHRICHTEN. Gib nur den Bericht aus, ohne Einleitung.`

  try {
    const message = await getAnthropicClient().messages.create(
      {
        model: RECAP_MODEL,
        max_tokens: 3000,
        system: 'Du bist ein erfahrener Finanzjournalist bei Finclue und schreibst präzise, faktenbasierte Marktberichte auf Deutsch.',
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: prompt }],
      },
      { timeout: 40_000, maxRetries: 1 }
    )
    const content = withoutDashes(
      message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim()
    )
    if (message.stop_reason !== 'end_turn' || !content.includes('**Marktüberblick**')) {
      throw new Error(`unvollständige Antwort (${message.stop_reason})`)
    }

    console.log(`✅ [Recap] ${type} Recap mit Claude (${content.length} Zeichen, ${message.usage.input_tokens}/${message.usage.output_tokens} Tokens)`)

    return {
      type,
      contentDe: content,
      contentEn: null,
      tickers: allTickers,
      articleCount: top.length,
    }
  } catch (error) {
    console.error('❌ [Recap] AI Recap fehlgeschlagen:', error instanceof Error ? error.message : error)
    return generateSimpleRecapFromArticles(top, type, allTickers)
  }
}

// ─── Fallback: Simple Recap (ohne AI) ────────────────────────────────────────

function generateSimpleRecapFromArticles(
  articles: ProcessedArticle[],
  type: 'morning' | 'evening',
  allTickers: string[]
): NewsRecap {
  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })

  const categoryLabels: Record<string, string> = {
    macro: 'Makro & Wirtschaft',
    geopolitics: 'Geopolitik',
    earnings: 'Quartalszahlen',
    analyst: 'Analysten',
    ma: 'M&A',
    product: 'Produkte & Innovation',
    corporate: 'Unternehmen',
    general: 'Märkte',
  }

  // Gruppiere nach Kategorie
  const byCategory = new Map<string, ProcessedArticle[]>()
  for (const a of articles) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, [])
    byCategory.get(a.category)!.push(a)
  }

  let content = `**${type === 'morning' ? 'Morgenbericht' : 'Abendbericht'}**, ${dateStr}\n\n`

  for (const cat of ['macro', 'geopolitics', 'earnings', 'analyst', 'ma', 'product', 'general']) {
    const catArticles = byCategory.get(cat)
    if (!catArticles?.length) continue

    content += `**${categoryLabels[cat] || cat}**\n`
    for (const a of catArticles.slice(0, 3)) {
      const tickerStr = a.tickers.length > 0 ? ` [${a.tickers.join(', ')}]` : ''
      content += `- ${a.title}${tickerStr} (${a.sourceName})\n`
    }
    content += '\n'
  }

  return {
    type,
    contentDe: content,
    contentEn: null,
    tickers: allTickers,
    articleCount: articles.length,
  }
}
