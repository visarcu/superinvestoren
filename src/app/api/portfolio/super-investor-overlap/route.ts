// src/app/api/portfolio/super-investor-overlap/route.ts
// Batch API: Given an array of tickers, returns how many superinvestors hold each one
import { NextRequest, NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

// SEC filing abbreviations → full words (reuse from super-investors route)
const SEC_ABBREVS: Record<string, string> = {
  'COS': 'COMPANIES', 'CO': 'COMPANY', 'HLDGS': 'HOLDINGS', 'HLDG': 'HOLDING',
  'CORP': 'CORPORATION', 'INC': 'INCORPORATED', 'INTL': 'INTERNATIONAL',
  'SYS': 'SYSTEMS', 'TECH': 'TECHNOLOGY', 'TECHS': 'TECHNOLOGIES',
  'GRP': 'GROUP', 'SVCS': 'SERVICES', 'SVC': 'SERVICE',
  'FINL': 'FINANCIAL', 'FINCL': 'FINANCIAL', 'MGMT': 'MANAGEMENT',
  'MFG': 'MANUFACTURING', 'PHARM': 'PHARMACEUTICALS',
  'LABS': 'LABORATORIES', 'LAB': 'LABORATORY',
  'COMMNS': 'COMMUNICATIONS', 'COMMUN': 'COMMUNICATIONS', 'COMMS': 'COMMUNICATIONS',
  'ENTMT': 'ENTERTAINMENT', 'PRODS': 'PRODUCTS', 'PROD': 'PRODUCTS',
  'INDS': 'INDUSTRIES', 'IND': 'INDUSTRIES', 'INVS': 'INVESTMENTS', 'INV': 'INVESTMENTS',
  'PROP': 'PROPERTIES', 'PROPS': 'PROPERTIES', 'SOLNS': 'SOLUTIONS', 'SOLN': 'SOLUTION',
  'ELECTR': 'ELECTRONICS', 'ELEC': 'ELECTRIC', 'NATL': 'NATIONAL', 'NAT': 'NATIONAL',
  'THERAPEUT': 'THERAPEUTICS', 'THERAP': 'THERAPEUTICS',
  'BIOSCIS': 'BIOSCIENCES', 'BIOSCI': 'BIOSCIENCES',
  'NETWRKS': 'NETWORKS', 'NETWRK': 'NETWORK',
  'STL': 'STEEL', 'MTG': 'MORTGAGE', 'RLTY': 'REALTY', 'CAP': 'CAPITAL',
  'ENGR': 'ENGINEERING', 'ENGY': 'ENERGY', 'LTD': 'LIMITED',
  'AMER': 'AMERICAN', 'BANCSHRS': 'BANCSHARES', 'BNCSHS': 'BANCSHARES',
  'HLTH': 'HEALTH', 'DEV': 'DEVELOPMENT', 'RES': 'RESOURCES',
  'INSUR': 'INSURANCE', 'INSRNC': 'INSURANCE', 'EQUIP': 'EQUIPMENT',
}

const NOISE_WORDS = new Set([
  'INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY',
  'LTD', 'LIMITED', 'PLC', 'LP', 'LLC', 'NV', 'SA', 'AG', 'SE',
  'THE', 'OF', 'AND', '&', 'A', 'AN', 'CLASS', 'CL', 'SHS',
  'NEW', 'DEL', 'COM', 'ORD', 'SER', 'SERIES',
])

// Build lookup indexes once at module load
const cusipIndex = new Map<string, string>()
const nameIndex = new Map<string, string>()
for (const s of stocks) {
  if (s.cusip) cusipIndex.set(s.cusip, s.ticker)
  const key = getNameKey(s.name)
  if (key) nameIndex.set(key, s.ticker)
}

function getNameKey(name: string): string {
  const words = name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
  return words
    .filter(w => !NOISE_WORDS.has(w))
    .map(w => SEC_ABBREVS[w] || w)
    .filter(w => !NOISE_WORDS.has(w))
    .join('|')
}

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  if (position.cusip) {
    const byC = cusipIndex.get(position.cusip)
    if (byC) return byC
  }
  if (position.name) {
    const key = getNameKey(position.name)
    if (key) {
      const byN = nameIndex.get(key)
      if (byN) return byN
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { tickers } = await req.json()

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json({ error: 'tickers array required' }, { status: 400 })
    }

    // Normalize tickers to uppercase
    const tickerSet = new Set(tickers.map((t: string) => t.toUpperCase()))

    // Result: ticker → { count, investors[] }
    const result: Record<string, { count: number; investors: { name: string; slug: string }[] }> = {}
    for (const t of tickerSet) {
      result[t] = { count: 0, investors: [] }
    }

    // Single pass through all investors
    Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
      const investorInfo = investors.find(inv => inv.slug === slug)
      if (!investorInfo || !snapshots || snapshots.length === 0) return

      const latest = snapshots[snapshots.length - 1]?.data
      if (!latest?.positions) return

      // Track which tickers this investor holds (avoid double-counting)
      const investorHolds = new Set<string>()

      for (const position of latest.positions) {
        const posTicker = getTicker(position)
        if (!posTicker || !tickerSet.has(posTicker)) continue

        // Skip negligible positions
        if ((position.shares || 0) <= 0 || (position.value || 0) < 100000) continue

        investorHolds.add(posTicker)
      }

      // Add this investor to all matched tickers
      for (const ticker of investorHolds) {
        result[ticker].count++
        result[ticker].investors.push({
          name: investorInfo.name,
          slug: investorInfo.slug
        })
      }
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    })

  } catch (error) {
    console.error('Error calculating super investor overlap:', error)
    return NextResponse.json({ error: 'Failed to calculate overlap' }, { status: 500 })
  }
}
