// src/app/api/scores/[ticker]/route.ts - REALISTIC SCORING SYSTEM
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ ticker: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const ticker = resolvedParams.ticker.toUpperCase()
    const apiKey = process.env.FMP_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Enhanced data fetching: Include financial statements for growth calculation
    const [altmanRes, piotroskiRes, ratiosRes, metricsRes, quoteRes, financialsRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v4/score?symbol=${ticker}&type=altman&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v4/score?symbol=${ticker}&type=piotroski&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=annual&limit=3&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=3&apikey=${apiKey}`),  
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=3&apikey=${apiKey}`) // For growth calculation
    ])

    const [altmanData, piotroskiData, ratiosData, metricsData, quoteData, financialsData] = await Promise.all([
      altmanRes.json(),
      piotroskiRes.json(),
      ratiosRes.json(),
      metricsRes.json(),
      quoteRes.json(),
      financialsRes.json()
    ])

    // Calculate growth metrics from financial statements
    let revenueGrowth = null, epsGrowth = null
    if (financialsData && financialsData.length >= 2) {
      const current = financialsData[0]
      const previous = financialsData[1]
      
      if (current.revenue && previous.revenue && previous.revenue > 0) {
        revenueGrowth = (current.revenue - previous.revenue) / previous.revenue
      }
      
      if (current.eps && previous.eps && previous.eps > 0) {
        epsGrowth = (current.eps - previous.eps) / previous.eps
      }
    }

    // Debug log for development - Enhanced with calculated growth
    console.log(`🔍 [Rating Debug] ${ticker}:`, {
      altman: altmanData?.[0]?.altmanZScore,
      piotroski: piotroskiData?.[0]?.piotroskiScore,
      roe: ratiosData?.[0]?.returnOnEquity,
      pe_annual: ratiosData?.[0]?.priceEarningsRatio,
      pe_current: quoteData?.[0]?.pe,
      margin: ratiosData?.[0]?.netProfitMargin,
      revenueGrowth: revenueGrowth,
      epsGrowth: epsGrowth
    })

    // Enhanced scoring with calculated growth metrics
    const finclueScore = calculateRealisticFinClueScore({
      altman: altmanData?.[0],
      piotroski: piotroskiData?.[0],
      ratios: ratiosData?.[0],
      metrics: metricsData?.[0],
      quote: quoteData?.[0],
      calculatedGrowth: { revenueGrowth, epsGrowth }
    })

    const breakdown = calculateRealisticBreakdown({
      ratios: ratiosData?.[0],
      metrics: metricsData?.[0],
      quote: quoteData?.[0],
      calculatedGrowth: { revenueGrowth, epsGrowth }
    })

    // Historische Scores basierend auf jährlichen Daten
    const historicalScores = ratiosData?.slice(0, 3).map((ratio: any, index: number) => ({
      date: ratio?.date || `${2024 - index}-12-31`,
      period: `${2024 - index}`,
      score: calculateRealisticFinClueScore({
        altman: altmanData?.[0],
        piotroski: piotroskiData?.[0],
        ratios: ratio,
        metrics: metricsData?.[index],
        quote: quoteData?.[0]
      })
    })).reverse() || []

    return NextResponse.json({
      altmanZScore: altmanData?.[0]?.altmanZScore ?? null,
      piotroskiScore: piotroskiData?.[0]?.piotroskiScore ?? null,
      finclueScore,
      breakdown,
      historicalScores
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch scores',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Hilfsfunktion für sichere Werte
function safeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || isNaN(value)) {
    return defaultValue
  }
  return Number(value)
}

function calculateRealisticFinClueScore(data: any): number {
  const { altman, piotroski, ratios, metrics, quote } = data || {}
  
  let totalScore = 0
  let totalWeight = 0

  // 1. Profitabilität (30%) - REALISTISCHE BENCHMARKS
  const roe = safeNumber(ratios?.returnOnEquity, 0)
  const netMargin = safeNumber(ratios?.netProfitMargin, 0)
  
  if (roe !== 0 || netMargin !== 0) {
    // ROE Scoring: 5% = 20pts, 10% = 40pts, 15% = 60pts, 20% = 80pts, 25%+ = 100pts
    let roeScore = 0
    if (roe < 0) roeScore = 0
    else if (roe < 0.05) roeScore = roe * 400  // 0-5% -> 0-20pts
    else if (roe < 0.10) roeScore = 20 + (roe - 0.05) * 400  // 5-10% -> 20-40pts
    else if (roe < 0.15) roeScore = 40 + (roe - 0.10) * 400  // 10-15% -> 40-60pts
    else if (roe < 0.20) roeScore = 60 + (roe - 0.15) * 400  // 15-20% -> 60-80pts
    else roeScore = Math.min(100, 80 + (roe - 0.20) * 400)  // 20%+ -> 80-100pts
    
    // Net Margin Scoring: 2% = 20pts, 5% = 40pts, 10% = 60pts, 15% = 80pts, 20%+ = 100pts
    let marginScore = 0
    if (netMargin < 0) marginScore = 0
    else if (netMargin < 0.02) marginScore = netMargin * 1000  // 0-2% -> 0-20pts
    else if (netMargin < 0.05) marginScore = 20 + (netMargin - 0.02) * 666  // 2-5% -> 20-40pts
    else if (netMargin < 0.10) marginScore = 40 + (netMargin - 0.05) * 400  // 5-10% -> 40-60pts
    else if (netMargin < 0.15) marginScore = 60 + (netMargin - 0.10) * 400  // 10-15% -> 60-80pts
    else marginScore = Math.min(100, 80 + (netMargin - 0.15) * 400)  // 15%+ -> 80-100pts
    
    const profitScore = (roeScore + marginScore) / 2
    totalScore += profitScore * 0.30
    totalWeight += 0.30
  }

  // 2. Wachstum (25%) - ENHANCED: Use calculated growth from financial statements
  const calculatedGrowth = data?.calculatedGrowth
  let revenueGrowthRate = calculatedGrowth?.revenueGrowth || metrics?.revenuePerShareGrowth || 0
  
  // Use calculated growth or fallback to metrics
  if (calculatedGrowth?.revenueGrowth !== null && calculatedGrowth?.revenueGrowth !== undefined) {
    revenueGrowthRate = calculatedGrowth.revenueGrowth
  }
  
  if (revenueGrowthRate !== null && revenueGrowthRate !== undefined && revenueGrowthRate !== 0) {
    let growthScore = 0
    if (revenueGrowthRate < -0.10) growthScore = 0  // -10%+ decline = 0pts
    else if (revenueGrowthRate < 0) growthScore = 20 + (revenueGrowthRate + 0.10) * 200  // -10% to 0% -> 0-20pts
    else if (revenueGrowthRate < 0.05) growthScore = 20 + revenueGrowthRate * 600  // 0-5% -> 20-50pts
    else if (revenueGrowthRate < 0.10) growthScore = 50 + (revenueGrowthRate - 0.05) * 600  // 5-10% -> 50-80pts
    else if (revenueGrowthRate < 0.20) growthScore = 80 + (revenueGrowthRate - 0.10) * 200  // 10-20% -> 80-100pts
    else growthScore = Math.min(100, 100)  // 20%+ -> 100pts
    
    totalScore += growthScore * 0.25
    totalWeight += 0.25
  }

  // 3. Bewertung (25%) - KGV-basiert - Use current P/E from quote for consistency
  const pe = safeNumber(quote?.pe || ratios?.priceEarningsRatio, 0)
  if (pe > 0) {
    let valuationScore = 0
    if (pe <= 10) valuationScore = 90 + pe  // Very cheap
    else if (pe <= 15) valuationScore = 90 - (pe - 10) * 4  // Cheap: 90-70pts
    else if (pe <= 20) valuationScore = 70 - (pe - 15) * 6  // Fair: 70-40pts
    else if (pe <= 30) valuationScore = 40 - (pe - 20) * 2  // Expensive: 40-20pts
    else if (pe <= 50) valuationScore = 20 - (pe - 30)  // Very expensive: 20-0pts
    else valuationScore = 0  // Extremely expensive
    
    totalScore += Math.max(0, valuationScore) * 0.25
    totalWeight += 0.25
  }

  // 4. Stabilität (10%) - Altman Z-Score
  const altmanZ = safeNumber(altman?.altmanZScore, 0)
  if (altmanZ > 0) {
    let stabilityScore = 0
    if (altmanZ >= 3.0) stabilityScore = 100
    else if (altmanZ >= 2.5) stabilityScore = 80
    else if (altmanZ >= 2.0) stabilityScore = 60
    else if (altmanZ >= 1.8) stabilityScore = 40
    else if (altmanZ >= 1.0) stabilityScore = 20
    else stabilityScore = 0
    
    totalScore += stabilityScore * 0.10
    totalWeight += 0.10
  }

  // 5. Fundamental Quality (10%) - Piotroski
  const pScore = safeNumber(piotroski?.piotroskiScore, 0)
  if (pScore >= 0) {
    // 9 = 100pts, 8 = 90pts, 7 = 75pts, 6 = 60pts, etc.
    const fundamentalScore = Math.max(0, (pScore / 9) * 100)
    totalScore += fundamentalScore * 0.10
    totalWeight += 0.10
  }

  // Finale Berechnung - REALISTISCHE VERTEILUNG
  if (totalWeight === 0) return 30  // Default für fehlende Daten

  let finalScore = (totalScore / totalWeight)
  
  // Keine künstlichen Caps - echte Performance-basierte Scores
  finalScore = Math.min(100, Math.max(0, finalScore))
  
  return Math.round(finalScore)
}

function calculateRealisticBreakdown(data: any): any {
  const { ratios, metrics, quote, calculatedGrowth } = data || {}
  
  // Profitabilität mit realistischen Benchmarks
  const roe = safeNumber(ratios?.returnOnEquity, 0)
  const netMargin = safeNumber(ratios?.netProfitMargin, 0)
  
  let roeScore = 0
  if (roe < 0) roeScore = 0
  else if (roe < 0.05) roeScore = roe * 400
  else if (roe < 0.15) roeScore = 20 + (roe - 0.05) * 800
  else roeScore = Math.min(100, 80 + (roe - 0.15) * 400)
  
  let marginScore = 0
  if (netMargin < 0) marginScore = 0
  else if (netMargin < 0.05) marginScore = netMargin * 800
  else if (netMargin < 0.15) marginScore = 40 + (netMargin - 0.05) * 600
  else marginScore = Math.min(100, 80 + (netMargin - 0.15) * 400)

  return {
    profitability: {
      score: Math.round((roeScore + marginScore) / 2),
      weight: 30,
      metrics: {
        roe: ratios?.returnOnEquity ?? null,
        netMargin: ratios?.netProfitMargin ?? null,
        grossMargin: ratios?.grossProfitMargin ?? null
      }
    },
    growth: {
      score: Math.round((() => {
        // Enhanced growth calculation using calculated metrics
        let revenueGrowthRate = calculatedGrowth?.revenueGrowth || metrics?.revenuePerShareGrowth || 0
        
        if (calculatedGrowth?.revenueGrowth !== null && calculatedGrowth?.revenueGrowth !== undefined) {
          revenueGrowthRate = calculatedGrowth.revenueGrowth
        }
        
        if (revenueGrowthRate === null || revenueGrowthRate === undefined || revenueGrowthRate === 0) {
          return 20 // Default score when no growth data
        }
        
        if (revenueGrowthRate < -0.10) return 0
        if (revenueGrowthRate < 0) return 20 + (revenueGrowthRate + 0.10) * 200
        if (revenueGrowthRate < 0.05) return 20 + revenueGrowthRate * 600
        if (revenueGrowthRate < 0.10) return 50 + (revenueGrowthRate - 0.05) * 600
        if (revenueGrowthRate < 0.20) return 80 + (revenueGrowthRate - 0.10) * 200
        return Math.min(100, 100)
      })()),
      weight: 25,
      metrics: {
        revenueGrowth: calculatedGrowth?.revenueGrowth ?? metrics?.revenuePerShareGrowth ?? null,
        epsGrowth: calculatedGrowth?.epsGrowth ?? metrics?.epsgrowth ?? null
      }
    },
    valuation: {
      score: Math.round((() => {
        const pe = safeNumber(quote?.pe || ratios?.priceEarningsRatio, 0)
        if (pe <= 0) return 20
        if (pe <= 10) return 90 + pe
        if (pe <= 15) return 90 - (pe - 10) * 4
        if (pe <= 20) return 70 - (pe - 15) * 6
        if (pe <= 30) return 40 - (pe - 20) * 2
        if (pe <= 50) return 20 - (pe - 30)
        return 0
      })()),
      weight: 25,
      metrics: {
        pe: quote?.pe ?? ratios?.priceEarningsRatio ?? null,
        pb: ratios?.priceToBookRatio ?? null,
        peg: ratios?.priceEarningsToGrowthRatio ?? null
      }
    },
    momentum: {
      score: Math.round((() => {
        const change = safeNumber(quote?.changesPercentage, 0)
        // -20% = 0pts, 0% = 50pts, +20% = 100pts
        return Math.min(100, Math.max(0, 50 + change * 2.5))
      })()),
      weight: 10,
      metrics: {
        priceChange: quote?.changesPercentage ?? null,
        volume: quote?.volume ?? null
      }
    },
    safety: {
      score: Math.round((() => {
        const currentRatio = safeNumber(ratios?.currentRatio, 0)
        const debtEquity = safeNumber(ratios?.debtEquityRatio, 0)
        
        let safetyScore = 0
        // Current Ratio: 1.5+ = good, 2+ = excellent  
        if (currentRatio >= 2.5) safetyScore += 50
        else if (currentRatio >= 2.0) safetyScore += 45
        else if (currentRatio >= 1.5) safetyScore += 35
        else if (currentRatio >= 1.0) safetyScore += 20
        else safetyScore += 5
        
        // Debt to Equity: <0.3 = excellent, <0.5 = good
        if (debtEquity <= 0.2) safetyScore += 50
        else if (debtEquity <= 0.4) safetyScore += 40
        else if (debtEquity <= 0.6) safetyScore += 30
        else if (debtEquity <= 1.0) safetyScore += 15
        else safetyScore += 5
        
        return Math.min(100, safetyScore)
      })()),
      weight: 10,
      metrics: {
        currentRatio: ratios?.currentRatio ?? null,
        debtToEquity: ratios?.debtEquityRatio ?? null
      }
    }
  }
}