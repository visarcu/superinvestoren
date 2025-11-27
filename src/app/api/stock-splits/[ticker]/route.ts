// src/app/api/stock-splits/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface StockSplit {
  symbol: string
  date: string
  numerator: number
  denominator: number
  splitType?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase()
    const API_KEY = process.env.FMP_API_KEY

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'FMP API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🔍 Fetching stock splits for ${ticker}...`)

    // Fetch stock splits from FMP API - using the exact URL you provided
    const splitsResponse = await fetch(
      `https://financialmodelingprep.com/stable/splits?symbol=${ticker}&apikey=${API_KEY}`
    )

    if (!splitsResponse.ok) {
      throw new Error(`FMP API error: ${splitsResponse.status}`)
    }

    const splits: StockSplit[] = await splitsResponse.json()
    
    console.log(`✅ Stock splits loaded: ${splits.length} splits found`)

    // Process and format the splits data
    const processedSplits = splits
      .map(split => ({
        symbol: split.symbol,
        date: split.date,
        numerator: split.numerator,
        denominator: split.denominator,
        ratio: `${split.numerator}:${split.denominator}`,
        type: split.numerator > split.denominator ? 'Aktiensplit' : 'Reverse Split',
        description: split.numerator > split.denominator 
          ? `${split.numerator}-für-${split.denominator} Aktiensplit`
          : `${split.numerator}-für-${split.denominator} Reverse Split`
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first

    return NextResponse.json({
      ticker,
      splits: processedSplits,
      count: processedSplits.length,
      lastUpdate: new Date().toISOString()
    })

  } catch (error) {
    console.error(`❌ Error fetching stock splits for ${params.ticker}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock splits data',
        ticker: params.ticker,
        splits: [],
        count: 0 
      },
      { status: 500 }
    )
  }
}