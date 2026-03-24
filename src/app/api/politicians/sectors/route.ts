// src/app/api/politicians/sectors/route.ts
// Liefert Sektor-Informationen für eine Liste von Tickern via FMP
// GET /api/politicians/sectors?tickers=AAPL,GOOGL,NVDA

import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#0d9488',
  'Communication Services': '#2563eb',
  'Financials': '#7c3aed',
  'Healthcare': '#059669',
  'Consumer Discretionary': '#d97706',
  'Industrials': '#6b7280',
  'Energy': '#dc2626',
  'Consumer Staples': '#84cc16',
  'Real Estate': '#f59e0b',
  'Utilities': '#06b6d4',
  'Materials': '#8b5cf6',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tickersParam = searchParams.get('tickers') || ''

  if (!tickersParam || !FMP_API_KEY) {
    return NextResponse.json({})
  }

  // Max 20 Ticker auf einmal
  const tickers = tickersParam.split(',').slice(0, 20).filter(Boolean)

  try {
    const url = `https://financialmodelingprep.com/api/v3/profile/${tickers.join(',')}?apikey=${FMP_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } }) // 24h Cache
    if (!res.ok) return NextResponse.json({})

    const data = await res.json()
    if (!Array.isArray(data)) return NextResponse.json({})

    const result: Record<string, { sector: string; color: string; name: string; logo: string }> = {}
    for (const item of data) {
      if (item.symbol) {
        const sector = item.sector || 'Sonstige'
        result[item.symbol] = {
          sector,
          color: SECTOR_COLORS[sector] || '#404040',
          name: item.companyName || item.symbol,
          logo: item.image || '',
        }
      }
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({})
  }
}
