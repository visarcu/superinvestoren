import { NextRequest, NextResponse } from 'next/server'

interface SegmentationData {
  segment: string
  totalRevenue: number
  [key: string]: any
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const { searchParams } = new URL(request.url)
  
  const segmentType = searchParams.get('type') || 'product' // 'product' or 'geographic'
  // FMP v4 kennt nur 'annual' und 'quarter' — 'quarterly' liefert sonst stillschweigend Jahresdaten
  const rawPeriod = searchParams.get('period') || 'annual'
  const period = rawPeriod === 'quarterly' ? 'quarter' : rawPeriod
  const structure = searchParams.get('structure') || 'flat'
  
  // Validate ticker format (security check)
  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  // Validate segmentType (security check)
  if (!['product', 'geographic'].includes(segmentType)) {
    return NextResponse.json({ error: 'Invalid segment type' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    // Determine API endpoint based on segmentType
    const endpoint = segmentType === 'product' 
      ? 'revenue-product-segmentation' 
      : 'revenue-geographic-segmentation'
    
    console.log(`🔍 Fetching ${segmentType} segmentation for ${ticker}...`)

    const fetchSegments = async (p: string): Promise<SegmentationData[]> => {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v4/${endpoint}?symbol=${ticker}&structure=${structure}&period=${p}&apikey=${apiKey}`,
        {
          next: { revalidate: 3600 } // Cache for 1 hour
        }
      )
      if (!response.ok) {
        throw new Error(`FMP API responded with status ${response.status}`)
      }
      const data = await response.json()
      return Array.isArray(data) ? data : []
    }

    let effectivePeriod = period
    let segments = await fetchSegments(period)

    // Frisch gelistete Unternehmen (z.B. IPO im laufenden Jahr) haben noch keinen 10-K,
    // daher existieren nur Quartals-Segmente — dann darauf zurückfallen
    if (segments.length === 0 && period === 'annual') {
      const quarterly = await fetchSegments('quarter')
      if (quarterly.length > 0) {
        segments = quarterly
        effectivePeriod = 'quarter'
      }
    }

    console.log(`✅ ${segmentType} segmentation API successful: ${segments.length} segments for ${ticker} (${effectivePeriod})`)

    return NextResponse.json({
      success: true,
      data: segments,
      segmentType,
      ticker: ticker.toUpperCase(),
      period: effectivePeriod,
      totalSegments: segments.length
    })

  } catch (error) {
    console.error(`Revenue segmentation error for ${ticker} (${segmentType}):`, error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch revenue segmentation data',
      data: [],
      segmentType,
      ticker,
      period
    }, { status: 500 })
  }
}