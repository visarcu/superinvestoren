// src/lib/news/newsProcessor.ts
// AI-basierte News-Verarbeitung: Ticker-Matching, Summaries, Kategorisierung
// Nutzt OpenAI (bereits konfiguriert) für Batch-Processing.

import { RawArticle } from './feedFetcher'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProcessedArticle {
  title: string
  summaryDe: string
  summaryEn: string
  url: string
  sourceName: string
  sourceUrl: string
  publishedAt: Date
  language: 'de' | 'en'
  tickers: string[]           // ["AAPL", "NVDA"]
  category: string            // "earnings" | "macro" | "geopolitics" | "analyst" | "product" | "m&a" | "general"
  relevanceScore: number      // 0-1
  imageUrl: string | null
}

// ─── Spam Filter ─────────────────────────────────────────────────────────────
// Filtert irrelevante Artikel (ETF NAVs, Werbung, etc.)

const SPAM_PATTERNS = [
  /net asset value/i,
  /NAV\(s\)/i,
  /UCITS ETF/i,
  /^Amundi\s/i,
  /^iShares\s/i,
  /^Xtrackers\s/i,
  /werbung|anzeige|sponsored|advertorial/i,
  /^PR:/i,
  /press release$/i,
]

function isSpam(article: RawArticle): boolean {
  return SPAM_PATTERNS.some(p => p.test(article.title))
}

// ─── Einfaches Ticker-Matching (ohne AI) ─────────────────────────────────────
// Erkennt Ticker und Firmennamen in Überschriften/Beschreibungen.

const COMPANY_PATTERNS: [RegExp, string][] = [
  // Mega Caps
  [/\bApple\b|AAPL/i, 'AAPL'], [/\bMicrosoft\b|MSFT/i, 'MSFT'],
  [/\bNvidia\b|NVDA/i, 'NVDA'], [/\bAlphabet\b|Google|GOOGL/i, 'GOOGL'],
  [/\bAmazon\b|AMZN/i, 'AMZN'], [/\bMeta\b|META\b|Facebook/i, 'META'],
  [/\bTesla\b|TSLA/i, 'TSLA'], [/\bNetflix\b|NFLX/i, 'NFLX'],
  // Tech
  [/\bAMD\b|Advanced Micro/i, 'AMD'], [/\bIntel\b|INTC/i, 'INTC'],
  [/\bCrowdStrike\b|CRWD/i, 'CRWD'], [/\bPalantir\b|PLTR/i, 'PLTR'],
  [/\bSnowflake\b|SNOW/i, 'SNOW'], [/\bShopify\b|SHOP/i, 'SHOP'],
  [/\bSpotify\b|SPOT/i, 'SPOT'], [/\bUber\b|UBER/i, 'UBER'],
  [/\bAirbnb\b|ABNB/i, 'ABNB'], [/\bCoinbase\b|COIN/i, 'COIN'],
  [/\bASML\b/i, 'ASML'], [/\bARK\b/i, 'ARKK'],
  [/\bSalesforce\b|CRM/i, 'CRM'], [/\bAdobe\b|ADBE/i, 'ADBE'],
  // Finance
  [/\bJPMorgan\b|JPM/i, 'JPM'], [/\bGoldman\sSachs\b|GS\b/i, 'GS'],
  [/\bVisa\b(?!\s*Free)/i, 'V'], [/\bMastercard\b(?!\s*University)/i, 'MA'],
  [/\bPayPal\b|PYPL/i, 'PYPL'], [/\bBerkshire\b|BRK/i, 'BRK.B'],
  // Healthcare
  [/\bPfizer\b|PFE/i, 'PFE'], [/\bEli\sLilly\b|LLY/i, 'LLY'],
  [/\bNovo\sNordisk\b|NVO/i, 'NVO'], [/\bJohnson\s.*Johnson\b|JNJ/i, 'JNJ'],
  // Consumer
  [/\bWalmart\b|WMT/i, 'WMT'], [/\bCoca.?Cola\b|KO\b/i, 'KO'],
  [/\bNike\b|NKE/i, 'NKE'], [/\bDisney\b|DIS/i, 'DIS'],
  [/\bStarbucks\b|SBUX/i, 'SBUX'], [/\bMcDonald/i, 'MCD'],
  // Industrial
  [/\bBoeing\b|BA\b/i, 'BA'], [/\bCaterpillar\b|CAT/i, 'CAT'],
  // Energy
  [/\bExxon\b|XOM/i, 'XOM'], [/\bChevron\b|CVX/i, 'CVX'],
  // German / DAX
  [/\bSAP\b(?!\s*Community)/i, 'SAP'], [/\bSiemens\b(?!\s*Energy)/i, 'SIE.DE'],
  [/\bAllianz\b/i, 'ALV.DE'], [/\bDeutsche\sTelekom\b|Telekom/i, 'DTE.DE'],
  [/\bBASF\b/i, 'BAS.DE'], [/\bBMW\b/i, 'BMW.DE'],
  [/\bMercedes\b|Daimler/i, 'MBG.DE'], [/\bAdidas\b/i, 'ADS.DE'],
  [/\bVolkswagen\b|VW\b/i, 'VOW3.DE'], [/\bBayer\b(?!\s*München)/i, 'BAYN.DE'],
  [/\bDeutsche\sBank\b/i, 'DBK.DE'], [/\bDeutsche\sBörse\b/i, 'DB1.DE'],
  // Crypto
  [/\bBitcoin\b|BTC/i, 'BTC'], [/\bEthereum\b|ETH/i, 'ETH'],
  // Indices (nicht als Ticker, aber als Kontext)
  [/\bS&P\s?500\b|SPX/i, 'SPX'], [/\bNasdaq\s?100\b|QQQ/i, 'QQQ'],
  [/\bDAX\b/i, 'DAX'], [/\bDow\sJones\b|DJIA/i, 'DJI'],
]

function matchTickers(text: string): string[] {
  const matched = new Set<string>()
  for (const [pattern, ticker] of COMPANY_PATTERNS) {
    if (pattern.test(text)) {
      matched.add(ticker)
    }
  }
  return Array.from(matched)
}

// ─── Kategorie-Erkennung ─────────────────────────────────────────────────────

function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  if (/earnings|quartalszahlen|geschäftszahlen|quarterly results|gewinn|revenue report/i.test(lower)) return 'earnings'
  if (/merger|acquisition|übernahme|takeover|m&a|deal/i.test(lower)) return 'ma'
  if (/analyst|kursziel|price target|rating|upgrade|downgrade|buy|sell|hold/i.test(lower)) return 'analyst'
  if (/fed|ezb|ecb|zins|inflation|gdp|bip|arbeitsmarkt|employment|tariff|zoll/i.test(lower)) return 'macro'
  if (/trump|biden|geopolitik|sanction|krieg|war|china|russia|iran/i.test(lower)) return 'geopolitics'
  if (/produkt|launch|iphone|feature|update|release|ai\s|künstliche/i.test(lower)) return 'product'
  if (/dividende|dividend|split|buyback|rückkauf/i.test(lower)) return 'corporate'
  return 'general'
}

// ─── Relevanz-Score ──────────────────────────────────────────────────────────

function calculateRelevance(article: RawArticle, tickers: string[], category: string): number {
  let score = 0.3 // Base score

  // Mehr Ticker = relevanter
  score += Math.min(tickers.length * 0.1, 0.3)

  // Bestimmte Kategorien sind relevanter
  if (['earnings', 'ma', 'macro', 'geopolitics'].includes(category)) score += 0.2
  if (category === 'analyst') score += 0.1

  // Quelle mit hoher Priorität
  if (article.source.priority === 1) score += 0.1

  // Hat Beschreibung (= mehr Kontext)
  if (article.description.length > 100) score += 0.05

  return Math.min(score, 1.0)
}

// ─── Main Processor ──────────────────────────────────────────────────────────

/**
 * Verarbeitet rohe RSS-Artikel: Spam-Filter, Ticker-Matching, Kategorisierung.
 * Phase 1: Ohne AI (schnell, kostenlos). AI-Summaries kommen in Phase 2.
 */
export function processArticles(rawArticles: RawArticle[]): ProcessedArticle[] {
  const filtered = rawArticles.filter(a => !isSpam(a))
  console.log(`🔍 [Processor] ${rawArticles.length} → ${filtered.length} nach Spam-Filter`)

  return filtered.map(article => {
    const fullText = `${article.title} ${article.description}`
    const tickers = matchTickers(fullText)
    const category = detectCategory(fullText)
    const relevance = calculateRelevance(article, tickers, category)

    return {
      title: article.title,
      summaryDe: article.source.language === 'de' ? article.description : '',
      summaryEn: article.source.language === 'en' ? article.description : '',
      url: article.url,
      sourceName: article.source.name,
      sourceUrl: article.source.url,
      publishedAt: article.publishedAt,
      language: article.source.language,
      tickers,
      category,
      relevanceScore: relevance,
      imageUrl: article.imageUrl,
    }
  }).sort((a, b) => {
    // Erst nach Relevanz, dann nach Datum
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
    return b.publishedAt.getTime() - a.publishedAt.getTime()
  })
}

/**
 * Generiert einen Morning/Evening Recap aus den top Artikeln.
 * Phase 1: Einfache Zusammenstellung. Phase 2: Claude-generierter Recap.
 */
export function generateSimpleRecap(
  articles: ProcessedArticle[],
  type: 'morning' | 'evening' = 'morning'
): { content: string; tickers: string[] } {
  // Top 10 relevanteste Artikel
  const top = articles.slice(0, 10)

  const allTickers = [...new Set(top.flatMap(a => a.tickers))]
  const categories = [...new Set(top.map(a => a.category))]

  // Gruppiere nach Kategorie
  const byCategory = new Map<string, ProcessedArticle[]>()
  for (const a of top) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, [])
    byCategory.get(a.category)!.push(a)
  }

  let content = `## ${type === 'morning' ? 'Morning Recap' : 'Evening Recap'}\n\n`

  // Macro/Geopolitics zuerst
  for (const cat of ['macro', 'geopolitics', 'earnings', 'analyst', 'ma', 'product', 'general']) {
    const catArticles = byCategory.get(cat)
    if (!catArticles || catArticles.length === 0) continue

    const catLabels: Record<string, string> = {
      macro: 'Makro & Wirtschaft',
      geopolitics: 'Geopolitik',
      earnings: 'Quartalszahlen',
      analyst: 'Analysten',
      ma: 'M&A & Übernahmen',
      product: 'Produkte & Innovation',
      corporate: 'Unternehmen',
      general: 'Märkte',
    }

    content += `### ${catLabels[cat] || cat}\n`
    for (const a of catArticles.slice(0, 3)) {
      const tickerStr = a.tickers.length > 0 ? ` [${a.tickers.join(', ')}]` : ''
      content += `- **${a.title}**${tickerStr} — ${a.sourceName}\n`
    }
    content += '\n'
  }

  return { content, tickers: allTickers }
}
