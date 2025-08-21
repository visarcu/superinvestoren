// src/app/api/price-targets/[ticker]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    // Fetch all price target data in parallel
    const [targetsRes, summaryRes, consensusRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v4/price-target?symbol=${ticker}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v4/price-target-summary?symbol=${ticker}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v4/price-target-consensus?symbol=${ticker}&apikey=${apiKey}`)
    ])

    if (!targetsRes.ok || !summaryRes.ok || !consensusRes.ok) {
      throw new Error('Failed to fetch price target data')
    }

    const [targets, summary, consensus] = await Promise.all([
      targetsRes.json(),
      summaryRes.json(),
      consensusRes.json()
    ])

    return NextResponse.json({
      targets: targets || [],
      summary: summary?.[0] || null,
      consensus: consensus?.[0] || null
    })
  } catch (error) {
    console.error(`[Price Targets API] Error for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch price targets' }, { status: 500 })
  }
}