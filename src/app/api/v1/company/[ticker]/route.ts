// Finclue Data API v1 – Company Profile
// GET /api/v1/company/{ticker}

import { NextRequest, NextResponse } from 'next/server'
import { getCompanyProfile } from '@/lib/sec/companyProfileService'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const profile = await getCompanyProfile(ticker)

    return NextResponse.json(profile, {
      headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Kein CIK') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
