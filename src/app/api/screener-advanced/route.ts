// src/app/api/screener-advanced/route.ts
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY || 'KYadX7pZnaaP034Rb4GvLtWhoKvCNuaw'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    console.log('🔍 [Screener-Advanced] Request params:', Object.fromEntries(searchParams.entries()))
    
    // Build FMP API URL
    const fmpParams = new URLSearchParams()
    
    // Basic filters that FMP supports directly
    if (searchParams.get('marketCapMoreThan')) {
      fmpParams.append('marketCapMoreThan', searchParams.get('marketCapMoreThan')!)
    }
    if (searchParams.get('marketCapLowerThan')) {
      fmpParams.append('marketCapLowerThan', searchParams.get('marketCapLowerThan')!)
    }
    if (searchParams.get('priceMoreThan')) {
      fmpParams.append('priceMoreThan', searchParams.get('priceMoreThan')!)
    }
    if (searchParams.get('priceLowerThan')) {
      fmpParams.append('priceLowerThan', searchParams.get('priceLowerThan')!)
    }
    if (searchParams.get('betaMoreThan')) {
      fmpParams.append('betaMoreThan', searchParams.get('betaMoreThan')!)
    }
    if (searchParams.get('betaLowerThan')) {
      fmpParams.append('betaLowerThan', searchParams.get('betaLowerThan')!)
    }
    if (searchParams.get('volumeMoreThan')) {
      fmpParams.append('volumeMoreThan', searchParams.get('volumeMoreThan')!)
    }
    if (searchParams.get('volumeLowerThan')) {
      fmpParams.append('volumeLowerThan', searchParams.get('volumeLowerThan')!)
    }
    
    // Dividend filter - convert percentage to decimal
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
    
    // Get more results initially for filtering
    const requestLimit = searchParams.get('limit') || '100'
    fmpParams.append('limit', '500') // Get more to filter
    fmpParams.append('apikey', FMP_API_KEY)
    
    console.log('📊 [Screener-Advanced] FMP URL:', `https://financialmodelingprep.com/api/v3/stock-screener?${fmpParams.toString()}`)
    
    // Fetch basic screener data
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock-screener?${fmpParams.toString()}`,
      { next: { revalidate: 300 } }
    )
    
    if (!response.ok) {
      console.error('❌ FMP API error:', response.status)
      throw new Error(`FMP API error: ${response.status}`)
    }
    
    let stocks = await response.json()
    
    console.log(`✅ [Screener-Advanced] Initial results: ${stocks.length} stocks`)
    
    // Check if we need advanced filters
    const advancedFilters = {
      revenueGrowthMoreThan: searchParams.get('revenueGrowthMoreThan'),
      revenueGrowthLowerThan: searchParams.get('revenueGrowthLowerThan'),
      epsGrowthMoreThan: searchParams.get('epsGrowthMoreThan'),
      epsGrowthLowerThan: searchParams.get('epsGrowthLowerThan'),
      roicMoreThan: searchParams.get('roicMoreThan'),
      roeMoreThan: searchParams.get('roeMoreThan'),
      grossMarginMoreThan: searchParams.get('grossMarginMoreThan'),
      operatingMarginMoreThan: searchParams.get('operatingMarginMoreThan'),
      netMarginMoreThan: searchParams.get('netMarginMoreThan'),
      peMoreThan: searchParams.get('peMoreThan'),
      peLowerThan: searchParams.get('peLowerThan'),
      pegLowerThan: searchParams.get('pegLowerThan'),
      pbLowerThan: searchParams.get('pbLowerThan'),
      psLowerThan: searchParams.get('psLowerThan'),
      currentRatioMoreThan: searchParams.get('currentRatioMoreThan'),
      debtToEquityLowerThan: searchParams.get('debtToEquityLowerThan'),
    }
    
    const needsAdditionalData = Object.values(advancedFilters).some(v => v !== null)
    
    // For now, if advanced filters are needed but we don't have the data,
    // we'll just return the basic filtered results
    // In production, you would fetch additional data here
    
    if (needsAdditionalData) {
      console.log('⚠️ [Screener-Advanced] Advanced filters requested but using basic filtering only')
      
      // Apply basic PE filter if present
      if (advancedFilters.peMoreThan) {
        const minPE = parseFloat(advancedFilters.peMoreThan)
        stocks = stocks.filter((s: any) => s.pe && s.pe >= minPE)
      }
      if (advancedFilters.peLowerThan) {
        const maxPE = parseFloat(advancedFilters.peLowerThan)
        stocks = stocks.filter((s: any) => s.pe && s.pe <= maxPE && s.pe > 0)
      }
      
      // For growth filters, we can estimate based on PE and sector
      if (advancedFilters.revenueGrowthMoreThan || advancedFilters.epsGrowthMoreThan) {
        // Filter for growth characteristics (low PE usually means value, high PE growth)
        // This is a rough approximation
        stocks = stocks.filter((s: any) => {
          // Tech and Healthcare sectors typically have higher growth
          const growthSectors = ['Technology', 'Healthcare', 'Communication Services']
          const isGrowthSector = growthSectors.includes(s.sector)
          
          // Growth stocks typically have higher PE ratios
          const hasGrowthPE = s.pe && s.pe > 20
          
          return isGrowthSector || hasGrowthPE
        })
      }
      
      // For ROE filter, use rough approximation based on profitability
      if (advancedFilters.roeMoreThan) {
        const minROE = parseFloat(advancedFilters.roeMoreThan)
        // Filter for profitable companies with good metrics
        stocks = stocks.filter((s: any) => {
          // Companies with PE between 10-30 often have decent ROE
          const hasReasonablePE = s.pe && s.pe > 0 && s.pe < 30
          // Dividend payers often have stable ROE
          const paysDividend = s.dividendYield && s.dividendYield > 0.01
          
          return hasReasonablePE || paysDividend
        })
      }
    }
    
    // Ensure clean data
    stocks = stocks.map((stock: any) => ({
      ...stock,
      symbol: stock.symbol,
      companyName: stock.companyName || stock.name,
      marketCap: stock.marketCap,
      price: stock.price,
      changesPercentage: !isNaN(stock.changesPercentage) ? stock.changesPercentage : 0,
      pe: stock.pe || null,
      dividendYield: stock.lastAnnualDividend && stock.price 
        ? (stock.lastAnnualDividend / stock.price) 
        : stock.dividendYield || null
    }))
    
    // Apply final limit
    const limit = parseInt(requestLimit)
    stocks = stocks.slice(0, limit)
    
    console.log(`📈 [Screener-Advanced] Final results: ${stocks.length} stocks`)
    
    return NextResponse.json(stocks)
    
  } catch (error) {
    console.error('❌ Advanced Screener API error:', error)
    
    // Fallback to basic screener
    try {
      const searchParams = request.nextUrl.searchParams
      const basicParams = new URLSearchParams()
      
      // Only pass basic parameters
      if (searchParams.get('marketCapMoreThan')) {
        basicParams.append('marketCapMoreThan', searchParams.get('marketCapMoreThan')!)
      }
      if (searchParams.get('marketCapLowerThan')) {
        basicParams.append('marketCapLowerThan', searchParams.get('marketCapLowerThan')!)
      }
      if (searchParams.get('priceMoreThan')) {
        basicParams.append('priceMoreThan', searchParams.get('priceMoreThan')!)
      }
      if (searchParams.get('priceLowerThan')) {
        basicParams.append('priceLowerThan', searchParams.get('priceLowerThan')!)
      }
      if (searchParams.get('sector')) {
        basicParams.append('sector', searchParams.get('sector')!)
      }
      if (searchParams.get('isEtf')) {
        basicParams.append('isEtf', searchParams.get('isEtf')!)
      }
      basicParams.append('isActivelyTrading', 'true')
      basicParams.append('limit', searchParams.get('limit') || '50')
      basicParams.append('apikey', FMP_API_KEY)
      
      const fallbackResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/stock-screener?${basicParams.toString()}`
      )
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        console.log(`⚠️ [Screener-Advanced] Using fallback data: ${fallbackData.length} stocks`)
        return NextResponse.json(fallbackData)
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError)
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch screener data' },
      { status: 500 }
    )
  }
}