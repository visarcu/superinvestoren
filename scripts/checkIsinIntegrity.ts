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
    // Unique symbols per ISIN (gleicher Ticker mehrfach ist OK — unterschiedliche sind es nicht)
    const uniqueSymbols = [...new Set(sources.map((s) => s.symbol))]
    if (uniqueSymbols.length > 1) {
      issues.push({ isin, sources })
    }
  }
  return issues
}

function main() {
  const allEntries = [
    ...etfs.map((e) => ({ isin: e.isin, symbol: e.symbol, source: 'etfs.ts' })),
    ...xetraETFs.map((e) => ({ isin: e.isin, symbol: e.symbol, source: 'xetraETFsComplete.ts' })),
  ]

  // 1) Duplikate innerhalb etfs.ts (kritisch — handkurierte Quelle)
  const etfsOnly = allEntries.filter((e) => e.source === 'etfs.ts')
  const etfsDups = findDuplicates(etfsOnly)

  // 2) Cross-Source-Konflikte: gleiche ISIN in etfs.ts und xetraETFs mit ANDEREM Ticker
  // (nur Info — etfs.ts hat Priorität, aber Diskrepanzen sind ein Warnsignal)
  const crossConflicts: Issue[] = []
  const etfsMap = new Map(etfsOnly.filter((e) => e.isin).map((e) => [e.isin!.toUpperCase(), e.symbol]))
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

  let hasFailure = false

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

  if (crossConflicts.length > 0) {
    console.warn(`\n⚠️  ${crossConflicts.length} ISIN-Konflikte zwischen etfs.ts und xetraETFsComplete.ts:`)
    for (const issue of crossConflicts.slice(0, 10)) {
      console.warn(`   ${issue.isin}: ${issue.sources.map((s) => `${s.symbol} (${s.source})`).join(' ≠ ')}`)
    }
    if (crossConflicts.length > 10) console.warn(`   ... und ${crossConflicts.length - 10} weitere`)
    console.warn('\n  → Nur Warnung. etfs.ts hat Priorität im Resolver. Prüfen ob bewusst.')
  }

  console.log(`\nZusammenfassung: ${etfsOnly.filter((e) => e.isin).length} ETF-Einträge mit ISIN in etfs.ts, ${xetraETFs.filter((e) => e.isin).length} in xetraETFsComplete.ts`)

  if (hasFailure) {
    console.error('\n❌ Check fehlgeschlagen.\n')
    process.exit(1)
  }
  console.log('\n✓ ISIN-Integrität OK.\n')
}

main()
