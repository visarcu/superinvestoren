// src/app/api/peer-comparison/[ticker]/route.ts
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

    console.log(`📊 [API] Loading peer comparison for ${ticker}`)
    
    const peerData = await peerComparisonService.getPeerComparison(ticker.toUpperCase())
    
    if (!peerData) {
      return NextResponse.json(
        { error: 'Could not fetch peer comparison data' },
        { status: 404 }
      )
    }

    return NextResponse.json(peerData)

  } catch (error) {
    console.error('[API] Peer comparison error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}