import { NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

// VEREINFACHTE API: Gibt USD-Preise zurück
// Die Konvertierung zu EUR erfolgt im Frontend mit getEURRate()

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json()

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 })
    }

    // Rate limiting
    if (symbols.length > 50) {
      return NextResponse.json({ error: 'Too many symbols' }, { status: 400 })
    }

    const symbolsString = symbols.join(',')
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${FMP_API_KEY}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data = await response.json()
    const quotes = Array.isArray(data) ? data : [data]

    // Einfache Rückgabe in USD - keine Konvertierung hier!
    return NextResponse.json({
      quotes: quotes.map((quote: any) => ({
        symbol: quote.symbol || '',
        name: quote.name || quote.symbol || '',
        price: quote.price || 0,           // USD!
        change: quote.change || 0,          // USD!
        changesPercentage: quote.changesPercentage || 0,
        marketCap: quote.marketCap,
        pe: quote.pe,
        currency: 'USD'                     // Klar markiert als USD
      }))
    })

  } catch (error) {
    console.error('Portfolio quotes API error:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}