// scripts/checkIsinIntegrity.ts
// Sicherheitscheck: Jede ISIN in unseren Daten-Files muss eine gültige Prüfziffer
// haben und darf nur EINEM Ticker zugewiesen sein. Bricht sonst mit Exit-Code 1 ab.
//
// Hintergrund: Am 2026-04-16 führte ein Duplikat in etfs.ts (IE00B3RBWM25 →
// VGWL.DE UND VWRL.L) dazu, dass das ING-Depot eines Users ~1% des tatsächlichen
// Marktwerts zeigte. Dieser Check soll verhindern, dass sowas nochmal unbemerkt
// in den main-Branch landet. Am 2026-11-24 kam die Prüfziffer dazu: 27 ISINs in
// etfMaster.ts und etfs.ts hatten das richtige Format, aber eine falsche Prüfziffer.
//
// Geprüft wird außerdem, ob ein Kürzel in zwei Dateien verschiedene ISINs trägt: So
// stand XDWD.DE hier als MSCI World und dort als Dividendenfonds.
//
// Grenze: Eine gültige ISIN, die überall gleich falsch ist (IJR mit der ISIN von AGG),
// fällt hier nicht auf. Das zeigt nur der Abgleich mit einer zweiten Quelle.
//
// Laufzeit: `npm run check:isin`

import { etfMaster } from '../src/data/etfMaster'
import { etfs } from '../src/data/etfs'
import { etfLookthrough } from '../src/data/etfLookthrough'
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

// Prüfziffer nach ISO 6166: Buchstaben zu Zahlen (A=10 … Z=35), dann Luhn über alle Ziffern.
function hasValidCheckDigit(isin: string): boolean {
  const digits = [...isin.toUpperCase()].map((c) => parseInt(c, 36).toString()).join('')
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
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

  // === 1) Alle Quellen: Format und Prüfziffer ===
  const allEntries = [
    ...masterEntries,
    ...etfs.map((e) => ({ isin: e.isin, symbol: e.symbol, source: 'etfs.ts' })),
    ...etfLookthrough.flatMap((e) => e.tickers.map((t) => ({ isin: e.isin, symbol: t, source: 'etfLookthrough.ts' }))),
    ...xetraETFs.map((e) => ({ isin: e.isin, symbol: e.symbol, source: 'xetraETFsComplete.ts' })),
  ]

  const invalidIsins = allEntries.flatMap((e) => {
    if (!e.isin) return []
    if (!validateIsinFormat(e.isin)) return [{ ...e, reason: 'Format: 2 Buchstaben + 9 alphanumerisch + 1 Prüfziffer' }]
    if (!hasValidCheckDigit(e.isin)) return [{ ...e, reason: 'Prüfziffer stimmt nicht' }]
    return []
  })
  if (invalidIsins.length > 0) {
    hasFailure = true
    console.error(`\n❌ ${invalidIsins.length} ungültige ISIN(s):\n`)
    for (const e of invalidIsins) console.error(`   ${e.isin} (${e.symbol}, ${e.source}): ${e.reason}`)
  } else {
    console.log(`✓ alle ${allEntries.filter((e) => e.isin).length} ISINs haben gültiges Format und gültige Prüfziffer`)
  }

  // Gleiches Kürzel, verschiedene ISINs (auch über Dateien hinweg)
  const bySymbol = new Map<string, { isin: string; source: string }[]>()
  for (const e of allEntries) {
    if (!e.isin) continue
    const key = e.symbol.toUpperCase()
    bySymbol.set(key, [...(bySymbol.get(key) || []), { isin: e.isin.toUpperCase(), source: e.source }])
  }
  const symbolConflicts = [...bySymbol].filter(([, list]) => new Set(list.map((x) => x.isin)).size > 1)
  if (symbolConflicts.length > 0) {
    hasFailure = true
    console.error(`\n❌ ${symbolConflicts.length} Kürzel mit verschiedenen ISINs:\n`)
    for (const [symbol, list] of symbolConflicts) {
      console.error(`   ${symbol}: ${list.map((x) => `${x.isin} (${x.source})`).join(' ≠ ')}`)
    }
  } else {
    console.log('✓ jedes Kürzel trägt in allen Dateien dieselbe ISIN')
  }

  // === 2) etfs.ts interne Duplikate ===
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

  // === 3) Cross-Source: etfMaster vs etfs.ts (Warnung) ===
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

  // === 4) Cross-Source: etfs.ts vs xetraETFsComplete (Warnung) ===
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
