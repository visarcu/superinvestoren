// /api/portfolio/search/route.ts
import { NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // FMP hat einen Search-Endpoint
    const url = `https://financialmodelingprep.com/api/v3/search?query=${query}&limit=10&apikey=${FMP_API_KEY}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      results: data.map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchangeShortName
      }))
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ 
      error: 'Failed to search stocks',
      results: [] 
    }, { status: 500 })
  }
}