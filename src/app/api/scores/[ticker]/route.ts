// src/app/api/scores/[ticker]/route.ts
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

    // Parallel alle benötigten Daten abrufen
    const [altmanRes, piotroskiRes, ratiosRes, metricsRes, quoteRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v4/score?symbol=${ticker}&type=altman&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v4/score?symbol=${ticker}&type=piotroski&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=quarter&limit=4&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=quarter&limit=4&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`)
    ])

    const [altmanData, piotroskiData, ratiosData, metricsData, quoteData] = await Promise.all([
      altmanRes.json(),
      piotroskiRes.json(),
      ratiosRes.json(),
      metricsRes.json(),
      quoteRes.json()
    ])

    // Berechne Scores
    const finclueScore = calculateFinClueScore({
      altman: altmanData?.[0],
      piotroski: piotroskiData?.[0],
      ratios: ratiosData?.[0],
      metrics: metricsData?.[0],
      quote: quoteData?.[0]
    })

    const breakdown = calculateBreakdown({
      ratios: ratiosData?.[0],
      metrics: metricsData?.[0],
      quote: quoteData?.[0]
    })

    // Historische Scores
    const historicalScores = ratiosData?.slice(0, 3).map((ratio: any, index: number) => ({
      date: ratio?.date || '',
      period: ratio?.period || '',
      score: calculateFinClueScore({
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

function calculateFinClueScore(data: any): number {
  const { altman, piotroski, ratios, metrics, quote } = data || {}
  
  let totalScore = 0
  let totalWeight = 0

  // 1. Profitabilität (25%) - STRENGER
  const roe = safeNumber(ratios?.returnOnEquity)
  const netMargin = safeNumber(ratios?.netProfitMargin)
  
  if (roe !== 0 || netMargin !== 0) {
    // ROE: 15% = 50 Punkte, 30% = 100 Punkte
    const roeScore = Math.min(100, Math.max(0, (roe * 100) / 30 * 100))
    // Margin: 10% = 50 Punkte, 20% = 100 Punkte  
    const marginScore = Math.min(100, Math.max(0, (netMargin * 100) / 20 * 100))
    const profitScore = (roeScore + marginScore) / 2
    totalScore += profitScore * 0.25
    totalWeight += 0.25
  }

  // 2. Wachstum (20%) - REALISTISCHER
  const growth = safeNumber(metrics?.revenuePerShareGrowth)
  if (growth !== 0 || metrics?.revenuePerShareGrowth !== undefined) {
    // Negatives Wachstum = niedrige Punkte
    // 0% = 50 Punkte, 20% = 100 Punkte
    const growthScore = Math.min(100, Math.max(0, 50 + (growth * 2.5)))
    totalScore += growthScore * 0.20
    totalWeight += 0.20
  }

  // 3. Bewertung (20%) - BRANCHEN-RELATIV
  const pe = safeNumber(ratios?.priceEarningsRatio)
  if (pe > 0) {
    // KGV 15 = 100 Punkte, KGV 30 = 50 Punkte, KGV 45+ = 0 Punkte
    let valuationScore = 0
    if (pe <= 15) valuationScore = 100
    else if (pe <= 30) valuationScore = 100 - ((pe - 15) * 3.33)
    else if (pe <= 45) valuationScore = 50 - ((pe - 30) * 3.33)
    else valuationScore = 0
    
    totalScore += Math.max(0, valuationScore) * 0.20
    totalWeight += 0.20
  }

  // 4. Stabilität (15%)
  const altmanZ = safeNumber(altman?.altmanZScore)
  if (altmanZ > 0) {
    const stabilityScore = altmanZ > 3 ? 90 : altmanZ > 1.8 ? 60 : 20
    totalScore += stabilityScore * 0.15
    totalWeight += 0.15
  }

  // 5. Fundamental (10%)
  const pScore = safeNumber(piotroski?.piotroskiScore)
  if (pScore > 0) {
    const fundamentalScore = (pScore / 9) * 100
    totalScore += fundamentalScore * 0.10
    totalWeight += 0.10
  }

  // 6. Momentum (10%) - ANGEPASST
  const priceChange = safeNumber(quote?.changesPercentage)
  if (quote?.changesPercentage !== undefined) {
    // -10% = 0 Punkte, 0% = 50 Punkte, +10% = 100 Punkte
    const momentumScore = Math.min(100, Math.max(0, 50 + (priceChange * 5)))
    totalScore += momentumScore * 0.10
    totalWeight += 0.10
  }

  // Normalisierung mit Abzug für Perfektion
  if (totalWeight === 0) return 50

  let finalScore = (totalScore / totalWeight) * 100
  
  // Cap bei 95 - niemand bekommt 100
  finalScore = Math.min(95, finalScore)
  
  return Math.round(Math.max(0, finalScore))
}

function calculateBreakdown(data: any): any {
  const { ratios, metrics, quote } = data || {}

  return {
    profitability: {
      score: Math.round(Math.min(95, Math.max(0,
        (Math.min(100, (safeNumber(ratios?.returnOnEquity) * 100) / 30 * 100) + 
         Math.min(100, (safeNumber(ratios?.netProfitMargin) * 100) / 20 * 100)) / 2
      ))),
      weight: 25,
      metrics: {
        roe: ratios?.returnOnEquity ?? null,
        netMargin: ratios?.netProfitMargin ?? null,
        grossMargin: ratios?.grossProfitMargin ?? null
      }
    },
    growth: {
      score: Math.round(Math.min(95, Math.max(0,
        50 + (safeNumber(metrics?.revenuePerShareGrowth) * 2.5)
      ))),
      weight: 20,
      metrics: {
        revenueGrowth: metrics?.revenuePerShareGrowth ?? null,
        epsGrowth: metrics?.epsgrowth ?? null
      }
    },
    valuation: {
      score: Math.round(Math.min(95, Math.max(0,
        (() => {
          const pe = safeNumber(ratios?.priceEarningsRatio)
          if (pe <= 0) return 20
          if (pe <= 15) return 90
          if (pe <= 30) return 90 - ((pe - 15) * 2.67)
          if (pe <= 45) return 50 - ((pe - 30) * 2.67)
          return 10
        })()
      ))),
      weight: 20,
      metrics: {
        pe: ratios?.priceEarningsRatio ?? null,
        pb: ratios?.priceToBookRatio ?? null,
        peg: ratios?.priceEarningsToGrowthRatio ?? null
      }
    },
    momentum: {
      score: Math.round(Math.min(95, Math.max(0,
        50 + (safeNumber(quote?.changesPercentage) * 5)
      ))),
      weight: 15,
      metrics: {
        priceChange: quote?.changesPercentage ?? null,
        volume: quote?.volume ?? null,
        avgVolume: quote?.avgVolume ?? null
      }
    },
    safety: {
      score: Math.round(Math.min(95, Math.max(0,
        (() => {
          const currentRatio = safeNumber(ratios?.currentRatio)
          const debtEquity = safeNumber(ratios?.debtEquityRatio)
          let safetyScore = 0
          
          // Current Ratio Score
          if (currentRatio >= 2) safetyScore += 50
          else if (currentRatio >= 1.5) safetyScore += 40
          else if (currentRatio >= 1) safetyScore += 25
          else safetyScore += 10
          
          // Debt to Equity Score
          if (debtEquity <= 0.3) safetyScore += 50
          else if (debtEquity <= 0.5) safetyScore += 40
          else if (debtEquity <= 1) safetyScore += 25
          else safetyScore += 10
          
          return safetyScore
        })()
      ))),
      weight: 10,
      metrics: {
        currentRatio: ratios?.currentRatio ?? null,
        debtToEquity: ratios?.debtEquityRatio ?? null,
        quickRatio: ratios?.quickRatio ?? null
      }
    },
    quality: {
      score: Math.round(Math.min(95, Math.max(0,
        ((safeNumber(ratios?.returnOnAssets) * 100 / 15 * 100) +
         (safeNumber(metrics?.freeCashFlowPerShare) > 0 ? 50 : 0)) / 2
      ))),
      weight: 10,
      metrics: {
        roa: ratios?.returnOnAssets ?? null,
        fcf: metrics?.freeCashFlowPerShare ?? null,
        operatingMargin: ratios?.operatingProfitMargin ?? null
      }
    }
  }
}