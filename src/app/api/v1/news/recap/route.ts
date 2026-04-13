// Finclue Data API v1 – News Recap (Morning/Evening)
// GET /api/v1/news/recap?type=morning&lang=de

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'morning'
  const lang = searchParams.get('lang') || 'de'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: recap, error } = await supabase
      .from('news_recaps')
      .select('*')
      .eq('type', type)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !recap) {
      return NextResponse.json({
        type,
        content: null,
        message: `Kein ${type} Recap verfügbar. Führe das Ingest-Script aus: npx tsx scripts/ingestNews.ts`,
        source: 'finclue-news',
      }, { status: 404 })
    }

    return NextResponse.json({
      id: recap.id,
      type: recap.type,
      content: lang === 'en' ? (recap.content_en || recap.content_de) : recap.content_de,
      tickers: recap.tickers || [],
      articleCount: recap.article_count,
      generatedAt: recap.generated_at,
      source: 'finclue-news',
    }, {
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
