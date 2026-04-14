// src/lib/finnhubService.ts
// Finnhub Real-Time Quote Service
// Kostenlos: 60 calls/min, WebSocket für 50 Symbole live
// https://finnhub.io/docs/api

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FinnhubQuote {
  symbol: string
  price: number           // Current price
  change: number          // Change from previous close
  changePercent: number   // Change %
  high: number            // Day high
  low: number             // Day low
  open: number            // Open price
  previousClose: number   // Previous close
  timestamp: number       // Unix timestamp (seconds)
  source: 'finnhub'
}

interface FinnhubQuoteRaw {
  c: number   // Current price
  d: number   // Change
  dp: number  // Percent change
  h: number   // High price of the day
  l: number   // Low price of the day
  o: number   // Open price of the day
  pc: number  // Previous close price
  t: number   // Timestamp
}

// ─── In-Memory Cache ────────────────────────────────────────────────────────
// Kurse werden gecached damit nicht jeder Seitenaufruf einen API Call macht

const quoteCache = new Map<string, { data: FinnhubQuote; ts: number }>()
const CACHE_TTL = 30 * 1000       // 30 Sekunden für Echtzeit-Kurse
const STALE_TTL = 5 * 60 * 1000   // 5 Minuten bevor wir null zurückgeben

// ─── Rate Limiter ───────────────────────────────────────────────────────────
// Finnhub Free: 60 calls/min

let callsThisMinute = 0
let minuteStart = Date.now()

function canMakeCall(): boolean {
  const now = Date.now()
  if (now - minuteStart > 60000) {
    callsThisMinute = 0
    minuteStart = now
  }
  return callsThisMinute < 55 // 5 Buffer
}

function recordCall() {
  callsThisMinute++
}

// ─── REST API ───────────────────────────────────────────────────────────────

function getApiKey(): string {
  // Server-side: use non-public key, fallback to public
  return process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || ''
}

export async function getFinnhubQuote(symbol: string): Promise<FinnhubQuote | null> {
  const key = symbol.toUpperCase()

  // Cache hit?
  const cached = quoteCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  // Rate limit check
  if (!canMakeCall()) {
    // Return stale cache if available
    if (cached && Date.now() - cached.ts < STALE_TTL) return cached.data
    console.warn(`[Finnhub] Rate limit reached, no cache for ${key}`)
    return null
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('[Finnhub] No API key configured')
    return null
  }

  try {
    recordCall()
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${key}&token=${apiKey}`,
      { next: { revalidate: 30 } }
    )

    if (!res.ok) {
      console.error(`[Finnhub] HTTP ${res.status} for ${key}`)
      return cached?.data || null
    }

    const raw: FinnhubQuoteRaw = await res.json()

    // Finnhub returns 0 for unknown symbols
    if (!raw.c || raw.c === 0) {
      return null
    }

    const quote: FinnhubQuote = {
      symbol: key,
      price: raw.c,
      change: raw.d || 0,
      changePercent: raw.dp || 0,
      high: raw.h,
      low: raw.l,
      open: raw.o,
      previousClose: raw.pc,
      timestamp: raw.t,
      source: 'finnhub',
    }

    quoteCache.set(key, { data: quote, ts: Date.now() })
    return quote

  } catch (error) {
    console.error(`[Finnhub] Error for ${key}:`, error)
    return cached?.data || null
  }
}

// ─── Batch Quotes ───────────────────────────────────────────────────────────
// Finnhub hat kein Batch-Endpoint, also sequential mit Cache-Optimierung

export async function getFinnhubBatchQuotes(
  symbols: string[]
): Promise<Record<string, FinnhubQuote>> {
  const results: Record<string, FinnhubQuote> = {}
  const toFetch: string[] = []

  // 1. Check cache first
  for (const sym of symbols) {
    const key = sym.toUpperCase()
    const cached = quoteCache.get(key)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      results[key] = cached.data
    } else {
      toFetch.push(key)
    }
  }

  // 2. Fetch missing ones (with rate limit awareness)
  for (const sym of toFetch) {
    if (!canMakeCall()) break
    const quote = await getFinnhubQuote(sym)
    if (quote) results[sym] = quote
    // Small delay to be nice to API
    if (toFetch.length > 5) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return results
}

// ─── Company Profile (for market cap etc.) ──────────────────────────────────

export interface FinnhubProfile {
  symbol: string
  name: string
  marketCap: number
  exchange: string
  industry: string
  logo: string
  currency: string
}

const profileCache = new Map<string, { data: FinnhubProfile; ts: number }>()
const PROFILE_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

export async function getFinnhubProfile(symbol: string): Promise<FinnhubProfile | null> {
  const key = symbol.toUpperCase()

  const cached = profileCache.get(key)
  if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) return cached.data

  if (!canMakeCall()) return cached?.data || null

  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    recordCall()
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${key}&token=${apiKey}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null

    const raw = await res.json()
    if (!raw.name) return null

    const profile: FinnhubProfile = {
      symbol: key,
      name: raw.name,
      marketCap: raw.marketCapitalization ? raw.marketCapitalization * 1e6 : 0, // Finnhub returns in millions
      exchange: raw.exchange || '',
      industry: raw.finnhubIndustry || '',
      logo: raw.logo || '',
      currency: raw.currency || 'USD',
    }

    profileCache.set(key, { data: profile, ts: Date.now() })
    return profile
  } catch {
    return cached?.data || null
  }
}

// ─── Warm Cache ─────────────────────────────────────────────────────────────
// Prefetches quotes for top tickers to have them ready instantly

const TOP_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
  'V', 'MA', 'JPM', 'GS', 'JNJ', 'UNH', 'LLY', 'KO', 'PEP',
  'WMT', 'DIS', 'AMD', 'CRM', 'ADBE', 'PYPL', 'NKE', 'SBUX',
  'UBER', 'ABNB', 'SHOP', 'SPOT', 'SNAP', 'PINS', 'COIN',
  'BA', 'CAT', 'INTC', 'CSCO', 'SAP', 'ASML', 'BRK-B',
]

let warmupDone = false

export async function warmUpQuoteCache(): Promise<number> {
  if (warmupDone) return 0

  let fetched = 0
  for (const sym of TOP_TICKERS) {
    if (!canMakeCall()) break
    const quote = await getFinnhubQuote(sym)
    if (quote) fetched++
    await new Promise(r => setTimeout(r, 200)) // ~300 calls/min safe
  }

  warmupDone = true
  console.log(`[Finnhub] Cache warm-up: ${fetched}/${TOP_TICKERS.length} Kurse geladen`)
  return fetched
}

// ─── Cache Stats ────────────────────────────────────────────────────────────

export function getQuoteCacheStats() {
  const now = Date.now()
  let fresh = 0, stale = 0
  quoteCache.forEach(v => {
    if (now - v.ts < CACHE_TTL) fresh++
    else stale++
  })
  return {
    total: quoteCache.size,
    fresh,
    stale,
    callsThisMinute,
    rateLimit: '60/min',
  }
}
