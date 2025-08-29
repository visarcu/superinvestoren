// API endpoint to show which stocks are used for sector benchmarks
import { NextRequest, NextResponse } from 'next/server'
import { getSectorStockNames } from '@/lib/sectorStocks'

export async function GET(
  request: NextRequest,
  { params }: { params: { sector: string } }
) {
  try {
    const { sector } = params
    
    if (!sector) {
      return NextResponse.json(
        { error: 'Sector parameter is required' },
        { status: 400 }
      )
    }

    console.log(`📋 [API] Loading sector stocks for ${sector}`)
    
    const sectorStocks = getSectorStockNames(sector, 50) // Limit to first 50
    
    if (sectorStocks.length === 0) {
      return NextResponse.json(
        { error: 'No stocks found for this sector' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sector,
      totalStocks: sectorStocks.length,
      stocks: sectorStocks,
      note: 'Diese Aktien werden für die Sektor-Benchmark-Berechnungen verwendet (gefiltert, prioritisiert)'
    })

  } catch (error) {
    console.error('[API] Sector stocks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}