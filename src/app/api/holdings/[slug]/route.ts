// API Route for individual investor holdings
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
    
    if (!investorHoldings) {
      return NextResponse.json(
        { error: 'Investor not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: investorHoldings
    })
    
  } catch (error) {
    console.error('Holdings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}