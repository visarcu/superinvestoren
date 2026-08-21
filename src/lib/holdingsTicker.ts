// src/lib/holdingsTicker.ts
// CUSIP-/Namens-Matching für 13F-Positionen → Ticker.
// Extrahiert aus /api/stocks/[ticker]/super-investors, damit Smart-Money-Layer
// und Super-Investors-Tab garantiert dieselben Halter erkennen.

import { stocks } from '@/data/stocks'

// SEC filing abbreviations → full words
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

export function getNameKey(name: string): string {
  const words = name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
  return words
    .filter(w => !NOISE_WORDS.has(w))
    .map(w => SEC_ABBREVS[w] || w)
    .filter(w => !NOISE_WORDS.has(w))
    .join('|')
}

// Build lookup indexes once at module load
const cusipIndex = new Map<string, string>()
const nameIndex = new Map<string, string>() // normalized name → ticker
for (const s of stocks) {
  if (s.cusip) cusipIndex.set(s.cusip, s.ticker)
  const key = getNameKey(s.name)
  if (key) nameIndex.set(key, s.ticker)
}

export interface HoldingsPositionLike {
  ticker?: string
  cusip?: string
  name?: string
}

export function getPositionTicker(position: HoldingsPositionLike): string | null {
  // 1. Direct ticker field
  if (position.ticker) return position.ticker
  // 2. CUSIP lookup (fast, indexed)
  if (position.cusip) {
    const byC = cusipIndex.get(position.cusip)
    if (byC) return byC
  }
  // 3. Name-based fallback with SEC abbreviation expansion
  if (position.name) {
    const key = getNameKey(position.name)
    if (key) {
      const byN = nameIndex.get(key)
      if (byN) return byN
    }
  }
  return null
}
