/**
 * importDaxFinancials.ts
 *
 * Importiert DAX-Finanzdaten aus CSV in Supabase.
 * Daten werden manuell aus Geschäftsberichten in die CSV eingetragen.
 *
 * Usage:
 *   npx tsx scripts/importDaxFinancials.ts                    # Standard-Datei
 *   npx tsx scripts/importDaxFinancials.ts data/custom.csv    # Custom CSV
 *   npx tsx scripts/importDaxFinancials.ts --dry-run          # Nur prüfen, nicht importieren
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

// ─── Type Conversion ─────────────────────────────────────────────────────────

function toNumber(val: string): number | null {
  if (!val || val === '' || val === '-') return null
  // Handle German number format (1.234,56 → 1234.56)
  const cleaned = val.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function toInt(val: string): number | null {
  const num = toNumber(val)
  return num !== null ? Math.round(num) : null
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const csvPath = args.find(a => !a.startsWith('--')) || 'data/dax-financials-template.csv'

  const fullPath = path.resolve(csvPath)
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ CSV-Datei nicht gefunden: ${fullPath}`)
    process.exit(1)
  }

  console.log(`📊 Finclue DAX Financials Importer`)
  console.log(`   CSV: ${csvPath}`)
  console.log(`   Mode: ${dryRun ? 'DRY RUN (keine Änderungen)' : 'LIVE IMPORT'}`)
  console.log('')

  const content = fs.readFileSync(fullPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`   ${rows.length} Zeilen gelesen`)
  console.log('')

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    const ticker = row.ticker
    const period = row.period
    const revenue = toInt(row.revenue)

    // Leere Zeilen überspringen (nur Ticker + Period, aber keine Daten)
    if (!revenue && !toInt(row.net_income) && !toNumber(row.eps)) {
      skipped++
      continue
    }

    const data = {
      ticker,
      entity_name: row.entity_name || null,
      period,
      fiscal_year: parseInt(row.fiscal_year) || 0,
      fiscal_period: row.fiscal_period || 'FY',
      // Income Statement (in der CSV in der Einheit des Unternehmens, z.B. Mio. EUR)
      revenue: toInt(row.revenue),
      net_income: toInt(row.net_income),
      gross_profit: toInt(row.gross_profit),
      operating_income: toInt(row.operating_income),
      cost_of_revenue: toInt(row.cost_of_revenue),
      eps: toNumber(row.eps),
      eps_basic: toNumber(row.eps_basic),
      research_and_development: toInt(row.research_and_development),
      selling_general_admin: toInt(row.selling_general_admin),
      income_tax: toInt(row.income_tax),
      interest_expense: toInt(row.interest_expense),
      depreciation: toInt(row.depreciation),
      // Balance Sheet
      total_assets: toInt(row.total_assets),
      total_liabilities: toInt(row.total_liabilities),
      shareholders_equity: toInt(row.shareholders_equity),
      cash: toInt(row.cash),
      long_term_debt: toInt(row.long_term_debt),
      short_term_debt: toInt(row.short_term_debt),
      total_debt: toInt(row.total_debt),
      inventory: toInt(row.inventory),
      accounts_receivable: toInt(row.accounts_receivable),
      accounts_payable: toInt(row.accounts_payable),
      goodwill: toInt(row.goodwill),
      property_plant_equip: toInt(row.property_plant_equip),
      shares_outstanding: toInt(row.shares_outstanding),
      // Cash Flow
      operating_cash_flow: toInt(row.operating_cash_flow),
      capex: toInt(row.capex),
      free_cash_flow: toInt(row.free_cash_flow),
      dividend_per_share: toNumber(row.dividend_per_share),
      dividends_paid: toInt(row.dividends_paid),
      share_repurchase: toInt(row.share_repurchase),
      // Meta
      source: row.source || 'manual-geschaeftsbericht',
      updated_at: new Date().toISOString(),
    }

    // Zähle ausgefüllte Felder
    const filledFields = Object.entries(data)
      .filter(([k, v]) => v !== null && !['ticker', 'entity_name', 'period', 'fiscal_year', 'fiscal_period', 'source', 'updated_at'].includes(k))
      .length

    if (dryRun) {
      console.log(`  📋 ${ticker} ${period}: ${filledFields} Felder ausgefüllt${revenue ? ` (Revenue: ${(revenue / 1e6).toFixed(0)} Mio.)` : ''}`)
      imported++
    } else {
      const { error } = await supabase
        .from('SecFinancialData')
        .upsert(data, { onConflict: 'ticker,period' })

      if (error) {
        console.error(`  ❌ ${ticker} ${period}: ${error.message}`)
        errors++
      } else {
        console.log(`  ✅ ${ticker} ${period}: ${filledFields} Felder importiert`)
        imported++
      }
    }
  }

  console.log('')
  console.log(`═══════════════════════════════`)
  console.log(`  Importiert: ${imported}`)
  console.log(`  Übersprungen: ${skipped} (leer)`)
  console.log(`  Fehler: ${errors}`)
  console.log(`═══════════════════════════════`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
