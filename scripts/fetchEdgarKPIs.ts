/**
 * fetchEdgarKPIs.ts
 *
 * Fetches 8-K earnings press releases from SEC EDGAR for pilot companies,
 * extracts company-specific KPIs using OpenAI, and stores them in the DB.
 *
 * Usage:
 *   npx tsx scripts/fetchEdgarKPIs.ts              # All pilot companies
 *   npx tsx scripts/fetchEdgarKPIs.ts NFLX         # Single ticker
 *   npx tsx scripts/fetchEdgarKPIs.ts NFLX --limit 4   # Last 4 quarters
 */

import { PrismaClient } from '../prisma/node_modules/@prisma/client/index.js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Pilot companies ──────────────────────────────────────────────────────────
// CIK numbers from SEC EDGAR (https://www.sec.gov/cgi-bin/browse-edgar)
const PILOT_COMPANIES: Record<string, { cik: string; name: string; kpiHints: string[]; forms?: string[] }> = {
  // ── Original companies ────────────────────────────────────────────────────
  NFLX: {
    cik: '1065280',
    name: 'Netflix',
    kpiHints: [
      'paid memberships / paid subscribers (global total)',
      'average revenue per membership (ARM) or average monthly revenue per paying membership',
      'streaming revenue',
      'operating margin — store as percent (e.g. 31.7% → value: 31.7, unit: "percent")',
      'GUIDANCE/OUTLOOK: revenue guidance or forecast for NEXT quarter — store in millions, use metric name "guidance_revenue", label "Revenue Guidance"',
      'GUIDANCE/OUTLOOK: operating margin guidance for NEXT quarter — store as percent, use metric name "guidance_operating_margin", label "Op. Margin Guidance"',
    ],
  },
  SPOT: {
    cik: '1639920',
    name: 'Spotify',
    forms: ['6-K'], // Spotify is a foreign private issuer → files 6-K not 8-K
    kpiHints: [
      'monthly active users (MAUs)',
      'premium subscribers',
      'premium average revenue per user (ARPU)',
      'gross profit',
      'gross margin — store as percent (e.g. 31.1% → value: 31.1, unit: "percent")',
    ],
  },
  META: {
    cik: '1326801',
    name: 'Meta Platforms',
    kpiHints: [
      'family daily active people (DAP)',
      'family monthly active people (MAP)',
      'average revenue per user (ARPU)',
      'operating margin — store as percent (e.g. 41% → value: 41, unit: "percent")',
      'GUIDANCE/OUTLOOK: total revenue guidance/outlook/range for NEXT quarter — if a range is given, use the midpoint. Store in millions, metric name "guidance_revenue", label "Revenue Guidance"',
      'GEOGRAPHIC: ARPU for US & Canada — store in dollars, metric name "arpu_us_canada", label "ARPU US & Canada"',
      'GEOGRAPHIC: ARPU for Europe — store in dollars, metric name "arpu_europe", label "ARPU Europe"',
      'GEOGRAPHIC: ARPU for Asia-Pacific — store in dollars, metric name "arpu_asia_pacific", label "ARPU Asia-Pacific"',
    ],
  },
  UBER: {
    cik: '1543151',
    name: 'Uber',
    kpiHints: [
      'monthly active platform consumers (MAPCs)',
      'trips completed',
      'gross bookings (total dollar value)',
      'Mobility segment adjusted EBITDA — store in millions',
      'Delivery segment adjusted EBITDA — store in millions',
    ],
  },
  ABNB: {
    cik: '1559720',
    name: 'Airbnb',
    kpiHints: [
      'nights and experiences booked',
      'active listings — IMPORTANT: Airbnb reports this as a single number like "8 million" or "9 million". Store as millions (e.g. "8 million active listings" → value: 8, unit: "millions"). Do NOT multiply by 1000.',
      'gross booking value (GBV)',
    ],
  },
  SHOP: {
    cik: '1594805',
    name: 'Shopify',
    kpiHints: [
      'gross merchandise volume (GMV)',
      'merchant solutions revenue',
      'subscription solutions revenue',
      'monthly recurring revenue (MRR) — store as millions not dollars',
      'gross profit margin / gross margin — store as percent (e.g. 51.5% → value: 51.5, unit: "percent")',
    ],
  },
  SNAP: {
    cik: '1564408',
    name: 'Snap',
    kpiHints: [
      'daily active users (DAUs) — always use this metric name',
      'average revenue per user (ARPU)',
    ],
  },
  PINS: {
    cik: '1506293',
    name: 'Pinterest',
    kpiHints: [
      'monthly active users (MAUs)',
      'average revenue per user (ARPU)',
    ],
  },
  // ── Payment Networks ──────────────────────────────────────────────────────
  MA: {
    cik: '1141391',
    name: 'Mastercard',
    kpiHints: [
      'total Mastercard and Maestro-branded cards — store in billions (e.g. 3.6 billion → value: 3.6, unit: "billions")',
      'gross dollar volume (GDV) — store in billions (e.g. $2.5 trillion → value: 2500, unit: "billions"). If only growth % is stated, store the growth percentage (unit: "percent")',
      'switched transactions — store in billions (e.g. 45.5 billion → value: 45.5, unit: "billions")',
      'cross-border volume growth — store as percent (e.g. 15% → value: 15, unit: "percent")',
    ],
  },
  V: {
    cik: '1403161',
    name: 'Visa',
    kpiHints: [
      'total payment credentials — store in billions (e.g. 4.7 billion credentials → value: 4.7, unit: "billions")',
      'processed transactions — store in billions (e.g. 65.4 billion → value: 65.4, unit: "billions")',
      'total payments volume — store in billions of dollars (e.g. $3.9 trillion → value: 3900, unit: "billions"). If only growth % is stated, store the growth rate (unit: "percent")',
      'cross-border volume growth excluding intra-Europe — store as percent (e.g. 11% → value: 11, unit: "percent")',
    ],
  },
  // ── Magnificent 7 ─────────────────────────────────────────────────────────
  AMZN: {
    cik: '1018724',
    name: 'Amazon',
    kpiHints: [
      'AWS (Amazon Web Services) net sales / revenue',
      'advertising services revenue',
      'third-party seller services revenue',
      'online stores revenue',
      'AWS operating income — store in millions',
      'North America operating income — store in millions',
      'International operating income — store in millions (can be negative)',
      'GUIDANCE/OUTLOOK: net sales/revenue guidance for NEXT quarter — if a range, use midpoint. Store in millions, metric "guidance_revenue", label "Revenue Guidance"',
      'GUIDANCE/OUTLOOK: operating income guidance for NEXT quarter — if a range, use midpoint. Store in millions, metric "guidance_operating_income", label "Op. Income Guidance"',
    ],
  },
  MSFT: {
    cik: '789019',
    name: 'Microsoft',
    kpiHints: [
      'Intelligent Cloud revenue (includes Azure)',
      'Azure and other cloud services revenue growth percentage',
      'Productivity and Business Processes revenue',
      'More Personal Computing revenue',
      'Intelligent Cloud operating income — store in millions',
      'Productivity and Business Processes operating income — store in millions',
      'More Personal Computing operating income — store in millions',
      'GUIDANCE/OUTLOOK: Intelligent Cloud revenue guidance for NEXT quarter — store in millions, metric "guidance_intelligent_cloud", label "Intelligent Cloud Guidance"',
      'GUIDANCE/OUTLOOK: total revenue guidance for NEXT quarter — store in millions, metric "guidance_revenue", label "Revenue Guidance"',
    ],
  },
  GOOGL: {
    cik: '1652044',
    name: 'Alphabet (Google)',
    kpiHints: [
      'Google Search and other revenue',
      'YouTube advertising revenue',
      'Google Cloud revenue',
      'Google Services total revenue',
      'Google Services operating income — store in millions',
      'Google Cloud operating income — store in millions (can be negative in older quarters)',
      'GEOGRAPHIC: United States revenue — store in millions, metric "revenue_us", label "Revenue US"',
      'GEOGRAPHIC: EMEA revenue — store in millions, metric "revenue_emea", label "Revenue EMEA"',
      'GEOGRAPHIC: APAC / Asia-Pacific revenue — store in millions, metric "revenue_apac", label "Revenue APAC"',
    ],
  },
  NVDA: {
    cik: '1045810',
    name: 'NVIDIA',
    kpiHints: [
      'Data Center revenue',
      'Gaming revenue',
      'total revenue',
      'GAAP gross margin — store as percent (e.g. 73.0% → value: 73.0, unit: "percent")',
      'GUIDANCE/OUTLOOK: revenue guidance/outlook for NEXT quarter — store in millions, metric "guidance_revenue", label "Revenue Guidance"',
      'GUIDANCE/OUTLOOK: GAAP gross margin guidance for NEXT quarter — store as percent, metric "guidance_gross_margin", label "Gross Margin Guidance"',
    ],
  },
  TSLA: {
    cik: '1318605',
    name: 'Tesla',
    kpiHints: [
      'vehicle deliveries — IMPORTANT: Tesla reports in actual units (e.g. 418,227 vehicles). Always store as thousands: 418,227 → value: 418.227, unit: "thousands"',
      'vehicle production — same rule: store as thousands',
      'energy storage deployed in GWh — store actual GWh value, unit: "GWh"',
      'energy generation and storage revenue — store in millions',
      'automotive revenue — store in millions',
      'total GAAP gross margin — store as percent (e.g. 18.0% → value: 18.0, unit: "percent"). Only extract if explicitly stated as a percentage.',
    ],
  },
  SAP: {
    cik: '1000184',
    name: 'SAP SE',
    forms: ['20-F'],
    kpiHints: [
      'cloud revenue / cloud and software revenue — store in millions',
      'current cloud backlog — store in millions',
      'total revenue — store in millions',
      'operating profit (non-IFRS or IFRS) — store in millions',
      'free cash flow — store in millions',
      'GEOGRAPHIC: EMEA revenue — store in millions, metric "revenue_emea", label "Revenue EMEA"',
      'GEOGRAPHIC: Americas revenue — store in millions, metric "revenue_americas", label "Revenue Americas"',
      'GEOGRAPHIC: APJ / Asia-Pacific revenue — store in millions, metric "revenue_apj", label "Revenue APJ"',
    ],
  },
  AAPL: {
    cik: '320193',
    name: 'Apple',
    kpiHints: [
      'iPhone revenue / net sales',
      'Services revenue / net sales',
      'Mac revenue / net sales',
      'iPad revenue / net sales',
      'Wearables, Home and Accessories revenue',
      'GEOGRAPHIC: Americas revenue — store in millions, metric "revenue_americas", label "Revenue Americas"',
      'GEOGRAPHIC: Europe revenue — store in millions, metric "revenue_europe", label "Revenue Europe"',
      'GEOGRAPHIC: Greater China revenue — store in millions, metric "revenue_china", label "Revenue China"',
    ],
  },
}

// ─── EDGAR helpers ─────────────────────────────────────────────────────────────

interface EdgarFiling {
  accessionNumber: string
  filingDate: string
  form: string
  primaryDocument: string
  primaryDocDescription: string
}

async function getEarningsFilings(cik: string, limit = 12, targetForms = ['8-K']): Promise<EdgarFiling[]> {
  const paddedCik = cik.padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Finclue research@finclue.de' },
  })
  if (!res.ok) throw new Error(`EDGAR submissions fetch failed: ${res.status}`)

  const data = await res.json()

  // Collect all filings: recent + any additional pages
  const allFilings = { ...data.filings?.recent }

  // If there are additional filing pages (companies with many filings), fetch the first one
  // This fixes PINS and others that show only old filings in `recent`
  const extraFiles: { name: string }[] = data.filings?.files || []
  if (extraFiles.length > 0 && allFilings.form?.length < 50) {
    try {
      const extraUrl = `https://data.sec.gov/submissions/${extraFiles[0].name}`
      const extraRes = await fetch(extraUrl, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
      if (extraRes.ok) {
        const extraData = await extraRes.json()
        // Prepend newer filings
        for (const key of Object.keys(allFilings)) {
          if (Array.isArray(extraData[key])) {
            allFilings[key] = [...extraData[key], ...allFilings[key]]
          }
        }
      }
    } catch { /* ignore extra page errors */ }
  }

  if (!allFilings.form) return []

  const results: EdgarFiling[] = []
  const forms: string[] = allFilings.form
  const dates: string[] = allFilings.filingDate
  const accessions: string[] = allFilings.accessionNumber
  const primaryDocs: string[] = allFilings.primaryDocument
  const primaryDescriptions: string[] = allFilings.primaryDocDescription

  for (let i = 0; i < forms.length && results.length < limit; i++) {
    if (targetForms.includes(forms[i])) {
      results.push({
        accessionNumber: accessions[i],
        filingDate: dates[i],
        form: forms[i],
        primaryDocument: primaryDocs[i],
        primaryDocDescription: primaryDescriptions[i] || '',
      })
    }
  }

  return results
}

async function findExhibitDoc(cik: string, accessionNumber: string, primaryDoc: string): Promise<string | null> {
  // Parse the HTML filing index to find Exhibit 99.1 (actual earnings press release)
  const accNoClean = accessionNumber.replace(/-/g, '')
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accNoClean}/${accessionNumber}-index.htm`

  const res = await fetch(indexUrl, {
    headers: { 'User-Agent': 'Finclue research@finclue.de' },
  })
  if (!res.ok) return null

  const html = await res.text()

  // Extract all .htm file links from the index page
  const matches = [...html.matchAll(/href="[^"]*\/([^"\/]+\.htm)"/gi)]
  const filenames = matches.map((m) => m[1])

  // Find the press release by common naming patterns
  // Priority: ex99.1 style → "pr" (press release) style → any non-cover htm
  const exhibit = filenames.find((name) =>
    /ex.?99.?1/i.test(name) || /ex991/i.test(name) || /exhibit.?99/i.test(name)
  ) || filenames.find((name) =>
    /pr\.htm/i.test(name) || /pressrelease/i.test(name) || /earnings/i.test(name)
  ) || filenames.find((name) =>
    // Exclude the primary 8-K cover document and CFO commentary
    !/cfo/i.test(name) && !/cover/i.test(name) && name !== primaryDoc
  )

  return exhibit || null
}

async function fetchFilingText(cik: string, accessionNumber: string, primaryDoc: string): Promise<{ text: string; url: string }> {
  const accNoClean = accessionNumber.replace(/-/g, '')
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accNoClean}`

  // Always look for the actual press release exhibit
  // (primaryDoc is sometimes "index.htm" which is useless)
  const exhibitDoc = await findExhibitDoc(cik, accessionNumber, primaryDoc)
  const docToFetch = exhibitDoc || (primaryDoc === 'index.htm' ? null : primaryDoc)
  if (!docToFetch) throw new Error(`No usable document found for ${accessionNumber}`)

  const url = `${baseUrl}/${docToFetch}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Finclue research@finclue.de' },
  })
  if (!res.ok) throw new Error(`EDGAR filing fetch failed: ${res.status} for ${url}`)

  const html = await res.text()
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 24000) // more chars for exhibit docs

  return { text, url }
}

// ─── KPI Extraction via OpenAI ────────────────────────────────────────────────

interface ExtractedKPI {
  metric: string       // snake_case key
  label: string        // Human-readable label
  value: number
  unit: string         // "millions", "billions", "thousands", "percent", "units"
  period: string       // "Q4 2024"
  periodDate: string   // ISO date string, e.g. "2024-12-31"
}

async function extractKPIs(
  ticker: string,
  companyName: string,
  filingText: string,
  filingDate: string,
  kpiHints: string[]
): Promise<ExtractedKPI[]> {
  const prompt = `You are a financial data analyst. Extract company-specific operating KPIs from this SEC 8-K earnings press release for ${companyName} (${ticker}).

Focus specifically on these KPIs if present:
${kpiHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Rules:
- For regular KPIs: Return actual reported values for the CURRENT quarter being reported
- For GUIDANCE/OUTLOOK items: Return the company's forward-looking guidance for the NEXT quarter. The period should be the NEXT quarter (e.g. if reporting Q4 2025, guidance period = "Q1 2026"). If a range is given (e.g. "$36-38B"), use the midpoint.
- For GEOGRAPHIC items: Return geographic revenue breakdowns for the CURRENT quarter
- For total revenue/GMV/bookings: always use "millions". Convert billions to millions (e.g. "$10.1B" → value: 10100, unit: "millions")
- For subscriber/user counts: always use "millions" (e.g. "325M subscribers" → value: 325, unit: "millions")
- For per-user metrics (ARPU, ARM, average revenue per membership/subscriber): use "dollars" and store the actual dollar value (e.g. "$17.26 per membership" → value: 17.26, unit: "dollars")
- For percentages, store as a decimal multiplied by 100 (e.g. 15.3% → value: 15.3, unit: "percent")
- The period should be the fiscal quarter being reported (e.g. "Q4 2024"), NOT the filing date. EXCEPTION: For GUIDANCE items, use the NEXT quarter as the period.
- periodDate should be the last day of that fiscal quarter in ISO format (e.g. "2024-12-31")
- metric should be a stable snake_case key (e.g. "paid_subscribers", "maus", "gross_bookings")
- label should be a clean display name (e.g. "Paid Subscribers", "Monthly Active Users")
- Only include KPIs you are highly confident about from the text

Filing date: ${filingDate}

Return a JSON array. Example format:
[
  {
    "metric": "paid_subscribers",
    "label": "Paid Subscribers",
    "value": 301.6,
    "unit": "millions",
    "period": "Q4 2024",
    "periodDate": "2024-12-31"
  }
]

If no relevant KPIs are found, return an empty array [].

Press release text:
${filingText}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0,
  })

  const content = response.choices[0].message.content || '{}'

  try {
    const parsed = JSON.parse(content)
    // Handle all common wrapper shapes
    const arr = Array.isArray(parsed)
      ? parsed
      : parsed.kpis ?? parsed.data ?? parsed.results ?? parsed.metrics ?? Object.values(parsed).find(Array.isArray) ?? []
    return arr.filter(
      (k: ExtractedKPI) =>
        k.metric && k.label && typeof k.value === 'number' && k.unit && k.period && k.periodDate
    )
  } catch {
    console.error('Failed to parse KPI extraction response:', content)
    return []
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function processCompany(ticker: string, limit: number) {
  const company = PILOT_COMPANIES[ticker]
  if (!company) {
    console.error(`Unknown ticker: ${ticker}. Available: ${Object.keys(PILOT_COMPANIES).join(', ')}`)
    return
  }

  console.log(`\n📊 Processing ${company.name} (${ticker}) — CIK ${company.cik}`)

  const targetForms = company.forms || ['8-K']
  const filings = await getEarningsFilings(company.cik, limit * 3, targetForms)
  console.log(`  Found ${filings.length} 8-K filings`)

  let processed = 0
  let saved = 0

  for (const filing of filings) {
    if (processed >= limit) break

    console.log(`  → ${filing.filingDate} | ${filing.accessionNumber}`)

    try {
      const { text, url: filingUrl } = await fetchFilingText(company.cik, filing.accessionNumber, filing.primaryDocument)

      // Skip filings that are unlikely to be earnings press releases
      const looksLikeEarnings =
        /revenue|quarter|earnings|results of operations|financial results/i.test(text.slice(0, 3000))
      if (!looksLikeEarnings) {
        console.log('     ↳ Skipped (not an earnings release)')
        continue
      }

      const kpis = await extractKPIs(
        ticker,
        company.name,
        text,
        filing.filingDate,
        company.kpiHints
      )

      if (kpis.length === 0) {
        console.log('     ↳ No KPIs extracted')
        processed++
        continue
      }

      for (const kpi of kpis) {
        await prisma.companyKPI.upsert({
          where: {
            ticker_metric_period: {
              ticker,
              metric: kpi.metric,
              period: kpi.period,
            },
          },
          update: {
            value: kpi.value,
            unit: kpi.unit,
            label: kpi.label,
            periodDate: new Date(kpi.periodDate),
            filingUrl,
          },
          create: {
            ticker,
            metric: kpi.metric,
            label: kpi.label,
            value: kpi.value,
            unit: kpi.unit,
            period: kpi.period,
            periodDate: new Date(kpi.periodDate),
            filingUrl,
          },
        })
        saved++
        console.log(`     ↳ ✅ ${kpi.label}: ${kpi.value} ${kpi.unit} (${kpi.period})`)
      }

      processed++

      // Rate limit: EDGAR allows max 10 requests/sec
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      console.error(`     ↳ ❌ Error:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`  Done: ${processed} filings processed, ${saved} KPIs saved`)
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : 12

  // Filter out flag args to get tickers
  const tickers = args.filter((a) => !a.startsWith('--') && isNaN(Number(a)))
  const targets = tickers.length > 0 ? tickers.map((t) => t.toUpperCase()) : Object.keys(PILOT_COMPANIES)

  console.log(`🚀 Finclue EDGAR KPI Fetcher`)
  console.log(`   Companies: ${targets.join(', ')}`)
  console.log(`   Limit: ${limit} earnings releases per company\n`)

  for (const ticker of targets) {
    await processCompany(ticker, limit)
  }

  await prisma.$disconnect()
  console.log('\n✅ All done!')
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
