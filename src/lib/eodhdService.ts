// src/lib/eodhdService.ts
// EODHD (eodhd.com) Real-Time + Fundamentals Service
// Plan-abhängig; All-World Plan deckt US/EU/UK/JP usw. ab
// https://eodhd.com/financial-apis/

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EodhdQuote {
  symbol: string
  price: number           // Current/last price
  change: number          // Change vs previous close
  changePercent: number
  high: number            // Day high
  low: number             // Day low
  open: number
  previousClose: number
  volume: number          // Day volume
  timestamp: number       // Unix seconds
  source: 'eodhd'
}

export interface EodhdProfile {
  symbol: string
  name: string
  marketCap: number
  exchange: string
  industry: string
  sector: string
  logo: string
  currency: string
  // EODHD liefert diese im selben Fundamentals-Call → wir reichen sie hier durch.
  week52High: number | null
  week52Low: number | null
  avgVolume: number | null
  peRatio: number | null
}

interface EodhdRawQuote {
  code: string         // e.g. "AAPL.US"
  timestamp: number
  gmtoffset: number
  open: number
  high: number
  low: number
  close: number        // letzter / aktueller Kurs
  volume: number
  previousClose: number
  change: number
  change_p: number
}

// ─── In-Memory Cache ────────────────────────────────────────────────────────

const quoteCache = new Map<string, { data: EodhdQuote; ts: number }>()
const profileCache = new Map<string, { data: EodhdProfile; ts: number }>()
const QUOTE_TTL = 30 * 1000           // 30 s (Echtzeit-Charakter)
const QUOTE_STALE_TTL = 5 * 60 * 1000 // bei Fehlern: bis 5 min alt akzeptieren
const PROFILE_TTL = 24 * 60 * 60 * 1000

// ─── Helpers ────────────────────────────────────────────────────────────────

function getApiKey(): string {
  return process.env.EODHD_API_KEY || ''
}

/**
 * EODHD braucht ein Suffix (`AAPL.US`, `SAP.DE`, `VOD.LSE`).
 * Wenn keiner gesetzt: `.US` als Default für US-Listings.
 */
function withExchangeSuffix(symbol: string): string {
  return symbol.includes('.') ? symbol : `${symbol}.US`
}

/** "AAPL.US" → "AAPL" */
function stripSuffix(code: string): string {
  const idx = code.indexOf('.')
  return idx >= 0 ? code.slice(0, idx) : code
}

function mapRawToQuote(raw: EodhdRawQuote): EodhdQuote {
  return {
    symbol: stripSuffix(raw.code).toUpperCase(),
    price: raw.close,
    change: raw.change ?? 0,
    changePercent: raw.change_p ?? 0,
    high: raw.high,
    low: raw.low,
    open: raw.open,
    previousClose: raw.previousClose,
    volume: raw.volume,
    timestamp: raw.timestamp,
    source: 'eodhd',
  }
}

// ─── Single Quote ───────────────────────────────────────────────────────────

export async function getEodhdQuote(symbol: string): Promise<EodhdQuote | null> {
  const key = symbol.toUpperCase()
  const cached = quoteCache.get(key)
  if (cached && Date.now() - cached.ts < QUOTE_TTL) return cached.data

  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('[EODHD] No API key configured')
    return cached?.data ?? null
  }

  try {
    const url = `https://eodhd.com/api/real-time/${withExchangeSuffix(key)}?api_token=${apiKey}&fmt=json`
    const res = await fetch(url, { next: { revalidate: 30 } })
    if (!res.ok) {
      if (cached && Date.now() - cached.ts < QUOTE_STALE_TTL) return cached.data
      return null
    }
    const raw: EodhdRawQuote = await res.json()
    if (!raw?.close || raw.close <= 0) return null
    const q = mapRawToQuote(raw)
    quoteCache.set(key, { data: q, ts: Date.now() })
    return q
  } catch (err) {
    console.error(`[EODHD] quote error for ${key}:`, err)
    return cached?.data ?? null
  }
}

// ─── Batch Quotes ───────────────────────────────────────────────────────────
// EODHD batched bis zu ~15-20 Symbole per `?s=...` Parameter.

const BATCH_LIMIT = 15

export async function getEodhdBatchQuotes(
  symbols: string[]
): Promise<Record<string, EodhdQuote>> {
  const results: Record<string, EodhdQuote> = {}
  const toFetch: string[] = []

  // Cache zuerst
  for (const s of symbols) {
    const key = s.toUpperCase()
    const cached = quoteCache.get(key)
    if (cached && Date.now() - cached.ts < QUOTE_TTL) {
      results[key] = cached.data
    } else {
      toFetch.push(key)
    }
  }

  if (toFetch.length === 0) return results

  const apiKey = getApiKey()
  if (!apiKey) return results

  // In Batches von BATCH_LIMIT zerlegen
  const chunks: string[][] = []
  for (let i = 0; i < toFetch.length; i += BATCH_LIMIT) {
    chunks.push(toFetch.slice(i, i + BATCH_LIMIT))
  }

  await Promise.all(
    chunks.map(async chunk => {
      // EODHD-Quirk: erstes Symbol in der URL, restliche per `?s=`
      const [first, ...rest] = chunk.map(withExchangeSuffix)
      const sParam = rest.length > 0 ? `&s=${rest.join(',')}` : ''
      const url = `https://eodhd.com/api/real-time/${first}?api_token=${apiKey}&fmt=json${sParam}`

      try {
        const res = await fetch(url, { next: { revalidate: 30 } })
        if (!res.ok) return
        const data = await res.json()
        // Wenn nur 1 Symbol → Object, sonst Array
        const list: EodhdRawQuote[] = Array.isArray(data) ? data : [data]
        for (const raw of list) {
          if (!raw?.close || raw.close <= 0) continue
          const q = mapRawToQuote(raw)
          quoteCache.set(q.symbol, { data: q, ts: Date.now() })
          results[q.symbol] = q
        }
      } catch (err) {
        console.error('[EODHD] batch chunk error:', err)
      }
    })
  )

  return results
}

// ─── Profile / Fundamentals ─────────────────────────────────────────────────
// EODHD Fundamentals liefert ein riesiges JSON; wir reduzieren auf Watchlist-Bedarf.

interface EodhdFundamentalsRaw {
  General?: {
    Name?: string
    Exchange?: string
    CurrencyCode?: string
    Sector?: string
    Industry?: string
    LogoURL?: string
  }
  Highlights?: {
    MarketCapitalization?: number
    PERatio?: number
    '52WeekHigh'?: number
    '52WeekLow'?: number
  }
  Technicals?: {
    '52WeekHigh'?: number
    '52WeekLow'?: number
  }
  SharesStats?: {
    SharesOutstanding?: number
  }
  Valuation?: {
    TrailingPE?: number
  }
}

export async function getEodhdProfile(symbol: string): Promise<EodhdProfile | null> {
  const key = symbol.toUpperCase()
  const cached = profileCache.get(key)
  if (cached && Date.now() - cached.ts < PROFILE_TTL) return cached.data

  const apiKey = getApiKey()
  if (!apiKey) return cached?.data ?? null

  try {
    const url = `https://eodhd.com/api/fundamentals/${withExchangeSuffix(key)}?api_token=${apiKey}&fmt=json`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return cached?.data ?? null
    const raw: EodhdFundamentalsRaw = await res.json()
    if (!raw?.General?.Name) return null

    const profile: EodhdProfile = {
      symbol: key,
      name: raw.General.Name,
      marketCap: raw.Highlights?.MarketCapitalization ?? 0,
      exchange: raw.General.Exchange ?? '',
      industry: raw.General.Industry ?? '',
      sector: raw.General.Sector ?? '',
      logo: raw.General.LogoURL ?? '',
      currency: raw.General.CurrencyCode ?? 'USD',
      week52High: raw.Highlights?.['52WeekHigh'] ?? raw.Technicals?.['52WeekHigh'] ?? null,
      week52Low: raw.Highlights?.['52WeekLow'] ?? raw.Technicals?.['52WeekLow'] ?? null,
      avgVolume: null, // EODHD liefert das in Technicals; bei Bedarf nachziehen
      peRatio: raw.Highlights?.PERatio ?? raw.Valuation?.TrailingPE ?? null,
    }
    profileCache.set(key, { data: profile, ts: Date.now() })
    return profile
  } catch (err) {
    console.error(`[EODHD] profile error for ${key}:`, err)
    return cached?.data ?? null
  }
}

// ─── Historical EOD Data ────────────────────────────────────────────────────
// /api/eod/{TICKER.EXCHANGE}?from=YYYY-MM-DD&to=YYYY-MM-DD

export interface EodPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  adjusted_close: number
  volume: number
}

const eodCache = new Map<string, { data: EodPoint[]; ts: number }>()
const EOD_TTL = 24 * 60 * 60 * 1000 // 24h

/**
 * Mappt FMP-Suffixe (Production-DB-Format) auf EODHD-Suffixe.
 * AAPL → AAPL.US, VWCE.DE → VWCE.XETRA, VOD.L → VOD.LSE
 */
export function toEodhdSymbol(symbol: string): string {
  if (!symbol.includes('.')) return `${symbol}.US`
  const [base, suffix] = symbol.split('.')
  const map: Record<string, string> = {
    DE: 'XETRA',  // Deutschland Xetra
    L: 'LSE',     // London Stock Exchange
    PA: 'PA',     // Paris
    AS: 'AS',     // Amsterdam
    MI: 'MI',     // Milan
    MC: 'MC',     // Madrid
    BR: 'BR',     // Brüssel
    LI: 'LI',     // Lissabon
    VI: 'VI',     // Wien
    CP: 'CO',     // Kopenhagen (FMP: CP, EODHD: CO)
    HE: 'HE',     // Helsinki
    SW: 'SW',     // Schweiz
    HK: 'HK',     // Hongkong
    TO: 'TO',     // Toronto
    ST: 'ST',     // Stockholm
    OL: 'OL',     // Oslo
    PR: 'PR',     // Prag
    WA: 'WAR',    // Warschau
    BD: 'BUD',    // Budapest
    JK: 'JK',     // Jakarta
    BO: 'BSE',    // Bombay
    NS: 'NSE',    // Indien NSE
  }
  return `${base}.${map[suffix.toUpperCase()] ?? suffix}`
}

export async function getEodhdHistorical(
  symbol: string,
  fromDate: string,
  toDate: string
): Promise<EodPoint[]> {
  const eodhdSymbol = toEodhdSymbol(symbol)
  const cacheKey = `${eodhdSymbol}_${fromDate}_${toDate}`
  const cached = eodCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < EOD_TTL) return cached.data

  const apiKey = getApiKey()

  // Versuch 1: EODHD direkt (wenn Plan/Key Zugriff hat)
  if (apiKey) {
    try {
      const url = `https://eodhd.com/api/eod/${eodhdSymbol}?from=${fromDate}&to=${toDate}&api_token=${apiKey}&fmt=json`
      const res = await fetch(url, { next: { revalidate: 1800 } })
      if (res.ok) {
        const data = await res.json()
        const points: EodPoint[] = Array.isArray(data) ? data : []
        if (points.length > 0) {
          eodCache.set(cacheKey, { data: points, ts: Date.now() })
          return points
        }
      }
      // 401/leer → Fallback weiter unten
    } catch (err) {
      console.error(`[EODHD] historical error for ${eodhdSymbol}:`, err)
    }
  }

  // Versuch 2: Yahoo Finance Historical (kostenlos, deckt Equity + FX ab)
  const yahooPoints = await getYahooHistorical(symbol, fromDate, toDate)
  eodCache.set(cacheKey, { data: yahooPoints, ts: Date.now() })
  return yahooPoints
}

/**
 * Yahoo-Finance-Fallback: historische Tageskurse für Equity + Indizes.
 * Mappt Yahoo-Antwort auf EodPoint-Shape.
 */
async function getYahooHistorical(
  symbol: string,
  fromDate: string,
  toDate: string
): Promise<EodPoint[]> {
  try {
    // Yahoo nutzt das ursprüngliche FMP-artige Format: AAPL, VWCE.DE, VOD.L
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&region=DE`
    const res = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result?.timestamp?.length) return []

    const timestamps: number[] = result.timestamp
    const opens: (number | null)[] = result.indicators?.quote?.[0]?.open || []
    const highs: (number | null)[] = result.indicators?.quote?.[0]?.high || []
    const lows: (number | null)[] = result.indicators?.quote?.[0]?.low || []
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []
    const volumes: (number | null)[] = result.indicators?.quote?.[0]?.volume || []
    const adjCloses: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || []

    const fromTime = new Date(fromDate).getTime() / 1000
    const toTime = new Date(toDate).getTime() / 1000
    const points: EodPoint[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i]
      if (ts < fromTime || ts > toTime + 86400) continue
      const close = closes[i]
      if (close === null || close === undefined || close <= 0) continue
      const date = new Date(ts * 1000).toISOString().slice(0, 10)
      points.push({
        date,
        open: opens[i] ?? close,
        high: highs[i] ?? close,
        low: lows[i] ?? close,
        close,
        adjusted_close: adjCloses[i] ?? close,
        volume: volumes[i] ?? 0,
      })
    }
    return points
  } catch (err) {
    console.error(`[YahooFallback] historical error for ${symbol}:`, err)
    return []
  }
}

/**
 * FX-Historie holen (z.B. USDEUR.FOREX, GBPEUR.FOREX).
 * Returned Map: date → close (EUR pro 1 USD bzw. EUR pro 1 GBP).
 *
 * EODHD-Format: USDEUR.FOREX → EUR pro 1 USD direkt
 * Yahoo-Fallback: EURUSD=X → USD pro 1 EUR (muss invertiert werden)
 */
export async function getEodhdFxHistory(
  pair: 'USDEUR' | 'GBPEUR',
  fromDate: string,
  toDate: string
): Promise<Map<string, number>> {
  const symbol = `${pair}.FOREX`
  const points = await getEodhdHistorical(symbol, fromDate, toDate)
  if (points.length > 0) {
    const map = new Map<string, number>()
    for (const p of points) if (p.close > 0) map.set(p.date, p.close)
    return map
  }

  // Yahoo-Fallback: EURUSD=X liefert USD pro EUR; wir invertieren zu EUR pro USD.
  const yahooSymbol = pair === 'USDEUR' ? 'EURUSD=X' : 'EURGBP=X'
  const yahooPoints = await getYahooHistorical(yahooSymbol, fromDate, toDate)
  const map = new Map<string, number>()
  for (const p of yahooPoints) {
    if (p.close > 0) {
      // EURUSD=X = 1.08 USD/EUR → USDEUR = 1/1.08 = 0.92 EUR/USD
      map.set(p.date, 1 / p.close)
    }
  }
  return map
}

// ─── Cache Stats ────────────────────────────────────────────────────────────

export function getEodhdCacheStats() {
  return {
    quoteCacheSize: quoteCache.size,
    profileCacheSize: profileCache.size,
    eodCacheSize: eodCache.size,
  }
}
