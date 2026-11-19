// src/lib/stockSuperinvestors.ts
// Server-only: Welche Superinvestoren halten eine Aktie? Index über die jeweils
// letzten 13F-Filings aller Investoren, einmal pro Server-Instanz aufgebaut.
//
// Nur Aktienpositionen (keine Puts/Calls), zusammengeführt je Ticker. Investoren,
// deren letztes Filing mehr als ein Quartal hinter dem neuesten liegt, zählen
// nicht mit – deren Bestände wären veraltet.

import holdingsHistory, { type Snapshot } from '@/data/holdings'
import { investors } from '@/data/investors'
import { investorNames, splitInvestorName } from '@/data/investorNames'
import { getPositionTicker } from '@/lib/holdingsTicker'
import { reportQuarter } from '@/lib/investorQuarterSummary'

type Position = Snapshot['data']['positions'][number]

export type HolderChange = 'new' | 'increased' | 'reduced' | 'unchanged'

interface InvestorRef {
  slug: string
  name: string
  firm: string | null
  imageUrl: string | null
  /** Berichtsquartal des Filings, z. B. "Q3 2026" */
  periodLabel: string
}

export interface StockHolder extends InvestorRef {
  shares: number
  value: number
  /** Anteil am gemeldeten Portfolio, 0..1 */
  portfolioShare: number
  change: HolderChange
  /** Veränderung der Stückzahl in Prozent (nur aufgestockt/reduziert) */
  pctChange: number | null
}

export interface StockSeller extends InvestorRef {
  /** Wert der Position im Quartal davor */
  previousValue: number
}

export interface StockSuperinvestorData {
  holders: StockHolder[]
  soldOut: StockSeller[]
  totalValue: number
  /** Anzahl Investoren mit aktuellem Filing (Basis für "x von y") */
  trackedInvestors: number
  /** Firmenname laut 13F, falls keine anderen Stammdaten verfügbar sind */
  filingName: string | null
}

interface TickerEntry {
  holders: StockHolder[]
  soldOut: StockSeller[]
  filingName: string | null
}

function isStockPosition(p: Position): boolean {
  if (p.putCall) return false
  return !p.optionType || p.optionType === 'STOCK'
}

function aggregateByTicker(positions: Position[]) {
  const map = new Map<string, { shares: number; value: number; name: string }>()
  for (const p of positions) {
    if (!isStockPosition(p)) continue
    const ticker = getPositionTicker(p)?.toUpperCase()
    if (!ticker) continue
    const entry = map.get(ticker)
    if (entry) {
      entry.shares += p.shares
      entry.value += p.value
    } else {
      map.set(ticker, { shares: p.shares, value: p.value, name: p.name })
    }
  }
  return map
}

const quarterIndex = (filingDate: string) => {
  const { q, year } = reportQuarter(filingDate)
  return year * 4 + q
}

function investorRef(slug: string, filingDate: string): InvestorRef {
  const { name, subtitle } = splitInvestorName(investorNames[slug] ?? slug)
  const { q, year } = reportQuarter(filingDate)
  return {
    slug,
    name,
    firm: subtitle ?? null,
    imageUrl: investors.find(i => i.slug === slug)?.imageUrl ?? null,
    periodLabel: `Q${q} ${year}`,
  }
}

let index: { byTicker: Map<string, TickerEntry>; trackedInvestors: number } | null = null

function buildIndex() {
  const history = holdingsHistory as Record<string, Snapshot[]>
  const latestOf = (snaps: Snapshot[]) => snaps[snaps.length - 1]?.data

  const newest = Math.max(
    ...Object.values(history).map(s => (latestOf(s)?.date ? quarterIndex(latestOf(s)!.date) : 0)),
  )

  const byTicker = new Map<string, TickerEntry>()
  const entryFor = (ticker: string) => {
    let e = byTicker.get(ticker)
    if (!e) {
      e = { holders: [], soldOut: [], filingName: null }
      byTicker.set(ticker, e)
    }
    return e
  }

  let trackedInvestors = 0
  for (const [slug, snaps] of Object.entries(history)) {
    const latest = latestOf(snaps)
    if (!latest?.date || quarterIndex(latest.date) < newest - 1) continue
    trackedInvestors++

    const ref = investorRef(slug, latest.date)
    const portfolioValue = latest.positions.reduce((sum, p) => sum + p.value, 0)
    const current = aggregateByTicker(latest.positions)
    const previous = snaps.length >= 2 ? aggregateByTicker(snaps[snaps.length - 2].data.positions) : null

    for (const [ticker, cur] of current) {
      if (cur.shares <= 0) continue
      const before = previous?.get(ticker)?.shares ?? 0
      const delta = cur.shares - before
      const change: HolderChange = !previous
        ? 'unchanged'
        : before === 0
          ? 'new'
          : delta > 0
            ? 'increased'
            : delta < 0
              ? 'reduced'
              : 'unchanged'

      const entry = entryFor(ticker)
      entry.filingName ??= cur.name
      entry.holders.push({
        ...ref,
        shares: cur.shares,
        value: cur.value,
        portfolioShare: portfolioValue > 0 ? cur.value / portfolioValue : 0,
        change,
        pctChange: (change === 'increased' || change === 'reduced') && before > 0 ? (delta / before) * 100 : null,
      })
    }

    if (previous) {
      for (const [ticker, prev] of previous) {
        if (current.has(ticker) || prev.shares <= 0) continue
        const entry = entryFor(ticker)
        entry.filingName ??= prev.name
        entry.soldOut.push({ ...ref, previousValue: prev.value })
      }
    }
  }

  for (const entry of byTicker.values()) {
    entry.holders.sort((a, b) => b.value - a.value)
    entry.soldOut.sort((a, b) => b.previousValue - a.previousValue)
  }

  return { byTicker, trackedInvestors }
}

function getIndex() {
  index ??= buildIndex()
  return index
}

export function getStockSuperinvestors(ticker: string): StockSuperinvestorData {
  const { byTicker, trackedInvestors } = getIndex()
  const entry = byTicker.get(ticker.toUpperCase())
  const holders = entry?.holders ?? []
  return {
    holders,
    soldOut: entry?.soldOut ?? [],
    totalValue: holders.reduce((sum, h) => sum + h.value, 0),
    trackedInvestors,
    filingName: entry?.filingName ?? null,
  }
}

/** Alle Ticker, die mindestens ein Superinvestor aktuell hält (für die Sitemap). */
export function getHeldTickers(): string[] {
  const { byTicker } = getIndex()
  return Array.from(byTicker.entries())
    .filter(([, e]) => e.holders.length > 0)
    .map(([ticker]) => ticker)
    .sort()
}
