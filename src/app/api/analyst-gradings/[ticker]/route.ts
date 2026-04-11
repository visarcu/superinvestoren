// src/app/api/analyst-gradings/[ticker]/route.ts
// Returns recent analyst upgrades/downgrades for a ticker
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key missing' }, { status: 500 })

  try {
    const url = `https://financialmodelingprep.com/api/v4/upgrades-downgrades?symbol=${ticker}&apikey=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const data = await res.json()
    if (!Array.isArray(data)) return NextResponse.json([])
    // Return latest 20
    return NextResponse.json(data.slice(0, 20))
  } catch (e) {
    return NextResponse.json([])
  }
}
