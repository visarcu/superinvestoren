// src/app/api/stock-lists/[listId]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { listId: string } }
) {
  const { listId } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  try {
    let endpoint = ''
    
    switch (listId) {
      case 'market-cap-global':
        endpoint = `https://financialmodelingprep.com/api/v3/market-capitalization?limit=100&apikey=${apiKey}`
        break
      case 'sp500':
        endpoint = `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${apiKey}`
        break
      case 'gainers-today':
        endpoint = `https://financialmodelingprep.com/api/v3/gainers?apikey=${apiKey}`
        break
      case 'losers-today':
        endpoint = `https://financialmodelingprep.com/api/v3/losers?apikey=${apiKey}`
        break
      default:
        return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 })
    }

    const response = await fetch(endpoint)
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({ 
      data: data.slice(0, 100), // Limit to 100 items
      listId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Stock list API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock list' }, 
      { status: 500 }
    )
  }
}