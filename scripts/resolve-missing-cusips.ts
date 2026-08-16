/**
 * Script: Resolve missing CUSIPs from 13F holdings against stocks*.ts
 *
 * Ablauf:
 * 1. Alle CUSIPs aus src/data/holdings/*\/2026-Q*.json sammeln
 * 2. Gegen die cusip-Felder in stocks-us/de/uk/jp.ts abgleichen
 * 3. Unbekannte CUSIPs über FMP /api/v3/cusip/{cusip} auflösen
 *    (Fallbacks: /stable/search-cusip für US-Listing-Präferenz,
 *     Reparatur verstümmelter 7/8-stelliger CUSIPs aus Filings
 *     (z.B. 46625100 → 46625H100 JPMorgan) gegen bekannte CUSIPs,
 *     danach Issuer-Match über die ersten 6 CUSIP-Stellen — fängt
 *     Wandelanleihen/Notes desselben Emittenten, z.B. Strategy Inc 594972AS0)
 * 4. Für Treffer das Profil (/api/v3/profile/{ticker}) holen und
 *    neue Einträge an stocks-us.ts anhängen bzw. bestehende aktualisieren
 *
 * Regeln gegen Regressionen:
 * - Ticker existiert mit leerer CUSIP  → CUSIP im bestehenden Eintrag setzen
 * - Ticker existiert, alte CUSIP taucht in 2026-Filings NICHT mehr auf
 *   (echter CUSIP-Wechsel, z.B. Umbenennung) → bestehenden Eintrag aktualisieren
 * - Ticker existiert, alte CUSIP ist in 2026-Filings noch aktiv
 *   (parallel gültige Wertpapiere: ADR vs. Ordinary, Aktie vs. Convertible)
 *   → zusätzlichen Eintrag anhängen, bestehenden NICHT überschreiben,
 *     sonst verlieren die aktiven Positionen ihren Ticker-Link
 *
 * Aufruf: npm run resolve-cusips [-- --dry-run]
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '..', '.env.local') })

const API_KEY = process.env.FMP_API_KEY
if (!API_KEY) {
  console.error('Bitte setze FMP_API_KEY in .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')

const holdingsDir = path.join(__dirname, '..', 'src', 'data', 'holdings')
const dataDir = path.join(__dirname, '..', 'src', 'data')
const STOCK_FILES = ['stocks-us.ts', 'stocks-de.ts', 'stocks-uk.ts', 'stocks-jp.ts']
const APPEND_FILE = 'stocks-us.ts'

const RATE_LIMIT_MS = 100

// ─── FMP-Helper mit Rate-Limit ───
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function fmpGet<T>(url: string): Promise<T | null> {
  await sleep(RATE_LIMIT_MS)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) {
        // Rate-Limit erreicht: kurz warten und einmal neu versuchen
        await sleep(2000)
        continue
      }
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      await sleep(1000)
    }
  }
  return null
}

interface CusipHit {
  ticker: string
  cusip: string
  company: string
}
interface StableHit {
  symbol: string
  companyName: string
  cusip: string
}
interface FmpProfile {
  symbol: string
  companyName: string
  sector: string | null
}

async function lookupCusip(cusip: string): Promise<{ ticker: string; company: string } | null> {
  const v3 = await fmpGet<CusipHit[]>(
    `https://financialmodelingprep.com/api/v3/cusip/${cusip}?apikey=${API_KEY}`
  )
  let best: { ticker: string; company: string } | null = null
  if (Array.isArray(v3) && v3[0]?.ticker) {
    best = { ticker: v3[0].ticker, company: v3[0].company || '' }
  }

  // v3 liefert teils Auslands-Listings (z.B. ABX.TO statt B für Barrick).
  // stable/search-cusip listet alle Listings → dotless US-Symbol bevorzugen.
  if (!best || best.ticker.includes('.')) {
    const stable = await fmpGet<StableHit[]>(
      `https://financialmodelingprep.com/stable/search-cusip?cusip=${cusip}&apikey=${API_KEY}`
    )
    if (Array.isArray(stable) && stable.length > 0) {
      const us = stable.find(s => s.symbol && !s.symbol.includes('.'))
      const pick = us || stable[0]
      if (pick?.symbol && (!best || (best.ticker.includes('.') && !pick.symbol.includes('.')))) {
        best = { ticker: pick.symbol, company: pick.companyName || '' }
      }
    }
  }
  return best
}

const profileCache = new Map<string, FmpProfile | null>()
async function fetchProfile(ticker: string): Promise<FmpProfile | null> {
  if (profileCache.has(ticker)) return profileCache.get(ticker)!
  const res = await fmpGet<FmpProfile[]>(
    `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(ticker)}?apikey=${API_KEY}`
  )
  const profile = Array.isArray(res) && res[0]?.symbol ? res[0] : null
  profileCache.set(ticker, profile)
  return profile
}

// ─── Schritt 1: CUSIPs aus den 2026er Holdings sammeln ───
interface HoldingCusip {
  names: Set<string>
  classes: Set<string>
}

function collectHoldingsCusips(): Map<string, HoldingCusip> {
  const map = new Map<string, HoldingCusip>()
  const investors = fs
    .readdirSync(holdingsDir)
    .filter(d => fs.statSync(path.join(holdingsDir, d)).isDirectory())

  for (const investor of investors) {
    const dir = path.join(holdingsDir, investor)
    const files = fs.readdirSync(dir).filter(f => /^2026-Q\d\.json$/.test(f))
    for (const file of files) {
      let data: any
      try {
        data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
      } catch {
        continue
      }
      for (const pos of data?.positions ?? []) {
        const cusip = String(pos?.cusip ?? '').trim().toUpperCase()
        if (cusip.length < 7) continue
        if (!map.has(cusip)) map.set(cusip, { names: new Set(), classes: new Set() })
        const entry = map.get(cusip)!
        if (pos.name) entry.names.add(pos.name)
        if (pos.titleOfClass) entry.classes.add(pos.titleOfClass)
      }
    }
  }
  return map
}

// ─── Schritt 2: stocks*.ts parsen ───
interface StockEntry {
  ticker: string
  cusip: string
  name: string
  file: string
}

function parseStockFiles(): StockEntry[] {
  const entries: StockEntry[] = []
  const regex = /ticker:\s*'([^']+)',\s*\n\s*cusip:\s*'([^']*)',\s*\n\s*name:\s*'((?:[^'\\]|\\.)*)'/g
  for (const file of STOCK_FILES) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    let match
    while ((match = regex.exec(content)) !== null) {
      entries.push({
        ticker: match[1],
        cusip: match[2].trim().toUpperCase(),
        name: match[3],
        file,
      })
    }
  }
  return entries
}

// ─── Schritt 4: Dateien patchen ───
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function escapeName(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\s+/g, ' ').trim()
}

function makeEntry(ticker: string, cusip: string, name: string, sector: string): string {
  return `  {
    ticker: '${ticker}',
    cusip:  '${cusip}',
    name:   '${escapeName(name)}',
    sector: '${escapeName(sector)}',
    metrics: [],
  }`
}

function setCusipInFile(file: string, ticker: string, oldCusip: string, newCusip: string): boolean {
  const filePath = path.join(dataDir, file)
  const content = fs.readFileSync(filePath, 'utf-8')
  const pattern = new RegExp(
    `(ticker:\\s*'${escapeRegex(ticker)}',\\s*\\n\\s*cusip:\\s*)'${escapeRegex(oldCusip)}',`,
    'g'
  )
  const next = content.replace(pattern, `$1'${newCusip}',`)
  if (next === content) return false
  if (!DRY_RUN) fs.writeFileSync(filePath, next, 'utf-8')
  return true
}

function appendEntries(entries: string[]) {
  if (entries.length === 0) return
  const filePath = path.join(dataDir, APPEND_FILE)
  const content = fs.readFileSync(filePath, 'utf-8')
  const closing = /\}\s*\n\]\s*$/
  if (!closing.test(content)) {
    throw new Error(`Konnte das Array-Ende in ${APPEND_FILE} nicht finden`)
  }
  const next = content.replace(closing, `},\n${entries.join(',\n')}\n]\n`)
  if (!DRY_RUN) fs.writeFileSync(filePath, next, 'utf-8')
}

// ─── Main ───
async function main() {
  console.log(`=== CUSIP-Auflösung 13F-Holdings → stocks*.ts ${DRY_RUN ? '(DRY-RUN)' : ''} ===\n`)

  const holdingsCusips = collectHoldingsCusips()
  console.log(`CUSIPs in 2026-Q*-Holdings: ${holdingsCusips.size}`)

  const stockEntries = parseStockFiles()
  const knownCusips = new Set(stockEntries.filter(e => e.cusip).map(e => e.cusip))
  const entriesByTicker = new Map<string, StockEntry[]>()
  const tickersByBase6 = new Map<string, Set<string>>()
  const entriesByCusip = new Map<string, StockEntry[]>()
  for (const e of stockEntries) {
    if (!entriesByTicker.has(e.ticker)) entriesByTicker.set(e.ticker, [])
    entriesByTicker.get(e.ticker)!.push(e)
    if (e.cusip.length >= 6) {
      const base = e.cusip.slice(0, 6)
      if (!tickersByBase6.has(base)) tickersByBase6.set(base, new Set())
      tickersByBase6.get(base)!.add(e.ticker)
    }
    if (e.cusip) {
      if (!entriesByCusip.has(e.cusip)) entriesByCusip.set(e.cusip, [])
      entriesByCusip.get(e.cusip)!.push(e)
    }
  }

  // Verstümmelte 7/8-stellige CUSIPs aus Filings reparieren: manche Filer
  // lassen führende Nullen oder den Buchstaben im Issuer-Code weg
  // (46625100 → 46625H100 JPMorgan). Kandidat = bekannte 9-stellige CUSIP,
  // die durch Entfernen genau eines Zeichens (bzw. Padding mit Nullen)
  // die verstümmelte Form ergibt. Nur bei eindeutigem Treffer + Namens-Match.
  const NAME_NOISE = new Set(['THE', 'A', 'AN'])
  function firstCoreWord(name: string): string {
    const words = name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => !NAME_NOISE.has(w))
    const w = words[0] || ''
    return w.length >= 3 ? w : ''
  }

  function repairMangledCusip(
    cusip: string,
    holdingNames: Set<string>
  ): StockEntry | null {
    if (cusip.length < 7 || cusip.length > 8) return null
    const candidates = new Map<string, StockEntry>()
    const padded = cusip.padStart(9, '0')
    for (const [known, entries] of entriesByCusip) {
      if (known.length !== 9) continue
      let matches = known === padded
      if (!matches && cusip.length === 8) {
        // Ergibt das Entfernen genau eines Zeichens aus der bekannten CUSIP
        // die verstümmelte Form?
        for (let i = 0; i < 9; i++) {
          if (known.slice(0, i) + known.slice(i + 1) === cusip) {
            matches = true
            break
          }
        }
      }
      if (matches) {
        for (const e of entries) candidates.set(e.ticker, e)
      }
    }
    // Namens-Guard vor der Eindeutigkeitsprüfung: bei mehreren Kandidaten
    // (88160101 passt auf THO 885160101 UND TSLA 88160R101) entscheidet
    // der Positionsname aus dem Filing ("Tesla Motors" → TSLA)
    const holdingWords = new Set([...holdingNames].map(firstCoreWord).filter(Boolean))
    const nameMatched = [...candidates.values()].filter(e => {
      const w = firstCoreWord(e.name)
      return w !== '' && holdingWords.has(w)
    })
    return nameMatched.length === 1 ? nameMatched[0] : null
  }
  console.log(`Einträge in stocks*.ts: ${stockEntries.length} (${knownCusips.size} eindeutige CUSIPs)`)

  const unknown = [...holdingsCusips.keys()].filter(c => !knownCusips.has(c)).sort()
  console.log(`Unbekannte CUSIPs: ${unknown.length}\n`)

  const updated: string[] = []
  const appended: string[] = []
  const unresolved: string[] = []
  const newEntries: string[] = []
  // CUSIPs, die in diesem Lauf bereits einem Ticker zugewiesen wurden
  const assignedInRun = new Set<string>()

  let processed = 0
  for (const cusip of unknown) {
    processed++
    if (processed % 50 === 0) {
      console.log(`… ${processed}/${unknown.length} verarbeitet`)
    }
    const holdingInfo = holdingsCusips.get(cusip)!
    const holdingLabel = [...holdingInfo.names].join(' | ') || '?'

    let ticker: string | null = null
    let fallbackName = ''
    let viaIssuerMatch = false
    let viaRepair = false

    const hit = await lookupCusip(cusip)
    if (hit) {
      ticker = hit.ticker
      fallbackName = hit.company
    } else {
      const repaired = repairMangledCusip(cusip, holdingInfo.names)
      if (repaired) {
        ticker = repaired.ticker
        fallbackName = repaired.name
        viaRepair = true
      } else if (cusip.length === 9) {
        // Issuer-Fallback: gleiche 6-stellige Emittenten-Basis wie ein bekannter
        // Eintrag (Convertibles/Notes, z.B. 594972AS0 → MSTR/Strategy Inc)
        const base = cusip.slice(0, 6)
        const candidates = tickersByBase6.get(base)
        if (candidates && candidates.size === 1) {
          ticker = [...candidates][0]
          viaIssuerMatch = true
        } else if (candidates && candidates.size > 1 && /[A-Z]/.test(cusip.slice(6, 8))) {
          // Anleihen-CUSIP (Buchstaben im Issue-Code) bei mehreren Tickern
          // derselben Basis: zur Stammaktie zuordnen. Die hat den niedrigsten
          // numerischen Issue-Code (meist 10x), Preferred/Notes liegen höher
          // (594972AS0 → MSTR 594972408, nicht STRK 594972AE1;
          //  842587DZ7 → SO 842587107, nicht Baby-Bond SOJD 842587800)
          let bestTicker: string | null = null
          let bestIssue = Infinity
          let tie = false
          for (const t of candidates) {
            for (const e of entriesByTicker.get(t) ?? []) {
              if (!e.cusip.startsWith(base)) continue
              const issueCode = e.cusip.slice(6, 8)
              if (!/^\d\d$/.test(issueCode)) continue
              const issue = parseInt(issueCode, 10)
              if (issue < bestIssue) {
                bestIssue = issue
                bestTicker = t
                tie = false
              } else if (issue === bestIssue && t !== bestTicker) {
                tie = true
              }
            }
          }
          if (bestTicker && !tie) {
            ticker = bestTicker
            viaIssuerMatch = true
          }
        }
      }
    }

    if (!ticker) {
      unresolved.push(`${cusip}  ${holdingLabel}`)
      continue
    }

    const existing = entriesByTicker.get(ticker) ?? []

    // Name/Sektor bestimmen
    let name = fallbackName
    let sector = ''
    if ((viaIssuerMatch || viaRepair) && existing.length > 0) {
      // Emittent ist bereits bekannt → Name aus dem bestehenden Eintrag
      name = existing[0].name
    } else {
      const profile = await fetchProfile(ticker)
      if (profile) {
        name = profile.companyName || name
        sector = profile.sector || ''
      }
    }
    if (!name) name = holdingLabel

    if (viaRepair && existing.length > 0) {
      // Alias für die verstümmelte Schreibweise anhängen; der echte Eintrag
      // behält seine korrekte CUSIP
      newEntries.push(makeEntry(ticker, cusip, name, sector))
      appended.push(`${ticker}  ${cusip}  ${name}  [CUSIP-Reparatur]`)
      existing.push({ ticker, cusip, name, file: APPEND_FILE })
      assignedInRun.add(cusip)
      continue
    }

    if (existing.length === 0) {
      // Neuer Ticker → anhängen (auch bei mehreren CUSIPs desselben neuen Tickers)
      newEntries.push(makeEntry(ticker, cusip, name, sector))
      appended.push(`${ticker}  ${cusip}  ${name}${viaIssuerMatch ? '  [Issuer-Match]' : ''}`)
      entriesByTicker.set(ticker, [{ ticker, cusip, name, file: APPEND_FILE }])
      assignedInRun.add(cusip)
      continue
    }

    const emptyEntry = existing.find(e => e.cusip === '')
    if (emptyEntry) {
      // Bestehender Eintrag ohne CUSIP → befüllen
      if (setCusipInFile(emptyEntry.file, ticker, '', cusip)) {
        updated.push(`${ticker}  '' → ${cusip}  (${emptyEntry.file})`)
        emptyEntry.cusip = cusip
        assignedInRun.add(cusip)
      } else {
        unresolved.push(`${cusip}  ${holdingLabel}  [Patch fehlgeschlagen: ${ticker}]`)
      }
      continue
    }

    // Ist eine der alten CUSIPs dieses Tickers in den 2026-Filings noch aktiv?
    const oldCusipStillLive = existing.some(
      e => e.cusip && (holdingsCusips.has(e.cusip) || assignedInRun.has(e.cusip))
    )

    if (oldCusipStillLive || viaIssuerMatch) {
      // Parallel gültige Wertpapiere (ADR/Ordinary, Aktie/Convertible):
      // zusätzlicher Eintrag, bestehenden nicht überschreiben
      newEntries.push(makeEntry(ticker, cusip, name, sector))
      appended.push(`${ticker}  ${cusip}  ${name}${viaIssuerMatch ? '  [Issuer-Match]' : '  [Zusatz-CUSIP]'}`)
      existing.push({ ticker, cusip, name, file: APPEND_FILE })
      assignedInRun.add(cusip)
    } else {
      // Echter CUSIP-Wechsel (alte CUSIP taucht 2026 nicht mehr auf) → aktualisieren
      const target = existing[0]
      if (setCusipInFile(target.file, ticker, target.cusip, cusip)) {
        updated.push(`${ticker}  ${target.cusip} → ${cusip}  (${target.file})`)
        target.cusip = cusip
        assignedInRun.add(cusip)
      } else {
        unresolved.push(`${cusip}  ${holdingLabel}  [Patch fehlgeschlagen: ${ticker}]`)
      }
    }
  }

  appendEntries(newEntries)

  console.log(`\n=== Ergebnis ===`)
  console.log(`Aktualisierte Einträge: ${updated.length}`)
  for (const u of updated) console.log(`  ~ ${u}`)
  console.log(`\nNeu angehängt in ${APPEND_FILE}: ${appended.length}`)
  for (const a of appended) console.log(`  + ${a}`)
  console.log(`\nNicht auflösbar: ${unresolved.length}`)
  for (const u of unresolved) console.log(`  ? ${u}`)

  if (DRY_RUN) {
    console.log('\n(DRY-RUN: keine Dateien geschrieben)')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
