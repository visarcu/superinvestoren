// src/lib/marketData/quoteService.ts
// Eine Stelle, an der Kurse herkommen.
//
// Ablauf je Symbol:
//   1. Cache (45 s)
//   2. Stammdaten: Symbol → ISIN → Anbieter-Symbole
//   3. EODHD für europäische Notierungen, FMP für den Rest — beides Batch
//   4. jeweils der andere Anbieter als Auffangnetz, zuletzt Yahoo
//
// Die Stammdaten liefern auch die Notierungswährung. Dadurch muss sie nicht
// mehr aus dem Ticker-Suffix geraten werden (die Quelle mehrerer Pence- und
// USD/EUR-Verwechslungen in der Vergangenheit).

import type { Instrument, NormalizedQuote, RawQuote } from './types'
import { fetchEodhdQuotes, eodhdConfigured } from './providers/eodhd'
import { fetchFmpQuotes, fmpConfigured } from './providers/fmpQuotes'
import { fetchYahooFirstAvailable } from './providers/yahooQuotes'
import { getInstrumentsForSymbols, resolveSymbolViaSearch } from './instrumentStore'
import { isIsin, SUFFIX_TO_EXCHANGE } from './symbols'
import { YAHOO_ALIASES } from '@/data/tickerFallbacks'

const QUOTE_TTL_MS = 45_000
const MAX_CACHE_ENTRIES = 10_000
const quoteCache = new Map<string, { quote: NormalizedQuote; expires: number }>()

/** Börsen, für die EODHD die bessere Abdeckung hat als FMP. */
const EODHD_FIRST_EXCHANGES = new Set(['XETRA', 'F', 'AS', 'PA', 'SW', 'MI', 'MC', 'VI', 'BR', 'ST', 'CO', 'HE', 'LSE'])

/** Währung aus dem Ticker-Suffix — nur wenn keine Stammdaten vorliegen. */
export function currencyFromSuffix(symbol: string): string {
  const s = symbol.toUpperCase()
  if (/\.(DE|F|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU|LS)$/.test(s)) return 'EUR'
  if (s.endsWith('.L')) return 'GBX'
  if (s.endsWith('.TO') || s.endsWith('.V')) return 'CAD'
  if (s.endsWith('.T')) return 'JPY'
  if (s.endsWith('.SW') || s.endsWith('.S')) return 'CHF'
  if (s.endsWith('.AX')) return 'AUD'
  if (s.endsWith('.ST')) return 'SEK'
  if (s.endsWith('.CO')) return 'DKK'
  if (s.endsWith('.OL')) return 'NOK'
  return 'USD'
}

function exchangeFromSymbol(symbol: string): string | null {
  const parts = symbol.toUpperCase().split('.')
  if (parts.length < 2) return 'US'
  return SUFFIX_TO_EXCHANGE[parts[parts.length - 1]] || null
}

function readCache(symbol: string): NormalizedQuote | null {
  const hit = quoteCache.get(symbol)
  if (!hit) return null
  if (hit.expires <= Date.now()) {
    quoteCache.delete(symbol)
    return null
  }
  return hit.quote
}

function writeCache(quotes: NormalizedQuote[]) {
  if (quoteCache.size > MAX_CACHE_ENTRIES) quoteCache.clear()
  const expires = Date.now() + QUOTE_TTL_MS
  for (const q of quotes) {
    if (q.price > 0) quoteCache.set(q.symbol, { quote: q, expires })
  }
}

/** Nur für Tests/Skripte: Cache leeren. */
export function clearQuoteCache() {
  quoteCache.clear()
}

/** EODHD-Symbol raten, wenn kein Stammsatz existiert (VHYL.DE → VHYL.XETRA). */
function guessEodhdSymbol(symbol: string): string | null {
  const upper = symbol.toUpperCase()
  if (isIsin(upper)) return null
  const parts = upper.split('.')
  if (parts.length === 1) return `${parts[0]}.US`
  const exchange = SUFFIX_TO_EXCHANGE[parts[parts.length - 1]]
  return exchange ? `${parts.slice(0, -1).join('.')}.${exchange}` : null
}

interface Plan {
  symbol: string
  instrument: Instrument | null
  eodhdSymbol: string | null
  fmpSymbol: string | null
  yahooCandidates: string[]
  currency: string
  preferEodhd: boolean
}

function buildPlan(symbol: string, instrument: Instrument | null): Plan {
  // Maßgeblich ist die Notierung, die der Nutzer hält — also das angefragte
  // Symbol. Sonst würde 'XOM' über Xetra bewertet (fremde Handelszeiten, ein
  // FX-Umweg), nur weil der Broker beim Import eine deutsche ISIN mitgab.
  const exchange = isIsin(symbol)
    ? instrument?.exchange?.toUpperCase() || null
    : exchangeFromSymbol(symbol) || instrument?.exchange?.toUpperCase() || null
  const currency = instrument?.currency || currencyFromSuffix(symbol)

  // Yahoo-Kandidaten: erst das Stammdaten-Symbol, dann das angefragte selbst.
  // Beide Richtungen kommen vor — VGWD.DE kennt nur Yahoo, VHYL.AS nur die Alt-Börse.
  // YAHOO_ALIASES deckt Papiere ab, die es an keiner der geladenen Börsen gibt
  // (TOJ.DE → RIG: Transocean hat kein handelbares Xetra-Listing).
  const yahooCandidates = [
    instrument?.yahooSymbol || undefined,
    isIsin(symbol) ? undefined : symbol,
    YAHOO_ALIASES[symbol.toUpperCase()],
    instrument?.fmpSymbol || undefined,
  ].filter((c): c is string => Boolean(c))

  return {
    symbol,
    instrument,
    eodhdSymbol: instrument?.eodhdSymbol || guessEodhdSymbol(symbol),
    fmpSymbol: instrument?.fmpSymbol || (isIsin(symbol) ? null : symbol),
    yahooCandidates: [...new Set(yahooCandidates)],
    currency,
    preferEodhd: Boolean(exchange && EODHD_FIRST_EXCHANGES.has(exchange)),
  }
}

/**
 * Die Währung gehört zur abgefragten Notierung, nicht zum Instrument.
 *
 * 'XOM' liegt im Stammsatz als XONA.XETRA (EUR), weil der Broker die ISIN eines
 * deutschen Listings mitgeliefert hat. Der Kurs kommt aber von FMP unter 'XOM'
 * in USD. Wurde er mit EUR etikettiert, rechnete die Route ihn nach USD hoch —
 * 15,6 % zu viel, ohne dass irgendwo ein Fehler aufgetaucht wäre.
 */
function currencyForSource(plan: Plan, raw: RawQuote, source: NormalizedQuote['source']): string {
  // Yahoo liefert die Währung der gelieferten Notierung selbst mit.
  if (source === 'yahoo' && raw.currency) return raw.currency
  // FMP folgt seiner eigenen Symbol-Konvention (XOM = USD, ULVR.L = Pence).
  if (source === 'fmp') return currencyFromSuffix(plan.fmpSymbol || plan.symbol)
  // EODHD: die Währung des Symbols, das wir dort abgefragt haben — genau die
  // steht am Alias bzw. am Instrument.
  return plan.currency
}

function toNormalized(plan: Plan, raw: RawQuote, source: NormalizedQuote['source']): NormalizedQuote {
  return {
    symbol: plan.symbol,
    price: raw.price,
    currency: currencyForSource(plan, raw, source),
    change: raw.change,
    changePercent: raw.changePercent,
    previousClose: raw.previousClose,
    name: raw.name || plan.instrument?.name,
    source,
    sourceSymbol: raw.symbol,
    raw: raw.raw,
  }
}

/**
 * Kurse für beliebige Symbole oder ISINs. Fehlende Symbole fehlen im Ergebnis —
 * der Aufrufer entscheidet, wie er das darstellt.
 */
export async function getQuotes(requested: string[]): Promise<Map<string, NormalizedQuote>> {
  const result = new Map<string, NormalizedQuote>()
  const unique = [...new Set(requested.map(s => s.trim().toUpperCase()).filter(Boolean))]
  if (unique.length === 0) return result

  const pending: string[] = []
  for (const symbol of unique) {
    const cached = readCache(symbol)
    if (cached) result.set(symbol, cached)
    else pending.push(symbol)
  }
  if (pending.length === 0) return result

  const instruments = await getInstrumentsForSymbols(pending)
  const plans = pending.map(s => buildPlan(s, instruments.get(s) || null))

  // --- Runde 1: bevorzugter Anbieter, gebündelt ---
  const eodhdFirst = plans.filter(p => p.preferEodhd && p.eodhdSymbol)
  const fmpFirst = plans.filter(p => !p.preferEodhd && p.fmpSymbol)

  const [eodhdRound1, fmpRound1] = await Promise.all([
    eodhdConfigured() && eodhdFirst.length > 0
      ? fetchEodhdQuotes(eodhdFirst.map(p => p.eodhdSymbol!))
      : Promise.resolve({} as Record<string, RawQuote>),
    fmpConfigured() && fmpFirst.length > 0
      ? fetchFmpQuotes(fmpFirst.map(p => p.fmpSymbol!))
      : Promise.resolve({} as Record<string, RawQuote>),
  ])

  const resolved = new Map<string, NormalizedQuote>()
  for (const plan of eodhdFirst) {
    const raw = eodhdRound1[plan.eodhdSymbol!.toUpperCase()]
    if (raw) resolved.set(plan.symbol, toNormalized(plan, raw, 'eodhd'))
  }
  for (const plan of fmpFirst) {
    const raw = fmpRound1[plan.fmpSymbol!.toUpperCase()]
    if (raw) resolved.set(plan.symbol, toNormalized(plan, raw, 'fmp'))
  }

  // --- Runde 2: jeweils der andere Anbieter ---
  const round2 = plans.filter(p => !resolved.has(p.symbol))
  if (round2.length > 0) {
    const needFmp = round2.filter(p => p.preferEodhd && p.fmpSymbol)
    const needEodhd = round2.filter(p => !p.preferEodhd && p.eodhdSymbol)

    const [fmpRound2, eodhdRound2] = await Promise.all([
      fmpConfigured() && needFmp.length > 0
        ? fetchFmpQuotes(needFmp.map(p => p.fmpSymbol!))
        : Promise.resolve({} as Record<string, RawQuote>),
      eodhdConfigured() && needEodhd.length > 0
        ? fetchEodhdQuotes(needEodhd.map(p => p.eodhdSymbol!))
        : Promise.resolve({} as Record<string, RawQuote>),
    ])

    for (const plan of needFmp) {
      const raw = fmpRound2[plan.fmpSymbol!.toUpperCase()]
      if (raw) resolved.set(plan.symbol, toNormalized(plan, raw, 'fmp'))
    }
    for (const plan of needEodhd) {
      const raw = eodhdRound2[plan.eodhdSymbol!.toUpperCase()]
      if (raw) resolved.set(plan.symbol, toNormalized(plan, raw, 'eodhd'))
    }
  }

  // --- Runde 3: unbekannte Symbole einmalig über die EODHD-Suche lernen ---
  const unknown = plans.filter(p => !resolved.has(p.symbol) && !p.instrument)
  if (unknown.length > 0 && eodhdConfigured()) {
    const learned = await Promise.allSettled(
      unknown.slice(0, 25).map(async plan => {
        const instrument = await resolveSymbolViaSearch(plan.symbol)
        if (!instrument?.eodhdSymbol) return null
        const quotes = await fetchEodhdQuotes([instrument.eodhdSymbol])
        const raw = quotes[instrument.eodhdSymbol.toUpperCase()]
        if (!raw) return null
        return toNormalized(buildPlan(plan.symbol, instrument), raw, 'eodhd')
      })
    )
    for (const entry of learned) {
      if (entry.status === 'fulfilled' && entry.value) resolved.set(entry.value.symbol, entry.value)
    }
  }

  // --- Runde 4: Yahoo als letzte Instanz ---
  const stillMissing = plans.filter(p => !resolved.has(p.symbol) && p.yahooCandidates.length > 0)
  if (stillMissing.length > 0) {
    const yahooResults = await Promise.allSettled(
      stillMissing.map(async plan => {
        const raw = await fetchYahooFirstAvailable(plan.yahooCandidates)
        return raw ? toNormalized(plan, raw, 'yahoo') : null
      })
    )
    for (const entry of yahooResults) {
      if (entry.status === 'fulfilled' && entry.value) resolved.set(entry.value.symbol, entry.value)
    }
  }

  const fresh = [...resolved.values()]
  writeCache(fresh)
  for (const quote of fresh) result.set(quote.symbol, quote)

  return result
}
