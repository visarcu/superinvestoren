// Finclue Data API v1 – Superinvestoren die eine Aktie halten
// GET /api/v1/investors/stock/{ticker}
// Source: Eigene 13F Filing Daten (SEC EDGAR)

import { NextRequest, NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

// ─── Helper: Ticker aus Position ermitteln ──────────────────────────────────

const SEC_ABBREVS: Record<string, string> = {
  'COS': 'COMPANIES', 'CO': 'COMPANY', 'HLDGS': 'HOLDINGS', 'HLDG': 'HOLDING',
  'CORP': 'CORPORATION', 'INC': 'INCORPORATED', 'INTL': 'INTERNATIONAL',
  'SYS': 'SYSTEMS', 'TECH': 'TECHNOLOGY', 'TECHS': 'TECHNOLOGIES',
  'GRP': 'GROUP', 'SVCS': 'SERVICES', 'SVC': 'SERVICE',
  'FINL': 'FINANCIAL', 'FINCL': 'FINANCIAL', 'MGMT': 'MANAGEMENT',
  'MFG': 'MANUFACTURING', 'PHARM': 'PHARMACEUTICALS',
}
const NOISE_WORDS = new Set([
  'INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY',
  'LTD', 'LIMITED', 'PLC', 'LP', 'LLC', 'NV', 'SA', 'AG', 'SE',
  'THE', 'OF', 'AND', '&', 'A', 'AN', 'CLASS', 'CL', 'SHS',
  'NEW', 'DEL', 'COM', 'ORD', 'SER', 'SERIES',
])

const cusipIndex = new Map<string, string>()
const nameIndex = new Map<string, string>()
for (const s of stocks) {
  if (s.cusip) cusipIndex.set(s.cusip, s.ticker)
  const key = getNameKey(s.name)
  if (key) nameIndex.set(key, s.ticker)
}

function getNameKey(name: string): string {
  return name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').filter(w => !NOISE_WORDS.has(w)).map(w => SEC_ABBREVS[w] || w)
    .filter(w => !NOISE_WORDS.has(w)).join('|')
}

function getTicker(pos: any): string | null {
  if (pos.ticker) return pos.ticker
  if (pos.cusip) { const t = cusipIndex.get(pos.cusip); if (t) return t }
  if (pos.name) { const t = nameIndex.get(getNameKey(pos.name)); if (t) return t }
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
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  const results: any[] = []
  const history = holdingsHistory as Record<string, any[]>

  for (const [slug, snapshots] of Object.entries(history)) {
    if (!snapshots || snapshots.length === 0) continue
    const investorInfo = investors.find(inv => inv.slug === slug)

    const latest = snapshots[snapshots.length - 1]?.data
    if (!latest?.positions) continue

    // Alle Positionen dieses Tickers zusammenführen
    const tickerPositions = latest.positions.filter((p: any) => getTicker(p) === ticker)
    if (tickerPositions.length === 0) continue

    const totalShares = tickerPositions.reduce((s: number, p: any) => s + (p.shares || 0), 0)
    const totalValue = tickerPositions.reduce((s: number, p: any) => s + (p.value || 0), 0)

    if (totalShares <= 0 || totalValue < 100000) continue

    // Portfolio-Anteil
    const portfolioTotal = latest.positions.reduce((s: number, p: any) => s + (p.value || 0), 0)
    const portfolioPct = portfolioTotal > 0 ? (totalValue / portfolioTotal) * 100 : 0

    // Veränderung zum Vorquartal
    let activity: 'neu' | 'aufgestockt' | 'reduziert' | 'unverändert' = 'unverändert'
    let changePct = 0

    if (snapshots.length >= 2) {
      const prev = snapshots[snapshots.length - 2]?.data
      if (prev?.positions) {
        const prevPositions = prev.positions.filter((p: any) => getTicker(p) === ticker)
        const prevShares = prevPositions.reduce((s: number, p: any) => s + (p.shares || 0), 0)

        if (prevShares === 0) {
          activity = 'neu'
        } else {
          const delta = totalShares - prevShares
          changePct = (delta / prevShares) * 100
          if (Math.abs(changePct) >= 1.0 && Math.abs(delta) >= Math.max(1000, prevShares * 0.001)) {
            activity = delta > 0 ? 'aufgestockt' : 'reduziert'
          }
        }
      }
    }

    // Quartal aus Filing-Date ableiten
    const filingDate = latest.date
    const [y, m] = filingDate.split('-').map(Number)
    const reportQ = Math.ceil(m / 3) - 1 || 4
    const reportY = reportQ === 4 && m <= 3 ? y - 1 : y

    results.push({
      investor: {
        slug,
        name: investorInfo?.name || slug,
        image: investorInfo?.imageUrl || null,
      },
      shares: totalShares,
      value: totalValue,
      valueFormatted: fmtValue(totalValue),
      portfolioPct: Math.round(portfolioPct * 100) / 100,
      activity,
      changePct: Math.round(changePct * 100) / 100,
      quarter: `Q${reportQ} ${reportY}`,
      filingDate,
    })
  }

  // Sortiert nach Wert (größte Position zuerst)
  results.sort((a, b) => b.value - a.value)

  return NextResponse.json({
    ticker,
    investors: results,
    count: results.length,
    totalValue: results.reduce((s, r) => s + r.value, 0),
    source: 'sec-13f',
    fetchedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}
