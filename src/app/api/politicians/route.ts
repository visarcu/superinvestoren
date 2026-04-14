// src/app/api/politicians/route.ts
// US-Kongress Aktien-Trades
// Primär: lokale JSON-Daten aus src/data/politician-trades/ (House/Senate Stock Watcher)
// Fallback: FMP senate-disclosure-rss-feed (nur ~7 Monate, aber immer aktuell)

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE = 'https://financialmodelingprep.com/api/v4'
const DATA_DIR = path.join(process.cwd(), 'src/data/politician-trades')

export interface PoliticianTrade {
  disclosureYear: string
  disclosureDate: string
  transactionDate: string
  owner: string
  ticker: string
  assetDescription: string
  type: string
  typeRaw?: string
  amount: string
  representative: string
  district: string
  link: string
  capitalGainsOver200USD: string
  // Derived
  slug: string
  party?: string
  state?: string
  chamber?: 'house' | 'senate'
}

export interface PoliticianIndexEntry {
  slug: string
  name: string
  chamber: string
  state: string
  district: string
  tradeCount: number
  lastTradeDate: string
  recentTickers: string[]
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getStateFromDistrict(district: string): string {
  if (!district) return ''
  const match = district.match(/^([A-Z]{2})/i)
  return match ? match[1].toUpperCase() : district
}

// Prüft ob lokale Daten vorhanden sind
function hasLocalData(): boolean {
  try {
    return fs.existsSync(path.join(DATA_DIR, 'index.json'))
  } catch {
    return false
  }
}

// Lädt den Politiker-Index aus lokalen Daten
function loadLocalIndex(): PoliticianIndexEntry[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// Lädt Trades eines einzelnen Politikers aus lokalen Daten
function loadLocalPolitician(slug: string): { trades: PoliticianTrade[]; name: string } | null {
  try {
    const filePath = path.join(DATA_DIR, `${slug}.json`)
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    return { trades: data.trades || [], name: data.name || slugToName(slug) }
  } catch {
    return null
  }
}

// Lädt aktuelle Trades aus dem FMP-Feed (letzten 7 Monate, als Ergänzung)
async function fetchFmpTrades(page: number): Promise<PoliticianTrade[]> {
  if (!FMP_API_KEY) return []
  try {
    const url = `${FMP_BASE}/senate-disclosure-rss-feed?page=${page}&apikey=${FMP_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) return []
    const raw = await res.json()
    if (!Array.isArray(raw)) return []
    return raw.map((t: any) => ({
      ...t,
      slug: nameToSlug(t.representative || ''),
      state: getStateFromDistrict(t.district || ''),
      chamber: 'senate' as const,
    }))
  } catch {
    return []
  }
}

// GET /api/politicians?page=0&politician=nancy-pelosi&limit=100&ticker=MSFT
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '0')
  const politicianSlug = searchParams.get('politician') || ''
  const tickerFilter = (searchParams.get('ticker') || '').toUpperCase()
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

  const useLocal = hasLocalData()

  // ── Trades für bestimmten Ticker (alle Politiker) ─────────────────────────
  if (tickerFilter && !politicianSlug) {
    if (useLocal) {
      const index = loadLocalIndex()
      const matchingTrades: (PoliticianTrade & { politicianName: string })[] = []

      for (const pol of index) {
        const data = loadLocalPolitician(pol.slug)
        if (!data) continue
        const filtered = data.trades.filter(
          t => (t.ticker || '').toUpperCase() === tickerFilter
        )
        for (const trade of filtered) {
          matchingTrades.push({ ...trade, politicianName: data.name })
        }
      }

      matchingTrades.sort((a, b) =>
        (b.transactionDate || b.disclosureDate).localeCompare(
          a.transactionDate || a.disclosureDate
        )
      )

      return NextResponse.json({
        trades: matchingTrades,
        ticker: tickerFilter,
        total: matchingTrades.length,
        source: 'local',
      })
    }

    // Fallback: FMP-Feed durchsuchen
    if (!FMP_API_KEY) {
      return NextResponse.json({ trades: [], ticker: tickerFilter, total: 0, source: 'fmp' })
    }
    const allFmpTrades: PoliticianTrade[] = []
    for (let p = 0; p < 10; p++) {
      const trades = await fetchFmpTrades(p)
      if (trades.length === 0) break
      allFmpTrades.push(...trades.filter(t => (t.ticker || '').toUpperCase() === tickerFilter))
    }
    return NextResponse.json({
      trades: allFmpTrades,
      ticker: tickerFilter,
      total: allFmpTrades.length,
      source: 'fmp',
    })
  }

  // ── Einzelner Politiker ───────────────────────────────────────────────────
  if (politicianSlug) {
    if (useLocal) {
      const local = loadLocalPolitician(politicianSlug)
      if (local) {
        // Auch neueste FMP-Trades hinzufügen (könnten neuer als lokale sein)
        let fmpTrades: PoliticianTrade[] = []
        if (FMP_API_KEY) {
          const targetName = slugToName(politicianSlug)
          const fmpPage0 = await fetchFmpTrades(0)
          const fmpPage1 = await fetchFmpTrades(1)
          const fmpAll = [...fmpPage0, ...fmpPage1]
          fmpTrades = fmpAll.filter(t =>
            t.representative?.toLowerCase() === targetName.toLowerCase()
          )
        }

        // FMP-Trades hinzufügen, die noch nicht lokal sind (nach Datum+Ticker deduplizieren)
        const localDates = new Set(
          local.trades.map(t => `${t.transactionDate}-${t.ticker}-${t.type}`)
        )
        const newFmpTrades = fmpTrades.filter(
          t => !localDates.has(`${t.transactionDate}-${t.ticker}-${t.type}`)
        )

        const allTrades = [...newFmpTrades, ...local.trades]

        return NextResponse.json({
          trades: allTrades,
          politician: local.name,
          source: 'local',
          total: allTrades.length,
        })
      }
    }

    // Fallback: FMP (mehrere Seiten)
    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'Keine Daten verfügbar' }, { status: 404 })
    }

    const targetName = slugToName(politicianSlug)
    const allTrades: PoliticianTrade[] = []
    for (let p = 0; p < 10; p++) {
      const trades = await fetchFmpTrades(p)
      if (trades.length === 0) break
      const filtered = trades.filter(
        t => t.representative?.toLowerCase() === targetName.toLowerCase()
      )
      allTrades.push(...filtered)
    }

    return NextResponse.json({
      trades: allTrades,
      politician: targetName,
      source: 'fmp',
      total: allTrades.length,
    })
  }

  // ── Overview / Feed ──────────────────────────────────────────────────────
  if (useLocal) {
    // Index laden
    const index = loadLocalIndex()

    // Alle neuesten Trades: aus allen Politiker-Dateien die jeweils letzten laden
    // Für den Feed: neueste Trades seitenweise
    const FEED_PAGE_SIZE = 100

    // Sammle alle Trades aus dem Feed – lade alle zusammen und sortiere
    // Für Performance: Nur die ersten N Politiker-Dateien laden (sortiert nach lastTradeDate)
    const sortedByRecent = [...index].sort((a, b) =>
      b.lastTradeDate.localeCompare(a.lastTradeDate)
    )

    // Für Feed: Alle Trades der letzten ~3 Monate aus den aktivsten Politikern sammeln
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const cutoff = threeMonthsAgo.toISOString().slice(0, 10)

    const feedTrades: PoliticianTrade[] = []
    const checked = new Set<string>()
    // Deduplizierung: gleiche Logik wie bei Einzelseiten
    const seenKeys = new Set<string>()

    for (const pol of sortedByRecent) {
      if (pol.lastTradeDate < cutoff && feedTrades.length > 500) break
      if (checked.has(pol.slug)) continue
      checked.add(pol.slug)

      const data = loadLocalPolitician(pol.slug)
      if (data) {
        // Nur recent Trades für Feed
        const recent = data.trades.filter(
          t => (t.transactionDate || t.disclosureDate) >= cutoff
        )
        for (const t of recent) {
          const key = `${t.transactionDate}-${t.ticker}-${t.type}-${t.representative || data.name}`
          seenKeys.add(key)
        }
        feedTrades.push(...recent)
      }
    }

    // FMP-Trades mergen (neueste Trades die noch nicht lokal sind)
    if (FMP_API_KEY) {
      const fmpPage0 = await fetchFmpTrades(0)
      const fmpPage1 = await fetchFmpTrades(1)
      const fmpAll = [...fmpPage0, ...fmpPage1]

      for (const t of fmpAll) {
        const date = t.transactionDate || t.disclosureDate
        if (!date || date < cutoff) continue
        const key = `${t.transactionDate}-${t.ticker}-${t.type}-${t.representative}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)
        feedTrades.push(t)
      }
    }

    // Sortieren und paginieren
    feedTrades.sort((a, b) =>
      (b.transactionDate || b.disclosureDate).localeCompare(
        a.transactionDate || a.disclosureDate
      )
    )

    const start = page * FEED_PAGE_SIZE
    const paginated = feedTrades.slice(start, start + FEED_PAGE_SIZE)

    return NextResponse.json({
      trades: paginated,
      index: index.slice(0, 200), // Top 200 für Politiker-Liste
      page,
      total: feedTrades.length,
      source: 'local',
    })
  }

  // Fallback: FMP
  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP API Key fehlt' }, { status: 500 })
  }

  try {
    const allTrades: PoliticianTrade[] = []
    for (let p = 0; p <= 5; p++) {
      const trades = await fetchFmpTrades(p)
      if (trades.length === 0) break
      allTrades.push(...trades)
    }

    return NextResponse.json({ trades: allTrades.slice(0, limit), page, source: 'fmp' })
  } catch (err) {
    console.error('Politiker-Trades Fehler:', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
