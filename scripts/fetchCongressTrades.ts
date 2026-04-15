#!/usr/bin/env npx tsx
// Eigener Congress-Trades Scraper — KEIN FMP, KEINE externen APIs
// Quelle: House Clerk Disclosures (disclosures-clerk.house.gov)
// Parst die offiziellen PTR (Periodic Transaction Report) PDFs
//
// Usage: npx tsx scripts/fetchCongressTrades.ts [--year 2026] [--force]

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const OUT_DIR = path.join(process.cwd(), 'src/data/politician-trades')
const INDEX_PATH = path.join(OUT_DIR, 'index.json')
const HOUSE_BASE = 'https://disclosures-clerk.house.gov'
const PDF_DIR = path.join(process.cwd(), '.cache/ptr-pdfs')

// ── Helpers ──────────────────────────────────────────────────────────────────

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

interface ParsedTrade {
  ticker: string; assetDescription: string; type: 'purchase' | 'sale' | 'exchange'
  transactionDate: string; disclosureDate: string; amount: string
  owner: string; capitalGains: boolean
}

interface PoliticianFile {
  slug: string; name: string; chamber: string; state: string
  trades: any[]
}

// ── 1. Index-Datei laden ─────────────────────────────────────────────────────

async function fetchHouseIndex(year: number): Promise<{ last: string; first: string; state: string; docId: string; filingDate: string; filingType: string }[]> {
  const url = `${HOUSE_BASE}/public_disc/financial-pdfs/${year}FD.txt`
  console.log(`📥 Lade House Clerk Index für ${year}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed: ${res.status}`)
  const text = await res.text()

  const lines = text.split('\n').slice(1) // Header überspringen
  const entries: any[] = []

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 9) continue
    const [prefix, last, first, suffix, filingType, stateDst, yr, filingDate, docId] = parts

    // Nur PTRs (Periodic Transaction Reports) = die eigentlichen Trades
    if (filingType !== 'P') continue

    const state = (stateDst || '').substring(0, 2)
    entries.push({ last: last?.trim(), first: first?.trim(), state, docId: docId?.trim(), filingDate: filingDate?.trim(), filingType })
  }

  console.log(`   ${entries.length} PTR-Filings gefunden`)
  return entries
}

// ── 2. PDF herunterladen ─────────────────────────────────────────────────────

async function downloadPDF(docId: string, year: number): Promise<string | null> {
  const pdfPath = path.join(PDF_DIR, `${docId}.pdf`)
  if (fs.existsSync(pdfPath)) return pdfPath // Cache

  const url = `${HOUSE_BASE}/public_disc/ptr-pdfs/${year}/${docId}.pdf`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Finclue/1.0 (info@finclue.de)' } })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    fs.writeFileSync(pdfPath, Buffer.from(buffer))
    return pdfPath
  } catch {
    return null
  }
}

// ── 3. PDF parsen ────────────────────────────────────────────────────────────

function parsePTR(pdfPath: string): { name: string; state: string; trades: ParsedTrade[] } {
  // pdftotext mit Layout-Option für strukturierte Extraktion
  let text: string
  try {
    text = execSync(`pdftotext -layout "${pdfPath}" -`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
  } catch {
    return { name: '', state: '', trades: [] }
  }

  const lines = text.split('\n')

  // Name extrahieren
  let name = ''
  let state = ''
  for (const l of lines) {
    const nameMatch = l.match(/Name:\s+(Hon\.\s+)?(.+?)(?:\s{2,}|$)/)
    if (nameMatch) { name = nameMatch[2].trim(); continue }
    const stateMatch = l.match(/State\/District:\s*([A-Z]{2})/)
    if (stateMatch) { state = stateMatch[1]; break }
  }

  // Trades extrahieren — robuster Parser
  // Strategie: Joinen wir den gesamten Text und suchen per Regex nach Trade-Blöcken
  const trades: ParsedTrade[] = []

  const parseDate = (d: string): string => {
    const [m, day, y] = d.split('/')
    if (!m || !day || !y) return ''
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Gesamten Text als ein String behandeln (Zeilenumbrüche durch Spaces ersetzen)
  // Aber wir behalten die Zeilen auch separat für Kontext
  const fullText = lines.join(' ').replace(/\s+/g, ' ')

  // Hauptstrategie: Finde alle Vorkommen von (TICKER) gefolgt von [XX] und dann P/S/E + Dates + Amount
  // Das Pattern kann über mehrere Zeilen verteilt sein, daher suchen wir im fullText

  // Zwei Strategien parallel:
  // 1. Ticker + [XX] auf GLEICHER Zeile (altes Format) — suche P/S/E + dates danach
  // 2. Ticker auf einer Zeile, [XX] auf nächster (neues Format) — suche in fullText

  // Strategy 1: Per-line mit breitem Kontext (Originalformat)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const tickerMatch = line.match(/\(([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\)/)
    if (!tickerMatch) continue
    const ticker = tickerMatch[1]

    // Asset-Code in der Nähe (0-2 Zeilen)
    const nearby = lines.slice(i, Math.min(i + 3, lines.length)).join(' ')
    const codeMatch = nearby.match(/\[([A-Z]{2})\]/)
    if (!codeMatch) continue
    if (['GS', 'TR', 'BK'].includes(codeMatch[1])) continue

    // Transaction Type + Dates + Amount (bis zu 5 Zeilen)
    const wide = lines.slice(i, Math.min(i + 6, lines.length)).join(' ')
    const tm = wide.match(/[-\s](P|S|E)\s*(?:\(partial\))?\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\$[\d,]+\s*-\s*\$[\d,]+|Over \$[\d,]+)/)
    if (!tm) continue

    const assetEnd = line.indexOf(`(${ticker})`)
    const assetDescription = assetEnd > 0 ? line.substring(0, assetEnd).trim() : ''
    const ownerCtx = lines.slice(Math.max(0, i - 1), i + 1).join(' ').toUpperCase()
    let owner = 'self'
    if (/\bSP\b/.test(ownerCtx)) owner = 'Spouse'
    else if (/\bJT\b/.test(ownerCtx)) owner = 'Joint'
    else if (/\bDC\b/.test(ownerCtx)) owner = 'Dependent Child'

    trades.push({
      ticker,
      assetDescription: assetDescription.replace(/^\s+/, '').substring(0, 80),
      type: tm[1] === 'P' ? 'purchase' : tm[1] === 'S' ? 'sale' : 'exchange',
      transactionDate: parseDate(tm[2]),
      disclosureDate: parseDate(tm[3]),
      amount: tm[4].replace(/\s+/g, ' '),
      owner,
      capitalGains: false,
    })
  }

  // Strategy 2: fullText scan für Fälle die per-line nicht gematcht haben
  const tradeRegex = /\(([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\).{0,120}\[([A-Z]{2})\].{0,80}?(P|S|E)\s*(?:\(partial\))?\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\$[\d,]+\s*-\s*\$[\d,]+|Over \$[\d,]+)/g

  let match: RegExpExecArray | null
  while ((match = tradeRegex.exec(fullText)) !== null) {
    const ticker = match[1]
    const assetCode = match[2]
    const rawType = match[3]
    const transDate = parseDate(match[4])
    const notifDate = parseDate(match[5])
    const amount = match[6].replace(/\s+/g, ' ')

    if (!transDate || !notifDate) continue
    // Nur Stocks, Options, ETFs etc. — keine Government Securities
    if (['GS', 'TR', 'BK'].includes(assetCode)) continue

    // Asset-Beschreibung: Text vor dem Ticker im Kontext
    const beforeTicker = fullText.substring(Math.max(0, match.index - 100), match.index)
    const assetDescription = beforeTicker.replace(/.*(?:SP|JT|DC|self)\s+/, '').replace(/.*\$[\d,]+.*?\s{2,}/, '').trim()

    // Owner: Suche 'SP', 'JT', 'DC' vor dem Ticker
    const ownerContext = fullText.substring(Math.max(0, match.index - 20), match.index + 10).toUpperCase()
    let owner = 'self'
    if (/\bSP\b/.test(ownerContext)) owner = 'Spouse'
    else if (/\bJT\b/.test(ownerContext)) owner = 'Joint'
    else if (/\bDC\b/.test(ownerContext)) owner = 'Dependent Child'

    trades.push({
      ticker,
      assetDescription: assetDescription.substring(assetDescription.length - 60).trim(),
      type: rawType === 'P' ? 'purchase' : rawType === 'S' ? 'sale' : 'exchange',
      transactionDate: transDate,
      disclosureDate: notifDate,
      amount,
      owner,
      capitalGains: false,
    })
  }

  // Deduplizierung (manche Trades tauchen doppelt auf durch overlappende Matches)
  const seen = new Set<string>()
  const uniqueTrades = trades.filter(t => {
    const key = `${t.transactionDate}|${t.ticker}|${t.type}|${t.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { name, state, trades: uniqueTrades }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const yearArg = args.indexOf('--year')
  const currentYear = new Date().getFullYear()
  const years = yearArg >= 0 ? [parseInt(args[yearArg + 1])] : [currentYear, currentYear - 1]
  const force = args.includes('--force')

  console.log('🏛️  Finclue — Congress Trades Scraper (Eigene Daten, kein FMP)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   Jahre: ${years.join(', ')}`)

  // PDF Cache-Verzeichnis
  fs.mkdirSync(PDF_DIR, { recursive: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Bestehende Daten laden (für Merge)
  const existingData = new Map<string, PoliticianFile>()
  if (!force) {
    const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json') && f !== 'index.json')
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf-8'))
        if (data.slug) existingData.set(data.slug, data)
      } catch { /* skip */ }
    }
    console.log(`   Bestehende Daten: ${existingData.size} Politiker`)
  }

  // Alle Jahre scrapen
  let totalNewTrades = 0

  for (const year of years) {
    const filings = await fetchHouseIndex(year)
    console.log(`\n📋 ${year}: ${filings.length} PTR-Filings`)

    let processed = 0, failed = 0

    for (const filing of filings) {
      const pdfPath = await downloadPDF(filing.docId, year)
      if (!pdfPath) { failed++; continue }

      const result = parsePTR(pdfPath)
      if (!result.name || result.trades.length === 0) { failed++; continue }

      const slug = nameToSlug(result.name)
      const fullName = result.name
      const st = result.state || filing.state

      // In bestehende Daten mergen
      if (!existingData.has(slug)) {
        existingData.set(slug, { slug, name: fullName, chamber: 'house', state: st, trades: [] })
      }

      const pol = existingData.get(slug)!

      // Trades deduplizieren
      const existingKeys = new Set(pol.trades.map((t: any) => `${t.transactionDate}|${t.ticker}|${t.type}`))
      let newCount = 0
      for (const trade of result.trades) {
        const key = `${trade.transactionDate}|${trade.ticker}|${trade.type}`
        if (!existingKeys.has(key)) {
          pol.trades.push({
            disclosureYear: trade.disclosureDate.substring(0, 4),
            disclosureDate: trade.disclosureDate,
            transactionDate: trade.transactionDate,
            owner: trade.owner,
            ticker: trade.ticker,
            assetDescription: trade.assetDescription,
            type: trade.type,
            typeRaw: trade.type === 'purchase' ? 'Purchase' : trade.type === 'sale' ? 'Sale' : 'Exchange',
            amount: trade.amount,
            representative: fullName,
            district: filing.state + (filing.state ? '' : ''),
            link: `${HOUSE_BASE}/public_disc/ptr-pdfs/${trade.disclosureDate.substring(0, 4)}/${filing.docId}.pdf`,
            capitalGainsOver200USD: trade.capitalGains ? 'True' : 'False',
            slug,
            state: st,
            chamber: 'house',
          })
          existingKeys.add(key)
          newCount++
        }
      }
      totalNewTrades += newCount
      processed++

      if (processed % 20 === 0) {
        process.stdout.write(`   ${processed}/${filings.length} PDFs verarbeitet (${totalNewTrades} neue Trades)\r`)
      }

      // Rate limit
      await sleep(100)
    }

    console.log(`   ✅ ${year}: ${processed} PDFs verarbeitet, ${failed} fehlgeschlagen`)
  }

  // Speichern
  console.log(`\n💾 Speichere ${existingData.size} Politiker...`)

  const indexEntries: any[] = []

  for (const [slug, data] of existingData) {
    // Sortiere Trades nach Datum (neueste zuerst)
    data.trades.sort((a: any, b: any) => (b.transactionDate || '').localeCompare(a.transactionDate || ''))

    // Datei speichern
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(data, null, 2))

    // Index-Eintrag
    const recentTickers = [...new Set(data.trades.slice(0, 10).map((t: any) => t.ticker).filter(Boolean))]
    indexEntries.push({
      slug,
      name: data.name,
      chamber: data.chamber || 'house',
      state: data.state || '',
      tradeCount: data.trades.length,
      lastTradeDate: data.trades[0]?.transactionDate || '',
      recentTickers: recentTickers.slice(0, 5),
    })
  }

  // Index sortieren nach Trades
  indexEntries.sort((a, b) => b.tradeCount - a.tradeCount)

  // Bestehende Index-Felder (bioguideId, photoUrl, party) erhalten
  const oldIndex = (() => {
    try { return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8')) } catch { return [] }
  })()
  const oldMap = new Map<string, any>()
  for (const p of oldIndex) oldMap.set(p.slug, p)

  for (const entry of indexEntries) {
    const old = oldMap.get(entry.slug)
    if (old) {
      if (old.bioguideId) entry.bioguideId = old.bioguideId
      if (old.photoUrl) entry.photoUrl = old.photoUrl
      if (old.party) entry.party = old.party
    }
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify(indexEntries, null, 2))

  console.log(`\n📊 Ergebnis:`)
  console.log(`   Politiker: ${existingData.size}`)
  console.log(`   Neue Trades: ${totalNewTrades}`)
  console.log(`   Gesamt-Trades: ${indexEntries.reduce((s, e) => s + e.tradeCount, 0)}`)
  console.log(`   Top 5:`)
  for (const p of indexEntries.slice(0, 5)) {
    console.log(`     ${p.name}: ${p.tradeCount} trades (${p.state})`)
  }
}

main().catch(console.error)
