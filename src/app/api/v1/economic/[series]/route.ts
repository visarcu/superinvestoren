// Finclue Data API v1 – Economic Data (FRED)
// GET /api/v1/economic/{series}?limit=60
// GET /api/v1/economic/cpi?limit=24
// GET /api/v1/economic/unemployment?limit=120

import { NextRequest, NextResponse } from 'next/server'
import { getFredSeries, getAvailableSeries } from '@/lib/economic/fredService'

export async function GET(
  request: NextRequest,
  { params }: { params: { series: string } }
) {
  const series = params.series.toLowerCase()
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '60'), 500)
  const startDate = request.nextUrl.searchParams.get('from') || undefined

  // Special: list all available series
  if (series === 'list') {
    return NextResponse.json({
      series: getAvailableSeries(),
      source: 'fred-federal-reserve',
    })
  }

  try {
    const data = await getFredSeries(series, { limit, startDate })

    if (!data) {
      return NextResponse.json({
        error: `Unbekannte Serie: ${series}`,
        availableSeries: getAvailableSeries().map(s => s.key),
      }, { status: 404 })
    }

    return NextResponse.json({
      ...data,
      count: data.observations.length,
      source: 'fred-federal-reserve',
      fetchedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' }, // 6h Cache
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
