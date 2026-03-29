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
    const filtered = data.filter(item =>
      item.symbol &&
      item.name &&
      // Focus on major US exchanges
      (item.exchangeShortName === 'NASDAQ' ||
       item.exchangeShortName === 'NYSE' ||
       item.exchangeShortName === 'AMEX')
    )

    const q = query.toUpperCase()

    // Sort: exact ticker match first, then ticker starts-with, then name starts-with, then rest
    filtered.sort((a, b) => {
      const aExact = a.symbol.toUpperCase() === q ? 0 : a.symbol.toUpperCase().startsWith(q) ? 1 : a.name.toUpperCase().startsWith(q) ? 2 : 3
      const bExact = b.symbol.toUpperCase() === q ? 0 : b.symbol.toUpperCase().startsWith(q) ? 1 : b.name.toUpperCase().startsWith(q) ? 2 : 3
      return aExact - bExact
    })

    const transformedData = filtered
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