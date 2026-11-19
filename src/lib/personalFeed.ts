// src/lib/personalFeed.ts
// Server-only: "Für dich"-Feed im Terminal. Bündelt, was für einen Nutzer seit
// dem letzten Besuch passiert ist:
//   – neue 13F-Filings der Investoren, denen er folgt
//   – Käufe/Verkäufe von Superinvestoren bei seinen Aktien (Watchlist + Depot)
//   – Insider-Käufe bei seinen Aktien (letzte 30 Tage)
//   – anstehende Quartalszahlen seiner Aktien (nächste 14 Tage)

import holdingsHistory, { type Snapshot } from '@/data/holdings'
import { investorNames, splitInvestorName } from '@/data/investorNames'
import { getEarningsFromDb } from '@/lib/earningsCalendarDb'
import { buildInvestorQuarterSummary, type QuarterMove } from '@/lib/investorQuarterSummary'
import { getStockSuperinvestors } from '@/lib/stockSuperinvestors'

const DAY_MS = 24 * 60 * 60 * 1000
/** 13F-Filings bleiben ein Quartal lang im Feed */
const FILING_WINDOW_DAYS = 100
const INSIDER_WINDOW_DAYS = 30
const EARNINGS_WINDOW_DAYS = 14
/** Obergrenze für Insider-Abfragen pro Aufruf (je Ticker ein FMP-Request) */
const MAX_INSIDER_TICKERS = 50

export interface FeedFilingItem {
  type: 'filing'
  date: string
  investorSlug: string
  investorName: string
  periodLabel: string
  counts: { new: number; increased: number; reduced: number; sold: number }
  topBuys: Pick<QuarterMove, 'ticker' | 'name' | 'kind' | 'pctChange'>[]
  topSells: Pick<QuarterMove, 'ticker' | 'name' | 'kind' | 'pctChange'>[]
}

export interface FeedMoveItem {
  type: 'move'
  date: string
  ticker: string
  investorSlug: string
  investorName: string
  periodLabel: string
  change: 'new' | 'increased' | 'reduced' | 'sold'
  pctChange: number | null
  portfolioShare: number | null
}

export interface FeedInsiderItem {
  type: 'insider'
  date: string
  ticker: string
  /** Größter Käufer im Zeitraum */
  insiderName: string
  insiderRole: string | null
  buyCount: number
  totalValue: number
}

export interface FeedEarningsItem {
  type: 'earnings'
  date: string
  ticker: string
  companyName: string | null
  time: string | null
}

export type FeedItem = FeedFilingItem | FeedMoveItem | FeedInsiderItem

export interface PersonalFeed {
  items: FeedItem[]
  upcomingEarnings: FeedEarningsItem[]
  followedInvestors: number
  trackedTickers: number
}

function daysAgo(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / DAY_MS
}

function displayName(slug: string): string {
  return splitInvestorName(investorNames[slug] ?? slug).name
}

const slimMove = (m: QuarterMove) => ({ ticker: m.ticker, name: m.name, kind: m.kind, pctChange: m.pctChange })

function filingItems(followedSlugs: string[]): FeedFilingItem[] {
  const history = holdingsHistory as Record<string, Snapshot[]>
  const items: FeedFilingItem[] = []
  for (const slug of followedSlugs) {
    const snapshots = history[slug]
    if (!Array.isArray(snapshots) || snapshots.length === 0) continue
    const summary = buildInvestorQuarterSummary(slug, snapshots)
    if (!summary?.filingDate || daysAgo(summary.filingDate) > FILING_WINDOW_DAYS) continue
    items.push({
      type: 'filing',
      date: summary.filingDate,
      investorSlug: slug,
      investorName: displayName(slug),
      periodLabel: summary.periodLabel,
      counts: summary.counts,
      topBuys: summary.topBuys.map(slimMove),
      topSells: summary.topSells.map(slimMove),
    })
  }
  return items
}

/** Mindestgewicht im Portfolio, damit eine Bewegung eines nicht gefolgten Investors zählt */
const MIN_PORTFOLIO_SHARE = 0.005
/** Höchstens so viele Superinvestor-Bewegungen je Aktie – sonst flutet eine Aktie den Feed */
const MAX_MOVES_PER_TICKER = 3

function moveScore(m: FeedMoveItem, followedSlugs: Set<string>): number {
  let score = 0
  if (followedSlugs.has(m.investorSlug)) score += 1000
  if (m.change === 'new' || m.change === 'sold') score += 100
  score += (m.portfolioShare ?? 0) * 100 // Anteil am Portfolio in Prozentpunkten
  score += Math.min(Math.abs(m.pctChange ?? 0), 100) / 10
  return score
}

function moveItems(tickers: string[], followedSlugs: Set<string>): FeedMoveItem[] {
  const items: FeedMoveItem[] = []
  for (const ticker of tickers) {
    const { holders, soldOut } = getStockSuperinvestors(ticker)
    const forTicker: FeedMoveItem[] = []
    for (const h of holders) {
      if (h.change === 'unchanged' || daysAgo(h.filingDate) > FILING_WINDOW_DAYS) continue
      // Kleinstanpassungen (< 1 %) sind Rauschen – außer bei gefolgten Investoren
      if (h.pctChange !== null && Math.abs(h.pctChange) < 1 && !followedSlugs.has(h.slug)) continue
      // Mini-Positionen (< 0,5 % des Portfolios) fremder Investoren sind kein Signal
      if (h.portfolioShare < MIN_PORTFOLIO_SHARE && !followedSlugs.has(h.slug)) continue
      forTicker.push({
        type: 'move',
        date: h.filingDate,
        ticker,
        investorSlug: h.slug,
        investorName: h.name,
        periodLabel: h.periodLabel,
        change: h.change,
        pctChange: h.pctChange,
        portfolioShare: h.portfolioShare,
      })
    }
    for (const sold of soldOut) {
      if (daysAgo(sold.filingDate) > FILING_WINDOW_DAYS) continue
      forTicker.push({
        type: 'move',
        date: sold.filingDate,
        ticker,
        investorSlug: sold.slug,
        investorName: sold.name,
        periodLabel: sold.periodLabel,
        change: 'sold',
        pctChange: null,
        portfolioShare: null,
      })
    }
    forTicker.sort((a, b) => moveScore(b, followedSlugs) - moveScore(a, followedSlugs))
    items.push(...forTicker.slice(0, MAX_MOVES_PER_TICKER))
  }
  return items
}

interface FmpInsiderTrade {
  transactionDate?: string
  transactionType?: string
  reportingName?: string
  typeOfOwner?: string
  securitiesTransacted?: number
  price?: number
}

async function insiderItems(tickers: string[]): Promise<FeedInsiderItem[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return []

  const results = await Promise.all(
    tickers.slice(0, MAX_INSIDER_TICKERS).map(async ticker => {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v4/insider-trading?symbol=${encodeURIComponent(ticker)}&page=0&apikey=${apiKey}`,
          { next: { revalidate: 3600 } },
        )
        if (!res.ok) return null
        const trades = (await res.json()) as FmpInsiderTrade[]
        if (!Array.isArray(trades)) return null

        const buys = trades.filter(
          t =>
            t.transactionType?.startsWith('P') &&
            t.transactionDate &&
            daysAgo(t.transactionDate) <= INSIDER_WINDOW_DAYS &&
            (t.securitiesTransacted ?? 0) > 0,
        )
        if (buys.length === 0) return null

        const valueOf = (t: FmpInsiderTrade) => (t.securitiesTransacted ?? 0) * (t.price ?? 0)
        const biggest = buys.reduce((a, b) => (valueOf(b) > valueOf(a) ? b : a))
        const dates = buys.map(t => t.transactionDate!).sort()
        const latestDate = dates[dates.length - 1]

        const item: FeedInsiderItem = {
          type: 'insider',
          date: latestDate,
          ticker,
          insiderName: biggest.reportingName ?? 'Insider',
          insiderRole: biggest.typeOfOwner ?? null,
          buyCount: buys.length,
          totalValue: buys.reduce((sum, t) => sum + valueOf(t), 0),
        }
        return item
      } catch {
        return null
      }
    }),
  )
  return results.filter((r): r is FeedInsiderItem => r !== null)
}

async function upcomingEarnings(tickers: string[]): Promise<FeedEarningsItem[]> {
  if (tickers.length === 0) return []
  const from = new Date().toISOString().slice(0, 10)
  const to = new Date(Date.now() + EARNINGS_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10)
  const wanted = new Set(tickers)

  let rows: FeedEarningsItem[] = []
  try {
    // DB-first wie der Earnings-Cron; ist die Tabelle für den Zeitraum leer, FMP
    const dbRows = await getEarningsFromDb(from, to)
    rows = dbRows
      .filter(r => wanted.has(r.symbol))
      .map(r => ({ type: 'earnings' as const, date: r.date, ticker: r.symbol, companyName: r.companyName, time: r.time || null }))
    if (dbRows.length > 0) return rows.sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    // DB nicht erreichbar → FMP
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return rows
  try {
    const res = await fetch(`https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${apiKey}`, {
      next: { revalidate: 6 * 3600 },
    })
    if (!res.ok) return rows
    const data = (await res.json()) as Array<{ symbol?: string; date?: string; time?: string }>
    if (!Array.isArray(data)) return rows
    return data
      .filter(e => e.symbol && e.date && wanted.has(e.symbol))
      .map(e => ({ type: 'earnings' as const, date: e.date!, ticker: e.symbol!, companyName: null, time: e.time || null }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return rows
  }
}

export async function buildPersonalFeed(input: { followedSlugs: string[]; tickers: string[] }): Promise<PersonalFeed> {
  const followed = Array.from(new Set(input.followedSlugs))
  const tickers = Array.from(new Set(input.tickers.map(t => t.toUpperCase()))).sort()

  const [insider, earnings] = await Promise.all([insiderItems(tickers), upcomingEarnings(tickers)])

  const followedSet = new Set(followed)
  // Neueste zuerst; bei gleichem Datum: Filings gefolgter Investoren, dann Insider-Käufe,
  // dann Superinvestor-Bewegungen nach Relevanz
  const relevance = (item: FeedItem) =>
    item.type === 'filing' ? 10_000 : item.type === 'insider' ? 5_000 : moveScore(item, followedSet)
  const items: FeedItem[] = [...filingItems(followed), ...moveItems(tickers, followedSet), ...insider].sort(
    (a, b) => b.date.slice(0, 10).localeCompare(a.date.slice(0, 10)) || relevance(b) - relevance(a),
  )

  return {
    items: items.slice(0, 40),
    upcomingEarnings: earnings,
    followedInvestors: followed.length,
    trackedTickers: tickers.length,
  }
}
