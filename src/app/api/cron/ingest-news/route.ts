// /api/cron/ingest-news
// Cron-Endpoint für automatisches News-Fetching
// Kann von Vercel Cron Jobs oder externem Scheduler aufgerufen werden.
//
// Vercel cron config in vercel.json:
// { "crons": [{ "path": "/api/cron/ingest-news", "schedule": "*/15 * * * *" }] }

import { NextRequest, NextResponse } from 'next/server'
import { fetchAllFeeds } from '@/lib/news/feedFetcher'
import { processArticles } from '@/lib/news/newsProcessor'
import { generateAIRecap } from '@/lib/news/recapGenerator'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60 // Max 60 Sekunden für Vercel

export async function GET(request: NextRequest) {
  // Optional: Auth-Check für Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const startTime = Date.now()

  try {
    // 1. RSS Feeds holen
    const rawArticles = await fetchAllFeeds()

    // 2. Verarbeiten
    const articles = processArticles(rawArticles)

    // 3. In DB speichern
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
          source_id: article.url,
          published_at: article.publishedAt.toISOString(),
          language: article.language,
          tickers: article.tickers,
          category: article.category,
          relevance_score: article.relevanceScore,
          image_url: article.imageUrl,
        }, { onConflict: 'url' })

      if (!error) stored++
    }

    // 4. Recap generieren (nur um 7-9 Uhr und 17-19 Uhr)
    const hour = new Date().getHours()
    let recapGenerated = false
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      const type = hour < 14 ? 'morning' : 'evening'

      // Prüfe ob heute schon ein Recap existiert
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from('news_recaps')
        .select('id')
        .eq('type', type)
        .gte('generated_at', `${today}T00:00:00`)
        .limit(1)

      if (!existing || existing.length === 0) {
        const recap = await generateAIRecap(articles, type)
        await supabase.from('news_recaps').insert({
          type: recap.type,
          content_de: recap.contentDe,
          content_en: recap.contentEn,
          tickers: recap.tickers,
          article_count: recap.articleCount,
        })
        recapGenerated = true
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      feedsFetched: 14,
      articlesProcessed: articles.length,
      articlesStored: stored,
      recapGenerated,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message, durationMs: Date.now() - startTime }, { status: 500 })
  }
}
