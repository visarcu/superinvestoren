// Combined Stock Overview API - Performance Optimization
// Replaces 13+ individual API calls with 1 optimized call
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    console.log(`🚀 Loading combined stock overview for: ${ticker}`)

    // ✅ PARALLEL API CALLS - ALL AT ONCE INSTEAD OF SEQUENTIAL
    const [
      quoteRes,
      profileRes, 
      keyMetricsRes,
      ratiosRes,
      estimatesRes,
      historicalRes,
      newsRes,
      peersRes
    ] = await Promise.all([
      // Core data (essential for page load)
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=1&apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=annual&limit=1&apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?limit=4&apikey=${FMP_API_KEY}`),
      
      // Secondary data (nice to have)
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=5&apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v4/stock_peers?symbol=${ticker}&apikey=${FMP_API_KEY}`)
    ])

    // Parse responses in parallel
    const [
      quote,
      profile,
      keyMetrics,
      ratios,
      estimates,
      historical,
      news,
      peers
    ] = await Promise.all([
      quoteRes.ok ? quoteRes.json() : null,
      profileRes.ok ? profileRes.json() : null,
      keyMetricsRes.ok ? keyMetricsRes.json() : null,
      ratiosRes.ok ? ratiosRes.json() : null,
      estimatesRes.ok ? estimatesRes.json() : null,
      historicalRes.ok ? historicalRes.json() : null,
      newsRes.ok ? newsRes.json() : null,
      peersRes.ok ? peersRes.json() : null,
    ])

    // Structure optimized response
    const combinedData = {
      // ✅ CORE DATA - Always included
      basic: {
        quote: Array.isArray(quote) ? quote[0] : quote,
        profile: Array.isArray(profile) ? profile[0] : profile,
        ticker: ticker.toUpperCase()
      },
      
      // ✅ FINANCIAL METRICS - Key ratios and estimates
      financials: {
        keyMetrics: Array.isArray(keyMetrics) ? keyMetrics[0] : null,
        ratios: Array.isArray(ratios) ? ratios[0] : null,
        estimates: Array.isArray(estimates) ? estimates.slice(0, 4) : []
      },
      
      // ✅ OPTIONAL DATA - Can be lazy loaded later
      additional: {
        historical: historical?.historical ? historical.historical.slice(-90) : [], // Last 90 days
        news: Array.isArray(news) ? news.slice(0, 5) : [],
        peers: Array.isArray(peers) ? peers.slice(0, 10) : []
      },
      
      // ✅ METADATA
      meta: {
        timestamp: new Date().toISOString(),
        dataQuality: {
          hasQuote: !!quote,
          hasProfile: !!profile,
          hasFinancials: !!(keyMetrics || ratios),
          hasEstimates: !!(estimates && estimates.length > 0)
        }
      }
    }

    console.log(`✅ Combined stock overview loaded for ${ticker} with ${Object.keys(combinedData).length} data sections`)

    return NextResponse.json(combinedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150' // 5min cache, 2.5min stale
      }
    })

  } catch (error) {
    console.error(`❌ Stock overview API error for ${ticker}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch stock overview', ticker },
      { status: 500 }
    )
  }
}