// Lesezugriff auf die Kongress-Trades in der DB.
//
// Einzige Datenquelle für alle Politiker-Routen. Geschrieben wird ausschließlich
// vom Cron (siehe politicianTradesSync.ts) — hier wird nur gelesen.
//
// PostgREST liefert pro Request maximal 1000 Zeilen, deshalb paginiert
// fetchAllRows() intern. Politiker mit >1000 Trades gibt es real (McClain ~1250).

import { supabaseAdmin } from './supabaseAdmin'

const PAGE_LIMIT = 1000

export interface DbTrade {
  id: string
  politicianSlug: string
  ticker: string | null
  assetDescription: string
  assetType: string | null
  type: 'purchase' | 'sale' | 'exchange'
  typeRaw: string | null
  transactionDate: string
  disclosureDate: string
  amount: string
  amountMid: number
  owner: string | null
  district: string | null
  chamber: string
  link: string | null
  capitalGains: boolean
  comment: string | null
  source: string
}

export interface DbPolitician {
  slug: string
  name: string
  chamber: string
  state: string | null
  district: string | null
  party: string | null
  bioguideId: string | null
  photoUrl: string | null
  tradeCount: number
  lastTradeDate: string | null
}

const TRADE_COLUMNS =
  'id, politicianSlug, ticker, assetDescription, assetType, type, typeRaw, transactionDate, disclosureDate, amount, amountMid, owner, district, chamber, link, capitalGains, comment, source'

// Holt beliebig viele Zeilen über PostgREST-Paginierung.
async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  hardCap = 20000
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < hardCap; from += PAGE_LIMIT) {
    const { data, error } = await build(from, from + PAGE_LIMIT - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE_LIMIT) break
  }
  return out
}

// ── Politiker ────────────────────────────────────────────────────────────────

export async function getPolitician(slug: string): Promise<DbPolitician | null> {
  const { data, error } = await supabaseAdmin
    .from('Politician')
    .select('slug, name, chamber, state, district, party, bioguideId, photoUrl, tradeCount, lastTradeDate')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as DbPolitician) || null
}

export interface ListPoliticiansOpts {
  search?: string | null
  chamber?: string | null
  party?: string | null
  sort?: string
  limit?: number
}

export async function listPoliticians(
  opts: ListPoliticiansOpts = {}
): Promise<{ politicians: (DbPolitician & { recentTickers: string[] })[]; total: number }> {
  const all = await fetchAllRows<DbPolitician>((from, to) =>
    supabaseAdmin
      .from('Politician')
      .select('slug, name, chamber, state, district, party, bioguideId, photoUrl, tradeCount, lastTradeDate')
      .range(from, to)
  )

  let rows = all
  const search = opts.search?.toLowerCase()
  if (search) {
    rows = rows.filter(
      p =>
        p.name.toLowerCase().includes(search) ||
        p.slug.includes(search) ||
        (p.state || '').toLowerCase().includes(search)
    )
  }
  if (opts.chamber) rows = rows.filter(p => p.chamber === opts.chamber)
  if (opts.party) rows = rows.filter(p => p.party?.startsWith(opts.party!))

  const sort = opts.sort || 'recent'
  if (sort === 'recent') {
    rows = [...rows].sort((a, b) => (b.lastTradeDate || '').localeCompare(a.lastTradeDate || ''))
  } else if (sort === 'trades') {
    rows = [...rows].sort((a, b) => b.tradeCount - a.tradeCount)
  } else if (sort === 'name') {
    rows = [...rows].sort((a, b) => a.name.localeCompare(b.name))
  }

  const total = rows.length
  const limited = rows.slice(0, opts.limit ?? 100)

  // recentTickers nur für die tatsächlich zurückgegebenen Politiker nachladen
  const recent = await getRecentTickers(limited.map(p => p.slug))

  return {
    politicians: limited.map(p => ({ ...p, recentTickers: recent.get(p.slug) || [] })),
    total,
  }
}

// Die letzten gehandelten Ticker je Politiker (max. 5, ohne Duplikate).
async function getRecentTickers(slugs: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (slugs.length === 0) return map

  const { data, error } = await supabaseAdmin
    .from('PoliticianTrade')
    .select('politicianSlug, ticker, transactionDate')
    .in('politicianSlug', slugs)
    .not('ticker', 'is', null)
    .order('transactionDate', { ascending: false })
    .limit(slugs.length * 40)
  if (error) throw new Error(error.message)

  for (const row of (data || []) as { politicianSlug: string; ticker: string }[]) {
    const list = map.get(row.politicianSlug) || []
    if (list.length >= 5 || list.includes(row.ticker)) continue
    list.push(row.ticker)
    map.set(row.politicianSlug, list)
  }
  return map
}

// ── Trades ───────────────────────────────────────────────────────────────────

export async function getPoliticianTrades(slug: string): Promise<DbTrade[]> {
  return fetchAllRows<DbTrade>((from, to) =>
    supabaseAdmin
      .from('PoliticianTrade')
      .select(TRADE_COLUMNS)
      .eq('politicianSlug', slug)
      .order('transactionDate', { ascending: false })
      .range(from, to)
  )
}

export type TradeWithPolitician = DbTrade & {
  politicianName: string
  party: string | null
  photoUrl: string | null
  politicianChamber: string | null
  politicianState: string | null
}

function withPolitician(rows: any[]): TradeWithPolitician[] {
  return rows.map(row => ({
    ...row,
    politicianName: row.politician?.name || row.politicianSlug,
    party: row.politician?.party || null,
    photoUrl: row.politician?.photoUrl || null,
    politicianChamber: row.politician?.chamber || row.chamber || null,
    politicianState: row.politician?.state || null,
  }))
}

const POLITICIAN_EMBED = 'politician:Politician!inner(name, party, photoUrl, chamber, state)'

// Alle Trades zu einem Ticker. Callers slicen selbst — die Summary-Zahlen
// (Kaeufe/Verkaeufe/Politiker) muessen ueber den Gesamtbestand laufen, nicht
// nur ueber die angezeigte Seite.
export async function getTradesByTicker(ticker: string): Promise<TradeWithPolitician[]> {
  const rows = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('PoliticianTrade')
      .select(`${TRADE_COLUMNS}, ${POLITICIAN_EMBED}`)
      .eq('ticker', ticker.toUpperCase())
      .order('transactionDate', { ascending: false })
      .range(from, to)
  )
  return withPolitician(rows)
}

// Alle Trades ab einem Stichtag — Basis für die Aggregationen (Top-Käufe etc.).
export async function getTradesSince(sinceDate: string): Promise<TradeWithPolitician[]> {
  const rows = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('PoliticianTrade')
      .select(`${TRADE_COLUMNS}, ${POLITICIAN_EMBED}`)
      .gte('transactionDate', sinceDate)
      .order('transactionDate', { ascending: false })
      .range(from, to)
  )
  return withPolitician(rows)
}

export interface FeedOpts {
  sinceDate?: string
  limit?: number
  offset?: number
  minAmount?: number
}

// Chronologischer Feed über alle Politiker, inkl. Namen für die Anzeige.
export async function getFeed(
  opts: FeedOpts = {}
): Promise<{ trades: TradeWithPolitician[]; total: number }> {
  const limit = opts.limit ?? 100
  const offset = opts.offset ?? 0

  let countQuery = supabaseAdmin.from('PoliticianTrade').select('id', { count: 'exact', head: true })
  let rowQuery = supabaseAdmin
    .from('PoliticianTrade')
    .select(`${TRADE_COLUMNS}, ${POLITICIAN_EMBED}`)

  if (opts.sinceDate) {
    countQuery = countQuery.gte('transactionDate', opts.sinceDate)
    rowQuery = rowQuery.gte('transactionDate', opts.sinceDate)
  }
  if (opts.minAmount) {
    countQuery = countQuery.gte('amountMid', opts.minAmount)
    rowQuery = rowQuery.gte('amountMid', opts.minAmount)
  }

  const [{ count, error: countError }, { data, error }] = await Promise.all([
    countQuery,
    rowQuery
      .order(opts.minAmount ? 'amountMid' : 'transactionDate', { ascending: false })
      .range(offset, offset + limit - 1),
  ])
  if (countError) throw new Error(countError.message)
  if (error) throw new Error(error.message)

  const trades = withPolitician((data || []) as any[])
  return { trades, total: count ?? trades.length }
}

// ── Kompatibilitäts-Mapping ──────────────────────────────────────────────────

// Die Seite /politiker erwartet weiterhin das ursprüngliche Feld-Layout der
// House/Senate-Stock-Watcher-Daten. Die DB ist sauberer normalisiert, deshalb
// wird hier zurückgemappt statt das Frontend anzufassen.
export function toLegacyTrade(t: DbTrade, politicianName: string) {
  return {
    disclosureYear: t.disclosureDate.slice(0, 4),
    disclosureDate: t.disclosureDate,
    transactionDate: t.transactionDate,
    owner: t.owner || '',
    ticker: t.ticker || '',
    assetDescription: t.assetDescription,
    type: t.type,
    typeRaw: t.typeRaw || undefined,
    amount: t.amount,
    representative: politicianName,
    district: t.district || '',
    link: t.link || '',
    capitalGainsOver200USD: t.capitalGains ? 'True' : 'False',
    slug: t.politicianSlug,
    state: (t.district || '').substring(0, 2).toUpperCase(),
    chamber: t.chamber as 'house' | 'senate',
  }
}
