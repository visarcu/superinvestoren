/**
 * fetchIpoFilings.ts
 *
 * Manueller IPO-Calendar-Sync aus SEC EDGAR.
 * Wird normalerweise wöchentlich vom Cron /api/cron/sync-ipos aufgerufen,
 * dieses Script ist für Initial-Backfill oder Debugging.
 *
 *   # Default — letzte 30 Tage, max 100 pro Form
 *   npx tsx scripts/fetchIpoFilings.ts
 *
 *   # Längerer Zeitraum (z.B. 90 Tage Backfill)
 *   npx tsx scripts/fetchIpoFilings.ts --days 90
 *
 *   # Höheres Limit pro Form
 *   npx tsx scripts/fetchIpoFilings.ts --max 500
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { syncIpoCalendar } from '../src/lib/ipoCalendarSync'

function parseArg(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name)
  if (idx !== -1 && process.argv[idx + 1]) {
    const v = parseInt(process.argv[idx + 1], 10)
    if (!isNaN(v) && v > 0) return v
  }
  return fallback
}

async function main() {
  const days = parseArg('--days', 30)
  const max = parseArg('--max', 100)

  console.log(`📥 IPO Calendar Sync: letzte ${days} Tage, max ${max} pro Form`)
  const startedAt = Date.now()

  const result = await syncIpoCalendar(days, max)

  const duration = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('')
  console.log('═══════════════════════════════════════')
  console.log(`✅ Fertig in ${duration}s`)
  console.log(`   Total Filings: ${result.total}`)
  console.log(`   Inserted:      ${result.inserted}`)
  console.log(`   Updated:       ${result.updated}`)
  console.log(`   Skipped:       ${result.skipped}`)
  console.log(`   Per Form:      ${JSON.stringify(result.byForm)}`)
  if (result.errors.length > 0) {
    console.log(`   Errors (${result.errors.length}):`)
    for (const e of result.errors.slice(0, 10)) console.log(`     - ${e}`)
  }
  console.log('═══════════════════════════════════════')
}

main()
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import('../src/lib/prisma')
    await prisma.$disconnect()
  })
