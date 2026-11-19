// src/lib/superinvestorActivity.ts
// Server-only: Käufe/Verkäufe je Investor und Quartal für /superinvestor/activity.
// Vorher im Browser über das komplette Holdings-Paket berechnet.

import holdingsHistory from '@/data/holdings'
import { getPositionTicker } from '@/lib/holdingsTicker'

// Types
interface Position {
  cusip: string
  ticker?: string
  name: string
  shares: number
  value: number
}

interface HoldingSnapshot {
  data: {
    date: string
    positions: Position[]
  }
}

export interface InvestorActivity {
  slug: string
  name: string
  period: string
  topBuys: string[]
  topSells: string[]
  /** Kürzel ohne bekannten Ticker (CUSIP-Rest) – nicht verlinken */
  unresolved: string[]
}


// Utility functions
function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

// Positionen ohne auflösbaren Ticker bekommen ein CUSIP-Kürzel; die merken wir
// uns, damit die Seite dafür keinen (toten) Aktien-Link baut.
const unresolvedTickers = new Set<string>()

function getTicker(position: Position): string {
  const ticker = getPositionTicker(position)
  if (ticker) return ticker
  const fallback = position.cusip.replace(/0+$/, '')
  unresolvedTickers.add(fallback)
  return fallback
}

// Investor name mapping (comprehensive)
const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  ackman: 'Bill Ackman',
  gates: 'Bill Gates Foundation',
  ark_investment_management: 'Catherine Wood',
  burry: 'Michael Burry',
  klarman: 'Seth Klarman',
  icahn: 'Carl Icahn',
  einhorn: 'David Einhorn',
  druckenmiller: 'Stanley Druckenmiller',
  thiel: 'Peter Thiel',
  akre: 'Chuck Akre',
  miller: 'Bill Miller',
  tepper: 'David Tepper',
  coleman: 'Chase Coleman',
  gayner: 'Thomas Gayner',
  ainslie: 'Lee Ainslie',
  hohn: 'Chris Hohn',
  yacktman: 'Don Yacktman',
  polen: 'Polen Capital',
  viking: 'Viking Global',
  cantillon: 'Cantillon Capital',
  jensen: 'Jensen Investment',
  russo: 'Thomas Russo',
  armitage: 'John Armitage',
  mandel: 'Stephen Mandel',
  ellenbogen: 'Jon Ellenbogen',
  vinall: 'Robert Vinall',
  greenhaven: 'Edgar Wachenheim',
  abrams: 'David Abrams',
  martin: 'Fred Martin',
  kantesaria: 'Dev Kantesaria',
  kahn: 'Kahn Brothers',
  train: 'Lindsell Train',
  burn: 'Harry Burn',
  dorsey: 'Pat Dorsey',
  chou: 'Francis Chou',
  lawrence: 'Bryan Lawrence',
  greenberg: 'Glenn Greenberg',
  roepers: 'Alex Roepers',
  munger: 'Charlie Munger',
  spier: 'Guy Spier',
  pabrai: 'Mohnish Pabrai', 
  aschenbrenner: 'Leopold Aschenbrenner',
    check: 'Steven Check'
}


function getAvailableQuarters(): string[] {
    const quarters = new Set<string>()
    Object.values(holdingsHistory).forEach(snapshots => {
      const snaps = snapshots as HoldingSnapshot[]
      if (!snaps || snaps.length === 0) return
      snaps.forEach(snap => {
        if (snap?.data?.date) {
          quarters.add(getPeriodFromDate(snap.data.date))
        }
      })
    })
    // Sort quarters descending (newest first)
    return Array.from(quarters).sort((a, b) => {
      const [qA, yA] = a.split(' ')
      const [qB, yB] = b.split(' ')
      if (yA !== yB) return parseInt(yB) - parseInt(yA)
      return parseInt(qB.replace('Q', '')) - parseInt(qA.replace('Q', ''))
    })
  }

function activityForQuarter(selectedQuarter: string): InvestorActivity[] {
    const investorActivities: InvestorActivity[] = []

    // Process each investor
    Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
      const snaps = snapshots as HoldingSnapshot[]
      if (!snaps || snaps.length < 2) return

      const latest = snaps[snaps.length - 1]
      const previous = snaps[snaps.length - 2]

      if (!latest?.data?.date || getPeriodFromDate(latest.data.date) !== selectedQuarter) return

      const investorName = investorNames[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

      // Create maps for current and previous positions
      const currentPositions = new Map<string, Position>()
      const previousPositions = new Map<string, Position>()

      latest.data.positions?.forEach(p => {
        const ticker = getTicker(p)
        if (ticker) {
          currentPositions.set(ticker, p)
        }
      })

      previous.data.positions?.forEach(p => {
        const ticker = getTicker(p)
        if (ticker) {
          previousPositions.set(ticker, p)
        }
      })

      // Find changes and rank by transaction value
      const allTransactions: { ticker: string; value: number; type: 'buy' | 'sell' }[] = []
      const allTickers = new Set([...currentPositions.keys(), ...previousPositions.keys()])

      allTickers.forEach(ticker => {
        const current = currentPositions.get(ticker)
        const prev = previousPositions.get(ticker)

        const currentShares = current?.shares || 0
        const prevShares = prev?.shares || 0
        const deltaShares = currentShares - prevShares

        if (Math.abs(deltaShares) < 100) return // Ignore small changes

        // Use better price calculation based on available positions
        let transactionValue = 0

        if (deltaShares > 0) {
          // Buy: use current position for price calculation
          const pricePerShare = current ? current.value / current.shares : (prev ? prev.value / prev.shares : 0)
          transactionValue = Math.abs(deltaShares * pricePerShare)
        } else {
          // Sell: calculate using the difference in position values
          const currentValue = current?.value || 0
          const prevValue = prev?.value || 0
          transactionValue = Math.abs(prevValue - currentValue)
        }

        if (transactionValue < 100000) return // Min $100K transaction for individual investors

        allTransactions.push({
          ticker,
          value: transactionValue,
          type: deltaShares > 0 ? 'buy' : 'sell'
        })
      })

      // Sort all transactions by value and take top 10
      const topTransactions = allTransactions
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      const topBuys = topTransactions
        .filter(t => t.type === 'buy')
        .map(t => t.ticker)

      const topSells = topTransactions
        .filter(t => t.type === 'sell')
        .map(t => t.ticker)

      if (topBuys.length > 0 || topSells.length > 0) {
        investorActivities.push({
          slug,
          name: investorName,
          period: selectedQuarter,
          topBuys,
          topSells,
          unresolved: [...topBuys, ...topSells].filter(t => unresolvedTickers.has(t)),
        })
      }
    })

    return investorActivities.sort((a, b) => a.name.localeCompare(b.name))
  }

export interface ActivityData {
  quarters: string[]
  byQuarter: Record<string, InvestorActivity[]>
}

let cached: ActivityData | null = null

export function buildActivityData(): ActivityData {
  if (cached) return cached
  const quarters = getAvailableQuarters()
  const byQuarter: Record<string, InvestorActivity[]> = {}
  for (const quarter of quarters) {
    const activities = activityForQuarter(quarter)
    if (activities.length > 0) byQuarter[quarter] = activities
  }
  // Nur Quartale anbieten, in denen es auch Aktivität gibt
  cached = { quarters: quarters.filter(q => byQuarter[q]), byQuarter }
  return cached
}
