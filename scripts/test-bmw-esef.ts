// scripts/test-bmw-esef.ts
// Integrationstest: Parst BMW ESEF-Package und verifiziert die Werte.
//
// Run: npx tsx scripts/test-bmw-esef.ts <path-to-BMW-zip>
// Erwartete Ergebnisse (BMW Konzern FY 2025, in EUR):
//   Revenue      133.453 Mio  = 133,453,000,000 EUR
//   Assets       265.967 Mio  = 265,967,000,000 EUR
//   Cash         18.854 Mio  =  18,854,000,000 EUR

import * as fs from 'fs'
import { parseEsefZip, parseIxNumber } from '../src/lib/esef/ixbrlParser'

// ─── Unit Tests für parseIxNumber ────────────────────────────────────
function testParseIxNumber() {
  console.log('\n━━━ parseIxNumber Unit Tests ━━━')
  const cases: Array<[string, string | undefined, number | null]> = [
    // BMW-Format: Punkt = Tausender
    ['133.453', 'ixt5:num-comma-decimal', 133453],
    ['142.380', 'ixt5:num-comma-decimal', 142380],
    ['18.854', 'ixt5:num-comma-decimal', 18854],
    // Mit Komma-Dezimal
    ['123.456,78', 'ixt5:num-comma-decimal', 123456.78],
    // US-Format
    ['1,234.56', 'ixt5:num-dot-decimal', 1234.56],
    ['1,000', 'ixt5:num-dot-decimal', 1000],
    // Negativ
    ['-123', 'ixt5:num-dot-decimal', -123],
    ['(456)', 'ixt5:num-dot-decimal', -456],
    // Dash
    ['–', undefined, 0],
    // Edge cases
    ['', undefined, null],
  ]

  let passed = 0, failed = 0
  for (const [input, fmt, expected] of cases) {
    const got = parseIxNumber(input, fmt)
    const ok = got === expected
    if (ok) passed++
    else failed++
    console.log(`  ${ok ? '✅' : '❌'} parseIxNumber("${input}", "${fmt ?? '-'}") = ${got} (erwartet: ${expected})`)
  }
  console.log(`  Ergebnis: ${passed}/${passed + failed} passed`)
  if (failed > 0) process.exit(1)
}

// ─── BMW Integrationstest ────────────────────────────────────────────
async function testBmwFile(zipPath: string) {
  console.log(`\n━━━ BMW ESEF Integration Test ━━━`)
  console.log(`  Datei: ${zipPath}`)

  if (!fs.existsSync(zipPath)) {
    console.error(`❌ Datei nicht gefunden: ${zipPath}`)
    process.exit(1)
  }

  const buffer = fs.readFileSync(zipPath)
  console.log(`  ZIP-Größe: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)

  const start = Date.now()
  const result = await parseEsefZip(buffer)
  const duration = Date.now() - start
  console.log(`  Parse-Zeit: ${duration}ms`)

  console.log(`\n  Entity LEI: ${result.entityLei}`)
  console.log(`  Total Facts: ${result.totalFacts}`)
  console.log(`  Mapped to Schema: ${result.mappedFacts}`)
  console.log(`  Skipped (Segment-Dims): ${result.skippedFactsWithDimensions}`)
  console.log(`  Perioden gefunden: ${result.periods.length}`)

  if (result.warnings.length > 0) {
    console.log(`  Warnings: ${result.warnings.length}`)
    result.warnings.slice(0, 3).forEach(w => console.log(`    ⚠️  ${w}`))
  }

  // Erwartete Werte verifizieren
  const fy2025 = result.periods.find(p => p.periodEnd === '2025-12-31')
  const fy2024 = result.periods.find(p => p.periodEnd === '2024-12-31')

  if (!fy2025) {
    console.error('❌ FY 2025 nicht gefunden!')
    process.exit(1)
  }

  const expectations: Array<{ label: string; actual: number | undefined; expected: number; tolerance: number }> = [
    { label: 'Revenue FY25',     actual: fy2025.fields.revenue,          expected: 133_453_000_000, tolerance: 1_000_000 },
    { label: 'Assets FY25',      actual: fy2025.fields.totalAssets,      expected: 265_967_000_000, tolerance: 1_000_000 },
    { label: 'Cash FY25',        actual: fy2025.fields.cashAndEquivalents, expected: 18_854_000_000, tolerance: 1_000_000 },
    ...(fy2024 ? [
      { label: 'Revenue FY24',   actual: fy2024.fields.revenue,          expected: 142_380_000_000, tolerance: 1_000_000 },
      { label: 'Assets FY24',    actual: fy2024.fields.totalAssets,      expected: 267_732_000_000, tolerance: 1_000_000 },
      { label: 'Cash FY24',      actual: fy2024.fields.cashAndEquivalents, expected: 19_287_000_000, tolerance: 1_000_000 },
    ] : []),
  ]

  console.log('\n  ── Expected vs. Actual ──')
  let allOk = true
  for (const e of expectations) {
    const actualFormatted = e.actual !== undefined
      ? e.actual.toLocaleString('de-DE')
      : '(missing)'
    const expectedFormatted = e.expected.toLocaleString('de-DE')
    const diff = e.actual !== undefined ? Math.abs(e.actual - e.expected) : Infinity
    const ok = diff <= e.tolerance
    if (!ok) allOk = false
    console.log(`  ${ok ? '✅' : '❌'} ${e.label.padEnd(15)} ${actualFormatted.padStart(20)} EUR  (erw: ${expectedFormatted})`)
  }

  // Zeige alle Mappings in der Haupt-Periode
  console.log('\n  ── Alle gemappten Felder FY 2025 ──')
  for (const [field, value] of Object.entries(fy2025.fields)) {
    if (value === undefined) continue
    const millionen = (value / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })
    console.log(`    ${field.padEnd(22)} ${millionen.padStart(14)} Mio ${fy2025.currency ?? 'EUR'}`)
  }

  if (!allOk) {
    console.error('\n❌ Einige Werte weichen ab!')
    process.exit(1)
  }

  console.log('\n✅ Alle BMW-Werte stimmen.')
}

async function main() {
  testParseIxNumber()

  const zipPath = process.argv[2] ?? '/Users/visar/Downloads/BMW_AG_KA+KLB_ESEF-2025-12-31-1-de (1).xbri'
  await testBmwFile(zipPath)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
