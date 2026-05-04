/**
 * fetchDividendDates.ts
 *
 * Extrahiert Dividend-Termine (Record Date, Payment Date, Amount)
 * aus SEC 8-K Earnings Press Releases.
 * Nutzt die gleiche EDGAR-Infrastruktur wie fetchEdgarKPIs.ts.
 *
 * Usage:
 *   npx tsx scripts/fetchDividendDates.ts AAPL
 *   npx tsx scripts/fetchDividendDates.ts MSFT --limit 8
 *   npx tsx scripts/fetchDividendDates.ts              # Alle konfigurierten
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Companies that pay dividends ────────────────────────────────────────────

const DIVIDEND_COMPANIES: Record<string, { cik: string; name: string }> = {
  AAPL: { cik: '320193', name: 'Apple' },
  MSFT: { cik: '789019', name: 'Microsoft' },
  GOOGL: { cik: '1652044', name: 'Alphabet' },
  MA: { cik: '1141391', name: 'Mastercard' },
  V: { cik: '1403161', name: 'Visa' },
  JPM: { cik: '19617', name: 'JPMorgan Chase' },
  KO: { cik: '21344', name: 'Coca-Cola' },
  PEP: { cik: '77476', name: 'PepsiCo' },
  JNJ: { cik: '200406', name: 'Johnson & Johnson' },
  PG: { cik: '80424', name: 'Procter & Gamble' },
  HD: { cik: '354950', name: 'Home Depot' },
  COST: { cik: '909832', name: 'Costco' },
  ABBV: { cik: '1551152', name: 'AbbVie' },
  MRK: { cik: '310158', name: 'Merck' },
  AVGO: { cik: '1649338', name: 'Broadcom' },
  CSCO: { cik: '858877', name: 'Cisco' },
  SAP: { cik: '1000184', name: 'SAP SE' },
}

// ─── EDGAR Helpers (reused from fetchEdgarKPIs) ──────────────────────────────

async function getEarningsFilings(cik: string, limit: number) {
  const paddedCik = cik.padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
  const res = await fetch(url, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!res.ok) throw new Error(`EDGAR failed: ${res.status}`)

  const data = await res.json()
  const recent = data.filings?.recent
  if (!recent?.form) return []

  const results: { accessionNumber: string; filingDate: string; primaryDocument: string }[] = []
  for (let i = 0; i < recent.form.length && results.length < limit; i++) {
    if (recent.form[i] === '8-K') {
      results.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        primaryDocument: recent.primaryDocument[i],
      })
    }
  }
  return results
}

async function fetchFilingText(cik: string, accNo: string, primaryDoc: string) {
  const accClean = accNo.replace(/-/g, '')
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accClean}`

  // Find exhibit 99.1
  const indexUrl = `${baseUrl}/${accNo}-index.htm`
  const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!indexRes.ok) throw new Error(`Index fetch failed: ${indexRes.status}`)

  const indexHtml = await indexRes.text()
  const matches = [...indexHtml.matchAll(/href="[^"]*\/([^"\/]+\.htm)"/gi)]
  const filenames = matches.map(m => m[1])

  const exhibit = filenames.find(n => /ex.?99.?1/i.test(n) || /ex991/i.test(n)) ||
    filenames.find(n => /pr\.htm|pressrelease|earnings/i.test(n)) ||
    filenames.find(n => !/cfo|cover/i.test(n) && n !== primaryDoc)

  if (!exhibit) throw new Error('No exhibit found')

  const docUrl = `${baseUrl}/${exhibit}`
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!res.ok) throw new Error(`Exhibit fetch failed: ${res.status}`)

  const html = await res.text()
  return {
    text: html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/\s{2,}/g, ' ').trim().slice(0, 12000),
    url: docUrl,
  }
}

// ─── Dividend Date Extraction ────────────────────────────────────────────────

interface DividendDate {
  dividendPerShare: number
  recordDate: string      // ISO date
  paymentDate: string     // ISO date
  declarationDate: string // ISO date
  period: string          // "Q1 2026"
}

async function extractDividendDates(
  ticker: string, companyName: string, text: string, filingDate: string
): Promise<DividendDate | null> {
  const prompt = `Extract the dividend declaration from this SEC 8-K press release for ${companyName} (${ticker}).

Look for text like:
- "declared a cash dividend of $X.XX per share"
- "payable on [DATE]"
- "to shareholders of record as of [DATE]"

Return a JSON object with:
{
  "dividendPerShare": 0.25,
  "recordDate": "2026-02-10",
  "paymentDate": "2026-02-13",
  "declarationDate": "${filingDate}",
  "period": "Q1 2026"
}

Rules:
- All dates must be in ISO format (YYYY-MM-DD)
- If no dividend declaration is found, return null
- Only return actual declared dividends, not historical or estimated
- The period should be the fiscal quarter when the dividend is paid

Filing date: ${filingDate}

Press release text (excerpt):
${text}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    })

    const content = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(content)

    if (!parsed.dividendPerShare || !parsed.recordDate || !parsed.paymentDate) return null

    return parsed as DividendDate
  } catch {
    return null
  }
}

// ─── Database ────────────────────────────────────────────────────────────────

// We'll store in a new table or extend CompanyKPI with date-type metrics
async function storeDividendDate(ticker: string, div: DividendDate, filingUrl: string) {
  // Store as CompanyKPI entries with special metric names
  const entries = [
    { metric: 'dividend_record_date', label: 'Dividend Record Date', value: new Date(div.recordDate).getTime() / 1000, unit: 'date' },
    { metric: 'dividend_payment_date', label: 'Dividend Payment Date', value: new Date(div.paymentDate).getTime() / 1000, unit: 'date' },
    { metric: 'dividend_per_share_declared', label: 'Dividend Per Share (Declared)', value: div.dividendPerShare, unit: 'dollars' },
  ]

  for (const entry of entries) {
    await prisma.companyKPI.upsert({
      where: {
        ticker_metric_period: {
          ticker,
          metric: entry.metric,
          period: div.period,
        },
      },
      update: { value: entry.value, unit: entry.unit, label: entry.label, filingUrl },
      create: {
        ticker,
        metric: entry.metric,
        label: entry.label,
        value: entry.value,
        unit: entry.unit,
        period: div.period,
        periodDate: new Date(div.paymentDate),
        filingUrl,
      },
    })
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function processCompany(ticker: string, limit: number) {
  const company = DIVIDEND_COMPANIES[ticker]
  if (!company) { console.error(`Unknown: ${ticker}`); return }

  console.log(`\n📊 ${company.name} (${ticker})`)
  const filings = await getEarningsFilings(company.cik, limit * 3)
  console.log(`  Found ${filings.length} 8-K filings`)

  let processed = 0, saved = 0

  for (const filing of filings) {
    if (processed >= limit) break

    try {
      const { text, url } = await fetchFilingText(company.cik, filing.accessionNumber, filing.primaryDocument)

      // Quick check: does it mention dividend?
      if (!/dividend|payable|record date/i.test(text.slice(0, 5000))) {
        continue
      }

      processed++
      const div = await extractDividendDates(ticker, company.name, text, filing.filingDate)

      if (div) {
        await storeDividendDate(ticker, div, url)
        saved++
        console.log(`  ✅ ${div.period}: $${div.dividendPerShare} | Record: ${div.recordDate} | Payment: ${div.paymentDate}`)
      } else {
        console.log(`  → ${filing.filingDate}: No dividend found`)
      }

      await new Promise(r => setTimeout(r, 200)) // Rate limit
    } catch (err) {
      console.error(`  ❌ ${filing.filingDate}: ${err instanceof Error ? err.message.slice(0, 60) : err}`)
    }
  }

  console.log(`  Done: ${processed} processed, ${saved} dividend dates saved`)
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : 8

  const tickers = args.filter(a => !a.startsWith('--') && isNaN(Number(a)))
  const targets = tickers.length > 0 ? tickers.map(t => t.toUpperCase()) : Object.keys(DIVIDEND_COMPANIES)

  console.log(`🚀 Finclue Dividend Date Fetcher`)
  console.log(`   Companies: ${targets.join(', ')}`)
  console.log(`   Limit: ${limit} per company`)

  for (const ticker of targets) {
    await processCompany(ticker, limit)
  }

  await prisma.$disconnect()
  console.log('\n✅ Done!')
}

main().catch(async err => { console.error(err); await prisma.$disconnect(); process.exit(1) })
