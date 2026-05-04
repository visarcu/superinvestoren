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
import { searchCryptos } from '@/data/cryptos'

interface SearchedInstrument {
  ticker: string
  name: string
  exchange?: string
  isin?: string
  type: 'stock' | 'etf' | 'crypto'
  source: 'etf_master' | 'etf_xetra' | 'stocks_local' | 'sec' | 'openfigi' | 'fmp' | 'crypto_local'
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

    // Bevorzugt XETRA (GR/GY), dann LSE, dann US, dann übrige
    const order = [
      'GR', 'GY', 'GF',
      'LN', 'LS',
      'US', 'UN', 'UQ', 'UW', 'UA', 'UP',
      'FP', 'NA', 'BB', 'IM', 'SM', 'SW', 'VX', 'AV',
      'CT', 'CN',
      'AT', 'AU',
      'JT', 'HK', 'SP', 'KS',
    ]
    const suffix: Record<string, string> = {
      // Deutsche Börsen
      GR: '.DE', GY: '.DE', GF: '.DE',
      // UK
      LN: '.L', LS: '.L',
      // US (kein Suffix)
      US: '', UN: '', UQ: '', UW: '', UA: '', UP: '',
      // Europa
      FP: '.PA', NA: '.AS', BB: '.BR',
      IM: '.MI', SM: '.MC', SW: '.SW', VX: '.SW', AV: '.VI',
      // Kanada
      CT: '.TO', CN: '.TO',
      // Australien (ASX)
      AT: '.AX', AU: '.AX',
      // Asien
      JT: '.T', HK: '.HK', SP: '.SI', KS: '.KS',
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

// === FMP Name-Search Fallback ==============================================
// Für nicht-US-Aktien außerhalb von XETRA-ETFs/lokalen-Stocks (z.B. ASX-Listings
// wie Vulcan Energy VUL.AX). FMP /search akzeptiert Namen + Symbole und kennt
// alle internationalen Börsen.

// FMP exchangeShortName → Display-Tag (für UI-Anzeige) + Sort-Priorität.
// Niedrigere Zahl = höhere Prio (bevorzugte Börse).
const FMP_EXCHANGE_PRIORITY: Record<string, number> = {
  // EU/DE bevorzugen — User sucht meist DE-Listings
  'XETRA': 0,
  'FRANKFURT': 1,
  'AMSTERDAM': 2, 'EURONEXT': 2, 'PARIS': 2, 'BRUSSELS': 2, 'LISBON': 2,
  'LONDON': 3, 'LSE': 3,
  'SIX': 4, 'SWISS': 4,
  'MILAN': 5, 'MADRID': 5, 'STOCKHOLM': 5, 'OSLO': 5, 'COPENHAGEN': 5, 'HELSINKI': 5, 'WIEN': 5, 'VIENNA': 5,
  // US danach
  'NASDAQ': 6, 'NYSE': 6, 'AMEX': 6, 'NYSE ARCA': 6, 'NASDAQ GLOBAL MARKET': 6, 'NASDAQ CAPITAL MARKET': 6,
  // Kanada
  'TORONTO': 7, 'TSX': 7, 'TSXV': 7,
  // Asien-Pazifik
  'ASX': 8, 'AUSTRALIA': 8,
  'TOKYO': 9, 'TSE': 9,
  'HONG KONG': 10, 'HKEX': 10,
  'SHENZHEN': 11, 'SHANGHAI': 11, 'SINGAPORE': 11, 'KOREA': 11, 'KSE': 11, 'KOSDAQ': 11,
}

interface FMPSearchItem {
  symbol: string
  name: string
  currency?: string
  stockExchange?: string
  exchangeShortName?: string
}

async function searchViaFMP(query: string, limit: number): Promise<SearchedInstrument[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return []

  try {
    const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=20&apikey=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const items: FMPSearchItem[] = await res.json()
    if (!Array.isArray(items)) return []

    // Nach Börsen-Priorität sortieren, dann Symbol-Länge (kürzer = primäres Listing)
    const ranked = items
      .filter(it => it.symbol && it.name)
      .map(it => {
        const ex = (it.exchangeShortName || it.stockExchange || '').toUpperCase()
        const priority = FMP_EXCHANGE_PRIORITY[ex] ?? 99
        return { item: it, priority, ex }
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.item.symbol.length - b.item.symbol.length
      })

    // ETF-Heuristik: Name enthält "ETF"/"UCITS" oder Exchange ist klassisches Fund-Venue
    const isEtf = (name: string) => /\b(ETF|UCITS|ETP|ETN|Exchange[\s-]Traded)\b/i.test(name)

    return ranked.slice(0, limit).map(({ item, ex }) => ({
      ticker: item.symbol,
      name: item.name,
      exchange: ex || undefined,
      type: isEtf(item.name) ? 'etf' : 'stock',
      source: 'fmp',
    } as SearchedInstrument))
  } catch {
    return []
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

  // 0) Krypto — kuratierte Top-Coins, Symbol/Name/Alias-Match
  for (const c of searchCryptos(rawQuery, 5)) {
    push({
      ticker: c.symbol,
      name: c.name,
      exchange: 'CRYPTO',
      type: 'crypto',
      source: 'crypto_local',
    })
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

  // 5) Fallbacks bei zu wenigen lokalen Treffern
  //    a) Eingabe sieht aus wie ISIN/WKN → OpenFIGI (deckt deutsche WKNs ab)
  //    b) Sonst → FMP /search (deckt internationale Aktien ab, z.B. ASX/HK/Tokyo)
  const needsFallback = results.length === 0 || (results.length < 3 && q.length >= 3)
  if (needsFallback) {
    if (looksLikeISIN(q)) {
      const figi = await resolveViaOpenFIGI('ID_ISIN', q)
      if (figi) push(figi)
      // Bei ISIN zusätzlich FMP — manche EU-ISINs werden von OpenFIGI ohne Key nicht gefunden
      if (results.length === 0) {
        const fmpHits = await searchViaFMP(q, 5)
        for (const h of fmpHits) push(h)
      }
    } else if (looksLikeWKN(q)) {
      const figi = await resolveViaOpenFIGI('ID_WERTPAPIER', q)
      if (figi) push(figi)
    } else if (results.length === 0) {
      // Reine Name- oder Symbol-Suche, lokal nichts → FMP
      const fmpHits = await searchViaFMP(q, Math.min(limit, 8))
      for (const h of fmpHits) push(h)
    }
  }

  return NextResponse.json(
    { data: results.slice(0, limit) },
    { headers: { 'Cache-Control': 'private, max-age=60' } }
  )
}
