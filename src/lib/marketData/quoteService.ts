// src/lib/marketData/quoteService.ts
// Eine Stelle, an der Kurse herkommen.
//
// Ablauf je Symbol:
//   1. Cache (45 s)
//   2. Stammdaten: Symbol → ISIN → Notierung (Börsenticker + Währung)
//   3. FMP im Batch — angefragtes Symbol und Börsenticker der Notierung
//   4. unbekannte Symbole einmalig über die FMP-Suche lernen
//   5. Yahoo als letzte Instanz
// Ein eingefrorener FMP-Kurs zählt dabei wie keiner und kommt erst ganz am Schluss
// zum Zug, wenn keine Notierung etwas Frischeres liefert.
//
// Die Stammdaten liefern auch die Notierungswährung. Dadurch muss sie nicht
// mehr aus dem Ticker-Suffix geraten werden (die Quelle mehrerer Pence- und
// USD/EUR-Verwechslungen in der Vergangenheit).

import type { Instrument, NormalizedQuote, RawQuote } from './types'
import { fetchFmpQuotes, fmpConfigured } from './providers/fmpQuotes'
import { fetchYahooFirstAvailable, fetchYahooQuote } from './providers/yahooQuotes'
import { getInstrumentsForSymbols, resolveSymbolViaSearch } from './instrumentStore'
import { isIsin, SUFFIX_TO_EXCHANGE, yahooSymbolFromEodhd } from './symbols'
import { YAHOO_ALIASES } from '@/data/tickerFallbacks'

const QUOTE_TTL_MS = 45_000
/** Yahoo-Abrufe je Aufruf: unbekannte Symbole in Masse drosselten sonst die Server-IP */
const MAX_YAHOO_FALLBACKS = 40
const MAX_CACHE_ENTRIES = 10_000
const quoteCache = new Map<string, { quote: NormalizedQuote; expires: number }>()

/**
 * Ab diesem Alter gilt ein Kurs als eingefroren. FMP führt umbenannte und
 * eingestellte Notierungen mit dem letzten Kurs weiter, ohne sie zu kennzeichnen:
 * SWF.DE stand im November 2026 noch mit 82,56 € vom 13.02.2025, während dieselbe
 * Aktie als SWF.F bei 101,70 € gehandelt wurde. 14 Tage überdauern jede Feiertagspause.
 */
const FROZEN_AFTER_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Börsen, an denen der Broker-Ticker oft nicht der Börsenticker ist (VHYL.DE
 * für VGWD.DE). Dort gewinnt die Notierung aus den Stammdaten.
 */
const LISTING_FIRST_EXCHANGES = new Set(['XETRA', 'F', 'AS', 'PA', 'SW', 'MI', 'MC', 'VI', 'BR', 'ST', 'CO', 'HE', 'LSE'])

/** Währung aus dem Ticker-Suffix — nur wenn keine Stammdaten vorliegen. */
export function currencyFromSuffix(symbol: string): string {
  const s = symbol.toUpperCase()
  if (/\.(DE|F|SG|MU|DU|HM|BE|HA|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU|LS|IR)$/.test(s)) return 'EUR'
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

/** Zeitpunkt des Kurses in ms (FMP und Yahoo liefern 'timestamp' in Sekunden), null ohne Angabe. */
function quoteTime(raw: RawQuote): number | null {
  const seconds = Number(raw.raw?.timestamp)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null
}

function isFrozen(raw: RawQuote): boolean {
  const time = quoteTime(raw)
  return time !== null && Date.now() - time > FROZEN_AFTER_MS
}

/** Ersatz für einen eingefrorenen Kurs: nur mit Zeitangabe und nur, wenn er frisch ist. */
async function fetchYahooFresh(candidates: string[]): Promise<RawQuote | null> {
  for (const candidate of candidates) {
    const quote = await fetchYahooQuote(candidate)
    if (quote && quoteTime(quote) !== null && !isFrozen(quote)) return quote
  }
  return null
}

/** Nur für Tests/Skripte: Cache leeren. */
export function clearQuoteCache() {
  quoteCache.clear()
}

interface Plan {
  symbol: string
  instrument: Instrument | null
  /** FMP-Symbole in Abfrage-Reihenfolge; das erste mit Kurs gewinnt. */
  fmpCandidates: string[]
  /** Börsenticker der Notierung laut Stammdaten (VGWD.DE für VHYL.DE). */
  listingSymbol: string | null
  yahooCandidates: string[]
  currency: string
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

  // Notierung aus den Stammdaten (Spalte eodhd_symbol: Code.Börse) in
  // FMP-Schreibweise — für die geladenen Börsen identisch mit Yahoo.
  const listingSymbol = yahooSymbolFromEodhd(instrument?.eodhdSymbol)
  const requestedSymbol = instrument?.fmpSymbol || (isIsin(symbol) ? null : symbol)
  const listingFirst = Boolean(exchange && LISTING_FIRST_EXCHANGES.has(exchange))
  const fmpCandidates = (listingFirst ? [listingSymbol, requestedSymbol] : [requestedSymbol, listingSymbol])
    .filter((c): c is string => Boolean(c))
    .map(c => c.toUpperCase())

  return {
    symbol,
    instrument,
    fmpCandidates: [...new Set(fmpCandidates)],
    listingSymbol: listingSymbol?.toUpperCase() || null,
    yahooCandidates: [...new Set(yahooCandidates)],
    currency,
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
function currencyForSource(plan: Plan, raw: RawQuote): string {
  // Yahoo liefert die Währung der gelieferten Notierung selbst mit, FMP an
  // der LSE ebenfalls (aus dem Profil, siehe fetchFmpQuotes).
  if (raw.currency) return raw.currency
  // Kam der Kurs unter dem Börsenticker der Stammdaten-Notierung, gilt deren
  // Währung — sie unterscheidet etwa eine USD-Linie an der SIX vom CHF-Listing.
  if (plan.listingSymbol && raw.symbol.toUpperCase() === plan.listingSymbol) return plan.currency
  // Sonst folgt FMP seiner eigenen Symbol-Konvention (XOM = USD, ULVR.L = Pence).
  return currencyFromSuffix(raw.symbol)
}

function toNormalized(plan: Plan, raw: RawQuote, source: NormalizedQuote['source']): NormalizedQuote {
  return {
    symbol: plan.symbol,
    price: raw.price,
    currency: currencyForSource(plan, raw),
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

  // --- Runde 1: FMP, alle Kandidaten in einem Batch ---
  const resolved = new Map<string, NormalizedQuote>()
  const frozen = new Map<string, RawQuote>()
  const fmpPlans = plans.filter(p => p.fmpCandidates.length > 0)
  if (fmpConfigured() && fmpPlans.length > 0) {
    const fmpQuotes = await fetchFmpQuotes([...new Set(fmpPlans.flatMap(p => p.fmpCandidates))])
    for (const plan of fmpPlans) {
      const hits = plan.fmpCandidates.map(c => fmpQuotes[c]).filter(Boolean)
      const fresh = hits.find(q => !isFrozen(q))
      if (fresh) resolved.set(plan.symbol, toNormalized(plan, fresh, 'fmp'))
      else if (hits.length > 0) {
        frozen.set(plan.symbol, hits.reduce((a, b) => ((quoteTime(b) ?? 0) > (quoteTime(a) ?? 0) ? b : a)))
      }
    }
  }

  // --- Runde 2: unbekannte Symbole einmalig über die FMP-Suche lernen ---
  const unknown = plans.filter(p => !resolved.has(p.symbol) && !frozen.has(p.symbol) && !p.instrument)
  if (unknown.length > 0 && fmpConfigured()) {
    const learned = await Promise.allSettled(
      unknown.slice(0, 25).map(async plan => {
        const instrument = await resolveSymbolViaSearch(plan.symbol)
        if (!instrument?.fmpSymbol) return null
        const learnedPlan = buildPlan(plan.symbol, instrument)
        const quotes = await fetchFmpQuotes(learnedPlan.fmpCandidates)
        const raw = learnedPlan.fmpCandidates.map(c => quotes[c]).find(Boolean)
        return raw ? toNormalized(learnedPlan, raw, 'fmp') : null
      })
    )
    for (const entry of learned) {
      if (entry.status === 'fulfilled' && entry.value) resolved.set(entry.value.symbol, entry.value)
    }
  }

  // --- Runde 3: Yahoo als letzte Instanz ---
  const stillMissing = plans
    .filter(p => !resolved.has(p.symbol) && p.yahooCandidates.length > 0)
    .slice(0, MAX_YAHOO_FALLBACKS)
  if (stillMissing.length > 0) {
    const yahooResults = await Promise.allSettled(
      stillMissing.map(async plan => {
        const raw = frozen.has(plan.symbol)
          ? await fetchYahooFresh(plan.yahooCandidates)
          : await fetchYahooFirstAvailable(plan.yahooCandidates)
        return raw ? toNormalized(plan, raw, 'yahoo') : null
      })
    )
    for (const entry of yahooResults) {
      if (entry.status === 'fulfilled' && entry.value) resolved.set(entry.value.symbol, entry.value)
    }
  }

  // --- Nichts Frischeres gefunden: der alte Kurs ist besser als keiner ---
  for (const plan of plans) {
    const raw = frozen.get(plan.symbol)
    if (raw && !resolved.has(plan.symbol)) resolved.set(plan.symbol, toNormalized(plan, raw, 'fmp'))
  }

  const fetched = [...resolved.values()]
  writeCache(fetched)
  for (const quote of fetched) result.set(quote.symbol, quote)

  return result
}
