// scripts/checkIsinIntegrity.ts
// Sicherheitscheck: Jede ISIN in unseren Daten-Files darf nur EINEM Ticker zugewiesen sein.
// Bricht mit Exit-Code 1 ab, wenn Duplikate gefunden werden.
//
// Hintergrund: Am 2026-04-16 führte ein Duplikat in etfs.ts (IE00B3RBWM25 →
// VGWL.DE UND VWRL.L) dazu, dass das ING-Depot eines Users ~1% des tatsächlichen
// Marktwerts zeigte. Dieser Check soll verhindern, dass sowas nochmal unbemerkt
// in den main-Branch landet.
//
// Laufzeit: `npm run check:isin`

import { etfMaster } from '../src/data/etfMaster'
import { etfs } from '../src/data/etfs'
import { xetraETFs } from '../src/data/xetraETFsComplete'

interface Issue {
  isin: string
  sources: { symbol: string; source: string }[]
}

function findDuplicates(
  entries: Array<{ isin?: string; symbol: string; source: string }>,
): Issue[] {
  const byIsin = new Map<string, { symbol: string; source: string }[]>()
  for (const entry of entries) {
    if (!entry.isin) continue
    const key = entry.isin.toUpperCase()
    if (!byIsin.has(key)) byIsin.set(key, [])
    byIsin.get(key)!.push({ symbol: entry.symbol, source: entry.source })
  }
  const issues: Issue[] = []
  for (const [isin, sources] of byIsin) {
    const uniqueSymbols = [...new Set(sources.map((s) => s.symbol))]
    if (uniqueSymbols.length > 1) {
      issues.push({ isin, sources })
    }
  }
  return issues
}

// ISIN-Format: 2 Buchstaben Ländercode + 9 alphanumerisch + 1 Prüfziffer = 12 Zeichen
function validateIsinFormat(isin: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin.toUpperCase())
}

function main() {
  let hasFailure = false

  // === 0) etfMaster.ts interne Checks ===
  const masterEntries = etfMaster.map((e) => ({
    isin: e.isin,
    symbol: e.xetraTicker,
    source: 'etfMaster.ts',
  }))
  const masterDups = findDuplicates(masterEntries)

  if (masterDups.length > 0) {
    hasFailure = true
    console.error(`\n❌ ${masterDups.length} ISIN(s) in etfMaster.ts mehrfach mit unterschiedlichem Ticker:\n`)
    for (const issue of masterDups) {
      console.error(`   ${issue.isin}:`)
      for (const s of issue.sources) console.error(`     · ${s.symbol} (${s.source})`)
    }
  } else {
    console.log('✓ etfMaster.ts: keine ISIN-Duplikate')
  }

  // ISIN-Format-Validierung für Master-Einträge
  const invalidIsins = etfMaster.filter((e) => !validateIsinFormat(e.isin))
  if (invalidIsins.length > 0) {
    hasFailure = true
    console.error(`\n❌ ${invalidIsins.length} ungültige ISIN(s) in etfMaster.ts:\n`)
    for (const e of invalidIsins) {
      console.error(`   ${e.isin} (${e.xetraTicker}) — erwartet: 2 Buchstaben + 9 alphanumerisch + 1 Prüfziffer`)
    }
  } else {
    console.log(`✓ etfMaster.ts: alle ${etfMaster.length} ISINs haben gültiges Format`)
  }

  // === 1) etfs.ts interne Duplikate ===
  const allEntries = [
    ...masterEntries,
    ...etfs.map((e) => ({ isin: e.isin, symbol: e.symbol, source: 'etfs.ts' })),
    ...xetraETFs.map((e) => ({ isin: e.isin, symbol: e.symbol, source: 'xetraETFsComplete.ts' })),
  ]

  const etfsOnly = allEntries.filter((e) => e.source === 'etfs.ts')
  const etfsDups = findDuplicates(etfsOnly)

  if (etfsDups.length > 0) {
    hasFailure = true
    console.error(`\n❌ ${etfsDups.length} ISIN(s) in etfs.ts mehrfach mit unterschiedlichem Ticker zugewiesen:\n`)
    for (const issue of etfsDups) {
      console.error(`   ${issue.isin}:`)
      for (const s of issue.sources) console.error(`     · ${s.symbol} (${s.source})`)
    }
    console.error('\n  → Bitte nur einen kanonischen Ticker pro ISIN. XETRA-Listings bevorzugen.')
  } else {
    console.log('✓ etfs.ts: keine ISIN-Duplikate')
  }

  // === 2) Cross-Source: etfMaster vs etfs.ts (Warnung) ===
  const masterMap = new Map(etfMaster.map((e) => [e.isin.toUpperCase(), e.xetraTicker]))
  const masterVsEtfsConflicts: Issue[] = []
  for (const e of etfs) {
    if (!e.isin) continue
    const masterSymbol = masterMap.get(e.isin.toUpperCase())
    if (masterSymbol && masterSymbol !== e.symbol && masterSymbol !== e.symbol_de) {
      masterVsEtfsConflicts.push({
        isin: e.isin,
        sources: [
          { symbol: masterSymbol, source: 'etfMaster.ts' },
          { symbol: e.symbol, source: 'etfs.ts' },
        ],
      })
    }
  }

  if (masterVsEtfsConflicts.length > 0) {
    console.warn(`\n⚠️  ${masterVsEtfsConflicts.length} ISIN-Konflikte zwischen etfMaster.ts und etfs.ts:`)
    for (const issue of masterVsEtfsConflicts) {
      console.warn(`   ${issue.isin}: ${issue.sources.map((s) => `${s.symbol} (${s.source})`).join(' ≠ ')}`)
    }
    console.warn('  → etfMaster.ts hat Priorität im Resolver. Prüfen ob bewusst.')
  }

  // === 3) Cross-Source: etfs.ts vs xetraETFsComplete (Warnung) ===
  const etfsMap = new Map(etfsOnly.filter((e) => e.isin).map((e) => [e.isin!.toUpperCase(), e.symbol]))
  const crossConflicts: Issue[] = []
  for (const x of xetraETFs) {
    if (!x.isin) continue
    const etfsSymbol = etfsMap.get(x.isin.toUpperCase())
    if (etfsSymbol && etfsSymbol !== x.symbol) {
      crossConflicts.push({
        isin: x.isin,
        sources: [
          { symbol: etfsSymbol, source: 'etfs.ts' },
          { symbol: x.symbol, source: 'xetraETFsComplete.ts' },
        ],
      })
    }
  }

  if (crossConflicts.length > 0) {
    console.warn(`\n⚠️  ${crossConflicts.length} ISIN-Konflikte zwischen etfs.ts und xetraETFsComplete.ts:`)
    for (const issue of crossConflicts.slice(0, 10)) {
      console.warn(`   ${issue.isin}: ${issue.sources.map((s) => `${s.symbol} (${s.source})`).join(' ≠ ')}`)
    }
    if (crossConflicts.length > 10) console.warn(`   ... und ${crossConflicts.length - 10} weitere`)
    console.warn('  → Nur Warnung. etfs.ts hat Priorität im Resolver. Prüfen ob bewusst.')
  }

  // === Zusammenfassung ===
  console.log(`\nZusammenfassung: ${etfMaster.length} in etfMaster.ts, ${etfsOnly.filter((e) => e.isin).length} in etfs.ts, ${xetraETFs.filter((e) => e.isin).length} in xetraETFsComplete.ts`)

  if (hasFailure) {
    console.error('\n❌ Check fehlgeschlagen.\n')
    process.exit(1)
  }
  console.log('\n✓ ISIN-Integrität OK.\n')
}

main()
