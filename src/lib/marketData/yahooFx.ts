// src/lib/marketData/yahooFx.ts
// Wechselkurs-Historie von Yahoo, Ausweichquelle für ein gestörtes FMP.

const CURRENCIES = new Set([
  'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'HKD', 'KRW', 'TWD', 'CNY', 'BRL', 'SEK', 'NOK',
  'DKK', 'INR', 'IDR', 'THB', 'SGD', 'NZD', 'PLN', 'TRY', 'MXN', 'SAR', 'QAR', 'KWD', 'ZAR',
])

/** Währungspaar wie EURUSD oder CHFEUR */
export const isFxPair = (symbol: string) =>
  symbol.length === 6 && CURRENCIES.has(symbol.slice(0, 3)) && CURRENCIES.has(symbol.slice(3))

const DAY_MS = 86_400_000
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Werktag vor einem Datum (Montag → Freitag) */
function previousWeekday(date: string): string {
  const ms = Date.parse(date)
  const weekday = new Date(ms).getUTCDay()
  return isoDay(ms - (weekday === 1 ? 3 : weekday === 0 ? 2 : 1) * DAY_MS)
}

/**
 * Tageskurse eines Währungspaars, aufsteigend.
 *
 * - Durchgehende Historie hat Yahoo nur von EUR aus: TRYEUR=X oder KWDEUR=X
 *   bestehen aus dem heutigen Kurs. CCYEUR ist deshalb die umgekehrte EURCCY=X.
 * - Ein Tagesbalken beginnt um Mitternacht in London und enthält bei vergangenen
 *   Tagen den Kurs dieses Zeitpunkts, also den Schluss des vorigen Werktags. Nur
 *   der jüngste Balken führt als Schluss den aktuellen Kurs. So zugeordnet weicht
 *   EURUSD über drei Jahre im Mittel 0,06 % von FMP ab, nach Kalendertag 0,30 %.
 */
export async function fetchYahooFx(
  pair: string,
  fromDate: string,
  toDate: string
): Promise<Array<{ date: string; close: number }>> {
  const invert = pair.endsWith('EUR')
  const symbol = `${invert ? `EUR${pair.slice(0, 3)}` : pair}=X`
  try {
    // Vorlauf, um Paare ohne Historie zu erkennen, Nachlauf für den Balken nach dem Fenster
    const period1 = Math.floor(Date.parse(fromDate) / 1000) - 10 * 86400
    const period2 = Math.min(Math.floor(Date.parse(toDate) / 1000) + 5 * 86400, Math.floor(Date.now() / 1000))
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
        `?period1=${period1}&period2=${period2}&interval=1d&region=DE`,
      { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return []
    const result = (await res.json())?.chart?.result?.[0]
    const timestamps: number[] = result?.timestamp || []
    const quote = result?.indicators?.quote?.[0] ?? {}
    if (timestamps.length <= 2) return []

    const rates = new Map<string, number>()
    const add = (date: string, rate: number | null | undefined) => {
      if (!rate || rate <= 0 || date < fromDate || date > toDate) return
      rates.set(date, invert ? 1 / rate : rate)
    }
    timestamps.forEach((timestamp, i) => {
      // Im Sommer liegt Mitternacht in London auf 23 Uhr UTC des Vortags
      const day = isoDay((timestamp + 7200) * 1000)
      add(previousWeekday(day), quote.open?.[i] ?? quote.close?.[i])
      if (i === timestamps.length - 1) add(day, quote.close?.[i])
    })
    return [...rates].map(([date, close]) => ({ date, close }))
  } catch {
    return []
  }
}
