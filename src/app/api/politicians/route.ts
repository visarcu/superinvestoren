// src/app/api/politicians/route.ts
// US-Kongress Aktien-Trades aus der eigenen DB (Tabellen Politician/PoliticianTrade).
//
// Befüllt wird die DB vom Cron /api/cron/sync-politician-trades. Die Route liest
// nur — kein Live-Fetch bei externen Anbietern mehr, damit die Seite nicht von
// deren Verfügbarkeit und Seiten-Limits abhängt.
//
// Das Antwort-Format entspricht weiterhin dem der ursprünglichen
// House/Senate-Stock-Watcher-Daten (siehe toLegacyTrade), damit /politiker
// unverändert funktioniert.

import { NextRequest, NextResponse } from 'next/server'
import {
  getFeed,
  getPoliticianTrades,
  getPolitician,
  getTradesByTicker,
  listPoliticians,
  toLegacyTrade,
} from '@/lib/politicianTradesDb'

const FEED_PAGE_SIZE = 100
const FEED_MONTHS_BACK = 3

export const dynamic = 'force-dynamic'

// GET /api/politicians?page=0&politician=nancy-pelosi&limit=100&ticker=MSFT
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(parseInt(searchParams.get('page') || '0'), 0)
  const politicianSlug = (searchParams.get('politician') || '').toLowerCase()
  const tickerFilter = (searchParams.get('ticker') || '').toUpperCase()
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

  try {
    // ── Trades für bestimmten Ticker (alle Politiker) ───────────────────────
    if (tickerFilter && !politicianSlug) {
      const rows = await getTradesByTicker(tickerFilter)
      return NextResponse.json({
        trades: rows
          .slice(0, limit)
          .map(r => ({ ...toLegacyTrade(r, r.politicianName), politicianName: r.politicianName })),
        ticker: tickerFilter,
        total: rows.length,
        source: 'db',
      })
    }

    // ── Einzelner Politiker ─────────────────────────────────────────────────
    if (politicianSlug) {
      const politician = await getPolitician(politicianSlug)
      if (!politician) {
        return NextResponse.json({ error: 'Politiker nicht gefunden' }, { status: 404 })
      }

      const trades = await getPoliticianTrades(politicianSlug)
      return NextResponse.json({
        trades: trades.map(t => toLegacyTrade(t, politician.name)),
        politician: politician.name,
        source: 'db',
        total: trades.length,
      })
    }

    // ── Overview / Feed ─────────────────────────────────────────────────────
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - FEED_MONTHS_BACK)
    const sinceDate = cutoff.toISOString().slice(0, 10)

    const [{ trades, total }, { politicians }] = await Promise.all([
      getFeed({ sinceDate, limit: FEED_PAGE_SIZE, offset: page * FEED_PAGE_SIZE }),
      listPoliticians({ sort: 'recent', limit: 200 }),
    ])

    return NextResponse.json({
      trades: trades.map(t => toLegacyTrade(t, t.politicianName)),
      index: politicians.map(p => ({
        slug: p.slug,
        name: p.name,
        chamber: p.chamber,
        state: p.state || '',
        district: p.district || '',
        tradeCount: p.tradeCount,
        lastTradeDate: p.lastTradeDate || '',
        recentTickers: p.recentTickers,
        party: p.party,
        photoUrl: p.photoUrl,
      })),
      page,
      total,
      source: 'db',
    })
  } catch (err) {
    console.error('Politiker-Trades Fehler:', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
