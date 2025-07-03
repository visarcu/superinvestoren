import { NextRequest, NextResponse } from 'next/server'

interface InsiderTransaction {
  symbol: string
  reportingName: string
  typeOfOwner: string
  transactionDate: string
  transactionType: string
  securitiesOwned: number
  securitiesTransacted: number
  price: number
  securityName: string
  acquiredDisposedCode: string
  formType: string
  link: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '0'
    const limit = searchParams.get('limit') || '100'
    const symbol = searchParams.get('symbol') // Neu: Symbol-spezifische Abfrage
    
    console.log(`🔍 Loading FMP insider trading data - Page: ${page}${symbol ? `, Symbol: ${symbol}` : ''}`)
    
    // URL basierend auf Symbol erstellen
    let apiUrl = 'https://financialmodelingprep.com/api/v4/insider-trading?'
    
    if (symbol) {
      // Ticker-spezifische Abfrage
      apiUrl += `symbol=${symbol.toUpperCase()}&page=${page}&apikey=${process.env.FMP_API_KEY}`
    } else {
      // Allgemeine Abfrage
      apiUrl += `page=${page}&apikey=${process.env.FMP_API_KEY}`
    }
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'SuperInvestor-App/1.0'
      },
      next: { revalidate: symbol ? 1800 : 3600 } // Ticker-specific: 30min, General: 1h Cache
    })
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data: InsiderTransaction[] = await response.json()
    
    // Daten verarbeiten und filtern
    const processedData = data
      .filter((t: any) => t.reportingName && t.transactionDate && (symbol ? t.symbol : true))
      .sort((a: any, b: any) => 
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      )
      .slice(0, parseInt(limit))
    
    const cacheTime = symbol ? 1800 : 3600 // Kürzere Cache-Zeit für ticker-spezifische Daten
    
    return NextResponse.json({
      success: true,
      data: processedData,
      meta: {
        page: parseInt(page),
        count: processedData.length,
        symbol: symbol || null,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=86400`
      }
    })
    
  } catch (error) {
    console.error('❌ Insider trading API error:', error)
    
    return NextResponse.json({ 
      success: false,
      message: 'Failed to fetch insider trading data',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { 
      status: 500 
    })
  }
}