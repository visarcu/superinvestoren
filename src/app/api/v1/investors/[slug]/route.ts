// Finclue Data API v1 – Superinvestor Detail + Portfolio
// GET /api/v1/investors/{slug}
// Source: Eigene 13F Filing Daten (SEC EDGAR)

import { NextRequest, NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

// ─── Ticker Lookup ──────────────────────────────────────────────────────────

const cusipIndex = new Map<string, string>()
const nameIndex = new Map<string, string>()
const NOISE = new Set(['INC', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'LTD', 'PLC', 'LP', 'LLC', 'NV', 'SA', 'AG', 'SE', 'THE', 'OF', 'AND', '&', 'CLASS', 'CL', 'SHS', 'COM', 'ORD', 'NEW', 'DEL'])
for (const s of stocks) {
  if (s.cusip) cusipIndex.set(s.cusip, s.ticker)
  const key = s.name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').trim().split(/\s+/).filter(w => !NOISE.has(w)).slice(0, 3).join('|')
  if (key) nameIndex.set(key, s.ticker)
}

function getTicker(pos: any): string | null {
  if (pos.ticker) return pos.ticker
  if (pos.cusip) { const t = cusipIndex.get(pos.cusip); if (t) return t }
  if (pos.name) {
    const key = pos.name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').trim().split(/\s+/).filter((w: string) => !NOISE.has(w)).slice(0, 3).join('|')
    const t = nameIndex.get(key); if (t) return t
  }
  return null
}

function fmtValue(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Bio. $`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Mrd. $`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mio. $`
  return `${(v / 1e3).toFixed(0)}K $`
}

// ─── Main ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug.toLowerCase()
  const history = holdingsHistory as Record<string, any[]>
  const snapshots = history[slug]

  if (!snapshots || snapshots.length === 0) {
    return NextResponse.json({ error: `Investor "${slug}" nicht gefunden` }, { status: 404 })
  }

  const investorInfo = investors.find(inv => inv.slug === slug)
  const latest = snapshots[snapshots.length - 1]?.data
  const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2]?.data : null

  if (!latest?.positions) {
    return NextResponse.json({ error: 'Keine Portfolio-Daten' }, { status: 404 })
  }

  const totalValue = latest.positions.reduce((s: number, p: any) => s + (p.value || 0), 0)

  // Build previous positions map for change detection
  const prevMap = new Map<string, { shares: number; value: number }>()
  if (previous?.positions) {
    for (const p of previous.positions) {
      const t = getTicker(p) || p.cusip
      if (!t) continue
      const existing = prevMap.get(t)
      if (existing) {
        existing.shares += p.shares || 0
        existing.value += p.value || 0
      } else {
        prevMap.set(t, { shares: p.shares || 0, value: p.value || 0 })
      }
    }
  }

  // Build current positions with change info
  const positionMap = new Map<string, { name: string; ticker: string | null; cusip: string; shares: number; value: number }>()
  for (const p of latest.positions) {
    const t = getTicker(p) || p.cusip
    if (!t) continue
    const existing = positionMap.get(t)
    if (existing) {
      existing.shares += p.shares || 0
      existing.value += p.value || 0
    } else {
      positionMap.set(t, { name: p.name, ticker: getTicker(p), cusip: p.cusip, shares: p.shares || 0, value: p.value || 0 })
    }
  }

  const positions = Array.from(positionMap.entries()).map(([key, pos]) => {
    const pct = totalValue > 0 ? (pos.value / totalValue) * 100 : 0
    const prev = prevMap.get(key)

    let activity: 'neu' | 'aufgestockt' | 'reduziert' | 'unverändert' = 'unverändert'
    let changePct = 0

    if (!prev) {
      activity = 'neu'
    } else {
      const delta = pos.shares - prev.shares
      changePct = prev.shares > 0 ? (delta / prev.shares) * 100 : 0
      if (Math.abs(changePct) >= 1.0 && Math.abs(delta) >= Math.max(1000, prev.shares * 0.001)) {
        activity = delta > 0 ? 'aufgestockt' : 'reduziert'
      }
    }

    return {
      ticker: pos.ticker,
      name: pos.name,
      cusip: pos.cusip,
      shares: pos.shares,
      value: pos.value,
      valueFormatted: fmtValue(pos.value),
      portfolioPct: Math.round(pct * 100) / 100,
      activity,
      changePct: Math.round(changePct * 10) / 10,
    }
  }).sort((a, b) => b.value - a.value)

  // Closed positions (in previous but not in current)
  const currentKeys = new Set(positionMap.keys())
  const closedPositions = Array.from(prevMap.entries())
    .filter(([key]) => !currentKeys.has(key))
    .map(([key, prev]) => ({
      ticker: key.length <= 6 ? key : null,
      cusip: key.length > 6 ? key : null,
      previousShares: prev.shares,
      previousValue: prev.value,
      previousValueFormatted: fmtValue(prev.value),
    }))
    .sort((a, b) => b.previousValue - a.previousValue)

  // Sector allocation (from stocks data)
  const sectorMap = new Map<string, number>()
  for (const pos of positions) {
    if (!pos.ticker) continue
    const stock = stocks.find(s => s.ticker === pos.ticker)
    const sector = stock?.sector || 'Sonstige'
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + pos.value)
  }
  const sectors = Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name, value, pct: totalValue > 0 ? Math.round((value / totalValue) * 1000) / 10 : 0 }))
    .sort((a, b) => b.value - a.value)

  // Quarter info
  const filingDate = latest.date
  const [y, m] = filingDate.split('-').map(Number)
  const reportQ = Math.ceil(m / 3) - 1 || 4
  const reportY = reportQ === 4 && m <= 3 ? y - 1 : y

  // Portfolio history (value over time)
  const portfolioHistory = snapshots.map((s: any) => {
    const d = s.data
    if (!d?.positions) return null
    const val = d.positions.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
    return { quarter: s.quarter, value: val, positions: d.positions.length, date: d.date }
  }).filter(Boolean)

  return NextResponse.json({
    slug,
    name: investorInfo?.name || slug,
    image: investorInfo?.imageUrl || null,
    quarter: `Q${reportQ} ${reportY}`,
    filingDate,
    portfolioValue: totalValue,
    portfolioValueFormatted: fmtValue(totalValue),
    positionsCount: positions.length,
    positions,
    closedPositions,
    sectors,
    portfolioHistory,
    summary: {
      newPositions: positions.filter(p => p.activity === 'neu').length,
      increased: positions.filter(p => p.activity === 'aufgestockt').length,
      decreased: positions.filter(p => p.activity === 'reduziert').length,
      unchanged: positions.filter(p => p.activity === 'unverändert').length,
      closed: closedPositions.length,
      top3Pct: positions.slice(0, 3).reduce((s, p) => s + p.portfolioPct, 0),
    },
    source: 'sec-13f',
    fetchedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}
