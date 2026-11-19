// src/lib/publicStockData.ts
// Server-only: Stammdaten und Kurs einer Aktie von FMP für die öffentlichen
// Aktienseiten (/aktie/[ticker]). Fehler führen zu null statt zum Abbruch –
// die Seite rendert dann ohne Kursblock.

const FMP_BASE = 'https://financialmodelingprep.com/api/v3'
const REVALIDATE_SECONDS = 3600

export interface PublicStockProfile {
  companyName: string
  currency: string
  isin: string | null
  exchange: string | null
  sector: string | null
  industry: string | null
  country: string | null
  city: string | null
  ceo: string | null
  employees: number | null
  ipoDate: string | null
  website: string | null
  image: string | null
  lastDividend: number | null
  beta: number | null
  isEtf: boolean
  isFund: boolean
}

export interface PublicStockQuote {
  price: number
  change: number
  changePercent: number
  yearLow: number | null
  yearHigh: number | null
  marketCap: number | null
  pe: number | null
  eps: number | null
  /** Unix-Sekunden */
  timestamp: number | null
}

export interface PublicStockData {
  profile: PublicStockProfile | null
  quote: PublicStockQuote | null
}

async function fmpFirst(path: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`${FMP_BASE}/${path}?apikey=${apiKey}`, { next: { revalidate: REVALIDATE_SECONDS } })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) && data[0] && typeof data[0] === 'object' ? data[0] : null
  } catch {
    return null
  }
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

export async function getPublicStockData(ticker: string): Promise<PublicStockData> {
  const symbol = encodeURIComponent(ticker.toUpperCase())
  const [p, q] = await Promise.all([fmpFirst(`profile/${symbol}`), fmpFirst(`quote/${symbol}`)])

  const profile: PublicStockProfile | null =
    p && str(p.companyName)
      ? {
          companyName: str(p.companyName)!,
          currency: str(p.currency) ?? 'USD',
          isin: str(p.isin),
          exchange: str(p.exchangeShortName) ?? str(p.exchange),
          sector: str(p.sector),
          industry: str(p.industry),
          country: str(p.country),
          city: str(p.city),
          ceo: str(p.ceo),
          employees: num(p.fullTimeEmployees),
          ipoDate: str(p.ipoDate),
          website: str(p.website),
          image: p.defaultImage ? null : str(p.image),
          lastDividend: num(p.lastDiv),
          beta: num(p.beta),
          isEtf: p.isEtf === true,
          isFund: p.isFund === true,
        }
      : null

  const price = num(q?.price)
  const quote: PublicStockQuote | null =
    q && price !== null && price > 0
      ? {
          price,
          change: num(q.change) ?? 0,
          changePercent: num(q.changesPercentage) ?? 0,
          yearLow: num(q.yearLow),
          yearHigh: num(q.yearHigh),
          marketCap: num(q.marketCap),
          pe: num(q.pe),
          eps: num(q.eps),
          timestamp: num(q.timestamp),
        }
      : null

  return { profile, quote }
}
