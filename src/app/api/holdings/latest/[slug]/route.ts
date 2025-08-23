// API Route for latest holdings data only (performance optimized)
import { NextRequest, NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    // Get holdings for specific investor
    const investorHoldings = holdingsHistory[slug as keyof typeof holdingsHistory]
    
    if (!investorHoldings || !Array.isArray(investorHoldings) || investorHoldings.length === 0) {
      return NextResponse.json(
        { error: 'Investor not found or no data available' },
        { status: 404 }
      )
    }
    
    // Return only the latest snapshot for performance
    const latestSnapshot = investorHoldings[investorHoldings.length - 1]
    
    return NextResponse.json({
      success: true,
      data: latestSnapshot,
      investor: slug
    })
    
  } catch (error) {
    console.error('Latest holdings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}