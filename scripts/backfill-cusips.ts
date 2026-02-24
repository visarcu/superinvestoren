/**
 * Script: Backfill missing CUSIPs in stocks-us.ts from holdings data
 *
 * Strategy:
 * 1. From stocks-us.ts that already HAVE CUSIPs, build a confirmed ticker→CUSIP map
 * 2. From all holdings JSON, build a CUSIP→{names, ticker candidates} map
 * 3. For stocks with empty CUSIPs, find the CUSIP from holdings by:
 *    a. Reverse lookup: find a CUSIP in holdings whose name strongly matches the stock name
 *    b. Only accept matches where the SEC name clearly maps to the DB name
 * 4. Validate: no CUSIP gets assigned to two different tickers
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const holdingsDir = path.join(__dirname, '..', 'src', 'data', 'holdings')
const stocksFile = path.join(__dirname, '..', 'src', 'data', 'stocks-us.ts')

// ─── SEC abbreviation expansion ───
const ABBREVS: Record<string, string> = {
  'COS': 'COMPANIES',
  'CO': 'COMPANY',
  'HLDGS': 'HOLDINGS',
  'HLDG': 'HOLDING',
  'CORP': 'CORPORATION',
  'INC': 'INCORPORATED',
  'INTL': 'INTERNATIONAL',
  'SYS': 'SYSTEMS',
  'TECH': 'TECHNOLOGY',
  'TECHS': 'TECHNOLOGIES',
  'GRP': 'GROUP',
  'SVCS': 'SERVICES',
  'SVC': 'SERVICE',
  'FINL': 'FINANCIAL',
  'FINCL': 'FINANCIAL',
  'MGMT': 'MANAGEMENT',
  'MFG': 'MANUFACTURING',
  'PHARM': 'PHARMACEUTICALS',
  'LABS': 'LABORATORIES',
  'LAB': 'LABORATORY',
  'DEV': 'DEVELOPMENT',
  'COMMNS': 'COMMUNICATIONS',
  'COMMUN': 'COMMUNICATIONS',
  'COMMS': 'COMMUNICATIONS',
  'ENTMT': 'ENTERTAINMENT',
  'PRODS': 'PRODUCTS',
  'PROD': 'PRODUCTS',
  'INDS': 'INDUSTRIES',
  'IND': 'INDUSTRIES',
  'INVS': 'INVESTMENTS',
  'INV': 'INVESTMENTS',
  'PROP': 'PROPERTIES',
  'PROPS': 'PROPERTIES',
  'SOLNS': 'SOLUTIONS',
  'SOLN': 'SOLUTION',
  'ELECTR': 'ELECTRONICS',
  'ELEC': 'ELECTRIC',
  'NATL': 'NATIONAL',
  'NAT': 'NATIONAL',
  'THERAPEUT': 'THERAPEUTICS',
  'THERAP': 'THERAPEUTICS',
  'BIOSCIS': 'BIOSCIENCES',
  'BIOSCI': 'BIOSCIENCES',
  'SURG': 'SURGICAL',
  'INSTRUMTS': 'INSTRUMENTS',
  'INSTRS': 'INSTRUMENTS',
  'NETWRKS': 'NETWORKS',
  'NETWRK': 'NETWORK',
  'STL': 'STEEL',
  'CTR': 'CENTER',
  'CTRS': 'CENTERS',
  'MTG': 'MORTGAGE',
  'RLTY': 'REALTY',
  'CAP': 'CAPITAL',
  'ENGR': 'ENGINEERING',
  'ENGY': 'ENERGY',
  'FDS': 'FUNDS',
  'FD': 'FUND',
  'LTD': 'LIMITED',
  'AMER': 'AMERICAN',
  'BANCSHRS': 'BANCSHARES',
  'BNCSHS': 'BANCSHARES',
  'HLTH': 'HEALTH',
  'HEALTHCARE': 'HEALTHCARE',
  'ENVIR': 'ENVIRONMENTAL',
  'ENVIRON': 'ENVIRONMENTAL',
  'ASSN': 'ASSOCIATION',
  'RES': 'RESOURCES',
  'RSCS': 'RESOURCES',
  'PETLM': 'PETROLEUM',
  'PETRO': 'PETROLEUM',
  'TRANSN': 'TRANSMISSION',
  'TRANS': 'TRANSPORTATION',
  'INSUR': 'INSURANCE',
  'INSRNC': 'INSURANCE',
  'CHEM': 'CHEMICAL',
  'CHEMS': 'CHEMICALS',
  'DISTRS': 'DISTRIBUTORS',
  'DISTR': 'DISTRIBUTION',
  'EQUIP': 'EQUIPMENT',
  'WRLDWIDE': 'WORLDWIDE',
  'WLDWDE': 'WORLDWIDE',
  'ENTPR': 'ENTERPRISES',
  'ENTERS': 'ENTERPRISES',
  'ENTS': 'ENTERPRISES',
  'BANCORP': 'BANCORPORATION',
  'FINCLS': 'FINANCIALS',
}

// Reverse: full word → abbreviations
const REVERSE_ABBREVS: Record<string, string[]> = {}
for (const [abbr, full] of Object.entries(ABBREVS)) {
  if (!REVERSE_ABBREVS[full]) REVERSE_ABBREVS[full] = []
  REVERSE_ABBREVS[full].push(abbr)
}

// Noise words to strip
const NOISE = new Set([
  'INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY',
  'LTD', 'LIMITED', 'PLC', 'LP', 'LLC', 'NV', 'SA', 'AG', 'SE',
  'THE', 'OF', 'AND', '&', 'A', 'AN', 'CLASS', 'CL', 'SHS',
  'NEW', 'DEL', 'COM', 'ORD', 'SER', 'SERIES',
])

function cleanName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[.,\-\/\\()&'"!]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Get core words from a company name (strip noise, expand abbreviations)
function coreWords(name: string): string[] {
  const words = cleanName(name).split(' ')
  const result: string[] = []
  for (const w of words) {
    if (NOISE.has(w)) continue
    // Expand if abbreviation
    const expanded = ABBREVS[w] || w
    if (!NOISE.has(expanded)) {
      result.push(expanded)
    }
  }
  return result
}

// Strict name match: core words must match in order (first N significant words)
function strictNameMatch(secName: string, dbName: string): boolean {
  const secCore = coreWords(secName)
  const dbCore = coreWords(dbName)

  if (secCore.length === 0 || dbCore.length === 0) return false

  // Both must have the same first word
  if (secCore[0] !== dbCore[0]) return false

  // At least 2 core words must match, and at least 60% of the shorter
  const shorter = secCore.length <= dbCore.length ? secCore : dbCore
  const longer = secCore.length <= dbCore.length ? dbCore : secCore

  const longerSet = new Set(longer)
  const matchCount = shorter.filter(w => longerSet.has(w)).length

  // Require high match ratio
  const ratio = matchCount / shorter.length
  if (shorter.length === 1) {
    // Single core word: must be exact and the word must be long enough (not just "ROCKET" etc.)
    return secCore[0] === dbCore[0] && secCore.length === dbCore.length && secCore[0].length >= 5
  }

  return ratio >= 0.65 && matchCount >= 2
}

// ─── Step 1: Parse stocks-us.ts ───
interface StockEntry {
  ticker: string
  cusip: string
  name: string
  line: number
}

function parseStocksFile(): StockEntry[] {
  const content = fs.readFileSync(stocksFile, 'utf-8')
  const entries: StockEntry[] = []
  const regex = /ticker:\s*'([^']+)',\s*\n\s*cusip:\s*'([^']*)',\s*\n\s*name:\s*'([^']+)'/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length
    entries.push({ ticker: match[1], cusip: match[2], name: match[3], line: lineNum })
  }
  return entries
}

// ─── Step 2: Collect CUSIPs from holdings ───
interface CusipInfo {
  names: Set<string>
  tickers: Set<string>
  investorCount: number
}

function collectCusipMappings(): Map<string, CusipInfo> {
  const cusipMap = new Map<string, CusipInfo>()

  const investorDirs = fs.readdirSync(holdingsDir).filter(d => {
    const fullPath = path.join(holdingsDir, d)
    return fs.statSync(fullPath).isDirectory()
  })

  for (const investor of investorDirs) {
    const investorPath = path.join(holdingsDir, investor)
    const jsonFiles = fs.readdirSync(investorPath).filter(f => f.endsWith('.json'))
    const investorCusips = new Set<string>()

    for (const file of jsonFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(investorPath, file), 'utf-8'))
        if (!data.positions) continue

        for (const pos of data.positions) {
          if (!pos.cusip || pos.cusip.length < 6) continue
          const cusip = pos.cusip

          if (!cusipMap.has(cusip)) {
            cusipMap.set(cusip, { names: new Set(), tickers: new Set(), investorCount: 0 })
          }
          const entry = cusipMap.get(cusip)!
          if (pos.name) entry.names.add(pos.name)
          if (pos.ticker) entry.tickers.add(pos.ticker)
          investorCusips.add(cusip)
        }
      } catch {
        // Skip malformed files
      }
    }

    // Count investors per CUSIP
    for (const cusip of investorCusips) {
      cusipMap.get(cusip)!.investorCount++
    }
  }

  return cusipMap
}

// ─── Step 3: Match ───
function findMatches(
  stockEntries: StockEntry[],
  cusipMap: Map<string, CusipInfo>
): Map<string, string> {
  const tickerToCusip = new Map<string, string>()
  const cusipToTicker = new Map<string, string>() // For validation: 1 CUSIP → 1 ticker

  // First, record all existing CUSIP→ticker from stocks that already have CUSIPs
  for (const stock of stockEntries) {
    if (stock.cusip) {
      cusipToTicker.set(stock.cusip, stock.ticker)
    }
  }

  const needsCusip = stockEntries.filter(s => s.cusip === '')
  const needsMap = new Map(needsCusip.map(s => [s.ticker, s]))

  console.log(`\nStocks needing CUSIP: ${needsCusip.length}`)
  console.log(`CUSIPs from holdings: ${cusipMap.size}`)

  // For each CUSIP from holdings, try to find a matching stock without CUSIP
  for (const [cusip, info] of cusipMap) {
    // Skip if this CUSIP is already assigned to a stock
    if (cusipToTicker.has(cusip)) continue

    let matchedTicker: string | null = null

    // Strategy 1: Direct ticker match from holdings data
    for (const holdingTicker of info.tickers) {
      if (needsMap.has(holdingTicker)) {
        matchedTicker = holdingTicker
        break
      }
    }

    // Strategy 2: Strict name matching
    if (!matchedTicker) {
      const candidates: { ticker: string; score: number }[] = []
      for (const holdingName of info.names) {
        for (const stock of needsCusip) {
          if (tickerToCusip.has(stock.ticker)) continue
          if (strictNameMatch(holdingName, stock.name)) {
            // Compute a match confidence score
            const secCore = coreWords(holdingName)
            const dbCore = coreWords(stock.name)
            const shorter = Math.min(secCore.length, dbCore.length)
            const longerSet = new Set(secCore.length >= dbCore.length ? secCore : dbCore)
            const shorterArr = secCore.length <= dbCore.length ? secCore : dbCore
            const matchCount = shorterArr.filter(w => longerSet.has(w)).length
            const score = matchCount / shorter
            candidates.push({ ticker: stock.ticker, score })
          }
        }
      }
      // Deduplicate candidates by ticker (same stock matched via multiple holding names)
      const uniqueCandidates = new Map<string, number>()
      for (const c of candidates) {
        const existing = uniqueCandidates.get(c.ticker)
        if (!existing || c.score > existing) {
          uniqueCandidates.set(c.ticker, c.score)
        }
      }
      const dedupedCandidates = [...uniqueCandidates.entries()].map(([ticker, score]) => ({ ticker, score }))

      // Pick the best match
      if (dedupedCandidates.length === 1) {
        matchedTicker = dedupedCandidates[0].ticker
      } else if (dedupedCandidates.length > 1) {
        // Sort by score, take best if significantly better
        dedupedCandidates.sort((a, b) => b.score - a.score)
        if (dedupedCandidates[0].score > dedupedCandidates[1].score + 0.1) {
          matchedTicker = dedupedCandidates[0].ticker
        }
        // If tied, skip (ambiguous)
      }
    }

    if (matchedTicker) {
      tickerToCusip.set(matchedTicker, cusip)
      cusipToTicker.set(cusip, matchedTicker)
    }

  }

  return tickerToCusip
}

// ─── Step 4: Patch file ───
function patchStocksFile(tickerToCusip: Map<string, string>): number {
  let content = fs.readFileSync(stocksFile, 'utf-8')
  let patchCount = 0

  for (const [ticker, cusip] of tickerToCusip) {
    const escapedTicker = ticker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(
      `(ticker:\\s*'${escapedTicker}',\\s*\\n\\s*cusip:\\s*)'',`,
    )
    const newContent = content.replace(pattern, `$1'${cusip}',`)
    if (newContent !== content) {
      patchCount++
      content = newContent
    }
  }

  fs.writeFileSync(stocksFile, content, 'utf-8')
  return patchCount
}

// ─── Main ───
function main() {
  console.log('=== Backfilling missing CUSIPs in stocks-us.ts ===\n')

  console.log('Step 1: Collecting CUSIP mappings from holdings files...')
  const cusipMap = collectCusipMappings()
  console.log(`Found ${cusipMap.size} unique CUSIPs from holdings`)

  console.log('\nStep 2: Parsing stocks-us.ts...')
  const stockEntries = parseStocksFile()
  console.log(`Found ${stockEntries.length} stock entries`)
  const emptyCount = stockEntries.filter(s => s.cusip === '').length
  console.log(`Stocks with empty CUSIP: ${emptyCount}`)

  console.log('\nStep 3: Matching CUSIPs to stocks...')
  const matches = findMatches(stockEntries, cusipMap)
  console.log(`\nMatched ${matches.size} CUSIPs to stocks`)

  // Show key examples
  const examples = ['RKT', 'RKLB', 'LPL', 'MTZ', 'UBER', 'SPOT', 'COIN', 'HOOD', 'PLTR', 'ABNB', 'SNOW']
  console.log('\nKey examples:')
  for (const ex of examples) {
    if (matches.has(ex)) {
      const cusip = matches.get(ex)!
      const holdingNames = cusipMap.get(cusip)?.names
      console.log(`  ${ex} → ${cusip} (from: ${[...(holdingNames || [])].join(', ')})`)
    } else {
      console.log(`  ${ex} → NOT MATCHED`)
    }
  }

  console.log('\nStep 4: Patching stocks-us.ts...')
  const patchedCount = patchStocksFile(matches)
  console.log(`Patched ${patchedCount} entries`)

  // Verify
  const afterEntries = parseStocksFile()
  const remainingEmpty = afterEntries.filter(s => s.cusip === '').length
  console.log(`\nRemaining stocks with empty CUSIP: ${remainingEmpty} (was ${emptyCount})`)
  console.log(`Filled in: ${emptyCount - remainingEmpty} CUSIPs`)
}

main()
