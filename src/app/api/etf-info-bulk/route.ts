// src/app/api/etf-info-bulk/route.ts
// Bulk-Fetch von ETF-Infos (TER, ISIN, Sektoren) über FMP v4
// GET /api/etf-info-bulk?symbols=VWCE.DE,EUNL.DE,XDWT.DE
import { NextRequest, NextResponse } from 'next/server'

interface FMPETFInfo {
  symbol: string
  name: string
  expenseRatio?: number
  isin?: string
  etfCompany?: string
  aum?: number
  domicile?: string
  holdingsCount?: number
  assetClass?: string
  sectorsList?: Array<{ industry: string; exposure: number }>
}

interface ETFInfoResponse {
  symbol: string
  name: string
  ter?: number
  isin?: string
  issuer?: string
  category?: string
  aum?: number
  domicile?: string
}

// Server-seitiger In-Memory Cache mit 24h TTL
const serverCache = new Map<string, { data: ETFInfoResponse; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 Stunden

function getCategoryFromSectors(sectors?: Array<{ industry: string; exposure: number }>): string {
  if (!sectors || sectors.length === 0) return 'Unknown'
  const top = [...sectors].sort((a, b) => b.exposure - a.exposure)[0]
  if (!top) return 'Unknown'
  if (top.exposure > 50) return top.industry
  return 'Diversified'
}

async function fetchSingleETFInfo(symbol: string): Promise<ETFInfoResponse | null> {
  // Cache check
  const cached = serverCache.get(symbol.toUpperCase())
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data
  }

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v4/etf-info?symbol=${encodeURIComponent(symbol)}&apikey=${process.env.FMP_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null

    const data: FMPETFInfo[] = await res.json()
    if (!data || data.length === 0) return null

    const info = data[0]
    const result: ETFInfoResponse = {
      symbol: info.symbol || symbol,
      name: info.name || symbol,
      ter: info.expenseRatio,
      isin: info.isin,
      issuer: info.etfCompany,
      category: getCategoryFromSectors(info.sectorsList),
      aum: info.aum,
      domicile: info.domicile,
    }

    // In Server-Cache speichern
    serverCache.set(symbol.toUpperCase(), { data: result, timestamp: Date.now() })
    return result
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols')
  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 50) // Max 50 Symbole pro Request

  if (symbols.length === 0) {
    return NextResponse.json([])
  }

  // Parallel fetchen mit Concurrency-Limit von 5
  const results: ETFInfoResponse[] = []
  const CONCURRENCY = 5

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map(s => fetchSingleETFInfo(s))
    )
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value)
      }
    }
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
