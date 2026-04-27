// /api/v1/markets — Marktindizes + Sektor-Performance (Finnhub)
// Nutzt ETF-Proxies für Indizes und Sektor-ETFs für Sektoren
import { NextResponse } from 'next/server'

// ── Index-Definitionen (ETF-Proxies) ────────────────────────────────────────

interface MarketIndex {
  /** Click-Through-Ticker (ETF-Proxy für /analyse/aktien/{symbol}) */
  symbol: string
  /** FMP-Index-Symbol für ECHTEN Index-Wert (^GSPC etc.). null = ETF-Proxy via Finnhub */
  fmpSymbol: string | null
  name: string
  nameDE: string
  region: 'americas' | 'emea' | 'asia'
  country: string
  flag: string
}

const INDICES: MarketIndex[] = [
  { symbol: 'SPY',   fmpSymbol: '^GSPC', name: 'S&P 500',       nameDE: 'S&P 500',       region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'QQQ',   fmpSymbol: '^NDX',  name: 'Nasdaq 100',    nameDE: 'Nasdaq 100',    region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'DIA',   fmpSymbol: '^DJI',  name: 'Dow Jones',     nameDE: 'Dow Jones',     region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'IWM',   fmpSymbol: '^RUT',  name: 'Russell 2000',  nameDE: 'Russell 2000',  region: 'americas', country: 'USA', flag: '🇺🇸' },
  { symbol: 'EWG',   fmpSymbol: null,    name: 'DAX (Germany)', nameDE: 'DAX',           region: 'emea',     country: 'Deutschland', flag: '🇩🇪' },
  { symbol: 'EWU',   fmpSymbol: null,    name: 'FTSE 100 (UK)', nameDE: 'FTSE 100',     region: 'emea',     country: 'UK', flag: '🇬🇧' },
  { symbol: 'EWQ',   fmpSymbol: null,    name: 'CAC 40 (FR)',   nameDE: 'CAC 40',       region: 'emea',     country: 'Frankreich', flag: '🇫🇷' },
  { symbol: 'EWJ',   fmpSymbol: null,    name: 'Nikkei (Japan)',nameDE: 'Nikkei 225',   region: 'asia',     country: 'Japan', flag: '🇯🇵' },
  { symbol: 'FXI',   fmpSymbol: null,    name: 'China Large-Cap',nameDE: 'China',        region: 'asia',     country: 'China', flag: '🇨🇳' },
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

// ── FMP Index Quote (echter Index-Wert wie ^GSPC, nicht ETF) ────────────────

interface FmpIndexQuote {
  symbol: string
  price: number
  change: number
  changesPercentage: number
  dayHigh: number
  dayLow: number
  open: number
  previousClose: number
  timestamp?: number
}

async function fetchFmpIndexQuotes(symbols: string[]): Promise<Record<string, FmpIndexQuote>> {
  if (symbols.length === 0) return {}
  const key = process.env.FMP_API_KEY
  if (!key) return {}
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${key}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return {}
    const data = await res.json()
    if (!Array.isArray(data)) return {}
    const map: Record<string, FmpIndexQuote> = {}
    for (const q of data) {
      if (q?.symbol && typeof q.price === 'number') {
        map[q.symbol] = q as FmpIndexQuote
      }
    }
    return map
  } catch {
    return {}
  }
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

    // FMP-Index-Symbole für US-Indizes (echter Wert statt ETF-Proxy)
    const fmpIndexSymbols = INDICES
      .map(i => i.fmpSymbol)
      .filter((s): s is string => s !== null)

    const [quotes, fmpIndices] = await Promise.all([
      fetchBatchQuotes(allSymbols),
      fetchFmpIndexQuotes(fmpIndexSymbols),
    ])

    // Indizes formatieren — bevorzugt FMP-Echtwert, Fallback auf Finnhub-ETF
    const indices = INDICES.map(idx => {
      const fmp = idx.fmpSymbol ? fmpIndices[idx.fmpSymbol] : null
      const etf = quotes[idx.symbol]

      // FMP-Echtwert hat Vorrang (S&P 500 ~6000 statt SPY ~600)
      if (fmp) {
        return {
          symbol: idx.symbol, // Click-Through-Ticker bleibt ETF
          name: idx.name,
          nameDE: idx.nameDE,
          region: idx.region,
          country: idx.country,
          flag: idx.flag,
          price: fmp.price,
          change: fmp.change ?? null,
          changePercent: fmp.changesPercentage ?? null,
          previousClose: fmp.previousClose ?? null,
          dayHigh: fmp.dayHigh ?? null,
          dayLow: fmp.dayLow ?? null,
          timestamp: fmp.timestamp ?? null,
          source: 'fmp-index' as const,
        }
      }

      // Fallback: Finnhub via ETF-Proxy
      if (etf) {
        return {
          symbol: idx.symbol,
          name: idx.name,
          nameDE: idx.nameDE,
          region: idx.region,
          country: idx.country,
          flag: idx.flag,
          price: etf.c,
          change: etf.d,
          changePercent: etf.dp,
          previousClose: etf.pc,
          dayHigh: etf.h,
          dayLow: etf.l,
          timestamp: etf.t,
          source: 'finnhub-etf-proxy' as const,
        }
      }

      return null
    }).filter((i): i is NonNullable<typeof i> => i !== null && i.price !== null)

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
      source: Object.keys(fmpIndices).length > 0 ? 'fmp-index + finnhub-etf' : 'finnhub-etf-proxy',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('[Markets API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
