// API Route für Stock Finder - liest aus lokalem JSON Cache
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// In-Memory Cache für schnellere Antworten
let cachedStocks: ScreenerStock[] | null = null
let cacheTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 Minuten

interface ScreenerStock {
  symbol: string
  name: string
  sector: string
  industry: string
  exchange: string
  country: string
  marketCap: number | null
  price: number | null
  pe: number | null
  priceToBook: number | null
  evToEbitda: number | null
  dividendYield: number | null
  beta: number | null
  revenueGrowth1Y: number | null
  revenueGrowth3Y: number | null
  revenueGrowth5Y: number | null
  epsGrowth1Y: number | null
  epsGrowth3Y: number | null
  epsGrowth5Y: number | null
  grossMargin: number | null
  operatingMargin: number | null
  netProfitMargin: number | null
  roe: number | null
  roa: number | null
  roic: number | null
  currentRatio: number | null
  debtToEquity: number | null
  lastUpdated: string
}

async function loadStocks(): Promise<ScreenerStock[]> {
  const now = Date.now()

  // Return cached data if still valid
  if (cachedStocks && (now - cacheTime) < CACHE_DURATION) {
    return cachedStocks
  }

  const filePath = path.join(process.cwd(), 'public', 'data', 'stocks-screener.json')

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    cachedStocks = data.stocks || []
    cacheTime = now
    return cachedStocks
  } catch (error) {
    console.error('Fehler beim Laden der Stock-Daten:', error)
    return []
  }
}

function filterStocks(stocks: ScreenerStock[], filters: Record<string, any>): ScreenerStock[] {
  return stocks.filter(stock => {
    // Numerische Min/Max Filter
    const numericChecks: [string, string, keyof ScreenerStock][] = [
      // Bewertung
      ['marketCapMin', 'marketCapMax', 'marketCap'],
      ['priceMin', 'priceMax', 'price'],
      ['peMin', 'peMax', 'pe'],
      ['priceToBookMin', 'priceToBookMax', 'priceToBook'],
      ['evToEbitdaMin', 'evToEbitdaMax', 'evToEbitda'],
      // dividendYield wird separat behandelt (Dezimal in Daten, Prozent im Filter)
      ['betaMin', 'betaMax', 'beta'],
      // Wachstum
      ['revenueGrowth1YMin', 'revenueGrowth1YMax', 'revenueGrowth1Y'],
      ['revenueGrowth3YMin', 'revenueGrowth3YMax', 'revenueGrowth3Y'],
      ['revenueGrowth5YMin', 'revenueGrowth5YMax', 'revenueGrowth5Y'],
      ['epsGrowth1YMin', 'epsGrowth1YMax', 'epsGrowth1Y'],
      ['epsGrowth3YMin', 'epsGrowth3YMax', 'epsGrowth3Y'],
      ['epsGrowth5YMin', 'epsGrowth5YMax', 'epsGrowth5Y'],
      // Profitabilität
      ['grossMarginMin', 'grossMarginMax', 'grossMargin'],
      ['operatingMarginMin', 'operatingMarginMax', 'operatingMargin'],
      ['netProfitMarginMin', 'netProfitMarginMax', 'netProfitMargin'],
      ['roeMin', 'roeMax', 'roe'],
      ['roaMin', 'roaMax', 'roa'],
      ['roicMin', 'roicMax', 'roic'],
      // Finanzielle Gesundheit
      ['currentRatioMin', 'currentRatioMax', 'currentRatio'],
      ['debtToEquityMin', 'debtToEquityMax', 'debtToEquity'],
    ]

    for (const [minKey, maxKey, field] of numericChecks) {
      const value = stock[field] as number | null

      if (filters[minKey] !== undefined && filters[minKey] !== null) {
        if (value === null || value < filters[minKey]) return false
      }
      if (filters[maxKey] !== undefined && filters[maxKey] !== null) {
        if (value === null || value > filters[maxKey]) return false
      }
    }

    // String Filter (exakte Übereinstimmung)
    if (filters.sector && stock.sector !== filters.sector) return false
    if (filters.industry && stock.industry !== filters.industry) return false
    if (filters.exchange && stock.exchange !== filters.exchange) return false
    if (filters.country && stock.country !== filters.country) return false

    // Dividend Yield Filter (separat weil: Daten sind Dezimal 0.03, Filter ist Prozent 3)
    if (filters.dividendMin !== undefined && filters.dividendMin !== null) {
      const yieldPercent = stock.dividendYield !== null ? stock.dividendYield * 100 : null
      if (yieldPercent === null || yieldPercent < filters.dividendMin) return false
    }
    if (filters.dividendMax !== undefined && filters.dividendMax !== null) {
      const yieldPercent = stock.dividendYield !== null ? stock.dividendYield * 100 : null
      if (yieldPercent === null || yieldPercent > filters.dividendMax) return false
    }

    return true
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filters = {}, limit = 100, offset = 0 } = body

    const allStocks = await loadStocks()

    if (allStocks.length === 0) {
      return NextResponse.json({
        error: 'Stock-Daten noch nicht verfügbar. Bitte später erneut versuchen.',
        stocks: [],
        total: 0
      }, { status: 503 })
    }

    // Filter anwenden
    const filteredStocks = filterStocks(allStocks, filters)

    // Sortierung (nach Market Cap absteigend als Default)
    const sortedStocks = filteredStocks.sort((a, b) => {
      const aVal = a.marketCap || 0
      const bVal = b.marketCap || 0
      return bVal - aVal
    })

    // Pagination
    const paginatedStocks = sortedStocks.slice(offset, offset + limit)

    return NextResponse.json({
      stocks: paginatedStocks,
      total: filteredStocks.length,
      totalInDatabase: allStocks.length,
      filtersApplied: Object.keys(filters).length > 0
    })

  } catch (error) {
    console.error('Stock Finder Search Error:', error)
    return NextResponse.json({
      error: 'Fehler bei der Suche',
      stocks: [],
      total: 0
    }, { status: 500 })
  }
}

// GET für einfache Abfragen ohne Filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const allStocks = await loadStocks()

    if (allStocks.length === 0) {
      return NextResponse.json({
        error: 'Stock-Daten noch nicht verfügbar',
        stocks: [],
        total: 0
      }, { status: 503 })
    }

    // Top Stocks nach Market Cap
    const sortedStocks = allStocks
      .filter(s => s.marketCap && s.marketCap > 0)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(offset, offset + limit)

    return NextResponse.json({
      stocks: sortedStocks,
      total: allStocks.length
    })

  } catch (error) {
    console.error('Stock Finder GET Error:', error)
    return NextResponse.json({
      error: 'Fehler beim Laden der Daten',
      stocks: [],
      total: 0
    }, { status: 500 })
  }
}
