// src/app/api/market-indicators/route.ts
import { NextResponse } from 'next/server'

const BASE = 'https://financialmodelingprep.com/stable'

async function fetchEconomicIndicator(name: string, apiKey: string) {
  const res = await fetch(`${BASE}/economic-indicators?name=${name}&apikey=${apiKey}`)
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) && data.length > 0 ? data : null
}

function yoyChange(data: { value: number; date: string }[], monthsBack = 12) {
  if (data.length < 2) return null
  const latest = data[0]
  // Find entry ~12 months ago
  const targetDate = new Date(latest.date)
  targetDate.setFullYear(targetDate.getFullYear() - 1)
  const yearAgo = data.find(d => new Date(d.date) <= targetDate)
  if (!yearAgo) return null
  return ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  try {
    const [treasuryData, cpiData, fedData, gdpData, unemploymentData] = await Promise.all([
      fetch(`${BASE}/treasury-rates?apikey=${apiKey}`).then(r => r.ok ? r.json() : null),
      fetchEconomicIndicator('CPI', apiKey),
      fetchEconomicIndicator('federalFunds', apiKey),
      fetchEconomicIndicator('GDP', apiKey),
      fetchEconomicIndicator('unemploymentRate', apiKey),
    ])

    // --- Yield Curve (full) ---
    const yieldCurve: { maturity: string; rate: number }[] = []
    let latestTreasury: Record<string, number> | null = null
    let prevTreasury: Record<string, number> | null = null

    if (Array.isArray(treasuryData) && treasuryData.length > 0) {
      latestTreasury = treasuryData[0]
      prevTreasury = treasuryData[1] ?? null

      const maturities = [
        { key: 'month1', label: '1M' },
        { key: 'month2', label: '2M' },
        { key: 'month3', label: '3M' },
        { key: 'month6', label: '6M' },
        { key: 'year1',  label: '1J' },
        { key: 'year2',  label: '2J' },
        { key: 'year3',  label: '3J' },
        { key: 'year5',  label: '5J' },
        { key: 'year7',  label: '7J' },
        { key: 'year10', label: '10J' },
        { key: 'year20', label: '20J' },
        { key: 'year30', label: '30J' },
      ]
      for (const { key, label } of maturities) {
        const rate = latestTreasury?.[key]
        if (rate != null) yieldCurve.push({ maturity: label, rate })
      }
    }

    // --- Economic indicators cards ---
    const indicators = []

    // Fed Funds Rate
    if (fedData) {
      const latest = fedData[0]
      const prev = fedData[1]
      const change = prev ? latest.value - prev.value : null
      indicators.push({
        id: 'fed-funds',
        name: 'Fed Funds Rate',
        value: `${latest.value.toFixed(2)}%`,
        change: change ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : null,
        status: change === null ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        description: 'Leitzins der US-Notenbank Federal Reserve',
        category: 'economy',
        lastUpdated: latest.date,
        source: 'FED',
      })
    }

    // CPI + YoY Inflation
    if (cpiData) {
      const latest = cpiData[0]
      const prev = cpiData[1]
      const yoy = yoyChange(cpiData)
      const mom = prev ? ((latest.value - prev.value) / prev.value) * 100 : null
      indicators.push({
        id: 'cpi',
        name: 'Inflation (CPI)',
        value: yoy != null ? `${yoy.toFixed(1)}%` : `${latest.value.toFixed(1)}`,
        change: mom != null ? `${mom > 0 ? '+' : ''}${mom.toFixed(2)}% MoM` : null,
        status: yoy == null ? 'neutral' : yoy > 4 ? 'up' : yoy > 2 ? 'neutral' : 'down',
        description: 'US Consumer Price Index — jährliche Inflationsrate',
        category: 'economy',
        lastUpdated: latest.date,
        source: 'BLS',
      })
    }

    // Unemployment
    if (unemploymentData) {
      const latest = unemploymentData[0]
      const prev = unemploymentData[1]
      const change = prev ? latest.value - prev.value : null
      indicators.push({
        id: 'unemployment',
        name: 'Arbeitslosenquote',
        value: `${latest.value.toFixed(1)}%`,
        change: change != null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : null,
        status: change === null ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        description: 'US Arbeitslosenquote',
        category: 'economy',
        lastUpdated: latest.date,
        source: 'BLS',
      })
    }

    // GDP (QoQ growth)
    if (gdpData) {
      const latest = gdpData[0]
      const prev = gdpData[1]
      const qoq = prev ? ((latest.value - prev.value) / prev.value) * 100 : null
      indicators.push({
        id: 'gdp',
        name: 'US BIP',
        value: `$${(latest.value / 1000).toFixed(1)}T`,
        change: qoq != null ? `${qoq > 0 ? '+' : ''}${qoq.toFixed(1)}% QoQ` : null,
        status: qoq === null ? 'neutral' : qoq > 0 ? 'up' : 'down',
        description: 'US Bruttoinlandsprodukt (nominell, annualisiert)',
        category: 'economy',
        lastUpdated: latest.date,
        source: 'BEA',
      })
    }

    // Treasury key rates as indicators
    if (latestTreasury) {
      const t10 = latestTreasury.year10
      const t2  = latestTreasury.year2
      const p10 = prevTreasury?.year10
      const p2  = prevTreasury?.year2

      if (t10 != null) {
        const change = p10 != null ? t10 - p10 : null
        indicators.push({
          id: '10y-treasury',
          name: '10J US Treasury',
          value: `${t10.toFixed(2)}%`,
          change: change != null ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : null,
          status: change === null ? 'neutral' : change > 0 ? 'up' : 'down',
          description: '10-jährige US-Staatsanleihen Rendite',
          category: 'treasury',
          lastUpdated: latestTreasury.date as string,
          source: 'FMP',
        })
      }

      if (t2 != null) {
        const change = p2 != null ? t2 - p2 : null
        indicators.push({
          id: '2y-treasury',
          name: '2J US Treasury',
          value: `${t2.toFixed(2)}%`,
          change: change != null ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : null,
          status: change === null ? 'neutral' : change > 0 ? 'up' : 'down',
          description: '2-jährige US-Staatsanleihen Rendite',
          category: 'treasury',
          lastUpdated: latestTreasury.date as string,
          source: 'FMP',
        })
      }

      if (t10 != null && t2 != null) {
        const spread = t10 - t2
        const prevSpread = p10 != null && p2 != null ? p10 - p2 : null
        const change = prevSpread != null ? spread - prevSpread : null
        indicators.push({
          id: 'yield-spread',
          name: 'Yield Spread (10J-2J)',
          value: `${spread > 0 ? '+' : ''}${spread.toFixed(2)}%`,
          change: change != null ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : null,
          status: spread > 0 ? 'up' : spread < 0 ? 'down' : 'neutral',
          description: 'Spread 10J–2J: negativ = invertierte Kurve (Rezessionssignal)',
          category: 'treasury',
          lastUpdated: latestTreasury.date as string,
          source: 'FMP',
        })
      }
    }

    return NextResponse.json({
      indicators,
      yieldCurve,
      lastUpdated: latestTreasury?.date ?? new Date().toISOString().split('T')[0],
    })

  } catch (error) {
    console.error('Error fetching market indicators:', error)
    return NextResponse.json({ error: 'Failed to fetch market indicators' }, { status: 500 })
  }
}
