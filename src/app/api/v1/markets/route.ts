// /api/v1/markets — Marktindizes + Sektor-Performance (Finnhub)
// Nutzt ETF-Proxies für Indizes und Sektor-ETFs für Sektoren
import { NextResponse } from 'next/server'

// ── Index-Definitionen (ETF-Proxies) ────────────────────────────────────────

interface MarketIndex {
  symbol: string       // ETF-Ticker für Finnhub
  name: string         // Anzeigename
  nameDE: string       // Deutsch
  region: 'americas' | 'emea' | 'asia'
  country: string
  flag: string
}

const INDICES: MarketIndex[] = [
  { symbol: 'SPY',   name: 'S&P 500',       nameDE: 'S&P 500',       region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'QQQ',   name: 'Nasdaq 100',    nameDE: 'Nasdaq 100',    region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'DIA',   name: 'Dow Jones',     nameDE: 'Dow Jones',     region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'IWM',   name: 'Russell 2000',  nameDE: 'Russell 2000',  region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'EWG',   name: 'DAX (Germany)', nameDE: 'DAX',           region: 'emea',     country: 'Deutschland', flag: '🇩🇪' },
  { symbol: 'EWU',   name: 'FTSE 100 (UK)', nameDE: 'FTSE 100',     region: 'emea',     country: 'UK', flag: '🇬🇧' },
  { symbol: 'EWQ',   name: 'CAC 40 (FR)',   nameDE: 'CAC 40',       region: 'emea',     country: 'Frankreich', flag: '🇫🇷' },
  { symbol: 'EWJ',   name: 'Nikkei (Japan)',nameDE: 'Nikkei 225',   region: 'asia',     country: 'Japan', flag: '🇯🇵' },
  { symbol: 'FXI',   name: 'China Large-Cap',nameDE: 'China',        region: 'asia',     country: 'China', flag: '🇨🇳' },
]

// ── Sektor-ETFs ─────────────────────────────────────────────────────────────

interface SectorETF {
  symbol: string
  name: string
  nameDE: string
}

const SECTOR_ETFS: SectorETF[] = [
  { symbol: 'XLK', name: 'Technology',              nameDE: 'Technologie' },
  { symbol: 'XLV', name: 'Healthcare',              nameDE: 'Gesundheit' },
  { symbol: 'XLF', name: 'Financial',               nameDE: 'Finanzen' },
  { symbol: 'XLC', name: 'Communication Services',  nameDE: 'Kommunikation' },
  { symbol: 'XLY', name: 'Consumer Discretionary',  nameDE: 'Zyklischer Konsum' },
  { symbol: 'XLP', name: 'Consumer Staples',        nameDE: 'Basiskonsumgüter' },
  { symbol: 'XLE', name: 'Energy',                  nameDE: 'Energie' },
  { symbol: 'XLI', name: 'Industrials',             nameDE: 'Industrie' },
  { symbol: 'XLB', name: 'Materials',               nameDE: 'Grundstoffe' },
  { symbol: 'XLRE',name: 'Real Estate',             nameDE: 'Immobilien' },
  { symbol: 'XLU', name: 'Utilities',               nameDE: 'Versorger' },
]

// ── Commodities/Crypto ──────────────────────────────────────────────────────

interface Commodity {
  symbol: string
  name: string
  nameDE: string
}

const COMMODITIES: Commodity[] = [
  { symbol: 'GLD',  name: 'Gold',         nameDE: 'Gold' },
  { symbol: 'SLV',  name: 'Silver',       nameDE: 'Silber' },
  { symbol: 'USO',  name: 'Crude Oil',    nameDE: 'Rohöl' },
  { symbol: 'TLT',  name: '20Y+ Treasury',nameDE: '20J+ Anleihen' },
]

// ── Finnhub Fetch ───────────────────────────────────────────────────────────

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || ''

interface FinnhubQuote {
  c: number   // current
  d: number   // change
  dp: number  // change percent
  h: number   // high
  l: number   // low
  o: number   // open
  pc: number  // previous close
  t: number   // timestamp
}

async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 60 } } // 1 min cache
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.c === 0) return null
    return data
  } catch {
    return null
  }
}

async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, FinnhubQuote>> {
  const results: Record<string, FinnhubQuote> = {}
  // Parallel fetch mit Rate-Limit-Schutz (max 10 gleichzeitig)
  const chunks: string[][] = []
  for (let i = 0; i < symbols.length; i += 10) {
    chunks.push(symbols.slice(i, i + 10))
  }
  for (const chunk of chunks) {
    const promises = chunk.map(async (s) => {
      const q = await fetchQuote(s)
      if (q) results[s] = q
    })
    await Promise.all(promises)
  }
  return results
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Alle Symbole sammeln
    const allSymbols = [
      ...INDICES.map(i => i.symbol),
      ...SECTOR_ETFS.map(s => s.symbol),
      ...COMMODITIES.map(c => c.symbol),
    ]

    const quotes = await fetchBatchQuotes(allSymbols)

    // Indizes formatieren
    const indices = INDICES.map(idx => {
      const q = quotes[idx.symbol]
      return {
        symbol: idx.symbol,
        name: idx.name,
        nameDE: idx.nameDE,
        region: idx.region,
        country: idx.country,
        flag: idx.flag,
        price: q?.c ?? null,
        change: q?.d ?? null,
        changePercent: q?.dp ?? null,
        previousClose: q?.pc ?? null,
        dayHigh: q?.h ?? null,
        dayLow: q?.l ?? null,
      }
    }).filter(i => i.price !== null)

    // Sektoren formatieren + sortieren nach Performance
    const sectors = SECTOR_ETFS.map(sec => {
      const q = quotes[sec.symbol]
      return {
        symbol: sec.symbol,
        name: sec.name,
        nameDE: sec.nameDE,
        price: q?.c ?? null,
        change: q?.d ?? null,
        changePercent: q?.dp ?? null,
      }
    })
    .filter(s => s.price !== null)
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))

    // Commodities formatieren
    const commodities = COMMODITIES.map(com => {
      const q = quotes[com.symbol]
      return {
        symbol: com.symbol,
        name: com.name,
        nameDE: com.nameDE,
        price: q?.c ?? null,
        change: q?.d ?? null,
        changePercent: q?.dp ?? null,
      }
    }).filter(c => c.price !== null)

    // Gesamtmarkt-Sentiment (basierend auf S&P 500)
    const spyQuote = quotes['SPY']
    const sentiment = spyQuote
      ? spyQuote.dp > 0.5 ? 'bullish' : spyQuote.dp < -0.5 ? 'bearish' : 'neutral'
      : 'neutral'

    return NextResponse.json({
      sentiment,
      indices,
      sectors,
      commodities,
      allSectorsChange: sectors.length > 0
        ? +(sectors.reduce((s, x) => s + (x.changePercent ?? 0), 0) / sectors.length).toFixed(2)
        : 0,
      fetchedAt: new Date().toISOString(),
      source: 'finnhub-etf-proxy',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('[Markets API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
