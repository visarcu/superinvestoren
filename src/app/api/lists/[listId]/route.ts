// src/app/api/lists/[listId]/route.ts - HYBRID VERSION
import { NextResponse } from 'next/server'
import { STOCK_LISTS_CONFIG } from '@/lib/stockLists'

export async function GET(
  req: Request,
  { params }: { params: { listId: string } }
) {
  const { listId } = params
  const apiKey = process.env.FMP_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  const listConfig = STOCK_LISTS_CONFIG[listId]
  if (!listConfig) {
    return NextResponse.json({ error: `Liste "${listId}" nicht gefunden` }, { status: 404 })
  }

  async function fetchJson(url: string) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`FMP fetch failed: ${url}`)
    }
    return response.json()
  }

  // Datenvalidierung
  function validateMarketCap(marketCap: number): boolean {
    const MIN_MARKET_CAP = 100 * 1e6
    const MAX_MARKET_CAP = 10 * 1e12
    return marketCap >= MIN_MARKET_CAP && marketCap <= MAX_MARKET_CAP
  }

  function validatePrice(price: number): boolean {
    return price >= 0.01 && price <= 100000
  }

  function validateSymbol(symbol: string): boolean {
    const problematicPatterns = [
      /^\d+\.KS$/, /\.PA$/, /\.L$/, /\.HK$/, /\.TO$/
    ]
    return !problematicPatterns.some(pattern => pattern.test(symbol))
  }

  try {
    let stocksData: any[] = []
    let dataSource = ''

    // ========== HYBRID LOGIC ==========
    
    // 1) Manual symbols (kuratierte Listen)
    if (listConfig.useManualSymbols && listConfig.symbols) {
      console.log(`🎨 Loading curated list: ${listConfig.title} (${listConfig.symbols.length} symbols)`)
      dataSource = 'Manual Curation'
      
      const validSymbols = listConfig.symbols.filter(validateSymbol)
      const chunks = []
      for (let i = 0; i < validSymbols.length; i += 50) {
        chunks.push(validSymbols.slice(i, i + 50))
      }
      
      const allQuotes = []
      for (const chunk of chunks) {
        const symbols = chunk.join(',')
        const url = `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${apiKey}`
        
        try {
          const quotes = await fetchJson(url)
          if (Array.isArray(quotes)) {
            allQuotes.push(...quotes)
          }
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`❌ Error loading chunk:`, error)
        }
      }
      
      stocksData = allQuotes
        .filter((q: any) => {
          const hasValidMarketCap = q.marketCap && validateMarketCap(q.marketCap)
          const hasValidPrice = q.price && validatePrice(q.price)
          const hasValidSymbol = q.symbol && validateSymbol(q.symbol)
          return hasValidMarketCap && hasValidPrice && hasValidSymbol
        })
        .sort((a: any, b: any) => (b.marketCap || 0) - (a.marketCap || 0))
    }
    
    // 2) Index APIs with fallback (S&P 500, NASDAQ)
    else if (listConfig.apiEndpoint.includes('constituent_or_fallback')) {
      console.log(`📊 Loading index: ${listConfig.title} (API with fallback)`)
      
      let indexSymbols: string[] = []
      let apiSuccess = false
      
      // Try API first
      try {
        if (listConfig.apiEndpoint.includes('sp500')) {
          console.log('🔍 Trying S&P 500 constituent API...')
          const response = await fetchJson(
            `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${apiKey}`
          )
          if (Array.isArray(response) && response.length > 0) {
            indexSymbols = response.map((item: any) => item.symbol).filter(validateSymbol)
            apiSuccess = true
            dataSource = 'S&P 500 API'
            console.log(`✅ S&P 500 API successful: ${indexSymbols.length} symbols`)
          }
        } 
        else if (listConfig.apiEndpoint.includes('nasdaq')) {
          console.log('🔍 Trying NASDAQ 100 constituent API...')
          const response = await fetchJson(
            `https://financialmodelingprep.com/api/v3/nasdaq_constituent?apikey=${apiKey}`
          )
          if (Array.isArray(response) && response.length > 0) {
            indexSymbols = response.map((item: any) => item.symbol).filter(validateSymbol)
            apiSuccess = true
            dataSource = 'NASDAQ 100 API'
            console.log(`✅ NASDAQ 100 API successful: ${indexSymbols.length} symbols`)
          }
        }
      } catch (error) {
        console.log(`⚠️ Index API failed: ${error}`)
      }
      
      // Fallback to manual symbols if API failed
      if (!apiSuccess && listConfig.symbols) {
        console.log(`🔄 Falling back to manual symbols for ${listConfig.title}`)
        indexSymbols = listConfig.symbols.filter(validateSymbol)
        dataSource = 'Manual Fallback'
      }
      
      // Get live quotes for symbols
      if (indexSymbols.length > 0) {
        const chunks = []
        for (let i = 0; i < indexSymbols.length; i += 50) {
          chunks.push(indexSymbols.slice(i, i + 50))
        }
        
        const allQuotes = []
        for (const chunk of chunks) {
          const symbols = chunk.join(',')
          const url = `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${apiKey}`
          
          try {
            const quotes = await fetchJson(url)
            if (Array.isArray(quotes)) {
              allQuotes.push(...quotes)
            }
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.error(`❌ Error loading quotes chunk:`, error)
          }
        }
        
        stocksData = allQuotes
          .filter((q: any) => {
            const hasValidMarketCap = q.marketCap && validateMarketCap(q.marketCap)
            const hasValidPrice = q.price && validatePrice(q.price)
            const hasValidSymbol = q.symbol && validateSymbol(q.symbol)
            return hasValidMarketCap && hasValidPrice && hasValidSymbol
          })
          .sort((a: any, b: any) => (b.marketCap || 0) - (a.marketCap || 0))
      }
    }
    
    // 3) Performance APIs (gainers, losers, actives)
    else {
      console.log(`📈 Loading performance list: ${listConfig.title}`)
      
      let url = ''
      switch (listConfig.apiEndpoint) {
        case 'gainers':
          url = `https://financialmodelingprep.com/api/v3/gainers?apikey=${apiKey}`
          dataSource = 'Gainers API'
          break
        case 'losers':
          url = `https://financialmodelingprep.com/api/v3/losers?apikey=${apiKey}`
          dataSource = 'Losers API'
          break
        case 'actives':
          url = `https://financialmodelingprep.com/api/v3/actives?apikey=${apiKey}`
          dataSource = 'Most Active API'
          break
        default:
          throw new Error(`Unbekannter API-Endpunkt: ${listConfig.apiEndpoint}`)
      }
      
      const rawData = await fetchJson(url)
      
      if (!Array.isArray(rawData)) {
        throw new Error('Keine Daten von der API erhalten')
      }
      
      stocksData = rawData
        .filter((item: any) => {
          const marketCap = item.marketCap || item.marketCapitalization
          const price = item.price
          const symbol = item.symbol || item.ticker
          
          if (marketCap && !validateMarketCap(marketCap)) return false
          if (price && !validatePrice(price)) return false
          return true
        })
        .slice(0, 50)
    }

    // Normalize data structure
    const normalizedData = stocksData.map((item: any) => ({
      symbol: item.symbol || item.ticker,
      name: item.name || item.companyName,
      marketCap: item.marketCap || item.marketCapitalization,
      price: item.price,
      change: item.change || item.changes,
      changePercentage: item.changesPercentage || item.changePercentage,
      volume: item.volume,
      sector: item.sector || listConfig.title,
      industry: item.industry
    }))

    console.log(`✅ ${listConfig.title}: ${normalizedData.length} stocks loaded via ${dataSource}`)

    return NextResponse.json({
      success: true,
      listConfig,
      data: normalizedData,
      metadata: {
        totalProcessed: stocksData.length,
        validEntries: normalizedData.length,
        dataSource,
        listType: listConfig.listType,
        updateFrequency: listConfig.updateFrequency,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error(`❌ Error loading list ${listId}:`, error)
    return NextResponse.json({ 
      error: error.message || 'Fehler beim Laden der Liste' 
    }, { status: 500 })
  }
}