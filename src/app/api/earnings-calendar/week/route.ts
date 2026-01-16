// API Route for Weekly Earnings Calendar - Fey-style all earnings for a date range
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FMP_API_KEY = process.env.FMP_API_KEY

// Minimum Market Cap für Large-Cap Filter ($10 Mrd.)
const MIN_MARKET_CAP = 10_000_000_000

interface EarningsEvent {
  symbol: string
  name: string
  date: string
  time: 'bmo' | 'amc' | 'dmh' | string
  epsEstimate: number | null
  revenueEstimate: number | null
  marketCap: number | null
}

// Cache für Stock-Daten
let stockDataCache: Map<string, { marketCap: number | null; name: string }> | null = null
let cacheTime = 0
const CACHE_DURATION = 10 * 60 * 1000 // 10 Minuten

async function loadStockData(): Promise<Map<string, { marketCap: number | null; name: string }>> {
  const now = Date.now()

  if (stockDataCache && (now - cacheTime) < CACHE_DURATION) {
    return stockDataCache
  }

  const map = new Map<string, { marketCap: number | null; name: string }>()

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'stocks-screener.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    if (data.stocks && Array.isArray(data.stocks)) {
      data.stocks.forEach((stock: any) => {
        map.set(stock.symbol?.toUpperCase(), {
          marketCap: stock.marketCap || null,
          name: stock.name || stock.symbol
        })
      })
    }

    stockDataCache = map
    cacheTime = now
    console.log(`📊 Loaded ${map.size} stocks from screener cache`)
  } catch (error) {
    console.error('Failed to load stock data:', error)
  }

  return map
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from/to date parameters' }, { status: 400 })
    }

    console.log(`📅 Loading weekly earnings calendar: ${from} to ${to}`)

    // Load stock data for market cap enrichment
    const stockData = await loadStockData()

    // Fetch earnings calendar from FMP with date range
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`,
      { next: { revalidate: 900 } } // 15 min cache
    )

    if (!response.ok) {
      console.error('FMP API error:', response.status)
      return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 })
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return NextResponse.json({ earnings: [] })
    }

    // Transform to our format and enrich with market cap
    const earnings: EarningsEvent[] = data
      .filter(event => event.symbol && event.date)
      .map(event => {
        const stockInfo = stockData.get(event.symbol?.toUpperCase())
        return {
          symbol: event.symbol,
          name: stockInfo?.name || event.symbol,
          date: event.date,
          time: mapTimeToCode(event.time),
          epsEstimate: event.epsEstimated ? parseFloat(event.epsEstimated) : null,
          revenueEstimate: event.revenueEstimated ? parseFloat(event.revenueEstimated) : null,
          marketCap: stockInfo?.marketCap || null,
        }
      })
      .sort((a, b) => {
        // Sort by date, then by time (bmo first)
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        if (a.time === 'bmo' && b.time !== 'bmo') return -1
        if (a.time !== 'bmo' && b.time === 'bmo') return 1
        return 0
      })

    console.log(`📅 Found ${earnings.length} earnings events for week`)

    return NextResponse.json(
      {
        earnings,
        meta: {
          from,
          to,
          total: earnings.length
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600'
        }
      }
    )

  } catch (error) {
    console.error('❌ Weekly Earnings Calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar' },
      { status: 500 }
    )
  }
}

// Map FMP time strings to standard codes
function mapTimeToCode(time: string | null): 'bmo' | 'amc' | 'dmh' {
  if (!time) return 'amc' // Default to after market close

  const lowerTime = time.toLowerCase()

  if (lowerTime.includes('bmo') || lowerTime.includes('before') || lowerTime.includes('pre')) {
    return 'bmo'
  }
  if (lowerTime.includes('amc') || lowerTime.includes('after') || lowerTime.includes('post')) {
    return 'amc'
  }
  if (lowerTime.includes('dmh') || lowerTime.includes('during')) {
    return 'dmh'
  }

  // Parse time strings like "9:30 AM"
  if (lowerTime.includes('am')) {
    const hour = parseInt(lowerTime)
    if (hour < 10) return 'bmo'
  }
  if (lowerTime.includes('pm')) {
    const hour = parseInt(lowerTime)
    if (hour >= 4) return 'amc'
  }

  return 'amc' // Default
}
