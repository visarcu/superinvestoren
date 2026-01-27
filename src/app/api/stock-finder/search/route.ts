// API Route für Stock Finder - liest aus lokalem JSON Cache
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { etfs } from '@/data/etfs'
import { OptimizedFinancialRAGSystem } from '@/lib/ragOptimized'

// RAG System Instanz
const ragSystem = new OptimizedFinancialRAGSystem()
let ragInitialized = false

// In-Memory Cache für schnellere Antworten
let cachedStocks: ScreenerStock[] | null = null
let cacheTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 Minuten

// ETF-Symbole als Set für schnelle Lookup
const etfSymbols = new Set(etfs.map(e => e.symbol.toUpperCase()))

// Prüft ob ein Stock ein ETF oder Mutual Fund ist (basierend auf Symbol und Name)
function isETFOrMutualFund(symbol: string, name?: string): boolean {
  // 1. Check gegen ETF-Registry
  if (etfSymbols.has(symbol.toUpperCase())) return true

  const upperSymbol = symbol.toUpperCase()

  // 2. Mutual Fund Symbol-Patterns (enden typischerweise auf X)
  // Beispiele: VSMPX, VFIAX, PMFLX, FXAIX
  if (upperSymbol.length === 5 && upperSymbol.endsWith('X')) {
    // Bekannte Mutual Fund Prefixe
    const mutualFundPrefixes = ['VS', 'VF', 'VT', 'VB', 'VI', 'PM', 'FX', 'FD', 'SW', 'TR', 'PR']
    if (mutualFundPrefixes.some(prefix => upperSymbol.startsWith(prefix))) {
      return true
    }
  }

  // 3. Check Name-Patterns
  if (name) {
    const upperName = name.toUpperCase()

    // Direkte ETF-Kennzeichnung
    if (upperName.includes(' ETF') || upperName.endsWith(' ETF') || upperName.startsWith('ETF ')) {
      return true
    }

    // Mutual Fund Patterns
    if (upperName.includes('INDEX FD') || upperName.includes('INDEX FUND') ||
      upperName.includes('ADMIRAL') || upperName.includes('INVESTOR SH') ||
      upperName.includes('INSTITUTIONAL') || upperName.includes('INSTL') ||
      upperName.includes('MUTUAL FUND')) {
      return true
    }

    // Bekannte ETF/Fund-Issuer + Trust/Fund Kombination
    const fundIssuers = ['ISHARES', 'VANGUARD', 'SPDR', 'INVESCO', 'PROSHARES',
      'WISDOMTREE', 'VANECK', 'SCHWAB', 'XTRACKERS', 'AMUNDI',
      'FIDELITY', 'PIMCO', 'T. ROWE', 'BLACKROCK', 'JPMORGAN',
      'AMERICAN FUNDS', 'FRANKLIN', 'PUTNAM', 'DODGE & COX']
    const fundKeywords = ['ETF', 'TRUST', 'FUND', 'INDEX', 'PORTFOLIO']

    const hasIssuer = fundIssuers.some(issuer => upperName.includes(issuer))
    const hasKeyword = fundKeywords.some(keyword => upperName.includes(keyword))

    if (hasIssuer && hasKeyword) {
      return true
    }
  }

  return false
}

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
    const allStocks: ScreenerStock[] = data.stocks || []
    // ETFs und Mutual Funds rausfiltern - Stock Finder zeigt nur Einzelaktien
    const stocks = allStocks.filter(s => !isETFOrMutualFund(s.symbol, s.name))
    cachedStocks = stocks
    cacheTime = now
    return stocks
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

    // 1. Thematische Suche (RAG)
    let thematicTickers: string[] = []
    if (filters.isThematic && filters.thematicTopic) {
      try {
        if (!ragInitialized) {
          await ragSystem.initialize()
          ragInitialized = true
        }

        console.log(`[Stock Finder] Thematic Search: ${filters.thematicTopic}`)
        const results = await ragSystem.search({
          query: filters.thematicTopic,
          limit: 40 // Etwas mehr Treffer für bessere Filter-Basis
        })

        thematicTickers = results
          .map(r => r.metadata?.ticker)
          .filter((t): t is string => !!t)

        // Ticker normieren und Duplikate entfernen
        thematicTickers = [...new Set(thematicTickers.map(t => t.toUpperCase()))]
        console.log(`[Stock Finder] RAG matched ${thematicTickers.length} unique tickers for "${filters.thematicTopic}"`)
      } catch (ragError) {
        console.error('[Stock Finder] RAG Search failed:', ragError)
        // Bei Fehler machen wir mit dem Standard-Screener weiter
      }
    }

    // 2. Basis-Menge festlegen (RAG Treffer oder alle)
    let baseStocks = allStocks
    if (filters.isThematic && thematicTickers.length > 0) {
      baseStocks = allStocks.filter(s => thematicTickers.includes(s.symbol.toUpperCase()))
    } else if (filters.isThematic && thematicTickers.length === 0) {
      // Wenn thematic gewünscht aber nichts gefunden wurde, geben wir ggf. nichts zurück 
      // oder machen Full-Search (hier: leer lassen damit User Feedback bekommt)
      baseStocks = []
    }

    // 3. Quantitative Filter anwenden
    const filteredStocks = filterStocks(baseStocks, filters)

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
