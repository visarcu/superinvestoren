/**
 * ingestNews.ts
 *
 * Holt alle RSS Feeds, verarbeitet Artikel und speichert sie in Supabase.
 * Generiert optional einen Morning/Evening Recap.
 *
 * Usage:
 *   npx tsx scripts/ingestNews.ts              # Feeds holen + Recap generieren
 *   npx tsx scripts/ingestNews.ts --feeds-only # Nur Feeds holen, kein Recap
 *   npx tsx scripts/ingestNews.ts --recap-only # Nur Recap aus bestehenden Artikeln
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { fetchAllFeeds } from '../src/lib/news/feedFetcher.js'
import { processArticles } from '../src/lib/news/newsProcessor.js'
import { generateAIRecap } from '../src/lib/news/recapGenerator.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Artikel speichern ───────────────────────────────────────────────────────

async function storeArticles(articles: any[]): Promise<number> {
  let stored = 0

  for (const article of articles) {
    const { error } = await supabase
      .from('news_articles')
      .upsert({
        title: article.title,
        summary_de: article.summaryDe || null,
        summary_en: article.summaryEn || null,
        url: article.url,
        source_name: article.sourceName,
        source_id: article.url, // URL als unique identifier
        published_at: article.publishedAt.toISOString(),
        language: article.language,
        tickers: article.tickers,
        category: article.category,
        relevance_score: article.relevanceScore,
        image_url: article.imageUrl,
      }, { onConflict: 'url' })

    if (!error) {
      stored++
    }
  }

  return stored
}

// ─── Recap generieren und speichern ──────────────────────────────────────────

async function generateAndStoreRecap(articles: any[]): Promise<void> {
  const hour = new Date().getHours()
  const type = hour < 14 ? 'morning' : 'evening'

  console.log(`🤖 Generiere AI ${type} Recap...`)
  const recap = await generateAIRecap(articles, type)

  const { error } = await supabase
    .from('news_recaps')
    .insert({
      type: recap.type,
      content_de: recap.contentDe,
      content_en: recap.contentEn,
      tickers: recap.tickers,
      article_count: recap.articleCount,
    })

  if (error) {
    console.error('❌ Recap speichern fehlgeschlagen:', error.message)
  } else {
    console.log(`📝 ${type} Recap gespeichert (${recap.tickers.length} Ticker, ${recap.contentDe.length} Zeichen)`)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const feedsOnly = args.includes('--feeds-only')
  const recapOnly = args.includes('--recap-only')

  console.log('🚀 Finclue News Ingest')
  console.log(`   Mode: ${feedsOnly ? 'Feeds only' : recapOnly ? 'Recap only' : 'Full (Feeds + Recap)'}`)
  console.log('')

  let articles: any[] = []

  if (!recapOnly) {
    // 1. RSS Feeds holen
    const rawArticles = await fetchAllFeeds()

    // 2. Verarbeiten (Spam-Filter, Ticker-Matching, Kategorisierung)
    articles = processArticles(rawArticles)
    console.log('')

    // 3. In Supabase speichern
    console.log(`💾 Speichere ${articles.length} Artikel in Supabase...`)
    const stored = await storeArticles(articles)
    console.log(`✅ ${stored} neue/aktualisierte Artikel gespeichert`)
  }

  if (!feedsOnly) {
    // Recap generieren
    if (articles.length === 0) {
      // Lade Artikel aus DB für Recap
      const { data } = await supabase
        .from('news_articles')
        .select('*')
        .gte('published_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .order('relevance_score', { ascending: false })
        .limit(30)

      articles = (data || []).map((a: any) => ({
        title: a.title,
        summaryDe: a.summary_de,
        summaryEn: a.summary_en,
        url: a.url,
        sourceName: a.source_name,
        publishedAt: new Date(a.published_at),
        language: a.language,
        tickers: a.tickers || [],
        category: a.category,
        relevanceScore: a.relevance_score,
      }))
    }

    if (articles.length > 0) {
      await generateAndStoreRecap(articles)
    } else {
      console.log('⚠️ Keine Artikel für Recap verfügbar')
    }
  }

  console.log('')
  console.log('✅ Done!')
}

main().catch(err => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
