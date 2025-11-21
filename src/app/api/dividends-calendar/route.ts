// Dividends Calendar API - Watchlist Focus
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tickers = searchParams.get('tickers')
    
    if (!tickers) {
      return NextResponse.json({ error: 'Tickers parameter required' }, { status: 400 })
    }

    const tickerList = tickers.split(',').map(t => t.trim()).filter(t => t.length > 0)
    
    if (tickerList.length === 0) {
      return NextResponse.json([])
    }

    console.log(`🗓️ [Dividends Calendar] Loading for ${tickerList.length} tickers: ${tickerList.join(', ')}`)

    // Parallel API calls für alle Tickers
    const dividendPromises = tickerList.map(async (ticker) => {
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.FMP_API_KEY}`
        )
        
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch dividends for ${ticker}`)
          return null
        }
        
        const data = await response.json()
        
        if (!data.historical || !Array.isArray(data.historical)) {
          console.warn(`⚠️ No dividend data for ${ticker}`)
          return null
        }

        // Get current stock price for yield calculation
        const quoteResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.FMP_API_KEY}`
        )
        
        let currentPrice = null
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json()
          currentPrice = quoteData[0]?.price || null
        }

        // Get upcoming and recent dividends (next 6 months + last 6 months)
        const now = new Date()
        const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000))
        const sixMonthsFromNow = new Date(now.getTime() + (6 * 30 * 24 * 60 * 60 * 1000))

        const relevantDividends = data.historical
          .map((div: any) => {
            const dividendAmount = div.dividend || div.adjDividend || 0
            const yield_ = currentPrice && dividendAmount > 0 ? (dividendAmount / currentPrice) * 100 : null
            
            return {
              ticker,
              companyName: data.symbol || ticker,
              date: div.date,
              exDate: div.date,
              paymentDate: div.paymentDate || div.date,
              recordDate: div.recordDate || div.date,
              dividend: dividendAmount,
              yield: yield_,
              currentPrice,
              frequency: estimateFrequency(data.historical)
            }
          })
          .filter((div: any) => {
            const divDate = new Date(div.date)
            return divDate >= sixMonthsAgo && divDate <= sixMonthsFromNow
          })
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

        return relevantDividends

      } catch (error) {
        console.error(`❌ Error fetching dividends for ${ticker}:`, error)
        return null
      }
    })

    const results = await Promise.all(dividendPromises)
    const allDividends = results
      .filter(result => result !== null)
      .flat()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log(`✅ [Dividends Calendar] Loaded ${allDividends.length} dividend events`)
    
    return NextResponse.json(allDividends)

  } catch (error) {
    console.error('❌ Dividends Calendar API Error:', error)
    return NextResponse.json({ error: 'Failed to load dividend calendar' }, { status: 500 })
  }
}

// Helper function to estimate dividend frequency
function estimateFrequency(dividends: any[]): string {
  if (!dividends || dividends.length < 2) return 'Unknown'
  
  const sortedDividends = dividends
    .filter(d => d.dividend > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8) // Last 8 dividends
  
  if (sortedDividends.length < 2) return 'Unknown'
  
  const intervals: number[] = []
  for (let i = 1; i < sortedDividends.length; i++) {
    const diff = new Date(sortedDividends[i-1].date).getTime() - new Date(sortedDividends[i].date).getTime()
    const days = diff / (1000 * 60 * 60 * 24)
    intervals.push(days)
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  
  if (avgInterval < 40) return 'Monthly'
  if (avgInterval < 120) return 'Quarterly'
  if (avgInterval < 200) return 'Semi-Annual'
  return 'Annual'
}