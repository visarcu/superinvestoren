import { NextResponse } from 'next/server'
import { getRequestUser, sanitizeSymbols, unauthorizedResponse } from '@/lib/apiAuth'

const FMP_API_KEY = process.env.FMP_API_KEY

// VEREINFACHTE API: Gibt USD-Preise zurück
// Die Konvertierung zu EUR erfolgt im Frontend mit getEURRate()

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorizedResponse()

    const { symbols: rawSymbols } = await request.json()

    // Höchstens 50 geprüfte Symbole, keine freien Zeichen im FMP-Pfad
    const symbols = sanitizeSymbols(rawSymbols, 50)
    if (symbols === null) {
      return NextResponse.json({ error: 'Too many symbols' }, { status: 400 })
    }
    if (symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 })
    }

    const symbolsString = encodeURIComponent(symbols.join(','))
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