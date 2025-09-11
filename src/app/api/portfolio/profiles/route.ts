// src/app/api/portfolio/profiles/route.ts

import { NextRequest, NextResponse } from 'next/server'

interface StockProfile {
  symbol: string
  companyName: string
  sector: string
  industry: string
  country: string
  currency: string
  marketCap: number
  exchange: string
}

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols array' }, { status: 400 })
    }

    const apiKey = process.env.FMP_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Fetch profiles in batches to avoid URL length limits
    const profiles: StockProfile[] = []
    const batchSize = 20
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      const symbolsParam = batch.join(',')
      
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/profile/${symbolsParam}?apikey=${apiKey}`
        )
        
        if (response.ok) {
          const data = await response.json()
          const batchProfiles = Array.isArray(data) ? data : [data]
          
          batchProfiles.forEach((profile: any) => {
            if (profile && profile.symbol) {
              profiles.push({
                symbol: profile.symbol,
                companyName: profile.companyName || profile.symbol,
                sector: profile.sector || 'Unknown',
                industry: profile.industry || 'Unknown',
                country: profile.country || 'Unknown', 
                currency: profile.currency || 'USD',
                marketCap: profile.mktCap || profile.marketCap || 0,
                exchange: profile.exchangeShortName || profile.exchange || 'Unknown'
              })
            }
          })
        }
      } catch (error) {
        console.error(`Error fetching batch starting at ${i}:`, error)
      }
    }

    return NextResponse.json(profiles, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      }
    })

  } catch (error) {
    console.error('Portfolio profiles API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}