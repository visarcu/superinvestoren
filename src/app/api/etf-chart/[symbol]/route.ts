// src/app/api/etf-chart/[symbol]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '1y' // 1y, 6m, 3m, 1m, max

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  // Calculate date range based on period
  const toDate = new Date()
  const fromDate = new Date()
  
  switch (period) {
    case '1m':
      fromDate.setMonth(fromDate.getMonth() - 1)
      break
    case '3m':
      fromDate.setMonth(fromDate.getMonth() - 3)
      break
    case '6m':
      fromDate.setMonth(fromDate.getMonth() - 6)
      break
    case 'max':
      fromDate.setFullYear(fromDate.getFullYear() - 20) // 20 years of data
      break
    case '1y':
    default:
      fromDate.setFullYear(fromDate.getFullYear() - 1)
      break
  }
  
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}&apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      console.error(`FMP Historical Price API responded with ${res.status}`)
      return NextResponse.json({ error: 'Data not available' }, { status: res.status })
    }

    const data = await res.json()
    
    if (!data.historical || data.historical.length === 0) {
      return NextResponse.json({ error: 'No historical data available' }, { status: 404 })
    }

    // Format data for Chart.js
    const chartData = data.historical
      .reverse() // Oldest first
      .map((item: any) => ({
        date: item.date,
        price: item.adjClose,
        timestamp: new Date(item.date).getTime()
      }))

    return NextResponse.json({
      symbol: data.symbol,
      period,
      data: chartData
    })
    
  } catch (err) {
    console.error('ETF Chart API error:', err)
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 502 })
  }
}