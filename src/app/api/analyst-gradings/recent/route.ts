// src/app/api/analyst-gradings/recent/route.ts
// Returns recent analyst upgrades/downgrades across all major stocks
import { NextResponse } from 'next/server'

const MAJOR_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V',
  'UNH', 'MA', 'JNJ', 'XOM', 'PG', 'HD', 'AVGO', 'CVX', 'MRK', 'ABBV',
  'KO', 'PEP', 'COST', 'LLY', 'WMT', 'BAC', 'CRM', 'TMO', 'CSCO', 'ACN',
  'MCD', 'ABT', 'NKE', 'DHR', 'TXN', 'ORCL', 'INTC', 'AMD', 'NFLX', 'DIS',
  'QCOM', 'ADBE', 'PM', 'LOW', 'UPS', 'IBM', 'GS', 'MS', 'BLK', 'AMGN',
  'CAT', 'BA', 'GE', 'RTX', 'AXP', 'SBUX', 'ISRG', 'MDLZ', 'PLD', 'SYK',
  'MMM', 'AMAT', 'NOW', 'BKNG', 'ABNB', 'UBER', 'SHOP', 'SQ', 'PYPL', 'SNOW',
  'PLTR', 'COIN', 'RIVN', 'LCID', 'SOFI', 'ARM', 'PANW', 'CRWD', 'ZS', 'NET',
]

export async function GET(req: Request) {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key missing' }, { status: 500 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  try {
    // FMP has a bulk endpoint for recent upgrades/downgrades
    const url = `https://financialmodelingprep.com/api/v4/upgrades-downgrades?apikey=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 1800 } }) // 30 min cache
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    if (!Array.isArray(data)) return NextResponse.json([])

    // Return the latest entries
    return NextResponse.json(data.slice(0, limit))
  } catch (e) {
    return NextResponse.json([])
  }
}
