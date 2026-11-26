// src/lib/marketData/history.ts
// Historische Tageskurse und FX-Reihen: FMP zuerst, Yahoo als Auffangnetz.
//
// Symbole in unserer Schreibweise (AAPL, VWCE.DE, VOD.L, ^GDAXI, BTCUSD).
// Ältere Clients schicken teils noch die frühere EODHD-Notation (GSPC.INDX,
// BMW.XETRA, BTC-USD.CC) — die wird hier übersetzt, EODHD selbst wird nicht
// mehr angefragt.

import { yahooSymbolFromEodhd } from './symbols'
import { fetchFmpJson } from './fmpRequest'
import { fetchFmpCurrencies } from './providers/fmpQuotes'
import { fetchYahooFx, isFxPair } from './yahooFx'
import { missedSplitDivisors, yahooSplitEvents } from './yahooSplits'

export interface DailyBar {
  date: string
  open: number
  high: number
  low: number
  /** Split-bereinigt (FMP liefert so, bei Yahoo ergänzt yahooSplits fehlende Splits). */
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

/** `outage`: FMP war gestört, eine leere Reihe heißt dann nicht "unbekanntes Papier". */
async function fetchFmpDaily(
  symbol: string,
  fromDate: string,
  toDate: string
): Promise<{ bars: DailyBar[]; outage: boolean }> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return { bars: [], outage: false }
  const { data, outage } = await fetchFmpJson(
    `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}` +
      `?from=${fromDate}&to=${toDate}&apikey=${apiKey}`
  )
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
  return { bars: bars.sort((a, b) => a.date.localeCompare(b.date)), outage }
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
    // Bis heute laden, auch wenn das Fenster früher endet: Yahoo nennt nur Splits
    // aus dem abgefragten Zeitraum, und nur mit den Kursen danach lässt sich
    // erkennen, ob sie eingerechnet sind.
    const period2 = Math.max(Math.floor(new Date(toDate).getTime() / 1000) + 86400, Math.floor(Date.now() / 1000))
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
        `?period1=${period1}&period2=${period2}&interval=1d&region=DE&events=splits`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return empty
    const result = (await res.json())?.chart?.result?.[0]
    if (!result?.timestamp?.length) return empty

    const timestamps: number[] = result.timestamp
    const quote = result.indicators?.quote?.[0] ?? {}
    const adjCloses: (number | null)[] = result.indicators?.adjclose?.[0]?.adjclose || []
    const splits = yahooSplitEvents(result)
    const divisors = missedSplitDivisors(timestamps, quote.close || [], splits)
    const adjDivisors = missedSplitDivisors(timestamps, adjCloses, splits)
    const bars: DailyBar[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close?.[i]
      if (close === null || close === undefined || close <= 0) continue
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10)
      if (date > toDate) break
      const divisor = divisors[i]
      const adjClose = adjCloses[i]
      bars.push({
        date,
        open: (quote.open?.[i] ?? close) / divisor,
        high: (quote.high?.[i] ?? close) / divisor,
        low: (quote.low?.[i] ?? close) / divisor,
        close: close / divisor,
        adjClose: adjClose ? adjClose / adjDivisors[i] : close / divisor,
        volume: (quote.volume?.[i] ?? 0) * divisor,
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
  const fmp = await fetchFmpDaily(normalized, fromDate, toDate)
  let bars = fmp.bars
  let currency: string | null = null
  if (bars.length > 0) {
    if (london) {
      // Ohne Antwort von FMP gälte eine Pfund-Linie als Pence, Faktor 100
      currency =
        (await fetchFmpCurrencies([normalized]))[normalized] ||
        (await fetchYahooDaily(normalized, fromDate, toDate)).currency
    }
  } else if (fmp.outage && isFxPair(normalized)) {
    // Als EURUSD kennt Yahoo das Paar nicht, nur als EURUSD=X
    bars = (await fetchYahooFx(normalized, fromDate, toDate)).map(({ date, close }) => ({
      date, open: close, high: close, low: close, close, adjClose: close, volume: 0,
    }))
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
 * GBPEUR: EUR pro 1 GBP). FMP führt beide Paare direkt, sonst Yahoo.
 */
export async function getFxHistory(
  pair: string,
  fromDate: string,
  toDate: string
): Promise<Map<string, number>> {
  const direct = await fetchFmpDaily(pair, fromDate, toDate)
  const days: Array<{ date: string; close: number }> =
    direct.bars.length > 0 ? direct.bars : await fetchYahooFx(pair, fromDate, toDate)
  return new Map(days.map(day => [day.date, day.close]))
}
