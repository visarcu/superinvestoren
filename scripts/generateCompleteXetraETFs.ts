import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  throw new Error('FMP_API_KEY not found in environment variables');
}

interface FMPETFListItem {
  symbol: string;
  name: string;
  price?: number;
  exchange?: string;
  exchangeShortName?: string;
  type?: string;
}

interface FMPETFInfo {
  symbol: string;
  name: string;
  expenseRatio?: number;
  isin?: string;
  etfCompany?: string;
  assetClass?: string;
  aum?: number;
  domicile?: string;
  holdingsCount?: number;
  sectorsList?: Array<{ industry: string; exposure: number }>;
}

interface ETF {
  symbol: string;
  name: string;
  price?: number;
  issuer: string;
  assetClass: 'Equity' | 'Fixed Income' | 'Commodity' | 'Mixed';
  category: string;
  isin?: string;
  ter?: number;
  aum?: number;
  domicile?: string;
}

// ============================================================
// Kategorie-Ableitung aus FMP sectorsList
// ============================================================

function categoryFromSectors(sectors: Array<{ industry: string; exposure: number }> | undefined): string | null {
  if (!sectors || sectors.length === 0) return null

  // Top-Sektor mit höchster Exposure
  const sorted = [...sectors].sort((a, b) => b.exposure - a.exposure)
  const top = sorted[0]
  if (!top) return null

  // Wenn ein Sektor > 50% hat, ist es ein Sektor-ETF
  if (top.exposure > 50) {
    const sectorMap: Record<string, string> = {
      'Technology': 'Technology',
      'Financial Services': 'Financials',
      'Healthcare': 'Healthcare',
      'Consumer Cyclical': 'Consumer Cyclical',
      'Consumer Defensive': 'Consumer Defensive',
      'Industrials': 'Industrials',
      'Energy': 'Energy',
      'Real Estate': 'Real Estate',
      'Utilities': 'Utilities',
      'Basic Materials': 'Materials',
      'Communication Services': 'Communication',
    }
    return sectorMap[top.industry] || top.industry
  }

  // Wenn kein Sektor dominiert, ist es breit diversifiziert
  // Prüfe geographische Hinweise im Namen (wird im Caller gemacht)
  return null
}

function categoryFromName(name: string): string {
  const n = name.toLowerCase()

  // Geographisch
  if (n.includes('world') || n.includes('global') || n.includes('all-world') || n.includes('acwi')) return 'Global'
  if (n.includes('europe') || n.includes('europa') || n.includes('stoxx') || n.includes('eurozn')) return 'Europe'
  if ((n.includes('usa') || n.includes('s&p') || n.includes('nasdaq') || n.includes('dow jones') || n.includes('us ')) && !n.includes('australia')) return 'US'
  if (n.includes('germany') || n.includes('dax') || n.includes('deutschland') || n.includes('mdax')) return 'Germany'
  if (n.includes('emerging') || n.includes('em ') || n.includes('msci em')) return 'Emerging Markets'
  if (n.includes('japan') || n.includes('nikkei') || n.includes('topix')) return 'Japan'
  if (n.includes('china') || n.includes('csi')) return 'China'
  if (n.includes('asia') || n.includes('asien') || n.includes('pacific')) return 'Asia Pacific'
  if (n.includes('india')) return 'India'
  if (n.includes('uk') || n.includes('ftse 100') || n.includes('united kingdom')) return 'UK'

  // Sektor (Fallback wenn FMP keine Sektordaten hat)
  if (n.includes('technology') || n.includes('tech') || n.includes('information tech')) return 'Technology'
  if (n.includes('healthcare') || n.includes('health') || n.includes('pharma')) return 'Healthcare'
  if (n.includes('financial') || n.includes('bank')) return 'Financials'
  if (n.includes('energy') || n.includes('oil') || n.includes('clean energy')) return 'Energy'
  if (n.includes('real estate') || n.includes('reit') || n.includes('immobilien')) return 'Real Estate'
  if (n.includes('industrial') || n.includes('industrie')) return 'Industrials'
  if (n.includes('utilities') || n.includes('versorger')) return 'Utilities'
  if (n.includes('materials') || n.includes('basic') || n.includes('mining')) return 'Materials'
  if (n.includes('communication') || n.includes('telecom')) return 'Communication'
  if (n.includes('consumer')) return 'Consumer'

  // Stil
  if (n.includes('dividend') || n.includes('yield') || n.includes('dividende') || n.includes('income')) return 'Dividend'
  if (n.includes('growth') || n.includes('wachstum')) return 'Growth'
  if (n.includes('value') || n.includes('wert')) return 'Value'
  if (n.includes('quality') || n.includes('qualität')) return 'Quality'
  if (n.includes('momentum')) return 'Momentum'
  if (n.includes('small cap') || n.includes('smallcap') || n.includes('small-cap')) return 'Small Cap'
  if (n.includes('mid cap') || n.includes('midcap')) return 'Mid Cap'
  if (n.includes('esg') || n.includes('sustainable') || n.includes('nachhaltig') || n.includes('sri') || n.includes('climate')) return 'ESG'

  // Bonds
  if (n.includes('bond') || n.includes('treasury') || n.includes('anleihe') || n.includes('fixed income') || n.includes('govt') || n.includes('aggregate')) return 'Bonds'
  if (n.includes('high yield')) return 'High Yield'
  if (n.includes('money market') || n.includes('overnight') || n.includes('short term')) return 'Money Market'

  // Commodities
  if (n.includes('gold') || n.includes('silver') || n.includes('commodity') || n.includes('rohstoff')) return 'Commodities'

  return 'Other'
}

function determineAssetClass(name: string, sectors?: Array<{ industry: string; exposure: number }>): ETF['assetClass'] {
  const n = name.toLowerCase()

  if (n.includes('bond') || n.includes('treasury') || n.includes('fixed income') || n.includes('anleihe') || n.includes('govt') || n.includes('aggregate') || n.includes('money market') || n.includes('overnight')) {
    return 'Fixed Income'
  }
  if (n.includes('gold') || n.includes('silver') || n.includes('commodity') || n.includes('oil') || n.includes('rohstoff')) {
    return 'Commodity'
  }
  if (n.includes('balanced') || n.includes('allocation') || n.includes('multi') || n.includes('target')) {
    return 'Mixed'
  }
  return 'Equity'
}

function extractIssuer(name: string, etfCompany?: string): string {
  if (etfCompany && etfCompany !== 'Unknown') return etfCompany

  const issuers = [
    'iShares', 'Vanguard', 'Xtrackers', 'SPDR', 'Invesco', 'Amundi', 'Lyxor', 'UBS',
    'Deka', 'ComStage', 'Franklin', 'HSBC', 'JPMorgan', 'BNP Paribas', 'Ossiam',
    'WisdomTree', 'VanEck', 'First Trust', 'Fidelity', 'Schwab', 'Legal & General', 'HANetf'
  ]
  for (const issuer of issuers) {
    if (name.toLowerCase().includes(issuer.toLowerCase())) return issuer
  }
  return name.split(' ')[0] || 'Unknown'
}

// ============================================================
// FMP v4 etf-info Fetcher mit Rate-Limiting
// ============================================================

async function fetchETFInfo(symbol: string): Promise<FMPETFInfo | null> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v4/etf-info?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch {
    return null
  }
}

async function fetchBatchETFInfo(symbols: string[], concurrency: number = 5, delayMs: number = 200): Promise<Map<string, FMPETFInfo>> {
  const results = new Map<string, FMPETFInfo>()
  const total = symbols.length

  for (let i = 0; i < total; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(s => fetchETFInfo(s))
    )

    batchResults.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        results.set(batch[idx], r.value)
      }
    })

    const progress = Math.min(i + concurrency, total)
    process.stdout.write(`\r  v4 etf-info: ${progress}/${total} (${results.size} enriched)`)

    if (i + concurrency < total) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  console.log() // Newline after progress
  return results
}

// ============================================================
// Main
// ============================================================

async function generateCompleteXetraETFsFile() {
  console.log('=== Generating xetraETFsComplete.ts with FMP v4 enrichment ===\n')

  // Step 1: Get all XETRA ETFs from FMP v3 list
  console.log('Step 1: Fetching XETRA ETF list from FMP v3...')
  const listRes = await fetch(
    `https://financialmodelingprep.com/api/v3/etf/list?apikey=${FMP_API_KEY}`
  )
  if (!listRes.ok) throw new Error(`ETF list failed: HTTP ${listRes.status}`)

  const allETFs: FMPETFListItem[] = await listRes.json()
  console.log(`  Total ETFs: ${allETFs.length}`)

  const xetraList = allETFs.filter(etf =>
    etf.exchangeShortName === 'XETRA' ||
    etf.exchange === 'XETRA' ||
    etf.symbol?.endsWith('.DE')
  )
  console.log(`  XETRA ETFs: ${xetraList.length}\n`)

  // Step 2: Enrich with FMP v4 etf-info
  console.log('Step 2: Enriching with FMP v4 etf-info (TER, ISIN, Sektoren)...')
  const symbols = xetraList.map(e => e.symbol)
  const v4Data = await fetchBatchETFInfo(symbols, 5, 250)
  console.log(`  Enriched: ${v4Data.size}/${xetraList.length} ETFs\n`)

  // Step 3: Transform
  console.log('Step 3: Building ETF data...')
  const transformedETFs: ETF[] = xetraList.map(etf => {
    const v4 = v4Data.get(etf.symbol)
    const name = v4?.name || etf.name || etf.symbol

    // Kategorie: Erst aus Sektordaten, dann aus Name
    const sectorCategory = categoryFromSectors(v4?.sectorsList)
    const nameCategory = categoryFromName(name)
    const category = sectorCategory || nameCategory

    return {
      symbol: etf.symbol,
      name: name.replace(/'/g, "\\'"),
      price: etf.price,
      issuer: extractIssuer(name, v4?.etfCompany),
      assetClass: determineAssetClass(name, v4?.sectorsList),
      category,
      isin: v4?.isin,
      ter: v4?.expenseRatio,
      aum: v4?.aum,
      domicile: v4?.domicile,
    }
  })

  transformedETFs.sort((a, b) => a.symbol.localeCompare(b.symbol))

  // Step 4: Stats
  const withTER = transformedETFs.filter(e => e.ter !== undefined).length
  const withISIN = transformedETFs.filter(e => e.isin !== undefined).length
  const categories: Record<string, number> = {}
  transformedETFs.forEach(e => { categories[e.category] = (categories[e.category] || 0) + 1 })

  console.log(`  Total: ${transformedETFs.length}`)
  console.log(`  With TER: ${withTER} (${(withTER / transformedETFs.length * 100).toFixed(1)}%)`)
  console.log(`  With ISIN: ${withISIN} (${(withISIN / transformedETFs.length * 100).toFixed(1)}%)`)
  console.log(`  Categories:`)
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`    ${cat}: ${count}`)
  })

  // Step 5: Write file
  console.log('\nStep 4: Writing xetraETFsComplete.ts...')

  let content = `// XETRA ETFs enriched with FMP v4 etf-info data
// Total: ${transformedETFs.length} ETFs trading on XETRA exchange
// Generated on ${new Date().toISOString().split('T')[0]}
// TER coverage: ${withTER}/${transformedETFs.length} (${(withTER / transformedETFs.length * 100).toFixed(1)}%)
// ISIN coverage: ${withISIN}/${transformedETFs.length} (${(withISIN / transformedETFs.length * 100).toFixed(1)}%)

export interface ETF {
  symbol: string;
  name: string;
  price?: number;
  issuer: string;
  assetClass: 'Equity' | 'Fixed Income' | 'Commodity' | 'Mixed';
  category: string;
  isin?: string;
  ter?: number;
  aum?: number;
  domicile?: string;
}

export const xetraETFs: ETF[] = [\n`

  transformedETFs.forEach((etf, index) => {
    const isLast = index === transformedETFs.length - 1
    content += '  {\n'
    content += `    symbol: '${etf.symbol}',\n`
    content += `    name: '${etf.name}',\n`
    if (etf.price !== undefined) content += `    price: ${etf.price},\n`
    content += `    issuer: '${etf.issuer}',\n`
    content += `    assetClass: '${etf.assetClass}',\n`
    content += `    category: '${etf.category}'`
    if (etf.isin) content += `,\n    isin: '${etf.isin}'`
    if (etf.ter !== undefined) content += `,\n    ter: ${etf.ter}`
    if (etf.aum !== undefined) content += `,\n    aum: ${etf.aum}`
    if (etf.domicile) content += `,\n    domicile: '${etf.domicile}'`
    content += `\n  }${isLast ? '' : ','}\n`
  })

  content += '];\n'

  const outputPath = path.resolve(process.cwd(), 'src/data/xetraETFsComplete.ts')
  fs.writeFileSync(outputPath, content, 'utf8')
  console.log(`\n✅ Written to ${outputPath}`)
}

async function main() {
  try {
    await generateCompleteXetraETFsFile()
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

main()
