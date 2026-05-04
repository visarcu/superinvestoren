// Finclue Data API v1 – Universal Instrument Search
// GET /api/v1/search-instruments?q=<query>&limit=10
//
// Sucht in einer einzigen Pipeline:
//   1) etfMaster        (kuratiert, kennt ISIN + WKN + XETRA-Ticker)
//   2) xetraETFsComplete (1.6k XETRA-ETFs, ISIN)
//   3) stocks           (US/DE/UK/JP, Symbol + Name)
//   4) SEC companies    (Live-Cache via /api/v1/companies)
//   5) OpenFIGI Fallback bei ISIN- oder WKN-Eingabe
//
// Antwort:
//   { data: [{ ticker, name, exchange?, isin?, type: 'stock' | 'etf', source }] }
//
// Wird genutzt vom Portfolio-„Aktie suchen"-Feld (manueller Kauf, Transfer etc.).
// Der Import-Flow nutzt weiterhin /api/portfolio/resolve-isins direkt.

import { NextRequest, NextResponse } from 'next/server'
import { etfMaster } from '@/data/etfMaster'
import { xetraETFs } from '@/data/xetraETFsComplete'
import { stocks } from '@/data/stocks'

interface SearchedInstrument {
  ticker: string
  name: string
  exchange?: string
  isin?: string
  type: 'stock' | 'etf'
  source: 'etf_master' | 'etf_xetra' | 'stocks_local' | 'sec' | 'openfigi'
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/
const WKN_RE = /^[A-Z0-9]{6}$/

function looksLikeISIN(q: string): boolean {
  return ISIN_RE.test(q.toUpperCase())
}

function looksLikeWKN(q: string): boolean {
  // WKNs sind exakt 6 Zeichen, alphanumerisch, KEIN ISIN
  const upper = q.toUpperCase()
  return WKN_RE.test(upper) && !looksLikeISIN(upper)
}

// === SEC-Companies-Cache (dieselbe Quelle wie /api/v1/companies) ============

interface SecCompany { ticker: string; name: string; exchange: string }
let _secCache: SecCompany[] | null = null
let _secCachedAt = 0
const SEC_CACHE_TTL = 24 * 60 * 60 * 1000

async function loadSecCompanies(): Promise<SecCompany[]> {
  if (_secCache && Date.now() - _secCachedAt < SEC_CACHE_TTL) return _secCache
  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers_exchange.json', {
      headers: { 'User-Agent': 'Finclue research@finclue.de' },
      // ISR-Cache zusätzlich
      next: { revalidate: 86400 },
    })
    if (!res.ok) return _secCache ?? []
    const data = await res.json()
    const fields: string[] = data.fields || []
    const rows: any[][] = data.data || []
    const nameIdx = fields.indexOf('name')
    const tickerIdx = fields.indexOf('ticker')
    const exchangeIdx = fields.indexOf('exchange')
    _secCache = rows
      .filter(row => row[exchangeIdx] && row[tickerIdx])
      .map(row => ({
        name: row[nameIdx] || '',
        ticker: row[tickerIdx] || '',
        exchange: row[exchangeIdx] || '',
      }))
    _secCachedAt = Date.now()
    return _secCache
  } catch {
    return _secCache ?? []
  }
}

// === Scoring ================================================================

function scoreMatch(q: string, ticker: string, name: string): number {
  const t = ticker.toUpperCase()
  const n = name.toUpperCase()
  if (t === q) return 0
  if (t.startsWith(q)) return 1
  if (n.startsWith(q)) return 2
  if (t.includes(q)) return 3
  if (n.includes(q)) return 4
  return 999
}

// === OpenFIGI Fallback (nur ISIN + WKN) =====================================
// Wir nutzen NICHT den /api/portfolio/resolve-isins Endpoint, weil der nur
// POST-Batch ist. Stattdessen direkter Single-Lookup hier.

async function resolveViaOpenFIGI(
  idType: 'ID_ISIN' | 'ID_WERTPAPIER',
  idValue: string
): Promise<SearchedInstrument | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = process.env.OPENFIGI_API_KEY
  if (apiKey) headers['X-OPENFIGI-APIKEY'] = apiKey

  try {
    const res = await fetch('https://api.openfigi.com/v3/mapping', {
      method: 'POST',
      headers,
      body: JSON.stringify([{ idType, idValue }]),
    })
    if (!res.ok) return null
    const data = await res.json()
    const matches = data?.[0]?.data
    if (!Array.isArray(matches) || matches.length === 0) return null

    // Bevorzugt XETRA (GR/GY), dann LSE, dann US
    const order = ['GR', 'GY', 'GF', 'LN', 'LS', 'US', 'UN', 'UQ', 'UW', 'UA', 'UP', 'FP', 'NA', 'SW']
    const suffix: Record<string, string> = {
      GR: '.DE', GY: '.DE', GF: '.DE',
      LN: '.L', LS: '.L',
      FP: '.PA', NA: '.AS', SW: '.SW',
    }
    let best = matches[0]
    let bestRank = order.indexOf(best.exchCode)
    for (const m of matches) {
      const r = order.indexOf(m.exchCode)
      if (r !== -1 && (bestRank === -1 || r < bestRank)) {
        bestRank = r
        best = m
      }
    }
    const cleanTicker = String(best.ticker || '').replace(/\//g, '-')
    const ticker = cleanTicker + (suffix[best.exchCode] ?? '')
    const isEtf = ['ETP', 'ETF', 'Open-End Fund', 'Closed-End Fund', 'Mutual Fund'].includes(best.securityType2 || '')
    return {
      ticker,
      name: best.name || cleanTicker,
      exchange: best.exchCode,
      type: isEtf ? 'etf' : 'stock',
      source: 'openfigi',
    }
  } catch {
    return null
  }
}

// === Hauptsuche =============================================================

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const rawQuery = (sp.get('q') || sp.get('search') || '').trim()
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '10'), 1), 30)

  if (!rawQuery) return NextResponse.json({ data: [] })

  const q = rawQuery.toUpperCase()
  const results: SearchedInstrument[] = []
  const seen = new Set<string>() // ticker-lookups (uppercase)

  const push = (item: SearchedInstrument) => {
    const key = item.ticker.toUpperCase()
    if (seen.has(key)) return
    seen.add(key)
    results.push(item)
  }

  // 1) etfMaster — kennt ISIN + WKN, autoritativ
  for (const e of etfMaster) {
    const matchesIsin = e.isin.toUpperCase() === q
    const matchesWkn = e.wkn?.toUpperCase() === q
    const score = scoreMatch(q, e.xetraTicker, e.name)
    if (matchesIsin || matchesWkn || score < 999) {
      push({
        ticker: e.xetraTicker,
        name: e.name,
        exchange: 'XETRA',
        isin: e.isin,
        type: 'etf',
        source: 'etf_master',
      })
    }
  }

  // 2) xetraETFs (1.6k Einträge — nur Symbol/Name/ISIN)
  for (const e of xetraETFs) {
    const matchesIsin = e.isin?.toUpperCase() === q
    const score = scoreMatch(q, e.symbol, e.name)
    if (matchesIsin || score < 999) {
      push({
        ticker: e.symbol,
        name: e.name,
        exchange: 'XETRA',
        isin: e.isin,
        type: 'etf',
        source: 'etf_xetra',
      })
    }
  }

  // 3) Lokale stocks (US/DE/UK/JP)
  for (const s of stocks) {
    const score = scoreMatch(q, s.ticker, s.name)
    if (score < 999) {
      push({
        ticker: s.ticker,
        name: s.name,
        type: 'stock',
        source: 'stocks_local',
      })
    }
    if (results.length >= limit * 4) break
  }

  // 4) SEC-Companies (Live, US-Listings)
  const secCompanies = await loadSecCompanies()
  for (const c of secCompanies) {
    const score = scoreMatch(q, c.ticker, c.name)
    if (score < 999) {
      push({
        ticker: c.ticker,
        name: c.name,
        exchange: c.exchange,
        type: 'stock',
        source: 'sec',
      })
    }
  }

  // Sortieren nach Match-Qualität
  results.sort((a, b) => {
    const sa = scoreMatch(q, a.ticker, a.name)
    const sb = scoreMatch(q, b.ticker, b.name)
    if (sa !== sb) return sa - sb
    // ETFs leicht bevorzugen wenn ISIN exakt matcht
    if (a.isin?.toUpperCase() === q && b.isin?.toUpperCase() !== q) return -1
    if (b.isin?.toUpperCase() === q && a.isin?.toUpperCase() !== q) return 1
    return 0
  })

  // 5) Wenn lokal nichts gefunden + Eingabe sieht aus wie ISIN/WKN → OpenFIGI
  if (results.length === 0) {
    if (looksLikeISIN(q)) {
      const figi = await resolveViaOpenFIGI('ID_ISIN', q)
      if (figi) push(figi)
    } else if (looksLikeWKN(q)) {
      const figi = await resolveViaOpenFIGI('ID_WERTPAPIER', q)
      if (figi) push(figi)
    }
  }

  return NextResponse.json(
    { data: results.slice(0, limit) },
    { headers: { 'Cache-Control': 'private, max-age=60' } }
  )
}
