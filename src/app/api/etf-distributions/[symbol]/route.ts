// src/app/api/etf-distributions/[symbol]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${symbol}?apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      console.error(`FMP Dividend History API responded with ${res.status}`)
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()
    
    if (!data.historical || data.historical.length === 0) {
      return NextResponse.json({ distributions: [], yield: 0, frequency: 'N/A' }, { status: 200 })
    }

    // Get last 2 years of distributions
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    
    const recentDistributions = data.historical
      .filter((d: any) => new Date(d.date) >= twoYearsAgo)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12) // Last 12 distributions

    // Calculate annualized yield based on last 4 quarters
    const lastYearDistributions = data.historical
      .filter((d: any) => {
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        return new Date(d.date) >= oneYearAgo
      })
    
    const annualDividends = lastYearDistributions.reduce((sum: number, d: any) => sum + (d.adjDividend || 0), 0)
    
    // Get current price from quote API for accurate yield calculation
    let currentPrice = 500 // fallback
    try {
      const quoteRes = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${process.env.FMP_API_KEY}`)
      if (quoteRes.ok) {
        const quoteData = await quoteRes.json()
        if (quoteData && quoteData.length > 0) {
          currentPrice = quoteData[0].price
        }
      }
    } catch (e) {
      console.log('Could not fetch current price for yield calculation')
    }
    
    const dividendYield = currentPrice > 0 ? (annualDividends / currentPrice) * 100 : 0
    
    // Determine frequency
    const frequency = lastYearDistributions.length >= 4 ? 'Quartalsweise' : 
                     lastYearDistributions.length >= 2 ? 'Halbjährlich' :
                     lastYearDistributions.length >= 1 ? 'Jährlich' : 'Unregelmäßig'
    
    return NextResponse.json({
      symbol: data.symbol,
      distributions: recentDistributions,
      annualDividends,
      yield: dividendYield,
      frequency
    })
    
  } catch (err) {
    console.error('ETF Distributions API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETF distributions' }, { status: 502 })
  }
}