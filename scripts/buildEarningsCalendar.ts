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

async function getEarnings8KDates(cik: string, limit: number): Promise<{ date: string; accession: string }[]> {
  const paddedCik = cik.padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
  const res = await fetch(url, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!res.ok) throw new Error(`EDGAR failed: ${res.status}`)

  const data = await res.json()
  const recent = data.filings?.recent
  if (!recent?.form) return []

  const results: { date: string; accession: string }[] = []
  const seenQuarters = new Set<string>()

  for (let i = 0; i < recent.form.length && results.length < limit; i++) {
    if (recent.form[i] !== '8-K') continue

    const filingDate = recent.filingDate[i]
    // Deduplizierung: max 1 Earnings pro Quartal
    const quarter = `${filingDate.slice(0, 4)}-Q${Math.ceil(parseInt(filingDate.slice(5, 7)) / 3)}`
    if (seenQuarters.has(quarter)) continue

    // Prüfe ob es ein Earnings-8K ist (Item 2.02 = Results of Operations)
    // Wir können das nicht direkt aus der Submissions-API lesen,
    // aber die meisten Earnings-8Ks kommen in Earnings-Season (Jan, Apr, Jul, Oct)
    const month = parseInt(filingDate.slice(5, 7))
    const isEarningsSeason = [1, 2, 4, 5, 7, 8, 10, 11].includes(month)

    if (isEarningsSeason) {
      seenQuarters.add(quarter)
      results.push({ date: filingDate, accession: recent.accessionNumber[i] })
    }
  }

  return results
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function processCompany(ticker: string, limit: number) {
  const company = TOP_COMPANIES[ticker]
  if (!company) { console.error(`Unknown: ${ticker}`); return }

  console.log(`📊 ${company.name} (${ticker})`)

  try {
    const dates = await getEarnings8KDates(company.cik, limit)

    let saved = 0
    for (const { date } of dates) {
      const { error } = await supabase
        .from('SecEarningsCalendar')
        .upsert({
          ticker,
          company_name: company.name,
          date,
          source: 'sec-8k-filing-date',
        }, { onConflict: 'ticker,date' })

      if (!error) saved++
    }

    console.log(`  ${dates.length} Earnings-Dates gefunden, ${saved} gespeichert`)
  } catch (err) {
    console.error(`  ❌ ${err instanceof Error ? err.message.slice(0, 60) : err}`)
  }

  await new Promise(r => setTimeout(r, 200))
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : 20

  const tickers = args.filter(a => !a.startsWith('--') && isNaN(Number(a)))
  const targets = tickers.length > 0 ? tickers.map(t => t.toUpperCase()) : Object.keys(TOP_COMPANIES)

  console.log(`🚀 Finclue Earnings Calendar Builder (SEC 8-K)`)
  console.log(`   Companies: ${targets.length}`)
  console.log(`   Limit: ${limit} per company\n`)

  // Create table if not exists
  // (Wird einmalig via Migration gemacht)

  for (const ticker of targets) {
    await processCompany(ticker, limit)
  }

  console.log('\n✅ Done!')
}

main().catch(err => { console.error(err); process.exit(1) })
