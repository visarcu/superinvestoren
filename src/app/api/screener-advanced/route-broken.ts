// src/app/api/screener-advanced/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stocks } from '@/data/stocks'

const FMP_API_KEY = process.env.FMP_API_KEY || 'KYadX7pZnaaP034Rb4GvLtWhoKvCNuaw'

interface FMPStock {
  symbol: string
  companyName: string
  marketCap: number
  price: number
  changesPercentage: number
  change: number
  pe: number | null
  eps: number | null
  beta: number | null
  dividendYield: number | null
  lastAnnualDividend: number | null
  sector: string | null
  industry: string | null
  country: string | null
  volume: number | null
  avgVolume: number | null
  dayLow: number | null
  dayHigh: number | null
  yearLow: number | null
  yearHigh: number | null
  exchange: string | null
}

interface EnhancedStock extends FMPStock {
  revenueGrowth?: number | null
  epsGrowth?: number | null
  roe?: number | null
  roic?: number | null
  grossMargin?: number | null
  operatingMargin?: number | null
  netMargin?: number | null
  pegRatio?: number | null
  pbRatio?: number | null
  psRatio?: number | null
  currentRatio?: number | null
  debtToEquity?: number | null
  // Growth data from our Growth API
  revenueGrowth5Y?: number | null
  revenueGrowth3Y?: number | null
  revenueGrowth1Y?: number | null
  epsGrowth5Y?: number | null
  epsGrowth3Y?: number | null
  epsGrowth1Y?: number | null
  ebitdaGrowth3Y?: number | null
  fcfGrowth3Y?: number | null
  // Dividend data from our Dividends API
  payoutRatio?: number | null
  dividendGrowthRate?: number | null
  dividendQuality?: string | null
}

// PERFORMANCE FIX: Individual API call functions removed
// Now using only batch FMP quote calls for maximum speed


// Quality Value screener - SUPER FAST version using only PE from quote endpoint  
async function runQualityValueScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const maxPE = parseFloat(searchParams.get('peLowerThan') || '20')
  const minPE = parseFloat(searchParams.get('peMoreThan') || '5')
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '1000000000')
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('🎯 SUPER FAST Quality Value Screener - PE filter only')

  const validTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => ticker && !ticker.includes('.') && !ticker.includes('-') && ticker.length <= 5 && /^[A-Z]+$/.test(ticker))
    .slice(0, 500)

  const symbolsStr = validTickers.join(',')
  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
    { next: { revalidate: 1800 } }
  )
  
  if (!response.ok) return []
  
  const quotes = await response.json()
  const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
  
  const results = quotesArray
    .filter(stock => {
      if (!stock.symbol || !stock.name || stock.price <= 0) return false
      if (minMarketCap > 0 && (!stock.marketCap || stock.marketCap < minMarketCap)) return false
      if (!stock.pe || stock.pe <= 0 || stock.pe > maxPE || stock.pe < minPE) return false
      return true
    })
    .map(stock => ({
      symbol: stock.symbol,
      companyName: stock.name,
      price: stock.price,
      marketCap: stock.marketCap,
      changesPercentage: stock.changesPercentage || 0,
      change: stock.change || 0,
      pe: stock.pe,
      eps: stock.eps,
      beta: stock.beta,
      dividendYield: stock.dividendYield,
      lastAnnualDividend: stock.lastAnnualDividend,
      sector: stock.sector,
      industry: stock.industry,
      country: stock.country,
      volume: stock.volume,
      avgVolume: stock.avgVolume,
      dayLow: stock.dayLow,
      dayHigh: stock.dayHigh,
      yearLow: stock.yearLow,
      yearHigh: stock.yearHigh,
      exchange: stock.exchange,
      roe: null,
      currentRatio: null,
      debtToEquity: null
    }))
    .slice(0, limit)

  console.log(`✅ Quality Value: ${results.length} stocks found`)
  return results
}
        
        console.log(`✓ ${stock.symbol}: ROE=${roePercent.toFixed(1)}%, CurrentRatio=${ratiosData.currentRatio?.toFixed(2)}, D/E=${ratiosData.debtToEquity?.toFixed(2)}, PE=${stock.pe}`)
        
        // Add to results
        results.push({
          symbol: stock.symbol,
          companyName: stock.name,
          price: stock.price,
          marketCap: stock.marketCap,
          changesPercentage: stock.changesPercentage || 0,
          change: stock.change || 0,
          pe: stock.pe,
          eps: stock.eps,
          beta: stock.beta,
          dividendYield: stock.dividendYield,
          lastAnnualDividend: stock.lastAnnualDividend,
          sector: stock.sector,
          industry: stock.industry,
          country: stock.country,
          volume: stock.volume,
          avgVolume: stock.avgVolume,
          dayLow: stock.dayLow,
          dayHigh: stock.dayHigh,
          yearLow: stock.yearLow,
          yearHigh: stock.yearHigh,
          exchange: stock.exchange,
          // Financial ratios from our API
          roe: ratiosData.roe,
          currentRatio: ratiosData.currentRatio,
          debtToEquity: ratiosData.debtToEquity,
          grossMargin: ratiosData.grossMargin,
          netMargin: ratiosData.netMargin,
          operatingMargin: ratiosData.operatingMargin,
          roic: ratiosData.roic
        })
      }

      // Rate limiting delay
      if (i + batchSize < validTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    } catch (error) {
      console.error('❌ Error in quality value screening batch:', error)
      continue
    }
  }

  console.log(`✅ Quality Value Screening complete: ${results.length} stocks found`)
  return results.slice(0, limit)
}

// Profitable Growth screener using both Growth API and Scores API
async function runProfitableGrowthScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const minRevGrowth = parseFloat(searchParams.get('revenueGrowthMoreThan') || '10')
  const minNetMargin = parseFloat(searchParams.get('netMarginMoreThan') || '10')
  const minROE = parseFloat(searchParams.get('roeMoreThan') || '12')
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '0')
  const maxPE = parseFloat(searchParams.get('peLowerThan') || '999')
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('🚀📊 Running Profitable Growth Screener with Growth + Scores APIs')
  console.log(`📊 Criteria: RevGrowth>${minRevGrowth}%, NetMargin>${minNetMargin}%, ROE>${minROE}%, MarketCap>${minMarketCap}`)

  // Filter stocks that have proper ticker format
  const validTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => {
      return ticker && 
             !ticker.includes('.') && 
             !ticker.includes('-') && 
             ticker.length <= 5 &&
             /^[A-Z]+$/.test(ticker)
    })
    // No limit - screen ALL stocks for best results!

  console.log(`📊 Screening ${validTickers.length} stocks for profitable growth`)

  const batchSize = 10 // Smaller batch for multiple API calls
  const results: EnhancedStock[] = []
  for (let i = 0; i < validTickers.length; i += batchSize) {
    const batch = validTickers.slice(i, i + batchSize)
    
    try {
      // Get basic stock quotes first
      const symbolsStr = batch.join(',')
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } } // Cache für 30 Minuten
      )
      
      if (!quoteResponse.ok) continue
      
      const quotes = await quoteResponse.json()
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
      
      // Filter by basic criteria first
      const filteredQuotes = quotesArray.filter(stock => {
        if (!stock.symbol || !stock.name || stock.price <= 0) return false
        if (minMarketCap > 0 && (!stock.marketCap || stock.marketCap < minMarketCap)) return false
        if (maxPE < 999 && (!stock.pe || stock.pe > maxPE || stock.pe <= 0)) return false
        return true
      })

      // Get both growth and profitability data for filtered stocks
      for (const stock of filteredQuotes) {
        const [growthData, ratiosData] = await Promise.all([
          getGrowthData(stock.symbol),
          getFinancialRatios(stock.symbol)
        ])
        
        // Apply profitable growth filters
        // Revenue growth: Use 5-year CAGR as primary metric, fallback to 3Y, then 1Y
        const revenueGrowthMetric = growthData.revenueGrowth5Y || growthData.revenueGrowth3Y || growthData.revenueGrowth1Y || 0
        if (minRevGrowth > 0 && revenueGrowthMetric < minRevGrowth) continue
        
        // ROE filter (convert from decimal to percentage)
        const roePercent = ratiosData.roe ? ratiosData.roe * 100 : 0
        if (minROE > 0 && roePercent < minROE) continue
        
        // Net margin filter (already in decimal format 0-1)
        const netMarginPercent = ratiosData.netMargin ? ratiosData.netMargin * 100 : 0
        if (minNetMargin > 0 && netMarginPercent < minNetMargin) continue
        
        console.log(`✓ ${stock.symbol}: RevGrowth=${revenueGrowthMetric?.toFixed(1)}%, ROE=${roePercent.toFixed(1)}%, NetMargin=${netMarginPercent.toFixed(1)}%, PE=${stock.pe}`)
        
        // Add to results
        results.push({
          symbol: stock.symbol,
          companyName: stock.name,
          price: stock.price,
          marketCap: stock.marketCap,
          changesPercentage: stock.changesPercentage || 0,
          change: stock.change || 0,
          pe: stock.pe,
          eps: stock.eps,
          beta: stock.beta,
          dividendYield: stock.dividendYield,
          lastAnnualDividend: stock.lastAnnualDividend,
          sector: stock.sector,
          industry: stock.industry,
          country: stock.country,
          volume: stock.volume,
          avgVolume: stock.avgVolume,
          dayLow: stock.dayLow,
          dayHigh: stock.dayHigh,
          yearLow: stock.yearLow,
          yearHigh: stock.yearHigh,
          exchange: stock.exchange,
          // Growth data from our Growth API
          revenueGrowth5Y: growthData.revenueGrowth5Y,
          revenueGrowth3Y: growthData.revenueGrowth3Y,
          revenueGrowth1Y: growthData.revenueGrowth1Y,
          epsGrowth5Y: growthData.epsGrowth5Y,
          epsGrowth3Y: growthData.epsGrowth3Y,
          epsGrowth1Y: growthData.epsGrowth1Y,
          // Set revenueGrowth to best available metric for display
          revenueGrowth: revenueGrowthMetric,
          epsGrowth: growthData.epsGrowth5Y || growthData.epsGrowth3Y,
          // Financial ratios from our Scores API
          roe: ratiosData.roe,
          currentRatio: ratiosData.currentRatio,
          debtToEquity: ratiosData.debtToEquity,
          grossMargin: ratiosData.grossMargin,
          netMargin: ratiosData.netMargin,
          operatingMargin: ratiosData.operatingMargin,
          roic: ratiosData.roic
        })
      }

      // Rate limiting delay
      if (i + batchSize < validTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error) {
      console.error('❌ Error in profitable growth screening batch:', error)
      continue
    }
  }

  // Sort by revenue growth descending
  results.sort((a, b) => {
    const aGrowth = a.revenueGrowth || -999
    const bGrowth = b.revenueGrowth || -999
    return bGrowth - aGrowth
  })

  console.log(`✅ Profitable Growth Screening complete: ${results.length} stocks found`)
  return results.slice(0, limit)
}

// Helper function to get dividend data from our Dividends API
async function getDividendData(symbol: string): Promise<any> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/dividends/${symbol}`, {
      next: { revalidate: 21600 } // Cache für 6 Stunden
    })
    
    if (!response.ok) {
      console.log(`⚠️ Dividend data not available for ${symbol}`)
      return {}
    }
    
    const data = await response.json()
    return {
      dividendYield: data.currentInfo?.currentYield || null,
      payoutRatio: data.currentInfo?.payoutRatio || null,
      dividendGrowthRate: data.currentInfo?.dividendGrowthRate || null,
      dividendQuality: data.currentInfo?.dividendQuality || null,
      dividendPerShareTTM: data.currentInfo?.dividendPerShareTTM || null
    }
  } catch (error) {
    console.error(`❌ Error fetching dividend data for ${symbol}:`, error)
    return {}
  }
}

// High Dividend screener using stocks database and Dividends API
async function runHighDividendScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const minDividendYield = parseFloat(searchParams.get('dividendMoreThan') || '3')
  const maxPayoutRatio = parseFloat(searchParams.get('payoutRatioLowerThan') || '70')
  const maxPE = parseFloat(searchParams.get('peLowerThan') || '999')
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '0')
  const minPrice = parseFloat(searchParams.get('priceMoreThan') || '0')
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('💰 Running High Dividend Screener with stocks.ts database + Dividends API')
  console.log(`📊 Criteria: DivYield>${minDividendYield}%, PayoutRatio<${maxPayoutRatio}%, PE<${maxPE}, MarketCap>${minMarketCap}`)

  // Filter stocks that have proper ticker format
  const validTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => {
      return ticker && 
             !ticker.includes('.') && 
             !ticker.includes('-') && 
             ticker.length <= 5 &&
             /^[A-Z]+$/.test(ticker)
    })
    // No limit - screen ALL stocks for best results!

  console.log(`📊 Screening ${validTickers.length} stocks for high dividend yields`)

  const batchSize = 15 // Smaller batch for dual API calls
  const results: EnhancedStock[] = []
  const targetResults = limit * 2 // Process until we have 2x target results for better selection

  for (let i = 0; i < validTickers.length && results.length < targetResults; i += batchSize) {
    const batch = validTickers.slice(i, i + batchSize)
    
    try {
      // Get basic stock quotes first
      const symbolsStr = batch.join(',')
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } } // Cache für 30 Minuten
      )
      
      if (!quoteResponse.ok) continue
      
      const quotes = await quoteResponse.json()
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
      
      // Filter by basic criteria first
      const filteredQuotes = quotesArray.filter(stock => {
        if (!stock.symbol || !stock.name || stock.price <= 0) return false
        if (minMarketCap > 0 && (!stock.marketCap || stock.marketCap < minMarketCap)) return false
        if (maxPE < 999 && (!stock.pe || stock.pe > maxPE || stock.pe <= 0)) return false
        if (minPrice > 0 && stock.price < minPrice) return false
        return true
      })

      // Get dividend data for filtered stocks
      for (const stock of filteredQuotes) {
        const dividendData = await getDividendData(stock.symbol)
        
        // Apply dividend filters
        const dividendYieldPercent = dividendData.dividendYield ? dividendData.dividendYield * 100 : 0
        if (minDividendYield > 0 && dividendYieldPercent < minDividendYield) continue
        
        const payoutRatioPercent = dividendData.payoutRatio ? dividendData.payoutRatio * 100 : 0
        if (maxPayoutRatio < 100 && payoutRatioPercent > maxPayoutRatio) continue
        
        console.log(`✓ ${stock.symbol}: DivYield=${dividendYieldPercent?.toFixed(2)}%, PayoutRatio=${payoutRatioPercent?.toFixed(1)}%, PE=${stock.pe}`)
        
        // Add to results
        results.push({
          symbol: stock.symbol,
          companyName: stock.name,
          price: stock.price,
          marketCap: stock.marketCap,
          changesPercentage: stock.changesPercentage || 0,
          change: stock.change || 0,
          pe: stock.pe,
          eps: stock.eps,
          beta: stock.beta,
          dividendYield: dividendData.dividendYield,
          payoutRatio: dividendData.payoutRatio,
          dividendGrowthRate: dividendData.dividendGrowthRate,
          dividendQuality: dividendData.dividendQuality,
          lastAnnualDividend: dividendData.dividendPerShareTTM,
          sector: stock.sector,
          industry: stock.industry,
          country: stock.country,
          volume: stock.volume,
          avgVolume: stock.avgVolume,
          dayLow: stock.dayLow,
          dayHigh: stock.dayHigh,
          yearLow: stock.yearLow,
          yearHigh: stock.yearHigh,
          exchange: stock.exchange
        })
      }

      // Rate limiting delay
      if (i + batchSize < validTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 175))
      }
    } catch (error) {
      console.error('❌ Error in high dividend screening batch:', error)
      continue
    }
  }

  // Sort by dividend yield descending
  results.sort((a, b) => {
    const aYield = a.dividendYield || 0
    const bYield = b.dividendYield || 0
    return bYield - aYield
  })

  console.log(`✅ High Dividend Screening complete: ${results.length} stocks found`)
  return results.slice(0, limit)
}

// Mega Caps screener - simple market cap based screening
async function runMegaCapsScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '100000000000') // 100B default
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('🏢 Running Mega Caps Screener with stocks.ts database + priority list')
  console.log(`📊 Criteria: MarketCap>${(minMarketCap/1000000000).toFixed(0)}B`)

  // Priority list of known mega caps to check first
  const priorityMegaCaps = ['MSFT', 'AAPL', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK.A', 'BRK.B', 'LLY', 'AVGO', 'JPM', 'UNH', 'XOM', 'V', 'PG', 'JNJ', 'MA', 'HD', 'CVX', 'ABBV', 'COST', 'NFLX', 'BAC', 'WMT', 'ORCL', 'KO', 'CRM', 'ACN', 'PEP', 'TMO', 'MRK', 'CSCO', 'AMD', 'LIN', 'ABT', 'QCOM', 'TXN', 'DHR', 'VZ', 'INTU', 'CMCSA', 'NOW', 'PM', 'PFE', 'CAT', 'AMAT', 'NKE', 'DIS', 'GE']

  // Get all tickers, but prioritize known mega caps
  const allValidTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => {
      return ticker && 
             !ticker.includes('.') && 
             !ticker.includes('-') && 
             ticker.length <= 5 &&
             /^[A-Z]+$/.test(ticker)
    })

  // Put priority mega caps first, then add others
  const priorityTickers = priorityMegaCaps.filter(ticker => allValidTickers.includes(ticker))
  const remainingTickers = allValidTickers.filter(ticker => !priorityMegaCaps.includes(ticker))
  const validTickers = [...priorityTickers, ...remainingTickers]

  console.log(`📊 Screening ${validTickers.length} stocks for mega caps`)

  const batchSize = 25 // Larger batches for simple screening
  const results: EnhancedStock[] = []
  const targetMegaCaps = limit * 3 // Get 3x target for better selection

  for (let i = 0; i < validTickers.length && results.length < targetMegaCaps; i += batchSize) {
    const batch = validTickers.slice(i, i + batchSize)
    
    try {
      // Get basic stock quotes
      const symbolsStr = batch.join(',')
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } } // Cache für 30 Minuten
      )
      
      if (!quoteResponse.ok) continue
      
      const quotes = await quoteResponse.json()
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
      
      // Filter by market cap
      for (const stock of quotesArray) {
        if (!stock.symbol || !stock.name || stock.price <= 0) continue
        if (!stock.marketCap || stock.marketCap < minMarketCap) continue
        
        console.log(`✓ ${stock.symbol}: MarketCap=${(stock.marketCap/1000000000).toFixed(1)}B, Price=${stock.price}, PE=${stock.pe}`)
        
        // Add to results
        results.push({
          symbol: stock.symbol,
          companyName: stock.name,
          price: stock.price,
          marketCap: stock.marketCap,
          changesPercentage: stock.changesPercentage || 0,
          change: stock.change || 0,
          pe: stock.pe,
          eps: stock.eps,
          beta: stock.beta,
          dividendYield: stock.dividendYield,
          lastAnnualDividend: stock.lastAnnualDividend,
          sector: stock.sector,
          industry: stock.industry,
          country: stock.country,
          volume: stock.volume,
          avgVolume: stock.avgVolume,
          dayLow: stock.dayLow,
          dayHigh: stock.dayHigh,
          yearLow: stock.yearLow,
          yearHigh: stock.yearHigh,
          exchange: stock.exchange
        })
      }

      // Rate limiting delay - only if we need more results
      if (i + batchSize < validTickers.length && results.length < targetMegaCaps) {
        await new Promise(resolve => setTimeout(resolve, 75))
      }
    } catch (error) {
      console.error('❌ Error in mega caps screening batch:', error)
      continue
    }
  }

  // Sort by market cap descending
  results.sort((a, b) => {
    const aMarketCap = a.marketCap || 0
    const bMarketCap = b.marketCap || 0
    return bMarketCap - aMarketCap
  })

  console.log(`✅ Mega Caps Screening complete: ${results.length} stocks found`)
  return results.slice(0, limit)
}

// Defensive Quality screener using low beta, stable dividends, and quality metrics
async function runDefensiveQualityScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const maxBeta = parseFloat(searchParams.get('betaLowerThan') || '0.8')
  const minDividendYield = parseFloat(searchParams.get('dividendMoreThan') || '2')
  const minROE = parseFloat(searchParams.get('roeMoreThan') || '10')
  const minCurrentRatio = parseFloat(searchParams.get('currentRatioMoreThan') || '1.2')
  const maxDebtToEquity = parseFloat(searchParams.get('debtToEquityLowerThan') || '0.5')
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '5000000000') // 5B default
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('🛡️ Running Defensive Quality Screener with low beta + stable dividends')
  console.log(`📊 Criteria: Beta<${maxBeta}, DivYield>${minDividendYield}%, ROE>${minROE}%, CurrentRatio>${minCurrentRatio}, D/E<${maxDebtToEquity}`)

  // Priority list of known defensive quality companies
  const defensiveCompanies = ['JNJ', 'PG', 'KO', 'PEP', 'WMT', 'CVX', 'XOM', 'VZ', 'T', 'PM', 'MO', 'MMM', 'CAT', 'UPS', 'KMB', 'CL', 'GIS', 'K', 'CPB', 'HRL', 'SJM', 'CLX', 'CHD', 'PNR', 'ITW', 'EMR', 'GD', 'LMT', 'RTX', 'NOC', 'ED', 'SO', 'DUK', 'NEE', 'AEP', 'D', 'EXC', 'SRE', 'PPL', 'FE', 'ETR', 'ES', 'CMS', 'DTE', 'NI', 'LNT', 'WEC', 'ATO', 'CNP', 'NJR']

  // Filter stocks - prioritize defensive companies, then add others
  const allValidTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => {
      return ticker && 
             !ticker.includes('.') && 
             !ticker.includes('-') && 
             ticker.length <= 5 &&
             /^[A-Z]+$/.test(ticker)
    })

  // Prioritize defensive companies, then add others
  const priorityTickers = defensiveCompanies.filter(ticker => allValidTickers.includes(ticker))
  const remainingTickers = allValidTickers.filter(ticker => !defensiveCompanies.includes(ticker))
  const validTickers = [...priorityTickers, ...remainingTickers]

  console.log(`📊 Screening ${validTickers.length} stocks for defensive quality`)

  const batchSize = 10 // Smaller batch for multiple API calls
  const results: EnhancedStock[] = []

  for (let i = 0; i < validTickers.length; i += batchSize) {
    const batch = validTickers.slice(i, i + batchSize)
    
    try {
      // Get basic stock quotes first
      const symbolsStr = batch.join(',')
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } } // Cache für 30 Minuten
      )
      
      if (!quoteResponse.ok) continue
      
      const quotes = await quoteResponse.json()
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
      
      // Filter by basic criteria first including Beta
      const filteredQuotes = quotesArray.filter(stock => {
        if (!stock.symbol || !stock.name || stock.price <= 0) return false
        if (minMarketCap > 0 && (!stock.marketCap || stock.marketCap < minMarketCap)) return false
        if (maxBeta < 10 && (!stock.beta || stock.beta > maxBeta)) return false // Beta filter
        return true
      })

      // Get both dividend and financial ratio data for filtered stocks
      for (const stock of filteredQuotes) {
        const [dividendData, ratiosData] = await Promise.all([
          getDividendData(stock.symbol),
          getFinancialRatios(stock.symbol)
        ])
        
        // Apply defensive quality filters with more lenient criteria
        // Dividend yield filter (reduced from 2% to 1%)
        const dividendYieldPercent = dividendData.dividendYield ? dividendData.dividendYield * 100 : 0
        if (minDividendYield > 1 && dividendYieldPercent < 1) continue
        
        // ROE filter (convert from decimal to percentage) - reduced threshold
        const roePercent = ratiosData.roe ? ratiosData.roe * 100 : 0
        if (minROE > 5 && roePercent < 5) continue
        
        // Current ratio filter - reduced threshold
        if (minCurrentRatio > 1.0 && (!ratiosData.currentRatio || ratiosData.currentRatio < 1.0)) continue
        
        // Debt to equity filter
        if (maxDebtToEquity < 10 && (!ratiosData.debtToEquity || ratiosData.debtToEquity > maxDebtToEquity)) continue
        
        console.log(`✓ ${stock.symbol}: Beta=${stock.beta?.toFixed(2)}, DivYield=${dividendYieldPercent?.toFixed(2)}%, ROE=${roePercent.toFixed(1)}%, CurrentRatio=${ratiosData.currentRatio?.toFixed(2)}`)
        
        // Add to results
        results.push({
          symbol: stock.symbol,
          companyName: stock.name,
          price: stock.price,
          marketCap: stock.marketCap,
          changesPercentage: stock.changesPercentage || 0,
          change: stock.change || 0,
          pe: stock.pe,
          eps: stock.eps,
          beta: stock.beta,
          dividendYield: dividendData.dividendYield,
          payoutRatio: dividendData.payoutRatio,
          dividendGrowthRate: dividendData.dividendGrowthRate,
          dividendQuality: dividendData.dividendQuality,
          lastAnnualDividend: dividendData.dividendPerShareTTM,
          sector: stock.sector,
          industry: stock.industry,
          country: stock.country,
          volume: stock.volume,
          avgVolume: stock.avgVolume,
          dayLow: stock.dayLow,
          dayHigh: stock.dayHigh,
          yearLow: stock.yearLow,
          yearHigh: stock.yearHigh,
          exchange: stock.exchange,
          // Financial ratios from our Scores API
          roe: ratiosData.roe,
          currentRatio: ratiosData.currentRatio,
          debtToEquity: ratiosData.debtToEquity,
          grossMargin: ratiosData.grossMargin,
          netMargin: ratiosData.netMargin,
          operatingMargin: ratiosData.operatingMargin,
          roic: ratiosData.roic
        })
      }

      // Rate limiting delay
      if (i + batchSize < validTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 250))
      }
    } catch (error) {
      console.error('❌ Error in defensive quality screening batch:', error)
      continue
    }
  }

  // Sort by dividend yield descending (defensive income focus)
  results.sort((a, b) => {
    const aYield = a.dividendYield || 0
    const bYield = b.dividendYield || 0
    return bYield - aYield
  })

  console.log(`✅ Defensive Quality Screening complete: ${results.length} stocks found`)
  return results.slice(0, limit)
}

// Tech Growth screener - Technology sector with revenue growth
async function runTechGrowthScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const minRevGrowth = parseFloat(searchParams.get('revenueGrowthMoreThan') || '10')
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '1000000000') // 1B default
  const sector = searchParams.get('sector') || 'Technology'
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('💻 Running Tech Growth Screener with Growth API + Tech focus')
  console.log(`📊 Criteria: RevGrowth>${minRevGrowth}%, MarketCap>${(minMarketCap/1000000000).toFixed(1)}B`)

  // Priority list of known tech companies to focus on
  const techCompanies = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'CRM', 'ORCL', 'ADBE', 'NFLX', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TXN', 'AMAT', 'ADI', 'MRVL', 'MU', 'LRCX', 'KLAC', 'CDNS', 'SNPS', 'FTNT', 'PANW', 'CRWD', 'ZS', 'DDOG', 'NET', 'SNOW', 'MDB', 'OKTA', 'ZM', 'DOCN', 'TWLO', 'SQ', 'PYPL', 'SHOP', 'UBER', 'LYFT', 'ABNB', 'COIN', 'RBLX', 'U', 'PLTR', 'AI', 'C3AI', 'SMCI', 'ARM', 'RIVN', 'LCID']

  // Filter stocks - prioritize known tech companies, then add others
  const allValidTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => {
      return ticker && 
             !ticker.includes('.') && 
             !ticker.includes('-') && 
             ticker.length <= 5 &&
             /^[A-Z]+$/.test(ticker)
    })

  // Prioritize tech companies, then add others
  const priorityTickers = techCompanies.filter(ticker => allValidTickers.includes(ticker))
  const remainingTickers = allValidTickers.filter(ticker => !techCompanies.includes(ticker))
  const validTickers = [...priorityTickers, ...remainingTickers]

  console.log(`📊 Screening ${validTickers.length} stocks for tech growth`)

  const batchSize = 20
  const results: EnhancedStock[] = []

  for (let i = 0; i < validTickers.length; i += batchSize) {
    const batch = validTickers.slice(i, i + batchSize)
    
    try {
      // Get basic stock quotes first
      const symbolsStr = batch.join(',')
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } } // Cache für 30 Minuten
      )
      
      if (!quoteResponse.ok) continue
      
      const quotes = await quoteResponse.json()
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
      
      // Filter by basic criteria first (market cap only - sector filtering comes later)
      const filteredQuotes = quotesArray.filter(stock => {
        if (!stock.symbol || !stock.name || stock.price <= 0) return false
        if (minMarketCap > 0 && (!stock.marketCap || stock.marketCap < minMarketCap)) return false
        return true
      })

      // Get growth data for filtered tech stocks
      for (const stock of filteredQuotes) {
        const growthData = await getGrowthData(stock.symbol)
        
        // Apply growth filters - use best available growth metric
        const revenueGrowthMetric = growthData.revenueGrowth5Y || growthData.revenueGrowth3Y || growthData.revenueGrowth1Y || 0
        if (minRevGrowth > 0 && revenueGrowthMetric < minRevGrowth) continue
        
        console.log(`✓ ${stock.symbol}: Sector=${stock.sector}, RevGrowth=${revenueGrowthMetric?.toFixed(1)}%, MarketCap=${(stock.marketCap/1000000000).toFixed(1)}B`)
        
        // Add to results
        results.push({
          symbol: stock.symbol,
          companyName: stock.name,
          price: stock.price,
          marketCap: stock.marketCap,
          changesPercentage: stock.changesPercentage || 0,
          change: stock.change || 0,
          pe: stock.pe,
          eps: stock.eps,
          beta: stock.beta,
          dividendYield: stock.dividendYield,
          lastAnnualDividend: stock.lastAnnualDividend,
          sector: stock.sector,
          industry: stock.industry,
          country: stock.country,
          volume: stock.volume,
          avgVolume: stock.avgVolume,
          dayLow: stock.dayLow,
          dayHigh: stock.dayHigh,
          yearLow: stock.yearLow,
          yearHigh: stock.yearHigh,
          exchange: stock.exchange,
          // Growth data from our Growth API
          revenueGrowth5Y: growthData.revenueGrowth5Y,
          revenueGrowth3Y: growthData.revenueGrowth3Y,
          revenueGrowth1Y: growthData.revenueGrowth1Y,
          epsGrowth5Y: growthData.epsGrowth5Y,
          epsGrowth3Y: growthData.epsGrowth3Y,
          epsGrowth1Y: growthData.epsGrowth1Y,
          // Set revenueGrowth to best available metric for display
          revenueGrowth: revenueGrowthMetric,
          epsGrowth: growthData.epsGrowth5Y || growthData.epsGrowth3Y
        })
      }

      // Rate limiting delay
      if (i + batchSize < validTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 120))
      }
    } catch (error) {
      console.error('❌ Error in tech growth screening batch:', error)
      continue
    }
  }

  // Sort by revenue growth descending
  results.sort((a, b) => {
    const aGrowth = a.revenueGrowth || -999
    const bGrowth = b.revenueGrowth || -999
    return bGrowth - aGrowth
  })

  console.log(`✅ Tech Growth Screening complete: ${results.length} stocks found`)
  return results.slice(0, limit)
}

// Simple Valuation screener using FMP API for PE, PB, PS, PEG ratios
async function runValuationScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '0')
  const maxMarketCap = parseFloat(searchParams.get('marketCapLowerThan') || '0')
  const minPrice = parseFloat(searchParams.get('priceMoreThan') || '0')
  const maxPrice = parseFloat(searchParams.get('priceLowerThan') || '0')
  const sector = searchParams.get('sector')
  
  // Get valuation filters
  const minPE = parseFloat(searchParams.get('peMoreThan') || '0')
  const maxPE = parseFloat(searchParams.get('peLowerThan') || '999')
  const maxPB = parseFloat(searchParams.get('pbLowerThan') || '999')
  const maxPS = parseFloat(searchParams.get('psLowerThan') || '999')
  const maxPEG = parseFloat(searchParams.get('pegLowerThan') || '999')
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('🎯 Running Valuation Screener with FMP API')
  console.log(`📊 Criteria: PE:${minPE}-${maxPE}, PB<${maxPB}, PS<${maxPS}, PEG<${maxPEG}, MarketCap>${minMarketCap}`)

  // Filter stocks that have proper ticker format
  const validTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => {
      return ticker && 
             !ticker.includes('.') && 
             !ticker.includes('-') && 
             ticker.length <= 5 &&
             /^[A-Z]+$/.test(ticker)
    })
    // No limit - screen ALL stocks for best results!

  console.log(`📊 Screening ${validTickers.length} stocks for valuation metrics`)

  const batchSize = 15 // Smaller batch size for API calls
  const results: EnhancedStock[] = []
  
  for (let i = 0; i < validTickers.length; i += batchSize) {
    const batch = validTickers.slice(i, i + batchSize)
    
    try {
      // Get basic stock quotes
      const symbolsStr = batch.join(',')
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } }
      )
      
      if (!quoteResponse.ok) continue
      
      const quotes = await quoteResponse.json()
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
      
      // Filter by basic criteria first
      const filteredQuotes = quotesArray.filter(stock => {
        if (!stock.symbol || !stock.name || stock.price <= 0) return false
        if (minMarketCap > 0 && (!stock.marketCap || stock.marketCap < minMarketCap)) return false
        if (maxMarketCap > 0 && (!stock.marketCap || stock.marketCap > maxMarketCap)) return false
        if (minPrice > 0 && stock.price < minPrice) return false
        if (maxPrice > 0 && stock.price > maxPrice) return false
        if (sector && stock.sector !== sector) return false
        
        // Valuation filters
        if (maxPE < 999 && (!stock.pe || stock.pe > maxPE || stock.pe <= 0)) return false
        if (minPE > 0 && (!stock.pe || stock.pe < minPE)) return false
        
        return true
      })

      // Get additional ratios for PB, PS, PEG filtering
      for (const stock of filteredQuotes) {
        try {
          // Get ratios from ratios API
          const ratiosResponse = await fetch(
            `https://financialmodelingprep.com/api/v3/ratios-ttm/${stock.symbol}?apikey=${FMP_API_KEY}`,
            { next: { revalidate: 3600 } }
          )
          
          if (ratiosResponse.ok) {
            const ratiosData = await ratiosResponse.json()
            if (Array.isArray(ratiosData) && ratiosData[0]) {
              const ratios = ratiosData[0]
              
              // Apply PB, PS, PEG filters
              if (maxPB < 999 && (!ratios.priceToBookRatio || ratios.priceToBookRatio > maxPB)) continue
              if (maxPS < 999 && (!ratios.priceToSalesRatio || ratios.priceToSalesRatio > maxPS)) continue
              if (maxPEG < 999 && (!ratios.pegRatio || ratios.pegRatio > maxPEG)) continue
              
              // Enhance stock with ratio data
              stock.pbRatio = ratios.priceToBookRatio
              stock.psRatio = ratios.priceToSalesRatio
              stock.pegRatio = ratios.pegRatio
            }
          }
          
          results.push(stock)
          
        } catch (error) {
          console.log(`⚠️ Error getting ratios for ${stock.symbol}:`, error)
          results.push(stock) // Still add stock even if ratios fail
        }
      }
      
    } catch (error) {
      console.log(`⚠️ Error in batch ${i}-${i+batchSize}:`, error)
      continue
    }
  }

  // Sort by market cap (largest first) and limit results
  const sortedResults = results
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, limit)

  console.log(`✅ Valuation Screener found ${sortedResults.length} stocks`)
  return sortedResults
}

// Growth-based screener using our stocks database and Growth API
async function runGrowthScreener(searchParams: URLSearchParams, isPreview = false): Promise<EnhancedStock[]> {
  const minRevGrowth5Y = parseFloat(searchParams.get('revenueGrowthMoreThan') || '0')
  const minEpsGrowth5Y = parseFloat(searchParams.get('epsGrowthMoreThan') || '0')
  const minMarketCap = parseFloat(searchParams.get('marketCapMoreThan') || '500000000') // Default 500M for better results
  const maxPE = parseFloat(searchParams.get('peLowerThan') || '999')
  const sector = searchParams.get('sector')
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log('🚀 Running Growth Screener with our stocks database')
  console.log(`📊 Criteria: RevGrowth5Y>${minRevGrowth5Y}%, EpsGrowth5Y>${minEpsGrowth5Y}%, MarketCap>${minMarketCap}`)

  // Filter stocks that have proper ticker format (no .NE, etc.)
  const validTickers = stocks
    .map(stock => stock.ticker)
    .filter(ticker => {
      // Remove suffixes and invalid tickers
      return ticker && 
             !ticker.includes('.') && 
             !ticker.includes('-') && 
             ticker.length <= 5 &&
             /^[A-Z]+$/.test(ticker)
    })
    .slice(0, 300) // Performance limit: 300 stocks for FAST screening

  console.log(`📊 Screening ${validTickers.length} stocks from our database`)

  // Get basic stock data in batches
  const batchSize = 20
  const results: EnhancedStock[] = []
  for (let i = 0; i < validTickers.length; i += batchSize) {
    const batch = validTickers.slice(i, i + batchSize)
    
    try {
      // Get basic stock quotes
      const symbolsStr = batch.join(',')
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 1800 } } // Cache für 30 Minuten
      )
      
      if (!quoteResponse.ok) continue
      
      const quotes = await quoteResponse.json()
      const quotesArray = Array.isArray(quotes) ? quotes : [quotes]
      
      // Filter by basic criteria first
      const filteredQuotes = quotesArray.filter(stock => {
        if (!stock.symbol || !stock.name || stock.price <= 0) return false
        if (minMarketCap > 0 && (!stock.marketCap || stock.marketCap < minMarketCap)) return false
        if (maxPE < 999 && (!stock.pe || stock.pe > maxPE || stock.pe <= 0)) return false
        return true
      })

      // Get growth data individually (FMP Growth API doesn't support batch calls)
      const growthMap = new Map()
      if (filteredQuotes.length > 0) {
        console.log(`🔍 Fetching growth data for ${filteredQuotes.length} symbols individually...`)
        
        // CRITICAL PERFORMANCE FIX: Only check top stocks with best basic metrics
        const topStocks = filteredQuotes
          .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)) // Sort by market cap
          .slice(0, 200) // Only check TOP 200 stocks for growth data
        
        console.log(`🚀 PERFORMANCE MODE: Only checking growth data for top ${topStocks.length} stocks by market cap`)
        
        // Process in smaller batches to avoid rate limiting
        const batchSize = 10
        for (let i = 0; i < topStocks.length; i += batchSize) {
          const batch = topStocks.slice(i, i + batchSize)
          const promises = batch.map(async (stock) => {
            try {
              const response = await fetch(
                `https://financialmodelingprep.com/api/v3/financial-growth/${stock.symbol}?period=annual&limit=1&apikey=${FMP_API_KEY}`,
                { next: { revalidate: 1800 } }
              )
              
              if (response.ok) {
                const data = await response.json()
                const growthData = Array.isArray(data) ? data[0] : data
                
                if (growthData && growthData.symbol) {
                  return {
                    symbol: growthData.symbol,
                    revenueGrowth5Y: growthData.revenueGrowth ? growthData.revenueGrowth * 100 : null,
                    epsGrowth5Y: growthData.epsgrowth ? growthData.epsgrowth * 100 : null
                  }
                }
              }
            } catch (error) {
              console.log(`⚠️ Growth data error for ${stock.symbol}:`, error)
            }
            return null
          })
          
          const batchResults = await Promise.all(promises)
          batchResults.forEach((result) => {
            if (result) {
              growthMap.set(result.symbol, {
                revenueGrowth5Y: result.revenueGrowth5Y,
                epsGrowth5Y: result.epsGrowth5Y
              })
            }
          })
          
          console.log(`📊 Batch ${Math.floor(i/batchSize) + 1}: Processed ${batch.length} symbols, got ${batchResults.filter(r => r).length} results`)
        }
        
        console.log(`📊 Total growth data collected: ${growthMap.size}/${topStocks.length} symbols`)
        
        // Apply filters ONLY to stocks we have growth data for (performance optimization)
        for (const stock of topStocks) {
          const growthData = growthMap.get(stock.symbol) || { revenueGrowth5Y: null, epsGrowth5Y: null }
          
          // Apply growth filters
          if (minRevGrowth5Y > 0 && (!growthData.revenueGrowth5Y || growthData.revenueGrowth5Y < minRevGrowth5Y)) continue
          if (minEpsGrowth5Y > 0 && (!growthData.epsGrowth5Y || growthData.epsGrowth5Y < minEpsGrowth5Y)) continue
          
          // Add to results
          results.push({
            symbol: stock.symbol,
            companyName: stock.name,
            price: stock.price,
            marketCap: stock.marketCap,
            changesPercentage: stock.changesPercentage || 0,
            change: stock.change || 0,
            pe: stock.pe,
            eps: stock.eps,
            beta: stock.beta,
            dividendYield: stock.dividendYield,
            lastAnnualDividend: stock.lastAnnualDividend,
            sector: stock.sector,
            industry: stock.industry,
            country: stock.country,
            volume: stock.volume,
            avgVolume: stock.avgVolume,
            dayLow: stock.dayLow,
            dayHigh: stock.dayHigh,
            yearLow: stock.yearLow,
            yearHigh: stock.yearHigh,
            exchange: stock.exchange,
            // Growth data from batch API call - MUCH FASTER!
            revenueGrowth5Y: growthData.revenueGrowth5Y,
            revenueGrowth3Y: growthData.revenueGrowth5Y, // Use 5Y as fallback
            revenueGrowth1Y: null,
            epsGrowth5Y: growthData.epsGrowth5Y,
            epsGrowth3Y: growthData.epsGrowth5Y, // Use 5Y as fallback
            epsGrowth1Y: null,
            ebitdaGrowth3Y: null,
            fcfGrowth3Y: null,
            // Set revenueGrowth to 5Y for backward compatibility
            revenueGrowth: growthData.revenueGrowth5Y,
            epsGrowth: growthData.epsGrowth5Y
          })
        }
      }

      // Small delay to avoid rate limiting
      if (i + batchSize < validTickers.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

    } catch (error) {
      console.error(`❌ Error processing batch ${i}-${i+batchSize}:`, error)
    }
  }

  // Sort by 5Y Revenue Growth descending
  results.sort((a, b) => {
    const aGrowth = a.revenueGrowth5Y || -999
    const bGrowth = b.revenueGrowth5Y || -999
    return bGrowth - aGrowth
  })

  console.log(`✅ Growth Screener found ${results.length} stocks`)
  return results.slice(0, limit)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const isPreview = searchParams.get('preview') === 'true'
    
    console.log('🔍 [Screener-Advanced] Request params:', Object.fromEntries(searchParams.entries()))
    
    // Check if this is a growth-focused screening
    const isGrowthScreening = (
      searchParams.get('revenueGrowthMoreThan') ||
      searchParams.get('epsGrowthMoreThan') ||
      searchParams.get('preset') === 'high-growth'
    )
    
    // Check if this is a tech growth screening (sector + growth)
    const isTechGrowthScreening = (
      searchParams.get('preset') === 'tech-growth' ||
      (searchParams.get('sector') === 'Technology' && searchParams.get('revenueGrowthMoreThan'))
    )
    
    // Check if this is profitable growth screening (needs both growth AND profitability data)
    const isProfitableGrowthScreening = (
      searchParams.get('preset') === 'profitable-growth' ||
      (searchParams.get('revenueGrowthMoreThan') && (searchParams.get('roeMoreThan') || searchParams.get('netMarginMoreThan')))
    )
    
    // Check if this is a quality value screening
    const isQualityValueScreening = (
      searchParams.get('roeMoreThan') ||
      searchParams.get('currentRatioMoreThan') ||
      searchParams.get('debtToEquityLowerThan') ||
      searchParams.get('preset') === 'quality-value'
    )
    
    // Check if this is a high dividend screening
    const isHighDividendScreening = (
      searchParams.get('dividendMoreThan') ||
      searchParams.get('payoutRatioLowerThan') ||
      searchParams.get('preset') === 'high-dividend'
    )
    
    // Check if this is a mega caps screening
    const isMegaCapsScreening = (
      searchParams.get('preset') === 'mega-caps' ||
      (searchParams.get('marketCapMoreThan') && parseFloat(searchParams.get('marketCapMoreThan')!) >= 50000000000) // 50B+ is mega cap territory
    )
    
    // Check if this is a defensive quality screening
    const isDefensiveQualityScreening = (
      searchParams.get('preset') === 'defensive-quality' ||
      (searchParams.get('betaLowerThan') && searchParams.get('dividendMoreThan'))
    )
    
    // Check if this is a simple valuation screening (PE, PB, PS, PEG ratios)
    const isValuationScreening = (
      searchParams.get('peMoreThan') ||
      searchParams.get('peLowerThan') ||
      searchParams.get('pbLowerThan') ||
      searchParams.get('psLowerThan') ||
      searchParams.get('pegLowerThan')
    )
    
    console.log('DEBUG: Screener conditions:')
    console.log('isDefensiveQualityScreening:', isDefensiveQualityScreening)
    console.log('isQualityValueScreening:', isQualityValueScreening)
    console.log('isHighDividendScreening:', isHighDividendScreening)
    
    // Use combined Growth + Scores APIs for profitable growth (check first - more specific)
    if (isProfitableGrowthScreening) {
      console.log('🚀📊 Using Profitable Growth Screener with Growth + Scores APIs')
      const profitableGrowthResults = await runProfitableGrowthScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(profitableGrowthResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(profitableGrowthResults)
    }
    
    // Use tech-specific screening with sector filtering + growth
    if (isTechGrowthScreening) {
      console.log('💻 Using Tech Growth Screener with sector filtering + Growth API')
      const techGrowthResults = await runTechGrowthScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(techGrowthResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(techGrowthResults)
    }
    
    // Use our Growth API for growth-focused screenings
    if (isGrowthScreening) {
      console.log('🚀 Using Growth Screener with stocks.ts database')
      const growthResults = await runGrowthScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(growthResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(growthResults)
    }
    
    // Use Defensive Quality screener for low beta + stable dividend stocks (check before quality value - more specific)
    if (isDefensiveQualityScreening) {
      console.log('🛡️ Using Defensive Quality Screener with beta + dividend continuity')
      const defensiveResults = await runDefensiveQualityScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(defensiveResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(defensiveResults)
    }
    
    // Use our Scores API for quality value screenings
    if (isQualityValueScreening) {
      console.log('🎯 Using Quality Value Screener with financial ratios')
      const qualityResults = await runQualityValueScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(qualityResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(qualityResults)
    }
    
    // Use our Dividends API for high dividend screenings
    if (isHighDividendScreening) {
      console.log('💰 Using High Dividend Screener with Dividends API')
      const dividendResults = await runHighDividendScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(dividendResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(dividendResults)
    }
    
    // Use simple market cap screening for mega caps
    if (isMegaCapsScreening) {
      console.log('🏢 Using Mega Caps Screener with market cap filtering')
      const megaCapResults = await runMegaCapsScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(megaCapResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(megaCapResults)
    }
    
    // Use reliable stocks database for simple valuation screening (PE, PB, PS, PEG)
    if (isValuationScreening) {
      console.log('🎯 Using Valuation Screener with stocks.ts database')
      const valuationResults = await runValuationScreener(searchParams, isPreview)
      if (isPreview) {
        return NextResponse.json(valuationResults.map(stock => ({ symbol: stock.symbol })))
      }
      return NextResponse.json(valuationResults)
    }
    
    console.log('📊 Using standard FMP screener')
    
    // Build FMP API URL for basic screening
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
    const requestLimit = parseInt(searchParams.get('limit') || '50')
    fmpParams.append('limit', Math.min(requestLimit * 3, 500).toString()) // Get 3x more to filter
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
    
    let stocks: FMPStock[] = await response.json()
    console.log(`✅ [Screener-Advanced] Initial results: ${stocks.length} stocks`)
    
    // Filter out invalid stocks
    stocks = stocks.filter(stock => 
      stock.symbol && 
      stock.companyName && 
      stock.price > 0 && 
      stock.marketCap > 0
    )
    
    // Enhance stocks with additional data if needed
    const enhancedStocks: EnhancedStock[] = await enhanceStockData(stocks, searchParams)
    
    // Apply advanced filters
    let filteredStocks = applyAdvancedFilters(enhancedStocks, searchParams)
    
    // Apply final limit
    filteredStocks = filteredStocks.slice(0, requestLimit)
    
    console.log(`📈 [Screener-Advanced] Final results: ${filteredStocks.length} stocks`)
    
    // For preview mode, return lightweight array with just count information
    if (isPreview) {
      return NextResponse.json(filteredStocks.map(stock => ({ symbol: stock.symbol })))
    }
    
    return NextResponse.json(filteredStocks)
    
  } catch (error) {
    console.error('❌ Advanced Screener API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screener data' },
      { status: 500 }
    )
  }
}

async function enhanceStockData(stocks: FMPStock[], searchParams: URLSearchParams): Promise<EnhancedStock[]> {
  // Check if we need additional data
  const needsFinancialRatios = [
    'roeMoreThan', 'roicMoreThan', 'grossMarginMoreThan', 
    'operatingMarginMoreThan', 'netMarginMoreThan',
    'currentRatioMoreThan', 'debtToEquityLowerThan',
    'pegLowerThan', 'pbLowerThan', 'psLowerThan'
  ].some(param => searchParams.get(param))
  
  const needsGrowthData = [
    'revenueGrowthMoreThan', 'revenueGrowthLowerThan',
    'epsGrowthMoreThan', 'epsGrowthLowerThan'
  ].some(param => searchParams.get(param))
  
  if (!needsFinancialRatios && !needsGrowthData) {
    // Return stocks with proper structure but null values for missing data
    return stocks.map(stock => ({
      ...stock,
      revenueGrowth: null,
      epsGrowth: null,
      roe: null,
      roic: null,
      grossMargin: null,
      operatingMargin: null,
      netMargin: null,
      pegRatio: null,
      pbRatio: null,
      psRatio: null,
      currentRatio: null,
      debtToEquity: null
    }))
  }
  
  // Batch fetch additional data for top stocks
  const topStocks = stocks.slice(0, 100) // Limit to avoid rate limiting
  const symbols = topStocks.map(s => s.symbol).join(',')
  
  try {
    let ratiosData: any[] = []
    let growthData: any[] = []
    
    // Fetch financial ratios if needed
    if (needsFinancialRatios) {
      console.log('📊 Fetching financial ratios for', topStocks.length, 'stocks')
      const ratiosResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/ratios-ttm/${symbols}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      )
      
      if (ratiosResponse.ok) {
        ratiosData = await ratiosResponse.json()
        if (!Array.isArray(ratiosData)) ratiosData = [ratiosData]
      }
    }
    
    // Fetch growth data if needed
    if (needsGrowthData) {
      console.log('📈 Fetching growth data for', topStocks.length, 'stocks')
      const growthResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/financial-growth/${symbols}?period=annual&limit=1&apikey=${FMP_API_KEY}`,
        { next: { revalidate: 3600 } }
      )
      
      if (growthResponse.ok) {
        growthData = await growthResponse.json()
        if (!Array.isArray(growthData)) growthData = [growthData]
      }
    }
    
    // Create lookup maps
    const ratiosMap = new Map(ratiosData.map(r => [r.symbol, r]))
    const growthMap = new Map(growthData.map(g => [g.symbol, g]))
    
    // Enhance stocks with additional data
    return stocks.map(stock => {
      const ratios = ratiosMap.get(stock.symbol)
      const growth = growthMap.get(stock.symbol)
      
      return {
        ...stock,
        // Growth metrics
        revenueGrowth: growth?.revenueGrowth ? parseFloat((growth.revenueGrowth * 100).toFixed(2)) : null,
        epsGrowth: growth?.epsgrowth ? parseFloat((growth.epsgrowth * 100).toFixed(2)) : null,
        
        // Profitability ratios
        roe: ratios?.returnOnEquity ? parseFloat((ratios.returnOnEquity * 100).toFixed(2)) : null,
        roic: ratios?.returnOnCapitalEmployed ? parseFloat((ratios.returnOnCapitalEmployed * 100).toFixed(2)) : null,
        grossMargin: ratios?.grossProfitMargin ? parseFloat((ratios.grossProfitMargin * 100).toFixed(2)) : null,
        operatingMargin: ratios?.operatingProfitMargin ? parseFloat((ratios.operatingProfitMargin * 100).toFixed(2)) : null,
        netMargin: ratios?.netProfitMargin ? parseFloat((ratios.netProfitMargin * 100).toFixed(2)) : null,
        
        // Valuation ratios
        pegRatio: ratios?.pegRatio || null,
        pbRatio: ratios?.priceToBookRatio || null,
        psRatio: ratios?.priceToSalesRatio || null,
        
        // Financial health
        currentRatio: ratios?.currentRatio || null,
        debtToEquity: ratios?.debtEquityRatio || null
      }
    })
    
  } catch (error) {
    console.error('⚠️ Error fetching additional data:', error)
    // Return stocks with null values for missing data
    return stocks.map(stock => ({
      ...stock,
      revenueGrowth: null,
      epsGrowth: null,
      roe: null,
      roic: null,
      grossMargin: null,
      operatingMargin: null,
      netMargin: null,
      pegRatio: null,
      pbRatio: null,
      psRatio: null,
      currentRatio: null,
      debtToEquity: null
    }))
  }
}

function applyAdvancedFilters(stocks: EnhancedStock[], searchParams: URLSearchParams): EnhancedStock[] {
  return stocks.filter(stock => {
    // PE ratio filters
    const peMoreThan = searchParams.get('peMoreThan')
    const peLowerThan = searchParams.get('peLowerThan')
    
    if (peMoreThan && (!stock.pe || stock.pe < parseFloat(peMoreThan))) {
      return false
    }
    if (peLowerThan && (!stock.pe || stock.pe > parseFloat(peLowerThan) || stock.pe <= 0)) {
      return false
    }
    
    // Growth filters
    const revenueGrowthMoreThan = searchParams.get('revenueGrowthMoreThan')
    const epsGrowthMoreThan = searchParams.get('epsGrowthMoreThan')
    
    if (revenueGrowthMoreThan && (!stock.revenueGrowth || stock.revenueGrowth < parseFloat(revenueGrowthMoreThan))) {
      return false
    }
    if (epsGrowthMoreThan && (!stock.epsGrowth || stock.epsGrowth < parseFloat(epsGrowthMoreThan))) {
      return false
    }
    
    // Profitability filters
    const roeMoreThan = searchParams.get('roeMoreThan')
    const netMarginMoreThan = searchParams.get('netMarginMoreThan')
    const operatingMarginMoreThan = searchParams.get('operatingMarginMoreThan')
    
    if (roeMoreThan && (!stock.roe || stock.roe < parseFloat(roeMoreThan))) {
      return false
    }
    if (netMarginMoreThan && (!stock.netMargin || stock.netMargin < parseFloat(netMarginMoreThan))) {
      return false
    }
    if (operatingMarginMoreThan && (!stock.operatingMargin || stock.operatingMargin < parseFloat(operatingMarginMoreThan))) {
      return false
    }
    
    // Valuation filters
    const pegLowerThan = searchParams.get('pegLowerThan')
    const pbLowerThan = searchParams.get('pbLowerThan')
    const psLowerThan = searchParams.get('psLowerThan')
    
    if (pegLowerThan && (!stock.pegRatio || stock.pegRatio > parseFloat(pegLowerThan))) {
      return false
    }
    if (pbLowerThan && (!stock.pbRatio || stock.pbRatio > parseFloat(pbLowerThan))) {
      return false
    }
    if (psLowerThan && (!stock.psRatio || stock.psRatio > parseFloat(psLowerThan))) {
      return false
    }
    
    // Financial health filters
    const currentRatioMoreThan = searchParams.get('currentRatioMoreThan')
    const debtToEquityLowerThan = searchParams.get('debtToEquityLowerThan')
    
    if (currentRatioMoreThan && (!stock.currentRatio || stock.currentRatio < parseFloat(currentRatioMoreThan))) {
      return false
    }
    if (debtToEquityLowerThan && (!stock.debtToEquity || stock.debtToEquity > parseFloat(debtToEquityLowerThan))) {
      return false
    }
    
    return true
  })
}