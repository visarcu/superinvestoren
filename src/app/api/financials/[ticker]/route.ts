// src/app/api/financials/[ticker]/route.ts
import { NextResponse } from 'next/server'

export async function GET(req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY' }, { status: 500 })
  }

  // Query-Params auslesen: limit und period (annual|quarterly)
  const { searchParams } = new URL(req.url)
  const limit  = searchParams.get('limit')  || '5'
  const period = searchParams.get('period') || 'annual'

  // wenn quarterly: &period=quarter mitschicken
  const periodQuery = period === 'quarterly' ? '&period=quarter' : ''

  const url = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}` +
    `?limit=${limit}${periodQuery}&apikey=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) {
    return NextResponse.json(
      { error: 'FMP lookup failed' },
      { status: res.status }
    )
  }
  const json = await res.json()

  // Mappe in einheitliches Format und baue label-Feld
  const data = (json as any[]).map(row => {
    const revenue = row.revenue  / 1_000_000
    const ebitda  = row.ebitda   / 1_000_000
    const eps     = row.eps
    if (period === 'quarterly') {
      // row.date z.B. "2023-03-31"
      return {
        label: row.date,
        year:   new Date(row.date).getFullYear(),
        revenue, ebitda, eps
      }
    } else {
      // annual: row.calendarYear z.B. "2022"
      const y = parseInt(row.calendarYear, 10)
      return {
        label: String(y),
        year:   y,
        revenue, ebitda, eps
      }
    }
  })

  return NextResponse.json({ data })
}