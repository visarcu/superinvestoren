/**
 * edgarKpiService.ts
 *
 * Shared core logic for fetching SEC EDGAR 8-K earnings press releases,
 * extracting company-specific KPIs via OpenAI, and storing them in the DB.
 *
 * Used by:
 *  - scripts/fetchEdgarKPIs.ts (manual runs)
 *  - src/app/api/cron/update-company-kpis/route.ts (automated daily)
 */

import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

// ─── Pilot companies ──────────────────────────────────────────────────────────
// CIK numbers from SEC EDGAR (https://www.sec.gov/cgi-bin/browse-edgar)

export interface CompanyConfig {
  cik: string
  name: string
  kpiHints: string[]
  forms?: string[]
}

export const PILOT_COMPANIES: Record<string, CompanyConfig> = {
  NFLX: {
    cik: '1065280',
    name: 'Netflix',
    kpiHints: [
      'paid memberships / paid subscribers (global total) — NOTE: Netflix only reports this in annual Q4 earnings letters. If not found, skip.',
      'average revenue per membership (ARM) or average monthly revenue per paying membership — NOTE: Netflix only reports this in annual Q4 earnings letters. If not found, skip.',
      'total revenue (labeled "Revenues" in the income statement) — store in millions. Look in the Consolidated Statements of Operations table. Convert from thousands if needed (e.g. $12,249,757 thousand → value: 12250, unit: "millions"). Use metric name "streaming_revenue", label "Streaming Revenue" for backwards compatibility.',
      'operating margin for the CURRENT quarter — look for explicit text like "operating margin of 32.3%" or in the summary table row "Operating Margin". This is DIFFERENT from the guidance value. Store as percent (e.g. 32.3% → value: 32.3, unit: "percent")',
      'GUIDANCE/OUTLOOK: QUARTERLY revenue guidance or forecast for the NEXT single quarter (NOT full-year guidance) — store in millions, use metric name "guidance_revenue", label "Revenue Guidance". If only full-year guidance is given, skip this.',
      'GUIDANCE/OUTLOOK: QUARTERLY operating margin guidance for the NEXT single quarter (NOT full-year targets) — store as percent, use metric name "guidance_operating_margin", label "Op. Margin Guidance". If only full-year guidance is given, skip this.',
    ],
  },
  SPOT: {
    cik: '1639920',
    name: 'Spotify',
    forms: ['6-K'],
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
  // ── Fintech / Payments ────────────────────────────────────────────────────
  PYPL: {
    cik: '1633917',
    name: 'PayPal Holdings',
    kpiHints: [
      'active accounts / active customer accounts — store in millions (e.g. 434 million → value: 434, unit: "millions")',
      'total payment volume (TPV) — store in BILLIONS (e.g. $437B → value: 437, unit: "billions")',
      'number of payment transactions — store in billions (e.g. 6.6 billion → value: 6.6, unit: "billions")',
      'payment transactions per active account — store as a count (e.g. 61.4 → value: 61.4, unit: "count")',
      'transaction margin / transaction margin dollars — store in millions',
      'GUIDANCE/OUTLOOK: revenue guidance for NEXT quarter — store in millions, metric "guidance_revenue", label "Revenue Guidance"',
    ],
  },
  XYZ: {
    cik: '1512673',
    name: 'Block',
    kpiHints: [
      'Cash App monthly transacting actives / monthly active users — store in millions, metric name "cash_app_maus", label "Cash App MAUs"',
      'Cash App gross profit — store in millions, metric name "cash_app_gross_profit", label "Cash App Gross Profit"',
      'Square gross payment volume (GPV) — store in BILLIONS (e.g. $61B → value: 61, unit: "billions"), metric name "square_gpv", label "Square GPV"',
      'Square gross profit — store in millions, metric name "square_gross_profit", label "Square Gross Profit"',
      'Bitcoin revenue — store in millions, metric name "bitcoin_revenue", label "Bitcoin Revenue"',
      'total gross profit — store in millions, metric name "total_gross_profit", label "Total Gross Profit"',
    ],
  },
  SOFI: {
    cik: '1818874',
    name: 'SoFi Technologies',
    kpiHints: [
      'total members — store in millions (e.g. 10.1 million → value: 10.1, unit: "millions")',
      'total products — store in millions (e.g. 14.7 million → value: 14.7, unit: "millions")',
      'Tech Platform total accounts / Galileo accounts — store in millions',
      'Financial Services products — store in millions',
      'Lending products — store in millions',
      'deposits / total deposits — store in billions',
    ],
  },
  // ── Unique Operating KPIs ─────────────────────────────────────────────────
  RBLX: {
    cik: '1315098',
    name: 'Roblox',
    kpiHints: [
      'daily active users (DAUs) — store in millions (e.g. 80.2 million → value: 80.2, unit: "millions")',
      'hours engaged — store in billions (e.g. 20.7 billion hours → value: 20.7, unit: "billions")',
      'bookings — this is virtual currency purchased, store in millions (e.g. $1,127 million → value: 1127, unit: "millions")',
      'average bookings per DAU (ABPDAU) — store in dollars, metric "abpdau", label "ABPDAU"',
      'average monthly unique payers — store in millions',
    ],
  },
  DASH: {
    cik: '1792789',
    name: 'DoorDash',
    kpiHints: [
      'total orders — store in millions (e.g. 761 million → value: 761, unit: "millions")',
      'marketplace gross order value (GOV) — store in BILLIONS (e.g. $23.2B → value: 23.2, unit: "billions"), metric name "marketplace_gov", label "Marketplace GOV"',
      'monthly active users (MAUs) — store in millions',
      'contribution profit — store in millions',
      'contribution profit margin — store as percent',
    ],
  },
  LYFT: {
    cik: '1759509',
    name: 'Lyft',
    kpiHints: [
      'active riders — store in millions (e.g. 24.7 million → value: 24.7, unit: "millions")',
      'rides — store in millions (e.g. 217 million rides → value: 217, unit: "millions")',
      'revenue per active rider — store in dollars',
      'gross bookings — store in BILLIONS (e.g. $4.2B → value: 4.2, unit: "billions")',
      'adjusted EBITDA margin — store as percent',
    ],
  },
  // ── SaaS / Cloud / Enterprise Software ────────────────────────────────────
  CRWD: {
    cik: '1535527',
    name: 'CrowdStrike',
    kpiHints: [
      'ending Annual Recurring Revenue (ARR) — store in millions, metric name "arr", label "Annual Recurring Revenue"',
      'net new ARR — store in millions, metric name "net_new_arr", label "Net New ARR"',
      'dollar-based net retention rate / DBNRR — store as percent, metric "dbnrr", label "Dollar-Based Net Retention"',
      'subscription customers — CrowdStrike reports a rough count; store in thousands (e.g. 29,000 customers → value: 29, unit: "thousands") if stated',
      'GUIDANCE/OUTLOOK: total revenue guidance for NEXT quarter — store in millions, metric "guidance_revenue", label "Revenue Guidance"',
      'NOTE: CrowdStrike fiscal year ends January 31. Q1 FY2026 = Feb-Apr 2025 (periodDate 2025-04-30), Q4 FY2026 = Nov 2025 - Jan 2026 (periodDate 2026-01-31).',
    ],
  },
  DDOG: {
    cik: '1561550',
    name: 'Datadog',
    kpiHints: [
      'total customers — store in thousands (e.g. 30,500 customers → value: 30.5, unit: "thousands")',
      'customers with ARR $100,000 or more — store in thousands (e.g. 3,610 → value: 3.61, unit: "thousands"), metric name "customers_100k_arr", label "Customers $100k+ ARR"',
      'customers with ARR $1 million or more — store as count (e.g. 462 → value: 462, unit: "count"), metric name "customers_1m_arr", label "Customers $1M+ ARR"',
      'dollar-based net retention rate / DBNRR — store as percent, metric "dbnrr", label "Dollar-Based Net Retention"',
    ],
  },
  SNOW: {
    cik: '1640147',
    name: 'Snowflake',
    kpiHints: [
      'product revenue — store in millions',
      'remaining performance obligations (RPO) — store in BILLIONS (e.g. $6.7B → value: 6.7, unit: "billions"), metric name "rpo", label "RPO"',
      'net revenue retention rate — store as percent, metric name "nrr", label "Net Revenue Retention"',
      'total customers — store in thousands',
      'customers with trailing 12-month product revenue greater than $1 million — store as count, metric name "customers_1m_product_revenue", label "Customers $1M+"',
      'Global 2000 / Forbes Global 2000 customers — store as count, metric name "g2k_customers", label "Global 2000 Customers"',
      'NOTE: Snowflake fiscal year ends January 31. Q1 FY2026 = Feb-Apr 2025, etc.',
    ],
  },
  NOW: {
    cik: '1373715',
    name: 'ServiceNow',
    kpiHints: [
      'subscription revenue — store in millions',
      'current remaining performance obligations (cRPO) — store in BILLIONS (e.g. $9.4B → value: 9.4, unit: "billions"), metric name "crpo", label "cRPO"',
      'total remaining performance obligations (RPO) — store in billions, metric name "rpo", label "Total RPO"',
      'customers with more than $1 million in annual contract value (ACV) — store as count, metric name "customers_1m_acv", label "Customers $1M+ ACV"',
      'customers with more than $5 million in ACV — store as count, metric name "customers_5m_acv", label "Customers $5M+ ACV"',
      'renewal rate — store as percent',
    ],
  },
  // ── Streaming / Media ─────────────────────────────────────────────────────
  DIS: {
    cik: '1744489',
    name: 'Walt Disney',
    kpiHints: [
      'Disney+ Core subscribers (excluding Hotstar / Disney+ Hotstar) — store in millions, metric name "disney_plus_core_subs", label "Disney+ Core Subs"',
      'Disney+ Core ARPU (monthly) — store in dollars, metric name "disney_plus_core_arpu", label "Disney+ Core ARPU"',
      'Hulu SVOD-Only subscribers — store in millions, metric name "hulu_svod_subs", label "Hulu SVOD Subs"',
      'Hulu Live TV + SVOD subscribers — store in millions, metric name "hulu_live_subs", label "Hulu Live Subs"',
      'Experiences segment operating income — store in millions, metric name "experiences_op_income", label "Experiences Op. Income"',
      'Entertainment segment operating income — store in millions, metric name "entertainment_op_income", label "Entertainment Op. Income"',
      'Sports segment (ESPN) operating income — store in millions, metric name "sports_op_income", label "Sports Op. Income"',
      'NOTE: Disney fiscal year ends late September/early October. Q1 FY2026 = Oct-Dec 2025 (periodDate 2025-12-31), Q4 FY2026 = Jul-Sep 2026 (periodDate 2026-09-30).',
    ],
  },
  WBD: {
    cik: '1437107',
    name: 'Warner Bros. Discovery',
    kpiHints: [
      'direct-to-consumer (DTC) / global Max subscribers — store in millions, metric name "dtc_subscribers", label "DTC Subscribers"',
      'DTC ARPU (global or domestic) — store in dollars, metric name "dtc_arpu", label "DTC ARPU"',
      'Studios segment revenue — store in millions, metric name "studios_revenue", label "Studios Revenue"',
      'Networks segment revenue — store in millions, metric name "networks_revenue", label "Networks Revenue"',
      'Direct-to-Consumer segment revenue — store in millions, metric name "dtc_revenue", label "DTC Revenue"',
      'adjusted EBITDA — store in millions',
    ],
  },
  // ── E-Commerce / Marketplaces ─────────────────────────────────────────────
  MELI: {
    cik: '1099590',
    name: 'MercadoLibre',
    kpiHints: [
      'gross merchandise volume (GMV) — store in BILLIONS (e.g. $13.4B → value: 13.4, unit: "billions")',
      'total payment volume (TPV) — store in BILLIONS (e.g. $58.9B → value: 58.9, unit: "billions")',
      'unique active users / unique buyers — store in millions',
      'unique fintech active users / fintech MAUs — store in millions, metric name "fintech_maus", label "Fintech MAUs"',
      'items sold — store in millions',
      'Mercado Pago acquiring TPV — store in billions, metric name "mercado_pago_tpv", label "Mercado Pago TPV"',
    ],
  },
  ETSY: {
    cik: '1370637',
    name: 'Etsy',
    kpiHints: [
      'active buyers (trailing twelve month) — store in millions, metric name "active_buyers", label "Active Buyers"',
      'active sellers — store in millions, metric name "active_sellers", label "Active Sellers"',
      'consolidated gross merchandise sales (GMS) — store in BILLIONS (e.g. $2.9B → value: 2.9, unit: "billions"), metric name "gms", label "Consolidated GMS"',
      'marketplace GMS — store in billions',
      'take rate — store as percent',
      'adjusted EBITDA margin — store as percent',
    ],
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EdgarFiling {
  accessionNumber: string
  filingDate: string
  form: string
  primaryDocument: string
  primaryDocDescription: string
}

export interface ExtractedKPI {
  metric: string       // snake_case key
  label: string        // Human-readable label
  value: number
  unit: string         // "millions", "billions", "thousands", "percent", "units"
  period: string       // "Q4 2024"
  periodDate: string   // ISO date string, e.g. "2024-12-31"
}

const EDGAR_HEADERS = { 'User-Agent': 'Finclue research@finclue.de' }

// ─── EDGAR helpers ─────────────────────────────────────────────────────────────

export async function getEarningsFilings(
  cik: string,
  limit = 12,
  targetForms = ['8-K']
): Promise<EdgarFiling[]> {
  const paddedCik = cik.padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`

  const res = await fetch(url, { headers: EDGAR_HEADERS })
  if (!res.ok) throw new Error(`EDGAR submissions fetch failed: ${res.status}`)

  const data = await res.json()
  const allFilings = { ...data.filings?.recent }

  const extraFiles: { name: string }[] = data.filings?.files || []
  if (extraFiles.length > 0 && allFilings.form?.length < 50) {
    try {
      const extraUrl = `https://data.sec.gov/submissions/${extraFiles[0].name}`
      const extraRes = await fetch(extraUrl, { headers: EDGAR_HEADERS })
      if (extraRes.ok) {
        const extraData = await extraRes.json()
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

async function findExhibitDoc(
  cik: string,
  accessionNumber: string,
  primaryDoc: string
): Promise<string | null> {
  const accNoClean = accessionNumber.replace(/-/g, '')
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accNoClean}/${accessionNumber}-index.htm`

  const res = await fetch(indexUrl, { headers: EDGAR_HEADERS })
  if (!res.ok) return null

  const html = await res.text()
  const matches = [...html.matchAll(/href="[^"]*\/([^"\/]+\.htm)"/gi)]
  const filenames = matches.map((m) => m[1])

  const exhibit = filenames.find((name) =>
    /ex.?99.?1/i.test(name) || /ex991/i.test(name) || /exhibit.?99/i.test(name)
  ) || filenames.find((name) =>
    /pr\.htm/i.test(name) || /pressrelease/i.test(name) || /earnings/i.test(name)
  ) || filenames.find((name) =>
    name !== 'index.htm' &&
    !/companysearch/i.test(name) &&
    !/cfo/i.test(name) &&
    !/cover/i.test(name) &&
    name !== primaryDoc &&
    name.endsWith('.htm')
  )

  return exhibit || null
}

export async function fetchFilingText(
  cik: string,
  accessionNumber: string,
  primaryDoc: string
): Promise<{ text: string; url: string }> {
  const accNoClean = accessionNumber.replace(/-/g, '')
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accNoClean}`

  const exhibitDoc = await findExhibitDoc(cik, accessionNumber, primaryDoc)
  const docToFetch = exhibitDoc || (primaryDoc === 'index.htm' ? null : primaryDoc)
  if (!docToFetch) throw new Error(`No usable document found for ${accessionNumber}`)

  const url = `${baseUrl}/${docToFetch}`
  const res = await fetch(url, { headers: EDGAR_HEADERS })
  if (!res.ok) throw new Error(`EDGAR filing fetch failed: ${res.status} for ${url}`)

  const html = await res.text()
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#38;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#47;/g, '/')
    .replace(/&#58;/g, ':')
    .replace(/&#59;/g, ';')
    .replace(/&#160;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8226;/g, '•')
    .replace(/&#8230;/g, '…')
    .replace(/&#\d+;/g, ' ')
    .replace(/Forward[- ]Looking Statements[\s\S]{0,3000}?(?=\d+\s+\w+,\s+Inc\.|$)/i, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 48000)

  return { text, url }
}

// ─── KPI Extraction via OpenAI ────────────────────────────────────────────────

export async function extractKPIs(
  openai: OpenAI,
  ticker: string,
  companyName: string,
  filingText: string,
  filingDate: string,
  kpiHints: string[]
): Promise<ExtractedKPI[]> {
  const prompt = `You are a financial data analyst. Extract company-specific operating KPIs from this SEC 8-K earnings press release for ${companyName} (${ticker}).

Extract EACH of the following KPIs if present. Each KPI should be its own entry in the result array:
${kpiHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}

IMPORTANT: Regular KPIs and GUIDANCE KPIs are SEPARATE entries. If the text mentions both "operating margin of 32.3%" for the current quarter AND "operating margin guidance of 32.6%" for next quarter, return BOTH as separate objects.

Rules:
- For regular KPIs (NOT marked GUIDANCE): Return actual reported values for the CURRENT quarter being reported. Look in the narrative text ("revenue grew to $X", "operating margin of X%") AND in the summary/financial tables.
- For GUIDANCE/OUTLOOK items: Return the company's forward-looking guidance for the NEXT quarter. The period should be the NEXT quarter (e.g. if reporting Q4 2025, guidance period = "Q1 2026"). If a range is given (e.g. "$36-38B"), use the midpoint.
- For GEOGRAPHIC items: Return geographic revenue breakdowns for the CURRENT quarter
- For total revenue/GMV/bookings: always use "millions". Convert billions to millions (e.g. "$10.1B" → value: 10100, unit: "millions"). If the income statement shows values "in thousands" (e.g. $12,249,757 in thousands), divide by 1000 and round to the nearest integer (→ value: 12250, unit: "millions").
- For subscriber/user counts: always use "millions" (e.g. "325M subscribers" → value: 325, unit: "millions")
- For per-user metrics (ARPU, ARM, average revenue per membership/subscriber): use "dollars" and store the actual dollar value (e.g. "$17.26 per membership" → value: 17.26, unit: "dollars")
- For percentages, store as a decimal multiplied by 100 (e.g. 15.3% → value: 15.3, unit: "percent")
- The period should be the fiscal quarter being reported (e.g. "Q4 2024"), NOT the filing date. EXCEPTION: For GUIDANCE items, use the NEXT quarter as the period.
- periodDate should be the last day of that fiscal quarter in ISO format (e.g. "2024-12-31")
- metric should be a stable snake_case key (e.g. "paid_subscribers", "maus", "gross_bookings")
- label should be a clean display name (e.g. "Paid Subscribers", "Monthly Active Users")
- Only include KPIs you are highly confident about from the text
- When a summary table has columns like "Q1'25 Q2'25 ... Q1'26 Q2'26 Forecast", the LAST column is the forecast/guidance, and the second-to-last is the CURRENT quarter being reported.

Filing date: ${filingDate}

Return a JSON object with a "kpis" key containing an array. Each KPI is a separate entry.
Example — note how operating_margin (current quarter) and guidance_operating_margin (next quarter) are SEPARATE entries:
{"kpis": [
  {"metric": "total_revenue", "label": "Total Revenue", "value": 12250, "unit": "millions", "period": "Q4 2024", "periodDate": "2024-12-31"},
  {"metric": "operating_margin", "label": "Operating Margin", "value": 32.3, "unit": "percent", "period": "Q4 2024", "periodDate": "2024-12-31"},
  {"metric": "guidance_revenue", "label": "Revenue Guidance", "value": 12574, "unit": "millions", "period": "Q1 2025", "periodDate": "2025-03-31"},
  {"metric": "guidance_operating_margin", "label": "Op. Margin Guidance", "value": 32.6, "unit": "percent", "period": "Q1 2025", "periodDate": "2025-03-31"}
]}

If no relevant KPIs are found, return {"kpis": []}.

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
    let arr: ExtractedKPI[]
    if (Array.isArray(parsed)) {
      arr = parsed
    } else if (parsed.kpis ?? parsed.data ?? parsed.results ?? parsed.metrics) {
      arr = parsed.kpis ?? parsed.data ?? parsed.results ?? parsed.metrics
    } else {
      const nestedArr = Object.values(parsed).find(Array.isArray) as ExtractedKPI[] | undefined
      if (nestedArr) {
        arr = nestedArr
      } else if (parsed.metric && parsed.label && typeof parsed.value === 'number') {
        arr = [parsed as ExtractedKPI]
      } else {
        arr = []
      }
    }

    return arr.filter(
      (k) => k.metric && k.label && typeof k.value === 'number' && k.unit && k.period && k.periodDate
    )
  } catch {
    console.error('Failed to parse KPI extraction response:', content.slice(0, 500))
    return []
  }
}

// ─── Post-processing ──────────────────────────────────────────────────────────

export function normalizeKPIs(kpis: ExtractedKPI[], filingDate?: string): ExtractedKPI[] {
  // Normalize metric names for backwards compatibility
  for (const kpi of kpis) {
    if (kpi.metric === 'total_revenue' || kpi.metric === 'revenue') {
      kpi.metric = 'streaming_revenue'
      kpi.label = 'Streaming Revenue'
    }
    if (kpi.unit === 'millions' || kpi.unit === 'billions' || kpi.unit === 'thousands') {
      kpi.value = Math.round(kpi.value)
    }
  }

  // Sanity check: reject records whose periodDate is >6 months beyond the
  // filing date. This catches extraction errors like Visa's fiscal-year
  // confusion that mapped "Q1 2026" → 2026-12-31.
  const filingTs = filingDate ? new Date(filingDate).getTime() : Date.now()
  const maxFutureMs = 6 * 30 * 24 * 60 * 60 * 1000 // ~6 months
  const validated = kpis.filter((kpi) => {
    const periodTs = new Date(kpi.periodDate).getTime()
    if (Number.isNaN(periodTs)) return false
    if (periodTs - filingTs > maxFutureMs) {
      console.warn(
        `[normalizeKPIs] Rejecting ${kpi.metric} ${kpi.period}: periodDate ${kpi.periodDate} is >6mo beyond filing ${filingDate}`
      )
      return false
    }
    return true
  })

  // Deduplicate: same metric + period
  const seen = new Set<string>()
  return validated.filter((kpi) => {
    const key = `${kpi.metric}:${kpi.period}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Processing ───────────────────────────────────────────────────────────────

export interface ProcessOptions {
  limit?: number
  skipExistingFilings?: boolean  // Skip filings whose URL is already in the DB
  onLog?: (msg: string) => void
}

export interface ProcessResult {
  ticker: string
  filingsFound: number
  filingsProcessed: number
  filingsSkipped: number
  kpisSaved: number
  newKpis: number
  errors: string[]
}

/**
 * Process one company: fetch filings, extract KPIs, save to DB.
 * Returns summary stats.
 */
export async function processCompany(
  openai: OpenAI,
  ticker: string,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const { limit = 12, skipExistingFilings = false, onLog = console.log } = options
  const company = PILOT_COMPANIES[ticker]

  const result: ProcessResult = {
    ticker,
    filingsFound: 0,
    filingsProcessed: 0,
    filingsSkipped: 0,
    kpisSaved: 0,
    newKpis: 0,
    errors: [],
  }

  if (!company) {
    result.errors.push(`Unknown ticker: ${ticker}`)
    return result
  }

  onLog(`📊 Processing ${company.name} (${ticker}) — CIK ${company.cik}`)

  const targetForms = company.forms || ['8-K']
  const filings = await getEarningsFilings(company.cik, limit * 3, targetForms)
  result.filingsFound = filings.length
  onLog(`  Found ${filings.length} ${targetForms.join('/')} filings`)

  // Pre-fetch known filing URLs for this ticker to skip already-processed ones
  let knownFilingUrls = new Set<string>()
  if (skipExistingFilings) {
    const existing = await prisma.companyKPI.findMany({
      where: { ticker },
      select: { filingUrl: true },
      distinct: ['filingUrl'],
    })
    knownFilingUrls = new Set(existing.map((e) => e.filingUrl).filter((u): u is string => !!u))
  }

  for (const filing of filings) {
    if (result.filingsProcessed >= limit) break

    onLog(`  → ${filing.filingDate} | ${filing.accessionNumber}`)

    try {
      const { text, url: filingUrl } = await fetchFilingText(
        company.cik,
        filing.accessionNumber,
        filing.primaryDocument
      )

      // Skip if we've already processed this exact filing
      if (skipExistingFilings && knownFilingUrls.has(filingUrl)) {
        onLog('     ↳ Skipped (already processed)')
        result.filingsSkipped++
        continue
      }

      // Skip non-earnings filings
      const looksLikeEarnings =
        /revenue|quarter|earnings|results of operations|financial results/i.test(text.slice(0, 3000))
      if (!looksLikeEarnings) {
        onLog('     ↳ Skipped (not an earnings release)')
        result.filingsSkipped++
        continue
      }

      const rawKpis = await extractKPIs(
        openai,
        ticker,
        company.name,
        text,
        filing.filingDate,
        company.kpiHints
      )

      if (rawKpis.length === 0) {
        onLog('     ↳ No KPIs extracted')
        result.filingsProcessed++
        continue
      }

      const kpis = normalizeKPIs(rawKpis, filing.filingDate)

      for (const kpi of kpis) {
        const existing = await prisma.companyKPI.findUnique({
          where: {
            ticker_metric_period: { ticker, metric: kpi.metric, period: kpi.period },
          },
        })

        await prisma.companyKPI.upsert({
          where: {
            ticker_metric_period: { ticker, metric: kpi.metric, period: kpi.period },
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
        result.kpisSaved++
        if (!existing) result.newKpis++
        onLog(`     ↳ ✅ ${kpi.label}: ${kpi.value} ${kpi.unit} (${kpi.period})`)
      }

      result.filingsProcessed++
      await new Promise((r) => setTimeout(r, 200)) // Rate limit
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onLog(`     ↳ ❌ Error: ${msg}`)
      result.errors.push(`${filing.accessionNumber}: ${msg}`)
    }
  }

  onLog(
    `  Done: ${result.filingsProcessed} filings processed, ${result.filingsSkipped} skipped, ${result.kpisSaved} KPIs saved (${result.newKpis} new)`
  )
  return result
}
