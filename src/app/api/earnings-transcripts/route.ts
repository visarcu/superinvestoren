// app/api/earnings-transcripts/route.ts
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

// Cache für Transcripts (24 Stunden)
const transcriptCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 Stunden

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ticker = searchParams.get('ticker')
  const year = searchParams.get('year')
  const quarter = searchParams.get('quarter')
  const limit = searchParams.get('limit') || '10'

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    // Spezifisches Transcript abrufen
    if (year && quarter) {
      const cacheKey = `${ticker}-${year}-Q${quarter}`
      
      // Check cache
      const cached = transcriptCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json(cached.data)
      }

      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/earning_call_transcript/${ticker}?quarter=${quarter}&year=${year}&apikey=${FMP_API_KEY}`
      )

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`)
      }

      const data = await response.json()
      
      // FMP gibt manchmal ein einzelnes Objekt statt Array zurück
      const normalizedData = Array.isArray(data) ? data : [data]
      
      // Cache the result
      transcriptCache.set(cacheKey, { data: normalizedData, timestamp: Date.now() })
      
      return NextResponse.json(normalizedData)
    }

    // Liste von Transcripts abrufen
    const cacheKey = `${ticker}-list-${limit}`
    
    // Check cache
    const cached = transcriptCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data)
    }

    // Nutze direkt v3 endpoint (funktioniert mit deinem Plan)
    const apiUrl = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${ticker}?apikey=${FMP_API_KEY}`
    console.log('Calling FMP API v3')
    
    const response = await fetch(apiUrl)

    if (!response.ok) {
      console.error('FMP API error:', response.status)
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('FMP Response type:', Array.isArray(data) ? 'array' : typeof data)
    
    // Ensure it's always an array
    const normalizedData = Array.isArray(data) ? data : [data]
    const limitedData = normalizedData.slice(0, parseInt(limit))
    
    // Cache the result
    transcriptCache.set(cacheKey, { data: limitedData, timestamp: Date.now() })
    
    return NextResponse.json(limitedData)

  } catch (error: any) {
    console.error('Error fetching earnings transcripts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings transcripts', details: error.message },
      { status: 500 }
    )
  }
}

// Optional: POST endpoint für Press Releases
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ticker, type = 'earnings' } = body

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    let endpoint = ''
    
    switch(type) {
      case 'earnings':
        endpoint = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${ticker}?apikey=${FMP_API_KEY}`
        break
      case 'press':
        endpoint = `https://financialmodelingprep.com/api/v3/press-releases/${ticker}?apikey=${FMP_API_KEY}`
        break
      case 'news':
        endpoint = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=50&apikey=${FMP_API_KEY}`
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const response = await fetch(endpoint)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error(`Error fetching ${type}:`, error)
    return NextResponse.json(
      { error: `Failed to fetch ${type}`, details: error.message },
      { status: 500 }
    )
  }
}