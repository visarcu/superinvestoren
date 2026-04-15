// src/app/api/intraday/[ticker]/route.ts
// Intraday-Daten (5min-Intervall) für 1D-Chart
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-chart/5min/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 300 } } // 5 Minuten Cache
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch intraday data' }, { status: 502 })
    }

    const rawData = await response.json()

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json({ symbol: ticker, intraday: [] })
    }

    // FMP liefert neueste zuerst — wir filtern auf den letzten Handelstag
    // Das "date"-Feld hat Format "YYYY-MM-DD HH:MM:SS"
    const latestDate = rawData[0]?.date?.split(' ')[0]
    if (!latestDate) {
      return NextResponse.json({ symbol: ticker, intraday: [] })
    }

    const todayData = rawData
      .filter((d: any) => d.date?.startsWith(latestDate) && typeof d.close === 'number')
      .map((d: any) => ({
        date: d.date,
        close: Math.round(d.close * 100) / 100,
      }))
      .reverse() // Chronologisch sortieren (älteste zuerst)

    return NextResponse.json({
      symbol: ticker,
      tradingDate: latestDate,
      intraday: todayData,
    })
  } catch (error) {
    console.error(`Error fetching intraday data for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch intraday data' }, { status: 500 })
  }
}
