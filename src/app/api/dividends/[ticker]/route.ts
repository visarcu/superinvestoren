// src/app/api/dividends/[ticker]/route.ts - Neue API für Dividendendaten mit Prognosen
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  async function fetchJson(url: string) {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`FMP API failed: ${url}`)
      return null
    }
    return response.json()
  }

  try {
    // 1. Historische Dividenden
    const historicalDividendsUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${apiKey}`
    const historicalDividends = await fetchJson(historicalDividendsUrl)
    
    // 2. Analyst Estimates (für Dividenden-Prognosen)
    const analystEstimatesUrl = `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?apikey=${apiKey}`
    const analystEstimates = await fetchJson(analystEstimatesUrl)
    
    // 3. Advanced Analyst Estimates (v4 - mehr Details)
    const advancedEstimatesUrl = `https://financialmodelingprep.com/api/v4/analyst-estimates/${ticker}?period=annual&apikey=${apiKey}`
    const advancedEstimates = await fetchJson(advancedEstimatesUrl)
    
    // 4. Key Metrics für aktuelle Dividendeninfo
    const keyMetricsUrl = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${apiKey}`
    const keyMetrics = await fetchJson(keyMetricsUrl)
    
    // 5. Company Profile für zusätzliche Dividendeninfo
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`
    const profile = await fetchJson(profileUrl)

    // Historische Dividenden verarbeiten
    const historical = historicalDividends?.[0]?.historical || historicalDividends?.historical || []
    const yearlyDividends: Record<string, number> = {}
    
    historical.forEach((d: any) => {
      const year = d.date.slice(0, 4)
      yearlyDividends[year] = (yearlyDividends[year] || 0) + (d.adjDividend || d.dividend || 0)
    })

    // Prognostizierte Dividenden aus Analyst Estimates extrahieren
    const currentYear = new Date().getFullYear()
    const dividendForecasts: Array<{
      year: number
      estimatedDividendPerShare: number
      estimatedDividendYield: number
      isProjected: boolean
      confidence: 'high' | 'medium' | 'low'
    }> = []

    // Standard Analyst Estimates verarbeiten
    if (analystEstimates && Array.isArray(analystEstimates)) {
      analystEstimates
        .filter((estimate: any) => {
          const year = parseInt(estimate.date.slice(0, 4))
          return year >= currentYear
        })
        .forEach((estimate: any) => {
          const year = parseInt(estimate.date.slice(0, 4))
          
          // Dividenden-Schätzung basierend auf EPS und geschätzter Payout Ratio
          if (estimate.estimatedEpsAvg) {
            const currentPayoutRatio = keyMetrics?.[0]?.payoutRatio || profile?.[0]?.payoutRatio || 0.3
            const estimatedDividend = estimate.estimatedEpsAvg * currentPayoutRatio
            const estimatedYield = profile?.[0]?.dividendYield || 0.02
            
            dividendForecasts.push({
              year,
              estimatedDividendPerShare: estimatedDividend,
              estimatedDividendYield: estimatedYield,
              isProjected: true,
              confidence: year === currentYear ? 'high' : year === currentYear + 1 ? 'medium' : 'low'
            })
          }
        })
    }

    // Advanced Estimates für bessere Dividenden-Prognosen
    if (advancedEstimates && Array.isArray(advancedEstimates)) {
      advancedEstimates
        .filter((estimate: any) => {
          const year = parseInt(estimate.date.slice(0, 4))
          return year >= currentYear
        })
        .forEach((estimate: any) => {
          const year = parseInt(estimate.date.slice(0, 4))
          
          // Prüfe ob direkte Dividenden-Schätzungen verfügbar sind
          if (estimate.estimatedDividendPerShare || estimate.dividendPerShare) {
            const estimatedDividend = estimate.estimatedDividendPerShare || estimate.dividendPerShare
            
            // Überschreibe oder ergänze existing forecast
            const existingIndex = dividendForecasts.findIndex(f => f.year === year)
            const newForecast = {
              year,
              estimatedDividendPerShare: estimatedDividend,
              estimatedDividendYield: estimate.estimatedDividendYield || 0.02,
              isProjected: true,
              confidence: 'high' as const
            }
            
            if (existingIndex >= 0) {
              dividendForecasts[existingIndex] = newForecast
            } else {
              dividendForecasts.push(newForecast)
            }
          }
        })
    }

    // Wenn keine direkten Schätzungen verfügbar sind, basiere auf Wachstumstrend
    if (dividendForecasts.length === 0) {
      const historicalYears = Object.keys(yearlyDividends)
        .map(year => parseInt(year))
        .sort((a, b) => a - b)
      
      if (historicalYears.length >= 3) {
        const recentYears = historicalYears.slice(-5) // Letzte 5 Jahre
        const dividends = recentYears.map(year => yearlyDividends[year.toString()])
        
        // Berechne durchschnittliches Wachstum
        let totalGrowth = 0
        let growthCount = 0
        
        for (let i = 1; i < dividends.length; i++) {
          if (dividends[i-1] > 0) {
            const growth = (dividends[i] - dividends[i-1]) / dividends[i-1]
            totalGrowth += growth
            growthCount++
          }
        }
        
        const avgGrowth = growthCount > 0 ? totalGrowth / growthCount : 0.05 // 5% default
        const lastDividend = dividends[dividends.length - 1] || 0
        
        // Projektiere die nächsten 3 Jahre
        for (let i = 0; i < 3; i++) {
          const year = currentYear + i
          const projectedDividend = lastDividend * Math.pow(1 + avgGrowth, i + 1)
          
          dividendForecasts.push({
            year,
            estimatedDividendPerShare: projectedDividend,
            estimatedDividendYield: 0.02, // Placeholder
            isProjected: true,
            confidence: i === 0 ? 'medium' : 'low'
          })
        }
      }
    }

    // Aktuelle Dividendeninformationen
    const currentDividendInfo = {
      currentYield: profile?.[0]?.dividendYield || keyMetrics?.[0]?.dividendYield || 0,
      payoutRatio: profile?.[0]?.payoutRatio || keyMetrics?.[0]?.payoutRatio || 0,
      exDividendDate: profile?.[0]?.exDividendDate || keyMetrics?.[0]?.exDividendDate,
      dividendPerShareTTM: profile?.[0]?.dividendPerShareTTM || keyMetrics?.[0]?.dividendPerShareTTM || 0,
      lastDividendDate: historical[0]?.date || null,
      dividendGrowthRate: (() => {
        const years = Object.keys(yearlyDividends).sort()
        if (years.length >= 2) {
          const latest = yearlyDividends[years[years.length - 1]]
          const previous = yearlyDividends[years[years.length - 2]]
          return previous > 0 ? ((latest - previous) / previous) * 100 : 0
        }
        return 0
      })()
    }

    return NextResponse.json({
      historical: yearlyDividends,
      forecasts: dividendForecasts.sort((a, b) => a.year - b.year),
      currentInfo: currentDividendInfo,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching dividend data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dividend data',
      historical: {},
      forecasts: [],
      currentInfo: null
    }, { status: 500 })
  }
}