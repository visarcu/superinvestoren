import { NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

// 🆕 NEU: Exchange Rate Cache (5 Minuten gültig)
let exchangeRateCache: { rate: number, timestamp: number } | null = null

async function getEURUSDRate(): Promise<number> {
  // Check cache (5 Minuten gültig)
  if (exchangeRateCache && Date.now() - exchangeRateCache.timestamp < 5 * 60 * 1000) {
    console.log('Using cached EUR/USD rate:', exchangeRateCache.rate)
    return exchangeRateCache.rate
  }

  try {
    console.log('Fetching fresh EUR/USD rate...')
    // FMP Exchange Rate API
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/fx/EURUSD?apikey=${FMP_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`)
    }
    
    const data = await response.json()
    const rate = data[0]?.price || 1.1 // Fallback: ~1.1 USD/EUR
    
    // Cache the rate
    exchangeRateCache = { rate, timestamp: Date.now() }
    console.log('Fresh EUR/USD rate:', rate)
    return rate
    
  } catch (error) {
    console.error('Exchange rate error:', error)
    console.log('Using fallback EUR/USD rate: 1.1')
    return 1.1 // Fallback rate
  }
}

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json()
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 })
    }

    // Rate limiting (optional)
    if (symbols.length > 50) {
      return NextResponse.json({ error: 'Too many symbols' }, { status: 400 })
    }

    // 🆕 NEU: Hole EUR/USD Kurs
    const eurUsdRate = await getEURUSDRate()

    const symbolsString = symbols.join(',')
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${FMP_API_KEY}`
    
    console.log('Fetching quotes for symbols:', symbols)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data = await response.json()
    const quotes = Array.isArray(data) ? data : [data]
    
    console.log('Converting prices from USD to EUR with rate:', eurUsdRate)
    
    return NextResponse.json({
      quotes: quotes.map((quote: any) => {
        const priceEUR = quote.price ? (quote.price / eurUsdRate) : 0
        const changeEUR = quote.change ? (quote.change / eurUsdRate) : 0
        
        console.log(`${quote.symbol}: $${quote.price} USD → €${priceEUR.toFixed(2)} EUR`)
        
        return {
          symbol: quote.symbol || '',
          name: quote.name || quote.symbol || '',
          // 🆕 NEU: USD zu EUR Umrechnung
          price: priceEUR,
          changesPercentage: quote.changesPercentage || 0,
          change: changeEUR,
          marketCap: quote.marketCap,
          pe: quote.pe,
          // 🆕 NEU: Debug Info
          priceUSD: quote.price || 0,
          currency: 'EUR',
          exchangeRate: eurUsdRate
        }
      })
    })

  } catch (error) {
    console.error('Portfolio quotes API error:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}