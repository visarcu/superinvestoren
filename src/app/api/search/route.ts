import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  
  if (!query || query.length < 2) return NextResponse.json([])
  
  const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&apikey=${process.env.FMP_API_KEY}`
  
  try {
    console.log(`🔍 Stock search for: "${query}"`)
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('FMP API error:', response.status, response.statusText)
      return NextResponse.json([])
    }
    
    const data = await response.json()
    console.log(`📊 Found ${data?.length || 0} results for "${query}"`)
    
    if (!Array.isArray(data)) {
      console.error('Unexpected data format:', data)
      return NextResponse.json([])
    }
    
    // Transform data to match expected format and filter for relevant exchanges
    const transformedData = data
      .filter(item => 
        item.symbol && 
        item.name &&
        // Focus on major US exchanges
        (item.exchangeShortName === 'NASDAQ' || 
         item.exchangeShortName === 'NYSE' || 
         item.exchangeShortName === 'AMEX')
      )
      .slice(0, 10)
      .map(item => ({
        symbol: item.symbol,
        name: item.name,
        stockExchange: item.stockExchange || item.exchange,
        exchangeShortName: item.exchangeShortName
      }))
    
    console.log(`✅ Returning ${transformedData.length} filtered results`)
    return NextResponse.json(transformedData)
    
  } catch (error) {
    console.error('Stock search error:', error)
    return NextResponse.json([])
  }
}