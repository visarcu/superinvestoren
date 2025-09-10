// src/app/api/screener/route.ts
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

export async function GET(request: NextRequest) {
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
    if (searchParams.get('isEtf')) {
      fmpParams.append('isEtf', searchParams.get('isEtf')!)
    }
    if (searchParams.get('isActivelyTrading')) {
      fmpParams.append('isActivelyTrading', searchParams.get('isActivelyTrading')!)
    }
    
    // Limit
    const limit = searchParams.get('limit') || '100'
    fmpParams.append('limit', limit)
    
    // Add API key
    fmpParams.append('apikey', FMP_API_KEY)
    
    // Fetch from FMP
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock-screener?${fmpParams.toString()}`,
      {
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    )
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Zusätzlicher Filter für Dividenden im Frontend
    // FMP's dividendYieldMoreThan funktioniert nicht immer zuverlässig
    let filteredData = data
    
    if (searchParams.get('dividendMoreThan')) {
      const minDividend = parseFloat(searchParams.get('dividendMoreThan')!) / 100
      filteredData = data.filter((stock: any) => {
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
    const cleanedData = filteredData.map((stock: any) => ({
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
    
    return NextResponse.json(cleanedData)
    
  } catch (error) {
    console.error('Screener API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screener data' },
      { status: 500 }
    )
  }
}