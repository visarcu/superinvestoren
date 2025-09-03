// src/app/api/etf-performance/[symbol]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  // Get 1 year of historical data
  const fromDate = new Date()
  fromDate.setFullYear(fromDate.getFullYear() - 1)
  const toDate = new Date()
  
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

    const prices = data.historical.reverse() // Oldest first
    const currentPrice = prices[prices.length - 1].adjClose
    
    // Calculate performance metrics
    const performance = {
      symbol: data.symbol,
      current: currentPrice,
      '1d': calculatePerformance(currentPrice, prices[prices.length - 2]?.adjClose || currentPrice),
      '1w': calculatePerformance(currentPrice, findPriceNDaysAgo(prices, 7)),
      '1m': calculatePerformance(currentPrice, findPriceNDaysAgo(prices, 30)),
      '3m': calculatePerformance(currentPrice, findPriceNDaysAgo(prices, 90)),
      '6m': calculatePerformance(currentPrice, findPriceNDaysAgo(prices, 180)),
      '1y': calculatePerformance(currentPrice, prices[0]?.adjClose || currentPrice),
      volatility: calculateVolatility(prices),
      maxDrawdown: calculateMaxDrawdown(prices)
    }
    
    return NextResponse.json(performance)
    
  } catch (err) {
    console.error('ETF Performance API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETF performance' }, { status: 502 })
  }
}

function calculatePerformance(current: number, previous: number): number {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

function findPriceNDaysAgo(prices: any[], days: number): number {
  if (prices.length <= days) return prices[0]?.adjClose || 0
  return prices[prices.length - days - 1]?.adjClose || 0
}

function calculateVolatility(prices: any[]): number {
  if (prices.length < 20) return 0
  
  const returns = []
  for (let i = 1; i < prices.length; i++) {
    const ret = Math.log(prices[i].adjClose / prices[i-1].adjClose)
    returns.push(ret)
  }
  
  const mean = returns.reduce((a, b) => a + b) / returns.length
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2)) / returns.length
  return Math.sqrt(variance * 252) * 100 // Annualized volatility
}

function calculateMaxDrawdown(prices: any[]): number {
  let maxPrice = prices[0].adjClose
  let maxDrawdown = 0
  
  for (const price of prices) {
    if (price.adjClose > maxPrice) {
      maxPrice = price.adjClose
    } else {
      const drawdown = (maxPrice - price.adjClose) / maxPrice
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
  }
  
  return maxDrawdown * 100
}