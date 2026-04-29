/**
 * seedMarketInsights.ts
 *
 * Backfill / Seed: generiert Market-Insights für die letzten Earnings aller
 * (oder ausgewählter) Tickers mit existierenden SecEarningsPressReleases.
 *
 * Usage:
 *   npx tsx scripts/seedMarketInsights.ts                # Alle Tickers, jeweils nur das neueste Quartal
 *   npx tsx scripts/seedMarketInsights.ts AMZN SPOT SPGI # Nur diese
 *   npx tsx scripts/seedMarketInsights.ts --all-quarters # Alle Quartale (teurer)
 *   npx tsx scripts/seedMarketInsights.ts --force        # Re-Generation auch wenn Insight existiert
 */

import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

// .env.local laden BEVOR irgendwelche Module mit env-deps importiert werden.
// Dynamic imports unten umgehen das ESM-Hoisting-Problem.
const envCandidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../../.env.local'),
  '/Users/visar/Projects/superinvestoren/.env.local',
]
for (const p of envCandidates) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

async function main() {
  // Dynamische Imports — erst NACH dotenv.config()
  const { createClient } = await import('@supabase/supabase-js')
  const { generateInsightFromEarnings, DEFAULT_MODEL } = await import('../src/lib/insightGenerator')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const args = process.argv.slice(2)
  const allQuarters = args.includes('--all-quarters')
  const force = args.includes('--force')
  const tickers = args.filter((a) => !a.startsWith('--')).map((t) => t.toUpperCase())

  console.log(`🚀 MarketInsights Seed`)
  console.log(`   Modell: ${DEFAULT_MODEL}`)
  console.log(`   Modus: ${allQuarters ? 'alle Quartale' : 'nur neuestes'}`)
  console.log(`   Force: ${force}`)
  console.log(`   Tickers: ${tickers.length ? tickers.join(', ') : 'ALLE'}\n`)

  let query = supabase
    .from('SecEarningsPressReleases')
    .select('id, ticker, period, filing_date')
    .order('filing_date', { ascending: false })
  if (tickers.length) query = query.in('ticker', tickers)

  const { data: earnings, error } = await query
  if (error || !earnings?.length) {
    console.error('Keine Earnings gefunden:', error?.message)
    process.exit(1)
  }

  const seen = new Set<string>()
  const targets = allQuarters
    ? earnings
    : earnings.filter((e) => {
        if (seen.has(e.ticker)) return false
        seen.add(e.ticker)
        return true
      })

  console.log(`📊 ${targets.length} Earnings zu verarbeiten\n`)

  let totalCost = 0
  let success = 0
  let skipped = 0
  let failed = 0

  for (const e of targets) {
    process.stdout.write(`  ${e.ticker.padEnd(6)} ${e.period.padEnd(10)} `)
    try {
      const r = await generateInsightFromEarnings(e.id, { force })
      const isNew = new Date(r.generatedAt).getTime() > Date.now() - 60_000
      if (isNew) {
        console.log(`✅ generated (${r.tokensIn}+${r.tokensOut} tok, $${r.costUsd?.toFixed(5)})`)
        totalCost += r.costUsd ?? 0
        success++
      } else {
        console.log(`⏭  exists (use --force to regen)`)
        skipped++
      }
      await new Promise((r) => setTimeout(r, 400))
    } catch (err: any) {
      console.log(`❌ ${err.message}`)
      failed++
    }
  }

  console.log(`\n─ Summary ─`)
  console.log(`  Generiert: ${success}`)
  console.log(`  Übersprungen: ${skipped}`)
  console.log(`  Fehler: ${failed}`)
  console.log(`  Total Kosten: $${totalCost.toFixed(4)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
