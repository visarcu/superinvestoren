// src/lib/marketData/missingSplits.ts
// Welche Splits fehlen den Käufen und Verkäufen einer Broker-Datei?
//
// Broker schreiben alte Buchungen nach einem Split nicht um, und nicht jeder
// Export nennt ihn (Flatex, Einzelabrechnungen). In ein leeres Depot importiert,
// stand L8I7.DE nach dem 200:1 vom 09.07.2026 mit 0,45 Stück zu 1.357 € bei einem
// Kurs von 9 €.
//
// Ob ein Split fehlt, zeigt der Schlusskurs vom Handelstag, auf die heutige
// Stückzahl bereinigt: In 15 echten Dateien lag der Kaufkurs vor einem
// ungenannten Split höchstens 5 % neben dem Verhältnis mal diesem Schlusskurs, bei
// genanntem Split höchstens 5 % neben dem Schlusskurs selbst.

import { missedSplitDivisors, yahooSplitEvents } from './yahooSplits'

export interface TradeSample {
  date: string
  /** Kurs in EUR, auf der Stückzahl der Datei */
  price: number
}

export interface SplitVerdict {
  symbol: string
  date: string
  /** neue Stücke je altem Stück */
  ratio: number
  /** true: fehlt den Buchungen davor, false: ist enthalten, null: nicht erkennbar */
  missing: boolean | null
}

interface SplitEvent {
  date: string
  ratio: number
}

// Kleinere Verhältnisse sind meist Spin-offs (GE 1253:1000) oder Umstellungen
// (Unilever 8:9) und von einer Kursbewegung nicht sicher zu trennen.
const MIN_STEP = Math.log(1.5)
// So weit darf der Kurs vom erwarteten abweichen, als Anteil am kleinsten Split.
const PRICE_TOLERANCE = 0.25

const step = (ratio: number) => Math.abs(Math.log(ratio))

/**
 * Urteil je Split. Geprüft wird gegen drei Arten von Ständen: kein Split fehlt,
 * alle fehlen, oder nur die jüngsten (die Datei ist zwischen zweien entstanden).
 */
export function judgeSplits(
  symbol: string,
  trades: TradeSample[],
  events: SplitEvent[],
  /** Schlusskurs in EUR auf heutiger Stückzahl, 0 wenn unbekannt */
  closeAt: (date: string) => number,
  /** Erste Buchung des Papiers, auch ohne Marktkurs */
  from?: string
): SplitVerdict[] {
  const splits = events.filter(e => step(e.ratio) >= MIN_STEP).sort((a, b) => b.date.localeCompare(a.date))
  const votes = splits.map(() => ({ missing: 0, included: 0 }))

  for (const { date, price } of trades) {
    const later = splits.filter(s => s.date > date)
    const close = closeAt(date)
    if (later.length === 0 || !(price > 0) || !(close > 0)) continue
    // Der Schlusskurs ist auch um Spin-offs bereinigt, der Kaufkurs nicht
    const reference = events
      .filter(e => e.date > date && step(e.ratio) < MIN_STEP)
      .reduce((value, e) => value * e.ratio, close)

    let factor = 1
    const best = [1, ...later.map(s => (factor *= s.ratio))]
      .map((f, count) => ({ count, gap: step(price / f / reference) }))
      .sort((a, b) => a.gap - b.gap)[0]
    if (best.gap > PRICE_TOLERANCE * Math.min(...later.map(s => step(s.ratio)))) continue
    later.forEach((_, i) => {
      if (i < best.count) votes[i].missing++
      else votes[i].included++
    })
  }

  return splits
    .filter(s => (from !== undefined && from < s.date) || trades.some(t => t.date < s.date))
    .map(split => {
      const { missing, included } = votes[splits.indexOf(split)]
      return { symbol, ...split, missing: missing > 0 === included > 0 ? null : missing > 0 }
    })
}

interface Chart {
  currency: string
  timestamps: number[]
  closes: (number | null)[]
  events: SplitEvent[]
}

const DAY_SECONDS = 86400
const isoDay = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10)

const RETRY_DELAY_MS = 800

/** Bei Abruflimit oder Serverfehler ein zweiter Versuch nach kurzer Pause. */
async function request(url: string): Promise<Response> {
  const load = () =>
    fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 6 * 3600 },
    })
  const res = await load()
  if (res.status !== 429 && res.status < 500) return res
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS + Math.random() * 400))
  return load()
}

/** Null: Yahoo führt das Papier nicht. Störungen werfen. */
async function fetchChart(symbol: string, fromDate: string, interval: '1mo' | '1d'): Promise<Chart | null> {
  const period1 = Math.floor(Date.parse(fromDate) / 1000)
  // Auf den Tag gerundet, damit die Antwort zwischengespeichert werden kann
  const period2 = (Math.floor(Date.now() / 1000 / DAY_SECONDS) + 1) * DAY_SECONDS
  const res = await request(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?period1=${period1}&period2=${period2}&interval=${interval}&region=DE&events=splits`
  )
  if (res.status === 404 || res.status === 400 || res.status === 422) return null
  if (!res.ok) throw new Error(`Yahoo ${res.status}`)
  const result = (await res.json())?.chart?.result?.[0]
  if (!result) return null

  const timestamps: number[] = result.timestamp || []
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []
  const splitEvents = yahooSplitEvents(result)
  const divisors = interval === '1d' ? missedSplitDivisors(timestamps, closes, splitEvents) : []
  return {
    currency: String(result.meta?.currency || ''),
    timestamps,
    closes: closes.map((close, i) => (close && close > 0 ? close / (divisors[i] || 1) : null)),
    events: splitEvents.map(e => ({ date: isoDay(e.date), ratio: e.numerator / e.denominator })),
  }
}

/** Wert am Tag oder bis zu sieben Tage davor, sonst 0. */
function lookup(timestamps: number[], values: (number | null)[], offsetSeconds = 0) {
  const days = timestamps
    .map((t, i) => ({ date: isoDay(t + offsetSeconds), value: values[i] || 0 }))
    .filter(day => day.value > 0)
  return (date: string): number => {
    let found: { date: string; value: number } | undefined
    for (const day of days) {
      if (day.date > date) break
      found = day
    }
    return found && Date.parse(date) - Date.parse(found.date) <= 7 * DAY_SECONDS * 1000 ? found.value : 0
  }
}

/** EUR je Einheit der Börsenwährung. Pence als GBp, so schreibt Yahoo sie. */
async function eurRates(currency: string, fromDate: string): Promise<(date: string) => number> {
  if (currency === 'EUR') return () => 1
  const pence = currency === 'GBp'
  // Durchgehende Historie hat Yahoo nur von EUR aus
  const chart = await fetchChart(`EUR${pence ? 'GBP' : currency}=X`, fromDate, '1d')
  // Der Tagesbalken beginnt um Mitternacht in London, im Sommer 23 Uhr UTC des Vortags
  const perEuro = chart ? lookup(chart.timestamps, chart.closes, 7200) : () => 0
  return date => {
    const rate = perEuro(date)
    return rate > 0 ? (pence ? 0.01 : 1) / rate : 0
  }
}

async function findForSymbol({ symbol, trades, from: firstBooking }: SplitRequest): Promise<SplitVerdict[]> {
  const first = [firstBooking, ...trades.map(t => t.date)].filter((date): date is string => !!date).sort()[0]
  if (!first) return []
  // Zum Jahresanfang, damit sich Antworten verschiedener Depots teilen lassen
  const from = `${Number(first.slice(0, 4)) - 1}-12-01`
  const months = await fetchChart(symbol, from, '1mo')
  if (!months?.events.some(e => step(e.ratio) >= MIN_STEP && e.date > first)) return []

  const days = await fetchChart(symbol, from, '1d')
  if (!days) return []
  const closes = lookup(days.timestamps, days.closes)
  const rates = await eurRates(days.currency, from)
  return judgeSplits(symbol, trades, days.events, date => closes(date) * rates(date), first)
}

export interface SplitRequest {
  symbol: string
  /** Käufe und Verkäufe, an deren Kurs sich der Split zeigt */
  trades: TradeSample[]
  /** Erste Buchung des Papiers. Ohne Käufe davor bleibt das Urteil offen. */
  from?: string
}

const CONCURRENCY = 8

/**
 * Splits, die nach den übergebenen Handelstagen stattfanden, samt Urteil.
 * `incomplete`: Mindestens ein Papier ließ sich wegen einer Störung nicht prüfen.
 */
export async function findMissingSplits(
  items: SplitRequest[]
): Promise<{ splits: SplitVerdict[]; incomplete: boolean }> {
  const queue = items.filter(item => item.trades.length > 0 || item.from)
  const splits: SplitVerdict[] = []
  let incomplete = false
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        splits.push(...(await findForSymbol(item)))
      } catch {
        incomplete = true
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { splits, incomplete }
}
