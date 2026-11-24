// src/lib/ai/data/news.ts
// Server-only: Nachrichten aus der eigenen Sammlung (news_articles, rund 1.400
// neue Artikel am Tag), ergänzt um FMP, wenn zu einer Aktie wenig da ist.

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fmpList } from './fmp'

export interface NewsItem {
  title: string
  summary: string | null
  source: string
  url: string | null
  publishedAt: string
  relevance: number
  /** Liveblogs und Marktberichte behalten die Uhrzeit ihrer ersten Fassung */
  rolling: boolean
}

const ROLLING = /markets wrap|live ?blog|newsblog|newsticker|live:|\bticker\b|aktuell:/i
/** Bloomberg schreibt Marktberichte den Tag über fort und behält die erste Uhrzeit */
const ROLLING_BLOOMBERG = /^(?:Stocks?|Treasuries|Gold|Silver|Oil|Copper|Dollar|Euro|Pound|Yen|Bitcoin|Crypto|Bonds?|Yields?|Asian?|European?|Emerging|Global|Wall Street|S&P 500|US (?:Stocks|Equities))\b/i
/** Sammelklage-Werbung und reine Produktmeldungen */
const NOISE = /class action|law offices|shareholder alert|deadline alert|investors? (?:with|who) loss|rosen law|pomerantz|WeeklyPay|declares? \$?\d/i

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/<[^>]+>/g, '')
    .trim()
}

function words(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(w => w.length > 3))
}

/** gleiche Meldung aus mehreren Quellen nur einmal */
function dedupe(items: NewsItem[]): NewsItem[] {
  const out: Array<{ item: NewsItem; words: Set<string> }> = []
  for (const item of items) {
    const w = words(item.title)
    const twin = out.some(o => {
      let hits = 0
      for (const x of w) if (o.words.has(x)) hits++
      return hits / Math.max(1, Math.min(w.size, o.words.size)) > 0.75
    })
    if (!twin) out.push({ item, words: w })
  }
  return out.map(o => o.item)
}

const STOP = new Set(['aktie', 'aktien', 'börse', 'boerse', 'stock', 'stocks', 'market', 'markets', 'heute', 'nach', 'wegen', 'with', 'from', 'after', 'that', 'this', 'what', 'will', 'über', 'ueber', 'eine', 'einen', 'einer', 'nicht', 'noch', 'wird', 'sind', 'auch', 'mehr', 'says', 'wall', 'street'])

/**
 * Früheste Meldungen zum beherrschenden Thema: häufigste Wörter der Titel
 * bestimmen, dann die ersten Artikel, die mindestens zwei davon enthalten.
 */
export function firstReports(items: NewsItem[], name: string, symbol: string, since: Date, limit = 5): NewsItem[] {
  const own = words(name)
  const fresh = items.filter(i => !i.rolling && mentions(i.title, name, symbol) && Date.parse(i.publishedAt) >= since.getTime())
  if (fresh.length < 6) return []
  const counts = new Map<string, number>()
  for (const item of fresh) for (const w of words(item.title)) if (!own.has(w) && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
  const top = [...counts.entries()].filter(([, n]) => n >= Math.max(3, fresh.length * 0.12)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w)
  if (top.length < 2) return []
  const hits = fresh.filter(i => {
    const w = words(i.title)
    return top.filter(t => w.has(t)).length >= 2
  })
  return hits.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)).slice(0, limit)
}

const GENERIC_NAME = new Set(['corporation', 'company', 'holding', 'holdings', 'group', 'international', 'technologies', 'systems', 'limited', 'aktiengesellschaft', 'gesellschaft', 'manufacturing', 'platforms', 'motors', 'energy', 'bank', 'financial', 'industries'])

/** Nennt der Titel die Firma selbst (und nicht nur die Branche)? */
export function mentions(title: string, name: string, symbol: string): boolean {
  const t = title.toLowerCase()
  const base = symbol.replace(/\..*$/, '').toLowerCase()
  if (base.length > 1 && new RegExp(`(?:^|[^\\p{L}\\p{N}])${base.replace(/[^a-z0-9]/g, '.')}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(t)) return true
  return [...words(name)].some(w => !GENERIC_NAME.has(w) && t.includes(w))
}

export async function loadNews(opts: {
  symbol?: string | null
  /** Firmenname: Artikel, die ihn im Titel nennen, werden bevorzugt */
  name?: string | null
  search?: string | null
  from: Date
  to: Date
  limit: number
  minRelevance?: number
}): Promise<{ items: NewsItem[]; total: number; all: NewsItem[] }> {
  let query = supabaseAdmin
    .from('news_articles')
    .select('title, summary_de, summary_en, source_name, url, published_at, relevance_score', { count: 'planned' })
    .gte('published_at', opts.from.toISOString())
    .lte('published_at', opts.to.toISOString())
    .order('published_at', { ascending: false })
    .limit(opts.symbol ? 300 : 120)
  if (opts.symbol) query = query.contains('tickers', [opts.symbol.replace(/\.(DE|F|PA|AS|L|SW|MI|MC)$/, '')])
  if (opts.search) query = query.ilike('title', `%${opts.search.replace(/[%_,()]/g, ' ').trim()}%`)
  if (opts.minRelevance) query = query.gte('relevance_score', opts.minRelevance)

  const { data } = await query
  let items: NewsItem[] = (data ?? []).map((row: any) => {
    const title = decodeEntities(row.title ?? '')
    const summary = row.summary_de || row.summary_en
    return {
      title,
      summary: summary ? decodeEntities(summary).slice(0, 260) : null,
      source: row.source_name ?? 'Nachricht',
      url: row.url ?? null,
      publishedAt: row.published_at,
      relevance: Number(row.relevance_score) || 0,
      rolling: ROLLING.test(title) || (row.source_name === 'Bloomberg' && ROLLING_BLOOMBERG.test(title)),
    }
  })

  if (opts.symbol && items.length < 8) {
    const extra = await fmpList('/stable/news/stock', { symbols: opts.symbol, limit: 30 }, { revalidate: 600 })
    for (const row of extra) {
      const published = typeof row.publishedDate === 'string' ? new Date(`${row.publishedDate.replace(' ', 'T')}-05:00`) : null
      if (!published || Number.isNaN(published.getTime()) || published < opts.from || published > opts.to) continue
      items.push({
        title: decodeEntities(row.title ?? ''), summary: row.text ? decodeEntities(row.text).slice(0, 260) : null, source: row.publisher ?? row.site ?? 'FMP',
        url: row.url ?? null, publishedAt: published.toISOString(), relevance: 0.5, rolling: false,
      })
    }
  }

  items = items.filter(i => i.title && !NOISE.test(i.title))
  const total = items.length
  // Wichtiges zuerst auswählen, danach zeitlich sortieren
  const weight = (i: NewsItem) => i.relevance - (opts.symbol && opts.name && !mentions(i.title, opts.name, opts.symbol) ? 0.35 : 0)
  const ranked = dedupe([...items].sort((a, b) => weight(b) - weight(a) || b.publishedAt.localeCompare(a.publishedAt))).slice(0, opts.limit)
  return { items: ranked.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)), total, all: items }
}
