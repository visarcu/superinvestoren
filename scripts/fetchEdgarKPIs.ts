/**
 * fetchEdgarKPIs.ts
 *
 * Manual runner for the EDGAR KPI ingestion.
 * The core logic lives in src/lib/edgarKpiService.ts and is shared with
 * the Vercel cron job at /api/cron/update-company-kpis.
 *
 * Usage:
 *   npx tsx scripts/fetchEdgarKPIs.ts              # All pilot companies
 *   npx tsx scripts/fetchEdgarKPIs.ts NFLX         # Single ticker
 *   npx tsx scripts/fetchEdgarKPIs.ts NFLX --limit 4   # Last 4 quarters
 *   npx tsx scripts/fetchEdgarKPIs.ts --skip-existing  # Only new filings
 */

import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import { PILOT_COMPANIES, processCompany } from '../src/lib/edgarKpiService'
import { prisma } from '../src/lib/prisma'

dotenv.config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function main() {
  const args = process.argv.slice(2)
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 12
  const skipExistingFilings = args.includes('--skip-existing')

  const tickers = args.filter((a) => !a.startsWith('--') && isNaN(Number(a)))
  const targets = tickers.length > 0 ? tickers.map((t) => t.toUpperCase()) : Object.keys(PILOT_COMPANIES)

  console.log(`🚀 Finclue EDGAR KPI Fetcher`)
  console.log(`   Companies: ${targets.join(', ')}`)
  console.log(`   Limit: ${limit} earnings releases per company`)
  if (skipExistingFilings) console.log(`   Mode: skip-existing (only new filings)`)
  console.log()

  for (const ticker of targets) {
    await processCompany(openai, ticker, { limit, skipExistingFilings })
  }

  await prisma.$disconnect()
  console.log('\n✅ All done!')
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
