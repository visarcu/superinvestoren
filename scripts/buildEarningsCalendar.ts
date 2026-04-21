/**
 * buildEarningsCalendar.ts
 *
 * Baut einen eigenen Earnings Calendar aus SEC 8-K Filing-Dates.
 * Logik: Wenn ein 8-K Filing Earnings-relevanten Content hat,
 * ist das Filing-Datum = Earnings-Datum.
 *
 * Speichert in einer eigenen Tabelle (nicht die FMP-Tabelle).
 *
 * Usage:
 *   npx tsx scripts/buildEarningsCalendar.ts AAPL
 *   npx tsx scripts/buildEarningsCalendar.ts              # Top 50 Unternehmen
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Top Companies ───────────────────────────────────────────────────────────

const TOP_COMPANIES: Record<string, { cik: string; name: string }> = {
  AAPL: { cik: '320193', name: 'Apple Inc.' },
  MSFT: { cik: '789019', name: 'Microsoft Corporation' },
  GOOGL: { cik: '1652044', name: 'Alphabet Inc.' },
  AMZN: { cik: '1018724', name: 'Amazon.com' },
  NVDA: { cik: '1045810', name: 'NVIDIA Corporation' },
  META: { cik: '1326801', name: 'Meta Platforms' },
  TSLA: { cik: '1318605', name: 'Tesla, Inc.' },
  NFLX: { cik: '1065280', name: 'Netflix Inc' },
  V: { cik: '1403161', name: 'Visa Inc.' },
  MA: { cik: '1141391', name: 'Mastercard Inc.' },
  JPM: { cik: '19617', name: 'JPMorgan Chase' },
  BAC: { cik: '70858', name: 'Bank of America' },
  GS: { cik: '886982', name: 'Goldman Sachs' },
  JNJ: { cik: '200406', name: 'Johnson & Johnson' },
  UNH: { cik: '731766', name: 'UnitedHealth Group' },
  PFE: { cik: '78003', name: 'Pfizer Inc.' },
  LLY: { cik: '59478', name: 'Eli Lilly' },
  KO: { cik: '21344', name: 'Coca-Cola' },
  PEP: { cik: '77476', name: 'PepsiCo' },
  WMT: { cik: '104169', name: 'Walmart Inc.' },
  COST: { cik: '909832', name: 'Costco' },
  DIS: { cik: '1744489', name: 'Walt Disney' },
  CSCO: { cik: '858877', name: 'Cisco Systems' },
  INTC: { cik: '50863', name: 'Intel Corporation' },
  AMD: { cik: '2488', name: 'Advanced Micro Devices' },
  CRM: { cik: '1108524', name: 'Salesforce' },
  ADBE: { cik: '796343', name: 'Adobe Inc.' },
  PYPL: { cik: '1633917', name: 'PayPal Holdings' },
  BA: { cik: '12927', name: 'Boeing Company' },
  CAT: { cik: '18230', name: 'Caterpillar Inc.' },
  NKE: { cik: '320187', name: 'Nike, Inc.' },
  SBUX: { cik: '829224', name: 'Starbucks Corp.' },
  MCD: { cik: '63908', name: 'McDonald\'s Corp.' },
  UBER: { cik: '1543151', name: 'Uber Technologies' },
  ABNB: { cik: '1559720', name: 'Airbnb, Inc.' },
  SHOP: { cik: '1594805', name: 'Shopify Inc.' },
  SPOT: { cik: '1639920', name: 'Spotify Technology' },
  COIN: { cik: '1679788', name: 'Coinbase Global' },
  SNAP: { cik: '1564408', name: 'Snap Inc.' },
  PINS: { cik: '1506293', name: 'Pinterest, Inc.' },
  // German / European (filing with SEC)
  SAP: { cik: '1000184', name: 'SAP SE' },
  ASML: { cik: '937966', name: 'ASML Holding NV' },
}

// ─── EDGAR: Get Earnings 8-K Filings ─────────────────────────────────────────

interface FilingRecord {
  date: string           // 2026-02-04
  accession: string      // 0001652044-26-000012
  items: string          // "2.02,9.01"
  acceptanceDt: string   // 2026-02-04T16:05:12.000Z
}

/**
 * Holt alle 8-K Filings mit Item 2.02 (Results of Operations) = echte
 * Earnings-Ankündigungen. Alte Heuristik (Monat + Dedup pro Quartal) war
 * fehleranfällig — sie hat Board-Change-8-Ks (Item 5.02) fälschlich als
 * Earnings markiert.
 */
async function getEarnings8KDates(cik: string, limit: number): Promise<FilingRecord[]> {
  const paddedCik = cik.padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
  const res = await fetch(url, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!res.ok) throw new Error(`EDGAR failed: ${res.status}`)

  const data = await res.json()
  const recent = data.filings?.recent
  if (!recent?.form) return []

  const results: FilingRecord[] = []
  const items = recent.items || []
  const acceptances = recent.acceptanceDateTime || []

  for (let i = 0; i < recent.form.length && results.length < limit; i++) {
    if (recent.form[i] !== '8-K') continue

    const itemStr = (items[i] || '') as string
    // Item 2.02 = "Results of Operations and Financial Condition" = Earnings
    if (!itemStr.split(',').map(s => s.trim()).includes('2.02')) continue

    results.push({
      date: recent.filingDate[i],
      accession: recent.accessionNumber[i],
      items: itemStr,
      acceptanceDt: acceptances[i] || '',
    })
  }

  return results
}

/**
 * Grobe Fiscal-Quarter-Heuristik aus Filing-Monat. Funktioniert für Firmen
 * mit Calendar-FY (GOOGL, AMZN, META, ...) — für Apple/Microsoft mit
 * abweichendem FY ist's unscharf, aber für die Display-Anzeige
 * "Q2 2026" ausreichend. Falls präzise nötig → per-Ticker Override später.
 */
function fiscalPeriod(filingDate: string): { quarter: string | null; year: number | null } {
  const [yStr, mStr] = filingDate.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  if (!y || !m) return { quarter: null, year: null }
  // Earnings-Call ist ~1 Monat nach Quartalsende. Mapping:
  if (m <= 2)  return { quarter: 'Q4', year: y - 1 }
  if (m <= 5)  return { quarter: 'Q1', year: y }
  if (m <= 8)  return { quarter: 'Q2', year: y }
  if (m <= 11) return { quarter: 'Q3', year: y }
  return { quarter: 'Q4', year: y }
}

/**
 * Leitet bmo/amc aus `acceptanceDateTime` ab. SEC akzeptiert Filings in ET,
 * nicht UTC. Das Format ist ISO-ähnlich ohne TZ-Indikator, aber tatsächlich ET.
 * Vor ~09:30 = bmo (before market open), nach ~16:00 = amc (after market close),
 * sonst intraday/unclear.
 */
function deriveCallTime(acceptanceDt: string): string | null {
  if (!acceptanceDt) return null
  const hh = Number(acceptanceDt.slice(11, 13))
  if (isNaN(hh)) return null
  if (hh < 9) return 'bmo'
  if (hh >= 16) return 'amc'
  return null
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function processCompany(ticker: string, limit: number) {
  const company = TOP_COMPANIES[ticker]
  if (!company) { console.error(`Unknown: ${ticker}`); return }

  console.log(`📊 ${company.name} (${ticker})`)

  try {
    const records = await getEarnings8KDates(company.cik, limit)

    let saved = 0
    for (const rec of records) {
      const fp = fiscalPeriod(rec.date)
      const callTime = deriveCallTime(rec.acceptanceDt)

      const { error } = await supabase
        .from('SecEarningsCalendar')
        .upsert({
          ticker,
          company_name: company.name,
          date: rec.date,
          fiscal_quarter: fp.quarter,
          fiscal_year: fp.year,
          items: rec.items,
          accession: rec.accession,
          call_time: callTime,
          is_upcoming: false,
          confirmed: true,
          source: 'sec-8k-item-2.02',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'ticker,date' })

      if (error) console.error(`  ⚠️  ${rec.date}: ${error.message}`)
      else saved++
    }

    console.log(`  ${records.length} Earnings (Item 2.02) gefunden, ${saved} gespeichert`)
  } catch (err) {
    console.error(`  ❌ ${err instanceof Error ? err.message.slice(0, 60) : err}`)
  }

  await new Promise(r => setTimeout(r, 200))
}

/**
 * Löscht Altlasten aus der Month-Heuristik-Ära (source = 'sec-8k-filing-date').
 * Optional: nur via --clean-legacy Flag.
 */
async function cleanLegacy() {
  console.log('🧹 Lösche Legacy-Einträge (source = sec-8k-filing-date)…')
  const { error, count } = await supabase
    .from('SecEarningsCalendar')
    .delete({ count: 'exact' })
    .eq('source', 'sec-8k-filing-date')
  if (error) console.error(`  ❌ ${error.message}`)
  else console.log(`  ${count ?? '?'} Einträge gelöscht.\n`)
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : 20
  const shouldClean = args.includes('--clean-legacy')

  const tickers = args.filter(a => !a.startsWith('--') && isNaN(Number(a)))
  const targets = tickers.length > 0 ? tickers.map(t => t.toUpperCase()) : Object.keys(TOP_COMPANIES)

  console.log(`🚀 Finclue Earnings Calendar Builder (SEC 8-K Item 2.02)`)
  console.log(`   Companies: ${targets.length}`)
  console.log(`   Limit: ${limit} per company\n`)

  if (shouldClean) await cleanLegacy()

  for (const ticker of targets) {
    await processCompany(ticker, limit)
  }

  console.log('\n✅ Done!')
}

main().catch(err => { console.error(err); process.exit(1) })
