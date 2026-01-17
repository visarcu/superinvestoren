// src/app/api/screener/route.ts
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    
    // Build FMP API URL
    const fmpParams = new URLSearchParams()
    
    // Market Cap
    if (searchParams.get('marketCapMoreThan')) {
      fmpParams.append('marketCapMoreThan', searchParams.get('marketCapMoreThan')!)
    }
    if (searchParams.get('marketCapLowerThan')) {
      fmpParams.append('marketCapLowerThan', searchParams.get('marketCapLowerThan')!)
    }
    
    // Price
    if (searchParams.get('priceMoreThan')) {
      fmpParams.append('priceMoreThan', searchParams.get('priceMoreThan')!)
    }
    if (searchParams.get('priceLowerThan')) {
      fmpParams.append('priceLowerThan', searchParams.get('priceLowerThan')!)
    }
    
    // Beta
    if (searchParams.get('betaMoreThan')) {
      fmpParams.append('betaMoreThan', searchParams.get('betaMoreThan')!)
    }
    if (searchParams.get('betaLowerThan')) {
      fmpParams.append('betaLowerThan', searchParams.get('betaLowerThan')!)
    }
    
    // Volume
    if (searchParams.get('volumeMoreThan')) {
      fmpParams.append('volumeMoreThan', searchParams.get('volumeMoreThan')!)
    }
    if (searchParams.get('volumeLowerThan')) {
      fmpParams.append('volumeLowerThan', searchParams.get('volumeLowerThan')!)
    }
    
    // Dividend - FMP nutzt dividendYieldMoreThan/LowerThan
    if (searchParams.get('dividendMoreThan')) {
      const divPercent = parseFloat(searchParams.get('dividendMoreThan')!)
      fmpParams.append('dividendYieldMoreThan', (divPercent / 100).toString())
    }
    if (searchParams.get('dividendLowerThan')) {
      const divPercent = parseFloat(searchParams.get('dividendLowerThan')!)
      fmpParams.append('dividendYieldLowerThan', (divPercent / 100).toString())
    }
    
    // Other filters
    if (searchParams.get('sector')) {
      fmpParams.append('sector', searchParams.get('sector')!)
    }
    if (searchParams.get('industry')) {
      fmpParams.append('industry', searchParams.get('industry')!)
    }
    if (searchParams.get('country')) {
      fmpParams.append('country', searchParams.get('country')!)
    }
    if (searchParams.get('exchange')) {
      fmpParams.append('exchange', searchParams.get('exchange')!)
    }

    // P/E Ratio Filter (für Stock Finder)
    if (searchParams.get('peMoreThan')) {
      fmpParams.append('peMoreThan', searchParams.get('peMoreThan')!)
    }
    if (searchParams.get('peLowerThan')) {
      fmpParams.append('peLowerThan', searchParams.get('peLowerThan')!)
    }

    // EPS Filter
    if (searchParams.get('epsMoreThan')) {
      fmpParams.append('epsMoreThan', searchParams.get('epsMoreThan')!)
    }
    if (searchParams.get('epsLowerThan')) {
      fmpParams.append('epsLowerThan', searchParams.get('epsLowerThan')!)
    }
    
    // Force ETFs to be excluded for stock screener
    fmpParams.append('isEtf', 'false')
    
    if (searchParams.get('isActivelyTrading')) {
      fmpParams.append('isActivelyTrading', searchParams.get('isActivelyTrading')!)
    }
    
    // Limit - maximize premium FMP plan potential
    const limit = searchParams.get('limit') || '1000'
    fmpParams.append('limit', limit)
    
    // Add API key
    fmpParams.append('apikey', FMP_API_KEY)
    
    // Fetch from FMP - reduced cache time for fresher data
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock-screener?${fmpParams.toString()}`,
      {
        next: { revalidate: 60 } // Cache for 1 minute only
      }
    )
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Additional filtering for better stock screening
    let filteredData = data.filter((stock: any) => {
      // Remove ETFs, Funds, and other non-stock instruments
      if (!stock.symbol || !stock.companyName) return false
      
      const name = stock.companyName.toUpperCase()
      const symbol = stock.symbol.toUpperCase()
      
      // More precise ETF/Fund filtering - only clear indicators
      const etfFundPatterns = [
        'INDEX FUND', 'ETF', ' FUND', 'SPDR', 'ISHARES', 'VANGUARD TOTAL',
        'VANGUARD S&P', 'VANGUARD 500', 'INVESCO QQQ', 'PROSHARES', 'DIREXION'
      ]
      
      for (const pattern of etfFundPatterns) {
        if (name.includes(pattern)) {
          return false
        }
      }
      
      // Filter symbols that are clearly ETFs
      if (symbol.endsWith('ETF') || symbol.includes('SPY') || symbol.includes('QQQ')) {
        return false
      }
      
      return true
    })
    
    // Additional dividend filtering
    if (searchParams.get('dividendMoreThan')) {
      const minDividend = parseFloat(searchParams.get('dividendMoreThan')!) / 100
      filteredData = filteredData.filter((stock: any) => {
        // Berechne Dividendenrendite aus lastAnnualDividend und price
        if (stock.lastAnnualDividend && stock.price) {
          const calculatedYield = stock.lastAnnualDividend / stock.price
          return calculatedYield >= minDividend
        }
        // Oder nutze vorhandene dividendYield
        return stock.dividendYield && stock.dividendYield >= minDividend
      })
    }
    
    // Bereinige die Daten und füge PE Ratio hinzu
    let cleanedData = filteredData.map((stock: any) => ({
      symbol: stock.symbol,
      companyName: stock.companyName,
      marketCap: stock.marketCap,
      price: stock.price,
      changesPercentage: !isNaN(stock.changesPercentage) && stock.changesPercentage !== null 
        ? stock.changesPercentage 
        : 0,
      change: stock.change || 0,
      dayLow: stock.dayLow,
      dayHigh: stock.dayHigh,
      yearHigh: stock.yearHigh,
      yearLow: stock.yearLow,
      volume: stock.volume,
      avgVolume: stock.avgVolume,
      exchange: stock.exchange,
      pe: stock.pe || null, // P/E Ratio hinzufügen
      eps: stock.eps || null,
      beta: stock.beta || null,
      lastDiv: stock.lastAnnualDividend || null,
      dividendYield: stock.lastAnnualDividend && stock.price 
        ? (stock.lastAnnualDividend / stock.price) 
        : stock.dividendYield || null,
      sector: stock.sector,
      industry: stock.industry,
      country: stock.country
    }))

    // Get live quotes for top results if requested
    const liveQuotes = searchParams.get('liveQuotes')
    if (liveQuotes === 'true' && cleanedData.length > 0) {
      const topSymbols = cleanedData.slice(0, 100).map((stock: any) => stock.symbol)
      
      try {
        // Add timeout to prevent slow responses
        const quotesResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${topSymbols.join(',')}?apikey=${FMP_API_KEY}`,
          { 
            signal: AbortSignal.timeout(3000) // 3 second timeout
          }
        )
        
        if (quotesResponse.ok) {
          const liveData = await quotesResponse.json()
          const quotesMap = new Map(liveData.map((quote: any) => [quote.symbol, quote]))
          
          // Update prices with live data
          cleanedData = cleanedData.map((stock: any) => {
            const liveQuote = quotesMap.get(stock.symbol)
            if (liveQuote) {
              return {
                ...stock,
                price: (liveQuote as any).price,
                changesPercentage: (liveQuote as any).changesPercentage || (stock as any).changesPercentage,
                change: (liveQuote as any).change || (stock as any).change,
                volume: (liveQuote as any).volume || (stock as any).volume,
                pe: (liveQuote as any).pe || (stock as any).pe,
                eps: (liveQuote as any).eps || (stock as any).eps
              }
            }
            return stock
          })
          
          console.log(`✅ Updated ${topSymbols.length} stocks with live quotes`)
        }
      } catch (error) {
        console.warn('⚠️ Live quotes failed, using screener data:', error)
      }
    }
    
    const totalTime = Date.now() - startTime
    console.log(`⏱️ Screener API completed in ${totalTime}ms (${liveQuotes === 'true' ? 'with' : 'without'} live quotes)`)
    
    return NextResponse.json(cleanedData)
    
  } catch (error) {
    console.error('Screener API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screener data' },
      { status: 500 }
    )
  }
}