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
    // FMP v4 requires symbol param — fetch top tickers in parallel batches
    const batchSize = 10
    const allGradings: any[] = []

    for (let i = 0; i < MAJOR_TICKERS.length; i += batchSize) {
      const batch = MAJOR_TICKERS.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const url = `https://financialmodelingprep.com/api/v4/upgrades-downgrades?symbol=${symbol}&apikey=${apiKey}`
            const res = await fetch(url, { next: { revalidate: 1800 } })
            if (!res.ok) return []
            const data = await res.json()
            return Array.isArray(data) ? data.slice(0, 3) : []
          } catch { return [] }
        })
      )
      allGradings.push(...results.flat())
    }

    // Sort by date descending and return
    allGradings.sort((a, b) =>
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    )

    return NextResponse.json(allGradings.slice(0, limit))
  } catch (e) {
    return NextResponse.json([])
  }
}
