// Finclue Data API v1 – Stock-specific News
// GET /api/v1/news/stock/{ticker}?limit=10

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 50)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: articles, error } = await supabase
      .from('news_articles')
      .select('*')
      .contains('tickers', [ticker])
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({
      ticker,
      articles: (articles || []).map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary_de || a.summary_en || '',
        url: a.url,
        sourceName: a.source_name,
        publishedAt: a.published_at,
        language: a.language,
        category: a.category,
        relevanceScore: a.relevance_score,
      })),
      count: articles?.length || 0,
      source: 'finclue-news',
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
