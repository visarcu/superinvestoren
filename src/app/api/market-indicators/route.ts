// src/app/api/market-indicators/route.ts
import { NextResponse } from 'next/server'

interface MarketIndicator {
  id: string
  name: string
  value: string
  change?: string
  changePercent?: string
  status: 'up' | 'down' | 'neutral'
  description: string
  category: 'market' | 'treasury' | 'economy' | 'valuation'
  lastUpdated: string
  source?: string
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const indicators: MarketIndicator[] = []

    // Parallel API calls für bessere Performance - mit aktuellen Endpoints
    const [
      treasuryRes,
      vixRes,
      sp500RatiosRes,
      dxyRes,
      treasury10yRes,
      treasury2yRes
    ] = await Promise.allSettled([
      // Aktuelle Treasury Rates - verschiedene Endpoints versuchen
      fetch(`https://financialmodelingprep.com/api/v4/treasury?apikey=${apiKey}`),
      // VIX
      fetch(`https://financialmodelingprep.com/api/v3/quote/%5EVIX?apikey=${apiKey}`),
      // S&P 500 Ratios (für PE)
      fetch(`https://financialmodelingprep.com/api/v3/ratios/SPY?period=annual&limit=1&apikey=${apiKey}`),
      // DXY Dollar Index
      fetch(`https://financialmodelingprep.com/api/v3/quote/DX-Y.NYB?apikey=${apiKey}`),
      // 10Y Treasury Rate (besser: Economic Calendar API oder Treasury API)
      fetch(`https://financialmodelingprep.com/api/v4/treasury?apikey=${apiKey}`),
      // 2Y Treasury aus demselben API call
      fetch(`https://financialmodelingprep.com/api/v4/treasury?apikey=${apiKey}`)
    ])

    // Treasury Rates aus Treasury API
    if (treasury10yRes.status === 'fulfilled' && treasury10yRes.value.ok) {
      const treasuryData = await treasury10yRes.value.json()
      if (Array.isArray(treasuryData) && treasuryData.length > 0) {
        // Neueste Daten zuerst
        const latest = treasuryData[treasuryData.length - 1]
        const previous = treasuryData.length > 1 ? treasuryData[treasuryData.length - 2] : null
        
        // 10Y Treasury
        if (latest.year10) {
          const change = previous && previous.year10 ? (latest.year10 - previous.year10) : null
          const changePercent = previous && previous.year10 > 0 
            ? (((latest.year10 - previous.year10) / previous.year10) * 100) 
            : null

          indicators.push({
            id: '10y-treasury',
            name: '10Y US Treasury',
            value: `${latest.year10.toFixed(2)}%`,
            change: change ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : undefined,
            changePercent: changePercent ? changePercent.toFixed(1) : undefined,
            status: change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral',
            description: '10-jährige US-Staatsanleihen Rendite',
            category: 'treasury',
            lastUpdated: latest.date || new Date().toISOString().split('T')[0],
            source: 'FMP'
          })
        }

        // 2Y Treasury
        if (latest.year2) {
          const change = previous && previous.year2 ? (latest.year2 - previous.year2) : null
          const changePercent = previous && previous.year2 > 0 
            ? (((latest.year2 - previous.year2) / previous.year2) * 100) 
            : null

          indicators.push({
            id: '2y-treasury',
            name: '2Y US Treasury',
            value: `${latest.year2.toFixed(2)}%`,
            change: change ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : undefined,
            changePercent: changePercent ? changePercent.toFixed(1) : undefined,
            status: change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral',
            description: '2-jährige US-Staatsanleihen Rendite',
            category: 'treasury',
            lastUpdated: latest.date || new Date().toISOString().split('T')[0],
            source: 'FMP'
          })
        }

        // Yield Curve Spread
        if (latest.year10 && latest.year2) {
          const spread = latest.year10 - latest.year2
          const prevSpread = previous && previous.year10 && previous.year2 
            ? (previous.year10 - previous.year2) 
            : null
          const change = prevSpread ? (spread - prevSpread) : null

          indicators.push({
            id: 'yield-curve',
            name: 'Yield Curve (10Y-2Y)',
            value: `${spread > 0 ? '+' : ''}${spread.toFixed(2)}%`,
            change: change ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : undefined,
            changePercent: undefined,
            status: change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral',
            description: 'Zinsstrukturkurve - Spread zwischen 10Y und 2Y Treasuries',
            category: 'treasury',
            lastUpdated: latest.date || new Date().toISOString().split('T')[0],
            source: 'FMP'
          })
        }
      }
    }

    // VIX verarbeiten
    if (vixRes.status === 'fulfilled' && vixRes.value.ok) {
      const vixData = await vixRes.value.json()
      if (Array.isArray(vixData) && vixData.length > 0) {
        const vix = vixData[0]
        indicators.push({
          id: 'vix',
          name: 'VIX (Fear Index)',
          value: vix.price.toFixed(1),
          change: vix.change ? vix.change.toFixed(1) : undefined,
          changePercent: vix.changesPercentage ? vix.changesPercentage.toFixed(1) : undefined,
          status: vix.change > 0 ? 'up' : vix.change < 0 ? 'down' : 'neutral',
          description: 'Volatilitätsindex - Misst die erwartete Marktvolatilität',
          category: 'market',
          lastUpdated: new Date().toISOString().split('T')[0],
          source: 'CBOE'
        })
      }
    }

    // S&P 500 P/E Ratio
    if (sp500RatiosRes.status === 'fulfilled' && sp500RatiosRes.value.ok) {
      const ratioData = await sp500RatiosRes.value.json()
      if (Array.isArray(ratioData) && ratioData.length > 0) {
        const latest = ratioData[0]
        if (latest.priceEarningsRatio) {
          indicators.push({
            id: 'sp500-pe',
            name: 'S&P 500 KGV',
            value: latest.priceEarningsRatio.toFixed(1),
            change: undefined,
            changePercent: undefined,
            status: 'neutral',
            description: 'Kurs-Gewinn-Verhältnis des S&P 500 Index',
            category: 'valuation',
            lastUpdated: latest.date,
            source: 'FMP'
          })
        }
      }
    }

    // Dollar Index (DXY) verarbeiten
    if (dxyRes.status === 'fulfilled' && dxyRes.value.ok) {
      const dxyData = await dxyRes.value.json()
      if (Array.isArray(dxyData) && dxyData.length > 0) {
        const dxy = dxyData[0]
        indicators.push({
          id: 'dollar-index',
          name: 'Dollar Index (DXY)',
          value: dxy.price.toFixed(1),
          change: dxy.change ? dxy.change.toFixed(1) : undefined,
          changePercent: dxy.changesPercentage ? dxy.changesPercentage.toFixed(1) : undefined,
          status: dxy.change > 0 ? 'up' : dxy.change < 0 ? 'down' : 'neutral',
          description: 'US Dollar Index - Stärke des Dollars gegenüber anderen Währungen',
          category: 'market',
          lastUpdated: new Date().toISOString().split('T')[0],
          source: 'FMP'
        })
      }
    }

    // Buffett Indikator würde echte Market Cap und GDP Daten benötigen - später implementieren
    // TODO: Implement real Buffett Indicator calculation with Market Cap API + GDP data

    // Nur echte API-Daten zurückgeben
    console.log(`✅ Loaded ${indicators.length} real market indicators from APIs`)

    return NextResponse.json({ indicators })

  } catch (error) {
    console.error('Error fetching market indicators:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market indicators' }, 
      { status: 500 }
    )
  }
}