// src/lib/marketData/providers/fmpProfile.ts
// Profil für Watchlist/Screener: Stammdaten aus /profile, 52-Wochen-Spanne und
// KGV aus /quote — FMP liefert beides nicht in einem Call.

export interface FmpProfile {
  symbol: string
  name: string
  marketCap: number
  exchange: string
  industry: string
  sector: string
  logo: string
  currency: string
  week52High: number | null
  week52Low: number | null
  peRatio: number | null
}

const profileCache = new Map<string, { data: FmpProfile; ts: number }>()
// Die 52W-Spanne bewegt sich täglich — kürzer als bei reinen Stammdaten.
const PROFILE_TTL = 60 * 60 * 1000

function positiveOrNull(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function fetchFirst(url: string, revalidate: number): Promise<any> {
  try {
    const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) ? data[0] ?? null : null
  } catch {
    return null
  }
}

export async function getFmpProfile(symbol: string): Promise<FmpProfile | null> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return null

  const key = symbol.toUpperCase()
  const cached = profileCache.get(key)
  if (cached && Date.now() - cached.ts < PROFILE_TTL) return cached.data

  const base = 'https://financialmodelingprep.com/api/v3'
  const [profile, quote] = await Promise.all([
    fetchFirst(`${base}/profile/${encodeURIComponent(key)}?apikey=${apiKey}`, 86400),
    fetchFirst(`${base}/quote/${encodeURIComponent(key)}?apikey=${apiKey}`, 900),
  ])
  const name = profile?.companyName || quote?.name
  if (!name) return cached?.data ?? null

  // Ersatz, falls /quote ausfällt: /profile führt die Spanne als "139.2-173.96".
  const [rangeLow, rangeHigh] = String(profile?.range || '').split('-').map(Number)

  const data: FmpProfile = {
    symbol: key,
    name,
    marketCap: Number(quote?.marketCap ?? profile?.mktCap) || 0,
    exchange: profile?.exchangeShortName || quote?.exchange || '',
    industry: profile?.industry || '',
    sector: profile?.sector || '',
    logo: profile?.image || '',
    currency: profile?.currency || 'USD',
    week52High: positiveOrNull(quote?.yearHigh) ?? positiveOrNull(rangeHigh),
    week52Low: positiveOrNull(quote?.yearLow) ?? positiveOrNull(rangeLow),
    peRatio: quote?.pe === null || quote?.pe === undefined || !Number.isFinite(Number(quote.pe)) ? null : Number(quote.pe),
  }
  profileCache.set(key, { data, ts: Date.now() })
  return data
}
