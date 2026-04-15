// scripts/fetchPoliticianTrades.js
// Lädt US-Kongress Aktien-Trades und speichert sie lokal
//
// Datenquellen (in Priorität):
//  1. House Stock Watcher  – https://housestockwatcher.com   (House-Mitglieder, seit 2012)
//  2. Senate Stock Watcher – https://senatestockwatcher.com  (Senatoren, seit 2012)
//  3. FMP Senate RSS       – API-Key nötig (nur ~letzten 7 Monate, aber zuverlässig)
//
// Speichert Ergebnisse in src/data/politician-trades/
// Ausführen: npm run fetch:politician-trades

import fetch from 'node-fetch'
import fs from 'fs/promises'
import path from 'path'
import { createWriteStream } from 'fs'

const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE = 'https://financialmodelingprep.com/api/v4'
const OUT_DIR = path.resolve('src/data/politician-trades')
const FMP_MAX_PAGES = 30 // FMP hat max ~30 Seiten à 100 Trades

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function nameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function getStateFromDistrict(district = '') {
  const m = district.match(/^([A-Z]{2})/i)
  return m ? m[1].toUpperCase() : ''
}

function normalizeType(raw = '') {
  const t = raw.toLowerCase()
  if (t.includes('purchase') || t.includes('buy')) return 'purchase'
  if (t.includes('sale') || t.includes('sell')) return 'sale'
  if (t.includes('exchange')) return 'exchange'
  return raw
}

function cleanTicker(ticker = '') {
  const t = ticker.replace(/^\$/, '').trim()
  if (t === '--' || t.toLowerCase() === 'n/a' || t === '') return ''
  return t.toUpperCase()
}

/** Normalisiert einen House-Watcher-Eintrag */
function normalizeHouse(t) {
  return {
    disclosureYear: (t.disclosure_date || '').slice(0, 4),
    disclosureDate: t.disclosure_date || '',
    transactionDate: t.transaction_date || '',
    owner: t.owner || 'self',
    ticker: cleanTicker(t.ticker),
    assetDescription: t.asset_description || t.description || '',
    type: normalizeType(t.type),
    typeRaw: t.type || '',
    amount: t.amount || '',
    representative: t.representative || '',
    district: t.district || '',
    link: t.ptr_link || t.link || '',
    capitalGainsOver200USD: String(t.capital_gains_over_200_usd ?? ''),
    slug: nameToSlug(t.representative || ''),
    state: getStateFromDistrict(t.district),
    chamber: 'house',
  }
}

/** Normalisiert einen Senate-Watcher-Eintrag */
function normalizeSenate(t) {
  return {
    disclosureYear: (t.disclosure_date || '').slice(0, 4),
    disclosureDate: t.disclosure_date || '',
    transactionDate: t.transaction_date || '',
    owner: t.owner || 'self',
    ticker: cleanTicker(t.ticker),
    assetDescription: t.asset_description || '',
    type: normalizeType(t.type),
    typeRaw: t.type || '',
    amount: t.amount || '',
    representative: t.senator || t.representative || '',
    district: t.state || '',
    link: t.ptr_link || '',
    capitalGainsOver200USD: '',
    slug: nameToSlug(t.senator || t.representative || ''),
    state: t.state || getStateFromDistrict(t.state || ''),
    chamber: 'senate',
  }
}

/** Normalisiert einen FMP Senate RSS Eintrag */
function normalizeFmp(t) {
  return {
    disclosureYear: (t.disclosureDate || t.transactionDate || '').slice(0, 4),
    disclosureDate: t.disclosureDate || '',
    transactionDate: t.transactionDate || '',
    owner: t.owner || 'self',
    ticker: cleanTicker(t.ticker),
    assetDescription: t.assetDescription || '',
    type: normalizeType(t.type),
    typeRaw: t.type || '',
    amount: t.amount || '',
    representative: t.representative || '',
    district: t.district || '',
    link: t.link || '',
    capitalGainsOver200USD: t.capitalGainsOver200USD || '',
    slug: nameToSlug(t.representative || ''),
    state: getStateFromDistrict(t.district || ''),
    chamber: 'senate', // FMP-Feed enthält hauptsächlich Senate-Daten
  }
}

// ── Fetch-Funktionen ─────────────────────────────────────────────────────────

async function tryFetch(url, label, timeoutMs = 30000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Finclue/1.0 (info@finclue.de)',
        Accept: 'application/json, */*',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    console.log(`  ✓ ${label}: ${data.length.toLocaleString('de')} Einträge`)
    return data
  } catch (e) {
    clearTimeout(timer)
    return null
  }
}

/** House Stock Watcher – kostenlos, seit 2012 */
async function fetchHouseWatcher() {
  console.log('↓  House Stock Watcher...')
  // Primäre URL
  let data = await tryFetch(
    'https://housestockwatcher.com/api',
    'housestockwatcher.com/api'
  )
  if (data) return data.map(normalizeHouse)

  // Alternativer direkter Download-Link (CSV→JSON kann abweichen, daher separater Versuch)
  data = await tryFetch(
    'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json',
    'S3 house-stock-watcher'
  )
  if (data) return data.map(normalizeHouse)

  console.log('  ✗ House Stock Watcher nicht erreichbar (eventuell VPN/Netzwerk)')
  return []
}

/** Senate Stock Watcher – kostenlos, seit 2012 */
async function fetchSenateWatcher() {
  console.log('↓  Senate Stock Watcher...')
  let data = await tryFetch(
    'https://senatestockwatcher.com/api',
    'senatestockwatcher.com/api'
  )
  if (data) return data.map(normalizeSenate)

  data = await tryFetch(
    'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json',
    'S3 senate-stock-watcher'
  )
  if (data) return data.map(normalizeSenate)

  console.log('  ✗ Senate Stock Watcher nicht erreichbar')
  return []
}

/** FMP Senate RSS – alle verfügbaren Seiten (max ~30 × 100 Trades) */
async function fetchFmpAllPages() {
  if (!FMP_API_KEY) {
    console.log('  ✗ FMP_API_KEY fehlt – FMP-Daten werden übersprungen')
    return []
  }

  console.log(`↓  FMP Senate RSS (bis zu ${FMP_MAX_PAGES} Seiten)...`)
  const allTrades = []

  for (let page = 0; page < FMP_MAX_PAGES; page++) {
    const url = `${FMP_BASE}/senate-disclosure-rss-feed?page=${page}&apikey=${FMP_API_KEY}`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Finclue/1.0' },
      })
      if (!res.ok) break
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) break
      allTrades.push(...data.map(normalizeFmp))
      process.stdout.write(`  Seite ${page + 1}/${FMP_MAX_PAGES}: ${allTrades.length} Trades geladen\r`)
    } catch {
      break
    }
  }

  console.log(`\n  ✓ FMP: ${allTrades.length.toLocaleString('de')} Trades (Senate)`)
  return allTrades
}

// ── Speicher-Funktionen ──────────────────────────────────────────────────────

/** Dedupliziert Trades anhand von transactionDate + ticker + type + representative */
function deduplicateTrades(trades) {
  const seen = new Set()
  return trades.filter(t => {
    const key = `${t.transactionDate}|${t.ticker}|${t.type}|${t.slug}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Erstellt Index-Eintrag pro Politiker */
function buildIndex(bySlug) {
  return Array.from(bySlug.values())
    .map(pol => ({
      slug: pol.slug,
      name: pol.name,
      chamber: pol.chamber,
      state: pol.state,
      tradeCount: pol.trades.length,
      lastTradeDate: pol.trades[0]?.transactionDate || pol.trades[0]?.disclosureDate || '',
      recentTickers: [
        ...new Set(
          pol.trades
            .slice(0, 30)
            .map(t => t.ticker)
            .filter(Boolean)
        ),
      ].slice(0, 5),
    }))
    .sort((a, b) => b.lastTradeDate.localeCompare(a.lastTradeDate))
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('🏛️  Finclue – Politiker-Trades Fetch')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await fs.mkdir(OUT_DIR, { recursive: true })

  // 1) Daten laden — Priorität: House/Senate Watcher, Fallback: FMP
  const [houseTrades, senateTrades] = await Promise.all([
    fetchHouseWatcher(),
    fetchSenateWatcher(),
  ])

  // 2) Zusammenführen und deduplizieren
  const watcherTrades = [...houseTrades, ...senateTrades]
  const hasWatcherData = watcherTrades.length > 100

  let allTrades
  if (hasWatcherData) {
    allTrades = deduplicateTrades(watcherTrades)
    console.log(`\n→ Quellen: House Watcher (${houseTrades.length}) + Senate Watcher (${senateTrades.length})`)
  } else {
    // Fallback: FMP wenn Watcher nicht erreichbar
    console.log('\n⚠️  Watcher nicht erreichbar — versuche FMP als Fallback...')
    const fmpTrades = await fetchFmpAllPages()
    if (fmpTrades.length > 0) {
      allTrades = deduplicateTrades(fmpTrades)
      console.log(`→ FMP-Fallback: ${fmpTrades.length} Trades geladen`)
    } else {
      allTrades = []
      console.log('→ Keine Daten verfügbar. Bestehende Daten bleiben erhalten.')
    }
  }

  console.log(`→ Gesamt nach Deduplizierung: ${allTrades.length.toLocaleString('de')} Trades`)

  // 3) Nach Politiker gruppieren
  const bySlug = new Map()
  for (const trade of allTrades) {
    if (!trade.slug || !trade.representative) continue
    if (!bySlug.has(trade.slug)) {
      bySlug.set(trade.slug, {
        slug: trade.slug,
        name: trade.representative,
        chamber: trade.chamber,
        state: trade.state,
        trades: [],
      })
    }
    bySlug.get(trade.slug).trades.push(trade)
  }

  // 4) Trades pro Politiker sortieren (neueste zuerst)
  for (const pol of bySlug.values()) {
    pol.trades.sort((a, b) =>
      (b.transactionDate || b.disclosureDate).localeCompare(
        a.transactionDate || a.disclosureDate
      )
    )
  }

  console.log(`→ ${bySlug.size} einzigartige Politiker`)

  // 5) Index speichern
  const index = buildIndex(bySlug)
  const indexPath = path.join(OUT_DIR, 'index.json')
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8')
  console.log(`\n✓ Index: ${indexPath}`)

  // 6) Pro Politiker JSON speichern
  let saved = 0
  for (const pol of bySlug.values()) {
    const filePath = path.join(OUT_DIR, `${pol.slug}.json`)
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          slug: pol.slug,
          name: pol.name,
          chamber: pol.chamber,
          state: pol.state,
          trades: pol.trades,
        },
        null,
        2
      ),
      'utf8'
    )
    saved++
    if (saved % 100 === 0) process.stdout.write(`  ${saved}/${bySlug.size} Politiker gespeichert...\r`)
  }

  // 7) Statistik
  const years = [...new Set(allTrades.map(t => t.disclosureYear).filter(Boolean))].sort()
  const buys = allTrades.filter(t => t.type === 'purchase').length
  const sells = allTrades.filter(t => t.type === 'sale').length

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Fertig! ${saved} Politiker-Dateien gespeichert`)
  console.log(`\n📊 Statistik:`)
  console.log(`   Trades:    ${allTrades.length.toLocaleString('de')}`)
  console.log(`   Käufe:     ${buys.toLocaleString('de')}`)
  console.log(`   Verkäufe:  ${sells.toLocaleString('de')}`)
  console.log(`   Zeitraum:  ${years[0] || '?'} – ${years[years.length - 1] || '?'}`)
  console.log(`   Politiker: ${bySlug.size}`)

  console.log(`\n🏆 Top 10 Politiker nach letztem Trade:`)
  index.slice(0, 10).forEach((p, i) =>
    console.log(`   ${i + 1}. ${p.name.padEnd(28)} ${p.tradeCount} Trades  ${p.lastTradeDate}`)
  )
}

run().catch(err => {
  console.error('\n❌ Fehler:', err.message || err)
  process.exit(1)
})
