// src/lib/marketData/history.ts
// Historische Tageskurse und FX-Reihen: FMP zuerst, Yahoo als Auffangnetz.
//
// Symbole in unserer Schreibweise (AAPL, VWCE.DE, VOD.L, ^GDAXI, BTCUSD).
// Ältere Clients schicken teils noch die frühere EODHD-Notation (GSPC.INDX,
// BMW.XETRA, BTC-USD.CC) — die wird hier übersetzt, EODHD selbst wird nicht
// mehr angefragt.

import { yahooSymbolFromEodhd } from './symbols'
import { fetchFmpCurrencies } from './providers/fmpQuotes'

export interface DailyBar {
  date: string
  open: number
  high: number
  low: number
  /** Split-bereinigt (FMP und Yahoo liefern beide so). */
  close: number
  /** Zusätzlich dividendenbereinigt. */
  adjClose: number
  volume: number
}

const HISTORY_TTL_MS = 30 * 60 * 1000
const MAX_CACHE_ENTRIES = 2_000
const historyCache = new Map<string, { bars: DailyBar[]; expires: number }>()

/** Frühere EODHD-Notation → unsere Schreibweise. Alles andere bleibt unverändert. */
export function normalizeHistorySymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase()
  const idx = upper.lastIndexOf('.')
  if (idx <= 0) return upper
  const code = upper.slice(0, idx)
  const namespace = upper.slice(idx + 1)
  if (namespace === 'INDX') return `^${code}`
  if (namespace === 'CC') return code.replace('-', '') // BTC-USD.CC → BTCUSD
  if (namespace === 'FOREX') return code
  // XETRA → .DE, LSE → .L, US → ohne Suffix; echte Suffixe wie .DE bleiben.
  if (namespace === 'US' || namespace === 'XETRA' || namespace === 'LSE') {
    return yahooSymbolFromEodhd(upper) || upper
  }
  return upper
}

async function fetchFmpDaily(symbol: string, fromDate: string, toDate: string): Promise<DailyBar[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}` +
        `?from=${fromDate}&to=${toDate}&apikey=${apiKey}`,
      { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const rows: any[] = Array.isArray(data?.historical) ? data.historical : []
    const bars: DailyBar[] = []
    for (const row of rows) {
      const close = Number(row?.close)
      if (!row?.date || !Number.isFinite(close) || close <= 0) continue
      bars.push({
        date: String(row.date).slice(0, 10),
        open: Number(row.open) || close,
        high: Number(row.high) || close,
        low: Number(row.low) || close,
        close,
        adjClose: Number(row.adjClose) || close,
        volume: Number(row.volume) || 0,
      })
    }
    // FMP liefert neueste zuerst — Konsumenten erwarten aufsteigend.
    return bars.sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

/** Yahoo-Tageskurse über den genauen Zeitraum (nicht pauschal 2 Jahre), samt Währung. */
async function fetchYahooDaily(
  symbol: string,
  fromDate: string,
  toDate: string
): Promise<{ bars: DailyBar[]; currency: string | null }> {
  const empty = { bars: [] as DailyBar[], currency: null }
  try {
    const period1 = Math.floor(new Date(fromDate).getTime() / 1000)
    const period2 = Math.floor(new Date(toDate).getTime() / 1000) + 86400
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
        `?period1=${period1}&period2=${period2}&interval=1d&region=DE`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return empty
    const result = (await res.json())?.chart?.result?.[0]
    if (!result?.timestamp?.length) return empty

    const timestamps: number[] = result.timestamp
    const quote = result.indicators?.quote?.[0] ?? {}
    const adjCloses: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || []
    const bars: DailyBar[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close?.[i]
      if (close === null || close === undefined || close <= 0) continue
      bars.push({
        date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
        open: quote.open?.[i] ?? close,
        high: quote.high?.[i] ?? close,
        low: quote.low?.[i] ?? close,
        close,
        adjClose: adjCloses[i] ?? close,
        volume: quote.volume?.[i] ?? 0,
      })
    }
    // Yahoo schreibt Pence als 'GBp'.
    const rawCurrency = typeof result.meta?.currency === 'string' ? result.meta.currency : ''
    return { bars, currency: rawCurrency === 'GBp' ? 'GBX' : rawCurrency.toUpperCase() || null }
  } catch {
    return empty
  }
}

/**
 * '.L'-Reihen liefern unsere Routen in Pence — dieselbe Konvention wie
 * /api/quotes, auf die alle Konsumenten (÷ 100) bauen. Pfund-Linien wie
 * VUSA.L führen FMP und Yahoo aber in GBP.
 */
function poundsToPence(bars: DailyBar[]): DailyBar[] {
  return bars.map(bar => ({
    ...bar,
    open: bar.open * 100,
    high: bar.high * 100,
    low: bar.low * 100,
    close: bar.close * 100,
    adjClose: bar.adjClose * 100,
  }))
}

/** Tageskurse von `fromDate` bis `toDate` (aufsteigend). Leeres Array, wenn keine Quelle liefert. */
export async function getDailyHistory(symbol: string, fromDate: string, toDate: string): Promise<DailyBar[]> {
  const normalized = normalizeHistorySymbol(symbol)
  const cacheKey = `${normalized}|${fromDate}|${toDate}`
  const cached = historyCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.bars

  const london = normalized.endsWith('.L')
  let bars = await fetchFmpDaily(normalized, fromDate, toDate)
  let currency: string | null = null
  if (bars.length > 0) {
    if (london) currency = (await fetchFmpCurrencies([normalized]))[normalized] || null
  } else {
    const yahoo = await fetchYahooDaily(normalized, fromDate, toDate)
    bars = yahoo.bars
    currency = yahoo.currency
  }
  if (london && currency === 'GBP') bars = poundsToPence(bars)

  if (bars.length > 0) {
    if (historyCache.size > MAX_CACHE_ENTRIES) historyCache.clear()
    historyCache.set(cacheKey, { bars, expires: Date.now() + HISTORY_TTL_MS })
  }
  return bars
}

/**
 * FX-Historie als Map Datum → EUR je Einheit (USDEUR: EUR pro 1 USD,
 * GBPEUR: EUR pro 1 GBP). FMP führt beide Paare direkt; Yahoo nur die
 * Gegenrichtung (EURUSD=X), die deshalb invertiert wird.
 */
export async function getFxHistory(
  pair: 'USDEUR' | 'GBPEUR',
  fromDate: string,
  toDate: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>()

  const direct = await fetchFmpDaily(pair, fromDate, toDate)
  if (direct.length > 0) {
    for (const bar of direct) map.set(bar.date, bar.close)
    return map
  }

  const inverse = await fetchYahooDaily(pair === 'USDEUR' ? 'EURUSD=X' : 'EURGBP=X', fromDate, toDate)
  for (const bar of inverse.bars) map.set(bar.date, 1 / bar.close)
  return map
}
