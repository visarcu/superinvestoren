// src/app/api/sector-averages/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { peerComparisonService } from '@/lib/peerComparisonService'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params
    
    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker parameter is required' },
        { status: 400 }
      )
    }

    console.log(`📊 [API] Loading sector averages for ${ticker}`)
    
    const sectorData = await peerComparisonService.getSectorAverages(ticker.toUpperCase())
    
    if (!sectorData) {
      return NextResponse.json(
        { error: 'Could not fetch sector averages' },
        { status: 404 }
      )
    }

    return NextResponse.json(sectorData)

  } catch (error) {
    console.error('[API] Sector averages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}