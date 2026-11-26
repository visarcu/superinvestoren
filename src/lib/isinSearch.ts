// src/lib/isinSearch.ts
// ISIN → Ticker für den Import. Nur serverseitig.
// Genutzt von /api/v1/isin-search und /api/broker-sync/import.
//
// Auflösungs-Reihenfolge:
//   1. DB-Cache (isin_resolutions)
//   2. Production-Master (isinResolver.resolveISINLocally), dann CUSIP aus stocks.ts
//   3. FMP-Suche per ISIN (alle Notierungen)
//   4. FMP-Suche per Name aus dem Import
//
// Der DB-Cache gilt für alle Nutzer und läuft nicht ab. Gespeichert werden
// deshalb nur Treffer, die allein an der ISIN hängen (2 und 3). Den Namen (4)
// bestimmt der Aufrufer: Ein falscher Name würde sonst den Ticker für alle
// späteren Importe festlegen. So landete die Credit-Suisse-ISIN US2254011081
// auf USOI, einem Öl-Papier mit "Credit Suisse" im Namen.

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveISINLocally } from '@/lib/isinResolver'
import { stocks } from '@/data/stocks'
import { searchFmpByIsin, searchFmpByQuery, type FmpListing } from '@/lib/marketData/providers/fmpSearch'

export interface IsinQuery {
  isin: string
  /** Name aus Datei oder Broker, nur für die Namenssuche */
  name?: string | null
}

export interface IsinResolution {
  isin: string
  ticker: string
  name: string | null
  exchange: string | null
  currency: string | null
  type: string | null
  country: string | null
  source: 'cache' | 'master' | 'fmp' | 'unknown'
}

// Jede ISIN kostet bis zu zwei FMP-Suchen. Alle auf einmal könnten ins
// Minutenlimit laufen, dann findet FMP auch bekannte ISINs nicht.
const CONCURRENCY = 10

// CUSIP-Map aus stocks.ts (DE/UK/US/JP, alle Aktien mit CUSIP-Feld).
// CUSIP = Zeichen 2-10 einer ISIN (9 Zeichen nach dem Ländercode, vor der
// Prüfziffer). Wird hier einmal beim ersten Request gebaut.
let _cusipMap: Map<string, { ticker: string; name: string }> | null = null
function getCusipMap() {
  if (_cusipMap) return _cusipMap
  _cusipMap = new Map()
  for (const s of stocks) {
    if (s.cusip) {
      _cusipMap.set(s.cusip.toUpperCase(), { ticker: s.ticker, name: s.name })
    }
  }
  return _cusipMap
}

function cusipFromIsin(isin: string): string | null {
  if (isin.length !== 12) return null
  return isin.substring(2, 11).toUpperCase()
}

function unknown(isin: string): IsinResolution {
  return {
    isin,
    ticker: '',
    name: null,
    exchange: null,
    currency: null,
    type: null,
    country: null,
    source: 'unknown',
  }
}

function fromListing(isin: string, pick: FmpListing): IsinResolution {
  return {
    isin,
    // FMP-Schreibweise = unser internes Ticker-Format (SAP.DE, VOD.L, AAPL)
    ticker: pick.symbol,
    name: pick.name ?? null,
    exchange: pick.exchange,
    currency: pick.currency,
    type: pick.type === 'unknown' ? null : pick.type,
    country: isin.slice(0, 2),
    source: 'fmp',
  }
}

/** Nur für Treffer, die allein an der ISIN hängen (siehe Kopf der Datei). */
async function persist(supabase: SupabaseClient, resolution: IsinResolution): Promise<void> {
  const { error } = await supabase.from('isin_resolutions').upsert(resolution)
  if (error) console.error('[isin-search] cache write failed:', error.message)
}

/** Mehrere ISINs auflösen. Reihenfolge und Anzahl wie in `queries`. */
export async function resolveIsins(
  supabase: SupabaseClient,
  queries: IsinQuery[]
): Promise<IsinResolution[]> {
  const results: IsinResolution[] = []
  for (let i = 0; i < queries.length; i += CONCURRENCY) {
    const group = queries.slice(i, i + CONCURRENCY)
    results.push(...(await Promise.all(group.map(q => resolveIsin(supabase, q)))))
  }
  return results
}

export async function resolveIsin(
  supabase: SupabaseClient,
  { isin, name: hintName }: IsinQuery
): Promise<IsinResolution> {
  const cleanIsin = isin.trim().toUpperCase()
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(cleanIsin)) return unknown(cleanIsin)

  // 1) DB-Cache
  const { data: cached } = await supabase
    .from('isin_resolutions')
    .select('*')
    .eq('isin', cleanIsin)
    .maybeSingle()
  if (cached?.ticker) {
    return {
      isin: cleanIsin,
      ticker: cached.ticker,
      name: cached.name,
      exchange: cached.exchange,
      currency: cached.currency,
      type: cached.type,
      country: cached.country,
      source: 'cache',
    }
  }

  // 2a) Production-Master (ETFs: etfMaster + xetraETFsComplete)
  const local = resolveISINLocally(cleanIsin)
  if (local?.symbol) {
    const result: IsinResolution = {
      ...unknown(cleanIsin),
      ticker: local.symbol,
      name: local.name ?? null,
      source: 'master',
    }
    await persist(supabase, result)
    return result
  }

  // 2b) Aktien-Master (stocks.ts mit CUSIP) für alle Aktien mit bekannter
  // CUSIP (US/DE/UK/JP). Deckt die meisten populären Aktien ab und spart
  // FMP-Calls.
  const cusip = cusipFromIsin(cleanIsin)
  const stockMatch = cusip ? getCusipMap().get(cusip) : undefined
  if (stockMatch) {
    const result: IsinResolution = {
      ...unknown(cleanIsin),
      ticker: stockMatch.ticker,
      name: stockMatch.name,
      type: 'Common Stock',
      country: cleanIsin.slice(0, 2),
      source: 'master',
    }
    await persist(supabase, result)
    return result
  }

  // 3) FMP-Direktsuche per ISIN
  const pick = pickBestMatch(await searchFmpByIsin(cleanIsin), cleanIsin)
  if (pick) {
    const result = fromListing(cleanIsin, pick)
    await persist(supabase, result)
    return result
  }

  // 4) Name-Fallback: wenn der Import einen Namen mitgibt (z.B. "Unilever",
  // "Vonovia"), danach suchen. Gilt nur für diese Antwort, nie gespeichert.
  const cleanedName = hintName && hintName.trim().length >= 3 ? cleanNameForSearch(hintName) : ''
  if (cleanedName) {
    const byName = await searchFmpByQuery(cleanedName)
    const pickByName = pickBestMatchByName(byName, cleanIsin.slice(0, 2), cleanedName)
    if (pickByName) return fromListing(cleanIsin, pickByName)
  }

  return unknown(cleanIsin)
}

// Name für die FMP-Suche vorbereiten: Corporate-Suffixes und Klammer-Zusätze
// rausstreichen, damit "Unilever" statt "Unilever (A)" gesucht wird.
function cleanNameForSearch(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '') // Klammer-Zusätze
    .replace(/\s+(AG|SE|NV|PLC|LTD|LIMITED|INC|CORP|CORPORATION|CO|GROUP|GRP|HOLDINGS|HOLDING|TRUST)\b.*$/i, '')
    .replace(/[-_,.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// FMP führt Börsen nicht in unserer Schreibweise; der Code kommt aus dem
// Ticker-Suffix (VOD.L → LSE, SAP.DE → XETRA, AAPL → US).

// Bei ISIN-Direktsuche: Heimatbörse (DE/US/GB) > Xetra > erste handelbare Notierung.
// Xetra vor fremden Heimatbörsen, weil deutsche Broker dort in EUR abrechnen.
function pickBestMatch(list: FmpListing[], isin: string): FmpListing | null {
  if (!list || list.length === 0) return null
  const country = isin.slice(0, 2)
  const homeExchange =
    country === 'DE' ? 'XETRA' : country === 'US' ? 'US' : country === 'GB' ? 'LSE' : null
  const matchingIsin = list.filter(r => r.isin === isin)
  const pool = matchingIsin.length > 0 ? matchingIsin : list
  for (const exchange of [homeExchange, 'XETRA']) {
    const byExchange = exchange && pool.find(r => r.exchange === exchange && r.activelyTrading && !r.otc)
    if (byExchange) return byExchange
  }
  // searchFmpByIsin sortiert handelbare und Nicht-OTC-Notierungen nach vorn.
  return pool[0]
}

// Bei Name-Suche: Match bevorzugt nach Country (aus ISIN-Prefix)
function pickBestMatchByName(
  list: FmpListing[],
  isinCountry: string,
  cleanedName: string
): FmpListing | null {
  if (!list || list.length === 0) return null
  const lowerQuery = cleanedName.toLowerCase()
  // OTC-Zweitlinien (ADRs, Pink Sheets) sind nie die Notierung aus dem Depot
  const candidates = list.filter(r => !r.otc && r.exchange)
  if (candidates.length === 0) return null

  // 1) passender Country aus ISIN-Prefix
  const countryMap: Record<string, string[]> = {
    DE: ['XETRA', 'F', 'DU', 'MU', 'HM', 'HA', 'BE', 'MI'],
    GB: ['LSE'],
    US: ['US'],
    IE: ['XETRA', 'LSE', 'US'], // IE-Fonds werden häufig multi-listed
    LU: ['XETRA', 'LSE'],
    FR: ['PA'],
    NL: ['AS'],
    CH: ['SW'],
  }
  const preferredExchanges = countryMap[isinCountry] ?? []

  for (const exch of preferredExchanges) {
    const found = candidates.find(r => r.exchange === exch)
    if (found) return found
  }

  // 2) Name-Start-Match als Sanity-Check
  const nameMatch = candidates.find(r => {
    const n = (r.name || '').toLowerCase()
    return n.startsWith(lowerQuery) || lowerQuery.startsWith(n.split(' ')[0])
  })
  if (nameMatch) return nameMatch

  return candidates[0]
}
