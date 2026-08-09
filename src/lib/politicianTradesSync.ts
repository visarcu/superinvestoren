// Kongress-Trades Sync — STOCK Act Offenlegungen in die eigene DB.
//
// Die Quelle ist bewusst hinter einem Interface gekapselt (TradeSource), damit
// FMP später gegen den eigenen House-Clerk-/Senate-EFD-Scraper getauscht werden
// kann, ohne dass API-Routen oder Frontend etwas davon mitbekommen. Der Rest der
// App liest ausschließlich aus den Tabellen Politician/PoliticianTrade.
//
// Aktuelle Quelle: FMP stable/house-latest + stable/senate-latest (paginiert).
// Ziel-Quelle: disclosures-clerk.house.gov PTR-PDFs + efdsearch.senate.gov.
//
// DB-Zugriff über die Supabase-HTTP-API (nicht Prisma) — gleiche Begründung wie
// bei ipoCalendarSync: direkte Postgres-Verbindungen sind aus Vercel heraus
// unzuverlässig. Prisma definiert nur das Schema.

import { supabaseAdmin } from './supabaseAdmin'
import { createHash, randomUUID } from 'crypto'

const FMP_BASE = 'https://financialmodelingprep.com/stable'
const PAGE_SIZE = 100

// ── Normalisierte Zwischenform ───────────────────────────────────────────────

export interface NormalizedTrade {
  politicianSlug: string
  name: string
  firstName: string | null
  lastName: string | null
  chamber: 'house' | 'senate'
  state: string | null
  district: string | null
  bioguideId: string | null
  ticker: string | null
  assetDescription: string
  assetType: string | null
  type: 'purchase' | 'sale' | 'exchange'
  typeRaw: string | null
  transactionDate: string // YYYY-MM-DD
  disclosureDate: string // YYYY-MM-DD
  amount: string
  amountMid: number
  owner: string | null
  link: string | null
  capitalGains: boolean
  comment: string | null
  source: string
}

export interface TradeSource {
  name: string
  fetchTrades(opts: { maxPages: number }): Promise<NormalizedTrade[]>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])

// Die Trade-Quellen liefern denselben Menschen in mehreren Schreibweisen:
// "Schiff,  Adam B. (Senator)", "Mitch Mc Connell", "James E Hon Banks".
// Ohne Normalisierung entstehen daraus mehrere Politiker-Datensätze und die
// Handelshistorie einer Person wird auf zwei Profilseiten aufgeteilt.
export function normalizePersonName(raw: string): string {
  let s = (raw || '').trim()
  if (!s) return ''

  // Klammer-Zusätze und Anreden entfernen
  s = s.replace(/\((senator|representative|rep|sen)\.?\)/gi, ' ')
  s = s.replace(/\b(hon|mr|mrs|ms|dr)\.?\b/gi, ' ')
  s = s.replace(/\s+/g, ' ').trim()

  // "Nachname[, Suffix], Vorname Mitte" → "Vorname Mitte Nachname Suffix"
  const comma = s.indexOf(',')
  if (comma > 0) {
    const lastPart = s.slice(0, comma).trim()
    const firstPart = s.slice(comma + 1).trim()
    // "A. Mitchell McConnell, Jr." — hinter dem Komma steht das Suffix,
    // nicht der Vorname. Dann nur anhängen statt umzudrehen.
    if (NAME_SUFFIXES.has(firstPart.toLowerCase().replace(/\./g, ''))) {
      s = `${lastPart} ${firstPart}`
    } else if (firstPart) {
      // Das Suffix kann auf beiden Seiten des Kommas stehen
      // ("Justice II, James Conley" wie auch "Pfluger, August Lee II")
      // und gehört im Ergebnis immer ans Ende.
      const isSuffix = (tok: string) => NAME_SUFFIXES.has(tok.toLowerCase().replace(/\./g, ''))
      const pullSuffix = (tokens: string[]) =>
        tokens.length > 1 && isSuffix(tokens[tokens.length - 1]) ? tokens.pop()! : ''

      const lastTokens = lastPart.split(' ')
      const firstTokens = firstPart.split(' ')
      const suffix = pullSuffix(lastTokens) || pullSuffix(firstTokens)

      s = [firstTokens.join(' '), lastTokens.join(' '), suffix].filter(Boolean).join(' ')
    }
  }

  // Aufgetrenntes "Mc Connell" / "Mac Arthur" wieder zusammenziehen
  s = s.replace(/\b(Mc|Mac|O')\s+([A-Z])/g, '$1$2')

  return s.replace(/\s+/g, ' ').trim()
}

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Diakritika entfernen
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// Betrags-Range → Mittelwert. Identisch zu /api/v1/politicians/[slug],
// damit die Volumen-Schätzung über alle Seiten konsistent bleibt.
const AMOUNT_RANGES: Record<string, number> = {
  '$1,001 - $15,000': 8000,
  '$15,001 - $50,000': 32500,
  '$50,001 - $100,000': 75000,
  '$100,001 - $250,000': 175000,
  '$250,001 - $500,000': 375000,
  '$500,001 - $1,000,000': 750000,
  '$1,000,001 - $5,000,000': 3000000,
  '$5,000,001 - $25,000,000': 15000000,
  '$25,000,001 - $50,000,000': 37500000,
  'Over $50,000,000': 75000000,
}

export function amountMidpoint(amount: string): number {
  const clean = (amount || '').trim()
  if (AMOUNT_RANGES[clean] !== undefined) return AMOUNT_RANGES[clean]

  // Fallback: Zahlen aus der Range parsen, falls die Quelle anders formatiert
  const nums = clean.match(/[\d,]+/g)
  if (!nums || nums.length === 0) return 0
  const parsed = nums.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => !isNaN(n))
  if (parsed.length === 0) return 0
  if (parsed.length === 1) return parsed[0]
  return Math.round((parsed[0] + parsed[parsed.length - 1]) / 2)
}

// "Sale (Partial)" / "Sale (Full)" / "sale_partial" → "sale"
export function normalizeType(raw: string): 'purchase' | 'sale' | 'exchange' {
  const t = (raw || '').toLowerCase()
  if (t.includes('purchase') || t.includes('buy')) return 'purchase'
  if (t.includes('exchange')) return 'exchange'
  return 'sale'
}

function normalizeOwner(raw: string): string | null {
  const o = (raw || '').trim().toLowerCase()
  if (!o) return null
  if (o.startsWith('self') || o === 'sp') return 'self'
  if (o.startsWith('spouse')) return 'spouse'
  if (o.startsWith('joint')) return 'joint'
  if (o.startsWith('child') || o.startsWith('dependent')) return 'child'
  return o
}

function isoDate(value: string): string | null {
  if (!value) return null
  const s = String(value).trim()
  // Bereits ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // MM/DD/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

// Stabiler Schlüssel: macht den Sync idempotent und verhindert Duplikate,
// wenn dieselbe Offenlegung später aus einer anderen Quelle nochmal kommt.
export function buildDedupeKey(t: {
  politicianSlug: string
  ticker: string | null
  assetDescription: string
  type: string
  transactionDate: string
  disclosureDate: string
  amount: string
  owner: string | null
}): string {
  const parts = [
    t.politicianSlug,
    (t.ticker || t.assetDescription.slice(0, 40)).toUpperCase(),
    t.type,
    t.transactionDate,
    t.disclosureDate,
    t.amount,
    t.owner || '',
  ].join('|')
  return createHash('sha1').update(parts).digest('hex')
}

// ── Quelle: FMP ──────────────────────────────────────────────────────────────

interface FmpTrade {
  symbol?: string
  senateID?: string
  disclosureDate?: string
  transactionDate?: string
  firstName?: string
  lastName?: string
  office?: string
  district?: string
  owner?: string
  assetDescription?: string
  assetType?: string
  type?: string
  amount?: string
  capitalGainsOver200USD?: string
  comment?: string
  link?: string
}

function mapFmpTrade(raw: FmpTrade, chamber: 'house' | 'senate'): NormalizedTrade | null {
  const transactionDate = isoDate(raw.transactionDate || '')
  const disclosureDate = isoDate(raw.disclosureDate || '')
  if (!transactionDate || !disclosureDate) return null

  const name = normalizePersonName(raw.office || `${raw.firstName || ''} ${raw.lastName || ''}`)
  if (!name) return null

  const slug = nameToSlug(name)
  if (!slug) return null

  const district = (raw.district || '').trim() || null
  // House: "CA11" → "CA". Senate: district ist bereits der State.
  const state = district ? district.substring(0, 2).toUpperCase() : null

  const amount = (raw.amount || '').trim()
  const ticker = (raw.symbol || '').trim().toUpperCase() || null
  const typeRaw = (raw.type || '').trim()
  const owner = normalizeOwner(raw.owner || '')

  return {
    politicianSlug: slug,
    name,
    firstName: (raw.firstName || '').trim() || null,
    lastName: (raw.lastName || '').trim() || null,
    chamber,
    state,
    district,
    bioguideId: (raw.senateID || '').trim() || null,
    ticker,
    assetDescription: (raw.assetDescription || ticker || '').trim() || 'Unbekannt',
    assetType: (raw.assetType || '').trim() || null,
    type: normalizeType(typeRaw),
    typeRaw: typeRaw || null,
    transactionDate,
    disclosureDate,
    amount,
    amountMid: amountMidpoint(amount),
    owner,
    link: (raw.link || '').trim() || null,
    capitalGains: String(raw.capitalGainsOver200USD || '').toLowerCase() === 'true',
    comment: (raw.comment || '').trim() || null,
    source: 'fmp',
  }
}

async function fetchFmpPage(
  endpoint: 'house-latest' | 'senate-latest',
  page: number,
  apiKey: string
): Promise<FmpTrade[]> {
  const url = `${FMP_BASE}/${endpoint}?page=${page}&limit=${PAGE_SIZE}&apikey=${apiKey}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`FMP ${endpoint} page ${page}: HTTP ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json)) return []
  return json
}

export const fmpSource: TradeSource = {
  name: 'fmp',
  async fetchTrades({ maxPages }) {
    const apiKey = process.env.FMP_API_KEY
    if (!apiKey) throw new Error('FMP_API_KEY fehlt')

    const out: NormalizedTrade[] = []
    const chambers: { endpoint: 'house-latest' | 'senate-latest'; chamber: 'house' | 'senate' }[] = [
      { endpoint: 'house-latest', chamber: 'house' },
      { endpoint: 'senate-latest', chamber: 'senate' },
    ]

    for (const { endpoint, chamber } of chambers) {
      for (let page = 0; page < maxPages; page++) {
        let rows: FmpTrade[]
        try {
          rows = await fetchFmpPage(endpoint, page, apiKey)
        } catch (err) {
          console.error(`⚠️ ${endpoint} Seite ${page} fehlgeschlagen:`, err instanceof Error ? err.message : err)
          break
        }
        if (rows.length === 0) break

        for (const raw of rows) {
          const mapped = mapFmpTrade(raw, chamber)
          if (mapped) out.push(mapped)
        }

        if (rows.length < PAGE_SIZE) break
      }
    }

    return out
  },
}

// ── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncResult {
  source: string
  fetched: number
  inserted: number
  skipped: number
  politicians: number
  errors: string[]
}

// Partei und Foto liefert keine der Trade-Quellen. Sie kommen aus zwei
// Stammdaten-Quellen und dürfen vom Sync nie mit null überschrieben werden:
//
//  1. unitedstates/congress-legislators — offener Datensatz aller amtierenden
//     Mitglieder inkl. Partei, State, District, Bioguide-ID. Autoritativ.
//  2. src/data/politician-trades/index.json — der gepflegte Altbestand.
//     Einzige Quelle für die lokal abgelegten Portraits.
//
// Ausgeschiedene Mitglieder stehen in keiner der beiden Quellen vollständig;
// bei denen bleibt die Partei leer (legislators-historical.json wäre 13 MB
// pro Cron-Lauf und ist den Aufwand nicht wert).

const LEGISLATORS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json'

interface Profile {
  party: string | null
  photoUrl: string | null
  bioguideId: string | null
  state: string | null
  district: string | null
}

// Ein Mitglied kann unter mehreren Namensvarianten in den Trade-Daten
// auftauchen ("Robert E Latta" / "Bob Latta"), deshalb mehrere Slug-Kandidaten.
function legislatorSlugs(m: any): string[] {
  const n = m.name || {}
  const candidates = [
    n.official_full,
    [n.first, n.last].filter(Boolean).join(' '),
    [n.nickname, n.last].filter(Boolean).join(' '),
    [n.first, n.middle, n.last].filter(Boolean).join(' '),
  ]
  return [...new Set(candidates.filter(Boolean).map(nameToSlug).filter(Boolean))]
}

async function loadStaticProfiles(): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>()

  // 1. Amtierende Mitglieder
  try {
    const res = await fetch(LEGISLATORS_URL, { cache: 'no-store' })
    if (res.ok) {
      const members = (await res.json()) as any[]
      for (const m of members) {
        const term = m.terms?.[m.terms.length - 1]
        if (!term) continue
        const profile: Profile = {
          party: term.party || null,
          photoUrl: null,
          bioguideId: m.id?.bioguide || null,
          state: term.state || null,
          district: term.district != null ? `${term.state}${String(term.district).padStart(2, '0')}` : term.state || null,
        }
        for (const slug of legislatorSlugs(m)) {
          if (!map.has(slug)) map.set(slug, profile)
        }
      }
      console.log(`   ${members.length} amtierende Kongressmitglieder geladen`)
    } else {
      console.error(`⚠️ congress-legislators: HTTP ${res.status}`)
    }
  } catch (err) {
    console.error('⚠️ congress-legislators nicht erreichbar:', err instanceof Error ? err.message : err)
  }

  // 2. Altbestand — ergänzt Portraits und deckt ausgeschiedene Mitglieder ab
  try {
    const index = (await import('@/data/politician-trades/index.json')).default as any[]
    for (const entry of index) {
      if (!entry?.slug) continue
      const existing = map.get(entry.slug)
      map.set(entry.slug, {
        party: existing?.party || entry.party || null,
        photoUrl: entry.photoUrl || existing?.photoUrl || null,
        bioguideId: existing?.bioguideId || entry.bioguideId || null,
        state: existing?.state || entry.state || null,
        district: existing?.district || null,
      })
    }
  } catch {
    // Index optional — ohne ihn fehlen nur die lokalen Portraits
  }

  return map
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function syncPoliticianTrades(
  opts: { maxPages?: number; source?: TradeSource } = {}
): Promise<SyncResult> {
  const source = opts.source || fmpSource
  const maxPages = opts.maxPages ?? 15

  const result: SyncResult = {
    source: source.name,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    politicians: 0,
    errors: [],
  }

  const trades = await source.fetchTrades({ maxPages })
  result.fetched = trades.length
  if (trades.length === 0) return result

  const profiles = await loadStaticProfiles()

  // ── 1. Politiker-Stammdaten upserten ──────────────────────────────────────
  const bySlug = new Map<string, NormalizedTrade[]>()
  for (const t of trades) {
    const list = bySlug.get(t.politicianSlug)
    if (list) list.push(t)
    else bySlug.set(t.politicianSlug, [t])
  }

  const nowIso = new Date().toISOString()

  // Stammdaten aus den Trades. Party/Foto werden bewusst NICHT hier gesetzt:
  // PostgREST schreibt beim Upsert jede angegebene Spalte, ein null würde also
  // gepflegte Werte in der DB überbügeln. Sie kommen in einem zweiten Durchlauf
  // nur für die Slugs, für die wir tatsächlich einen Wert haben.
  const politicianRows = [...bySlug.entries()].map(([slug, list]) => {
    const byDateDesc = [...list].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    const newest = byDateDesc[0]
    // District/State vom neuesten Trade, der überhaupt einen hat — die Quelle
    // lässt das Feld bei ~11% der Zeilen leer, sonst verlieren wir den Wert.
    const withDistrict = byDateDesc.find(t => t.district)
    const profile = profiles.get(slug)
    return {
      slug,
      name: newest.name,
      firstName: newest.firstName,
      lastName: newest.lastName,
      chamber: newest.chamber,
      state: withDistrict?.state ?? profile?.state ?? null,
      district: withDistrict?.district ?? profile?.district ?? null,
      updatedAt: nowIso,
    }
  })

  for (const batch of chunk(politicianRows, 200)) {
    const { error } = await supabaseAdmin
      .from('Politician')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false })
    if (error) {
      result.errors.push(`Politician upsert: ${error.message}`)
    } else {
      result.politicians += batch.length
    }
  }

  // Partei, Foto und Bioguide-ID separat — nur wo ein Wert existiert
  for (const [slug, list] of bySlug) {
    const profile = profiles.get(slug)
    const newest = list.reduce((a, b) => (b.transactionDate > a.transactionDate ? b : a))
    const patch: Record<string, string> = {}
    if (profile?.party) patch.party = profile.party
    if (profile?.photoUrl) patch.photoUrl = profile.photoUrl
    const bioguideId = profile?.bioguideId || newest.bioguideId
    if (bioguideId) patch.bioguideId = bioguideId
    if (Object.keys(patch).length === 0) continue

    const { error } = await supabaseAdmin.from('Politician').update(patch).eq('slug', slug)
    if (error) result.errors.push(`Politician profile ${slug}: ${error.message}`)
  }

  // ── 2. Trades einfügen (dedupeKey verhindert Duplikate) ───────────────────
  const tradeRows = trades.map(t => ({
    id: randomUUID(),
    politicianSlug: t.politicianSlug,
    ticker: t.ticker,
    assetDescription: t.assetDescription,
    assetType: t.assetType,
    type: t.type,
    typeRaw: t.typeRaw,
    transactionDate: t.transactionDate,
    disclosureDate: t.disclosureDate,
    amount: t.amount,
    amountMid: t.amountMid,
    owner: t.owner,
    district: t.district,
    chamber: t.chamber,
    link: t.link,
    capitalGains: t.capitalGains,
    comment: t.comment,
    source: t.source,
    dedupeKey: buildDedupeKey(t),
  }))

  // Innerhalb des Batches selbst deduplizieren — die Quelle liefert
  // gelegentlich identische Zeilen doppelt
  const seen = new Set<string>()
  const uniqueRows = tradeRows.filter(r => {
    if (seen.has(r.dedupeKey)) return false
    seen.add(r.dedupeKey)
    return true
  })

  // Einzelne Batches können an transienten Netzwerkfehlern scheitern. Ein
  // Retry rettet den Lauf, sonst fehlen bis zu 500 Trades bis zum nächsten Cron.
  for (const batch of chunk(uniqueRows, 500)) {
    let lastError = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabaseAdmin
        .from('PoliticianTrade')
        .upsert(batch, { onConflict: 'dedupeKey', ignoreDuplicates: true })
        .select('id')

      if (!error) {
        const insertedCount = data?.length ?? 0
        result.inserted += insertedCount
        result.skipped += batch.length - insertedCount
        lastError = ''
        break
      }

      lastError = error.message
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
    if (lastError) result.errors.push(`PoliticianTrade upsert: ${lastError}`)
  }

  // ── 3. Aggregate auf Politician nachziehen ────────────────────────────────
  const aggError = await refreshPoliticianAggregates()
  if (aggError) result.errors.push(`Aggregate: ${aggError}`)

  return result
}

// tradeCount und lastTradeDate aus den tatsächlich gespeicherten Trades neu
// berechnen — nicht aus dem Sync-Batch, der nur einen Ausschnitt enthält.
// Läuft als einzelnes UPDATE...FROM in der DB; eine Schleife über die Slugs
// wären hunderte HTTP-Round-Trips pro Sync.
export async function refreshPoliticianAggregates(): Promise<string | null> {
  const { error } = await supabaseAdmin.rpc('refresh_politician_aggregates')
  return error ? error.message : null
}
