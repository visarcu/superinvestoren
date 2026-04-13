// src/lib/news/recapGenerator.ts
// AI-powered Morning/Evening Recap Generator (Fey-Style)
// Nutzt OpenAI um aus den top Artikeln einen strukturierten Recap zu erstellen.

import { ProcessedArticle } from './newsProcessor'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewsRecap {
  type: 'morning' | 'evening'
  contentDe: string
  contentEn: string | null
  tickers: string[]
  articleCount: number
}

// ─── Recap via OpenAI ────────────────────────────────────────────────────────

export async function generateAIRecap(
  articles: ProcessedArticle[],
  type: 'morning' | 'evening' = 'morning'
): Promise<NewsRecap> {
  const apiKey = process.env.OPENAI_API_KEY

  // Top 15 relevanteste Artikel
  const top = articles
    .filter(a => a.relevanceScore >= 0.3)
    .slice(0, 15)

  const allTickers = [...new Set(top.flatMap(a => a.tickers).filter(t => !['SPX', 'QQQ', 'DAX', 'DJI'].includes(t)))]

  // Artikel als Input für die AI
  const articleSummaries = top.map((a, i) => {
    const tickers = a.tickers.length > 0 ? ` [${a.tickers.join(', ')}]` : ''
    const desc = (a.summaryDe || a.summaryEn || '').slice(0, 150)
    return `${i + 1}. [${a.sourceName}] ${a.title}${tickers}\n   ${desc}`
  }).join('\n\n')

  // Wenn kein API Key → Fallback auf Simple Recap
  if (!apiKey) {
    console.warn('⚠️ [Recap] Kein OPENAI_API_KEY – nutze Simple Recap')
    return generateSimpleRecapFromArticles(top, type, allTickers)
  }

  const timeLabel = type === 'morning' ? 'Morgen' : 'Abend'
  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const prompt = `Du bist ein Finanzmarkt-Analyst für Finclue, eine deutsche Finanzanalyse-Plattform.

Erstelle einen "${type === 'morning' ? 'Morning Recap' : 'Evening Recap'}" für ${dateStr} basierend auf diesen aktuellen Nachrichtenquellen:

${articleSummaries}

Regeln:
- Schreibe auf Deutsch, professionell aber verständlich
- Strukturiere den Recap so:

1. **Marktüberblick** (2-3 Sätze): Was bewegt die Märkte HEUTE? Sei spezifisch – nenne konkrete Events, nicht allgemeine Phrasen.

2. **Top-Themen** (3-5 Bullets): Die wichtigsten Nachrichten mit den betroffenen Aktien in [TICKER] Tags.

3. **Was das für Anleger bedeutet** (2-3 Sätze): Konkreter Kontext für Investoren.

- Benutze KEINE Emojis
- Nenne IMMER die Quelle wenn du auf einen spezifischen Artikel referenzierst
- Maximal 250 Wörter insgesamt
- Sei faktenbasiert, keine Spekulationen`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein erfahrener Finanzjournalist der präzise, faktenbasierte Marktberichte auf Deutsch schreibt.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    console.log(`✅ [Recap] AI ${type} Recap generiert (${content.length} Zeichen)`)

    return {
      type,
      contentDe: content,
      contentEn: null, // Könnte in einem zweiten Call übersetzt werden
      tickers: allTickers,
      articleCount: top.length,
    }
  } catch (error) {
    console.error('❌ [Recap] AI Recap fehlgeschlagen:', error)
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
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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

  let content = `**${type === 'morning' ? 'Morning Recap' : 'Evening Recap'}** — ${dateStr}\n\n`

  for (const cat of ['macro', 'geopolitics', 'earnings', 'analyst', 'ma', 'product', 'general']) {
    const catArticles = byCategory.get(cat)
    if (!catArticles?.length) continue

    content += `**${categoryLabels[cat] || cat}**\n`
    for (const a of catArticles.slice(0, 3)) {
      const tickerStr = a.tickers.length > 0 ? ` [${a.tickers.join(', ')}]` : ''
      content += `- ${a.title}${tickerStr} — *${a.sourceName}*\n`
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
