// src/lib/news/feedFetcher.ts
// RSS Feed Parser – holt Artikel von allen konfigurierten Quellen
// Kein extra Dependency nötig – nutzt Node.js fetch + einfachen XML Parser.

import { ALL_SOURCES, RSSSource } from './rssSources'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RawArticle {
  title: string
  description: string
  url: string
  publishedAt: Date
  source: RSSSource
  imageUrl: string | null
  author: string | null
}

// ─── XML Parser (minimal, kein Dependency) ───────────────────────────────────

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i')
  const cdataMatch = xml.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1].trim()

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : ''
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
  const match = xml.match(regex)
  return match ? match[1] : ''
}

function extractItems(xml: string): string[] {
  const items: string[] = []
  const regex = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1])
  }
  // Atom feeds use <entry>
  if (items.length === 0) {
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi
    while ((match = entryRegex.exec(xml)) !== null) {
      items.push(match[1])
    }
  }
  return items
}

function parseItem(itemXml: string, source: RSSSource): RawArticle | null {
  const title = extractTag(itemXml, 'title')
  if (!title) return null

  // URL: <link>, <guid>, or Atom <link href="...">
  let url = extractTag(itemXml, 'link')
  if (!url) url = extractAttribute(itemXml, 'link', 'href')
  if (!url) url = extractTag(itemXml, 'guid')
  if (!url) return null

  // Clean URL
  url = url.replace(/\s+/g, '').trim()
  if (!url.startsWith('http')) return null

  const description = extractTag(itemXml, 'description') ||
                      extractTag(itemXml, 'summary') ||
                      extractTag(itemXml, 'content:encoded') || ''

  // Strip HTML from description
  const cleanDescription = description
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 500) // Max 500 Zeichen

  // Date
  const dateStr = extractTag(itemXml, 'pubDate') ||
                  extractTag(itemXml, 'dc:date') ||
                  extractTag(itemXml, 'published') ||
                  extractTag(itemXml, 'updated')
  const publishedAt = dateStr ? new Date(dateStr) : new Date()

  // Image
  const imageUrl = extractAttribute(itemXml, 'media:content', 'url') ||
                   extractAttribute(itemXml, 'media:thumbnail', 'url') ||
                   extractAttribute(itemXml, 'enclosure', 'url') || null

  // Author
  const author = extractTag(itemXml, 'author') ||
                 extractTag(itemXml, 'dc:creator') || null

  return {
    title: title.slice(0, 300),
    description: cleanDescription,
    url,
    publishedAt,
    source,
    imageUrl,
    author,
  }
}

// ─── Feed Fetcher ────────────────────────────────────────────────────────────

async function fetchSingleFeed(source: RSSSource): Promise<RawArticle[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Finclue News Bot/1.0 (research@finclue.de)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`⚠️ [RSS] ${source.name}: HTTP ${res.status}`)
      return []
    }

    const xml = await res.text()
    const items = extractItems(xml)

    const articles = items
      .map(item => parseItem(item, source))
      .filter((a): a is RawArticle => a !== null)

    // Nur Artikel der letzten 48 Stunden
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const recent = articles.filter(a => a.publishedAt >= cutoff)

    console.log(`✅ [RSS] ${source.name}: ${recent.length}/${articles.length} Artikel (letzte 48h)`)
    return recent
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown'
    console.warn(`❌ [RSS] ${source.name}: ${msg.slice(0, 60)}`)
    return []
  }
}

/**
 * Holt alle RSS Feeds parallel und gibt deduplizierte Artikel zurück.
 */
export async function fetchAllFeeds(sources?: RSSSource[]): Promise<RawArticle[]> {
  const feedSources = sources || ALL_SOURCES

  console.log(`🔄 [RSS] Fetching ${feedSources.length} feeds...`)

  const results = await Promise.allSettled(
    feedSources.map(source => fetchSingleFeed(source))
  )

  const allArticles: RawArticle[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value)
    }
  }

  // Deduplizierung nach URL
  const seen = new Set<string>()
  const unique = allArticles.filter(a => {
    const normalized = a.url.replace(/\?.*$/, '').replace(/\/$/, '')
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })

  // Sortiere nach Datum (neueste zuerst)
  unique.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

  console.log(`📰 [RSS] ${unique.length} unique Artikel aus ${feedSources.length} Feeds`)

  return unique
}

/**
 * Holt nur deutsche Feeds.
 */
export async function fetchGermanFeeds(): Promise<RawArticle[]> {
  const deSources = ALL_SOURCES.filter(s => s.language === 'de')
  return fetchAllFeeds(deSources)
}

/**
 * Holt nur internationale Feeds.
 */
export async function fetchInternationalFeeds(): Promise<RawArticle[]> {
  const intSources = ALL_SOURCES.filter(s => s.language === 'en')
  return fetchAllFeeds(intSources)
}
