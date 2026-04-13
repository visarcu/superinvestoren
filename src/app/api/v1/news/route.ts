// Finclue Data API v1 – News Feed
// GET /api/v1/news?lang=de&limit=20&ticker=NVDA&category=macro

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
  const lang = searchParams.get('lang') // 'de', 'en', or null for all
  const ticker = searchParams.get('ticker')?.toUpperCase()
  const category = searchParams.get('category')
  const cursor = searchParams.get('cursor') // ISO date string for pagination

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    let query = supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit + 1) // +1 to check hasNextPage

    if (lang) query = query.eq('language', lang)
    if (ticker) query = query.contains('tickers', [ticker])
    if (category) query = query.eq('category', category)
    if (cursor) query = query.lt('published_at', cursor)

    const { data: articles, error } = await query

    if (error) throw error

    const hasNextPage = articles && articles.length > limit
    const pageData = (articles || []).slice(0, limit)
    const nextCursor = hasNextPage && pageData.length > 0
      ? pageData[pageData.length - 1].published_at
      : null

    return NextResponse.json({
      data: pageData.map(a => ({
        id: a.id,
        title: a.title,
        summary: lang === 'en' ? (a.summary_en || a.summary_de) : (a.summary_de || a.summary_en),
        url: a.url,
        sourceName: a.source_name,
        publishedAt: a.published_at,
        language: a.language,
        tickers: a.tickers || [],
        category: a.category,
        relevanceScore: a.relevance_score,
        imageUrl: a.image_url,
      })),
      pagination: {
        limit,
        hasNextPage,
        nextCursor,
      },
      source: 'finclue-news',
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
