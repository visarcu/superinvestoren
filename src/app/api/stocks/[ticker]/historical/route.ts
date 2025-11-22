import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase()
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }

    const FMP_API_KEY = process.env.FMP_API_KEY
    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 })
    }

    // Get historical price from FMP API
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${date}&to=${date}&apikey=${FMP_API_KEY}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('FMP API request failed')
    }

    const data = await response.json()
    
    if (!data.historical || data.historical.length === 0) {
      // If no data for exact date, try to get closest available data
      const fallbackUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?timeseries=30&apikey=${FMP_API_KEY}`
      const fallbackResponse = await fetch(fallbackUrl)
      const fallbackData = await fallbackResponse.json()
      
      if (fallbackData.historical && fallbackData.historical.length > 0) {
        // Find closest date
        const targetDate = new Date(date)
        const closest = fallbackData.historical.reduce((prev: any, curr: any) => {
          const prevDiff = Math.abs(new Date(prev.date).getTime() - targetDate.getTime())
          const currDiff = Math.abs(new Date(curr.date).getTime() - targetDate.getTime())
          return currDiff < prevDiff ? curr : prev
        })
        
        return NextResponse.json({ 
          price: closest.close,
          date: closest.date,
          fallback: true
        })
      }
      
      return NextResponse.json({ error: 'No historical data found' }, { status: 404 })
    }

    const historicalPrice = data.historical[0]
    
    return NextResponse.json({
      price: historicalPrice.close,
      date: historicalPrice.date,
      fallback: false
    })

  } catch (error) {
    console.error('Error fetching historical price:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical price' },
      { status: 500 }
    )
  }
}