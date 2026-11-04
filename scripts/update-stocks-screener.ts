// scripts/update-stocks-screener.ts
// Lädt alle US-Stocks mit umfangreichen Metriken für den Stock Finder
// Ausführen: npm run update-screener
// Einzelne Ticker nachtragen (z.B. frische IPOs), ohne Voll-Lauf:
//   npm run update-screener -- --symbols=INIO,SPCX

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Lade .env.local
config({ path: '.env.local' })

const API_KEY = process.env.FMP_API_KEY
if (!API_KEY) {
  console.error('❌ Bitte setze die Umgebungsvariable FMP_API_KEY in .env.local')
  process.exit(1)
}

// ============================================
// KONFIGURATION - Hier einfach erweiterbar
// ============================================

const CONFIG = {
  // Anzahl Stocks (0 = alle)
  maxStocks: 0, // Alle Stocks

  // Batch-Größe für API Calls
  batchSize: 50,

  // Pause zwischen Batches (ms) - Rate Limiting
  batchDelay: 1000,

  // Pause zwischen einzelnen Calls (ms)
  callDelay: 100,

  // Output-Pfad
  outputPath: 'public/data/stocks-screener.json',

  // Checkpoint-Pfad (für Resume bei Abbruch)
  checkpointPath: 'scripts/.stocks-screener-checkpoint.json',
}

// ============================================
// TYPEN
// ============================================

interface ScreenerStock {
  // Identifikation
  symbol: string
  name: string
  sector: string
  industry: string
  exchange: string
  country: string

  // Preis & Bewertung
  price: number | null
  marketCap: number | null
  pe: number | null
  forwardPe: number | null
  eps: number | null
  priceToBook: number | null
  priceToSales: number | null
  evToEbitda: number | null
  pegRatio: number | null

  // Dividende
  dividendYield: number | null
  dividendGrowth5Y: number | null
  payoutRatio: number | null

  // Growth
  revenueGrowth1Y: number | null
  revenueGrowth3Y: number | null
  revenueGrowth5Y: number | null
  epsGrowth1Y: number | null
  epsGrowth3Y: number | null
  epsGrowth5Y: number | null
  fcfGrowth3Y: number | null

  // Profitabilität
  grossMargin: number | null
  operatingMargin: number | null
  netProfitMargin: number | null
  roe: number | null
  roa: number | null
  roic: number | null

  // Finanzielle Gesundheit
  debtToEquity: number | null
  currentRatio: number | null
  quickRatio: number | null
  interestCoverage: number | null

  // Meta
  updatedAt: string
}

// ============================================
// API URLS
// ============================================

const API = {
  screener: `https://financialmodelingprep.com/api/v3/stock-screener?isEtf=false&isActivelyTrading=true&limit=10000&apikey=${API_KEY}`,
  quote: (symbols: string) => `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`,
  keyMetrics: (symbol: string) => `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${API_KEY}`,
  ratios: (symbol: string) => `https://financialmodelingprep.com/api/v3/ratios-ttm/${symbol}?apikey=${API_KEY}`,
  growth: (symbol: string) => `https://financialmodelingprep.com/api/v3/financial-growth/${symbol}?limit=5&apikey=${API_KEY}`,
  profile: (symbol: string) => `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${API_KEY}`,
}

// ============================================
// HELPER FUNKTIONEN
// ============================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const safeNumber = (value: any): number | null => {
  if (value === null || value === undefined || isNaN(value)) return null
  const num = Number(value)
  return isFinite(num) ? num : null
}

const formatPercent = (value: any): number | null => {
  const num = safeNumber(value)
  if (num === null) return null
  // FMP gibt Dezimalwerte zurück (0.15 = 15%, 1.14 = 114%)
  // Wir konvertieren immer zu Prozent
  return num * 100
}

// Für Growth-Werte die bereits als Dezimal (0.15 = 15%) kommen
const formatGrowthPercent = (value: any): number | null => {
  const num = safeNumber(value)
  if (num === null) return null
  // Growth API gibt Dezimalwerte: 0.15 = 15% Wachstum, 1.14 = 114% Wachstum
  return Math.round(num * 100 * 100) / 100 // Auf 2 Dezimalstellen runden
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit - länger warten
          console.log('⏳ Rate limit erreicht, warte 60s...')
          await sleep(60000)
          continue
        }
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      if (i === retries - 1) throw error
      await sleep(1000 * (i + 1))
    }
  }
}

function loadCheckpoint(): { processedSymbols: Set<string>, stocks: ScreenerStock[] } {
  try {
    if (fs.existsSync(CONFIG.checkpointPath)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.checkpointPath, 'utf-8'))
      console.log(`📂 Checkpoint gefunden: ${data.stocks.length} Stocks bereits verarbeitet`)
      return {
        processedSymbols: new Set(data.processedSymbols),
        stocks: data.stocks
      }
    }
  } catch (e) {
    console.log('⚠️ Checkpoint konnte nicht geladen werden, starte neu')
  }
  return { processedSymbols: new Set(), stocks: [] }
}

function saveCheckpoint(processedSymbols: Set<string>, stocks: ScreenerStock[]) {
  const data = {
    processedSymbols: Array.from(processedSymbols),
    stocks,
    timestamp: new Date().toISOString()
  }
  fs.writeFileSync(CONFIG.checkpointPath, JSON.stringify(data), 'utf-8')
}

function deleteCheckpoint() {
  try {
    if (fs.existsSync(CONFIG.checkpointPath)) {
      fs.unlinkSync(CONFIG.checkpointPath)
    }
  } catch (e) { }
}

// ============================================
// DATEN LADEN
// ============================================

async function fetchAllStocks(): Promise<any[]> {
  console.log('📊 Lade Stock-Liste von FMP Screener...')
  const data = await fetchWithRetry(API.screener)

  // Erlaube US-Exchanges + XETRA (Deutschland)
  const allowedExchanges = ['NASDAQ', 'NYSE', 'AMEX', 'XETRA', 'EURONEXT', 'LSE', 'SIX']

  const baseStocks = data.filter((s: any) =>
    s.exchangeShortName &&
    (allowedExchanges.includes(s.exchangeShortName) || s.country === 'DE') &&
    s.symbol &&
    s.marketCap > 0 &&
    // Bei US-Stocks keine Punkte (ADRs), bei anderen (z.B. .DE) erlaubt
    (s.country === 'US' ? !s.symbol.includes('.') : true)
  )

  // Sortiere nach Market Cap (größte zuerst)
  baseStocks.sort((a: any, b: any) => (b.marketCap || 0) - (a.marketCap || 0))

  const limit = CONFIG.maxStocks > 0 ? CONFIG.maxStocks : baseStocks.length
  console.log(`✅ ${baseStocks.length} Stocks gefunden (Global), verarbeite ${limit}`)

  return baseStocks.slice(0, limit)
}

async function enrichStockData(baseStock: any): Promise<ScreenerStock> {
  const symbol = baseStock.symbol

  // Basis-Daten vom Screener
  const stock: ScreenerStock = {
    symbol,
    name: baseStock.companyName || '',
    sector: baseStock.sector || '',
    industry: baseStock.industry || '',
    exchange: baseStock.exchangeShortName || '',
    country: baseStock.country || 'US',

    price: safeNumber(baseStock.price),
    marketCap: safeNumber(baseStock.marketCap),
    pe: safeNumber(baseStock.pe),
    forwardPe: null,
    eps: null,
    priceToBook: null,
    priceToSales: null,
    evToEbitda: null,
    pegRatio: null,

    dividendYield: safeNumber(baseStock.lastAnnualDividend) && safeNumber(baseStock.price)
      ? (baseStock.lastAnnualDividend / baseStock.price) * 100
      : null,
    dividendGrowth5Y: null,
    payoutRatio: null,

    revenueGrowth1Y: null,
    revenueGrowth3Y: null,
    revenueGrowth5Y: null,
    epsGrowth1Y: null,
    epsGrowth3Y: null,
    epsGrowth5Y: null,
    fcfGrowth3Y: null,

    grossMargin: null,
    operatingMargin: null,
    netProfitMargin: null,
    roe: null,
    roa: null,
    roic: null,

    debtToEquity: null,
    currentRatio: null,
    quickRatio: null,
    interestCoverage: null,

    updatedAt: new Date().toISOString().split('T')[0]
  }

  try {
    // Key Metrics TTM laden
    await sleep(CONFIG.callDelay)
    const metricsData = await fetchWithRetry(API.keyMetrics(symbol))
    if (metricsData && metricsData[0]) {
      const m = metricsData[0]
      stock.pe = safeNumber(m.peRatioTTM) || stock.pe
      stock.priceToBook = safeNumber(m.pbRatioTTM)
      stock.priceToSales = safeNumber(m.priceToSalesRatioTTM)
      stock.evToEbitda = safeNumber(m.enterpriseValueOverEBITDATTM)
      stock.pegRatio = safeNumber(m.pegRatioTTM)
      stock.roe = formatPercent(m.roeTTM)
      stock.roa = formatPercent(m.roaTTM)
      stock.roic = formatPercent(m.roicTTM)
      stock.debtToEquity = safeNumber(m.debtToEquityTTM)
      stock.currentRatio = safeNumber(m.currentRatioTTM)
      stock.interestCoverage = safeNumber(m.interestCoverageTTM)
      stock.dividendYield = formatPercent(m.dividendYieldTTM) || stock.dividendYield
      stock.payoutRatio = formatPercent(m.payoutRatioTTM)
    }

    // Ratios TTM für Margen
    await sleep(CONFIG.callDelay)
    const ratiosData = await fetchWithRetry(API.ratios(symbol))
    if (ratiosData && ratiosData[0]) {
      const r = ratiosData[0]
      stock.grossMargin = formatPercent(r.grossProfitMarginTTM)
      stock.operatingMargin = formatPercent(r.operatingProfitMarginTTM)
      stock.netProfitMargin = formatPercent(r.netProfitMarginTTM)
      stock.quickRatio = safeNumber(r.quickRatioTTM)
      stock.eps = safeNumber(r.netIncomePerShareTTM)
    }

    // Growth-Daten
    await sleep(CONFIG.callDelay)
    const growthData = await fetchWithRetry(API.growth(symbol))
    if (growthData && growthData.length > 0) {
      // Letztes Jahr
      if (growthData[0]) {
        stock.revenueGrowth1Y = formatGrowthPercent(growthData[0].revenueGrowth)
        stock.epsGrowth1Y = formatGrowthPercent(growthData[0].epsgrowth)
      }

      // 3-Jahres Durchschnitt (wenn genug Daten)
      if (growthData.length >= 3) {
        const revGrowths = growthData.slice(0, 3).map((g: any) => safeNumber(g.revenueGrowth)).filter((g: number | null) => g !== null)
        const epsGrowths = growthData.slice(0, 3).map((g: any) => safeNumber(g.epsgrowth)).filter((g: number | null) => g !== null)
        const fcfGrowths = growthData.slice(0, 3).map((g: any) => safeNumber(g.freeCashFlowGrowth)).filter((g: number | null) => g !== null)

        if (revGrowths.length >= 3) {
          stock.revenueGrowth3Y = formatGrowthPercent(revGrowths.reduce((a: number, b: number) => a + b, 0) / revGrowths.length)
        }
        if (epsGrowths.length >= 3) {
          stock.epsGrowth3Y = formatGrowthPercent(epsGrowths.reduce((a: number, b: number) => a + b, 0) / epsGrowths.length)
        }
        if (fcfGrowths.length >= 3) {
          stock.fcfGrowth3Y = formatGrowthPercent(fcfGrowths.reduce((a: number, b: number) => a + b, 0) / fcfGrowths.length)
        }
      }

      // 5-Jahres Durchschnitt
      if (growthData.length >= 5) {
        const revGrowths = growthData.slice(0, 5).map((g: any) => safeNumber(g.revenueGrowth)).filter((g: number | null) => g !== null)
        const epsGrowths = growthData.slice(0, 5).map((g: any) => safeNumber(g.epsgrowth)).filter((g: number | null) => g !== null)

        if (revGrowths.length >= 5) {
          stock.revenueGrowth5Y = formatGrowthPercent(revGrowths.reduce((a: number, b: number) => a + b, 0) / revGrowths.length)
        }
        if (epsGrowths.length >= 5) {
          stock.epsGrowth5Y = formatGrowthPercent(epsGrowths.reduce((a: number, b: number) => a + b, 0) / epsGrowths.length)
        }
      }
    }

  } catch (error) {
    console.warn(`⚠️ Fehler bei ${symbol}:`, error)
  }

  return stock
}

// ============================================
// MAIN
// ============================================

function parseSymbolsArg(): string[] {
  const arg = process.argv.find(a => a.startsWith('--symbols='))
  if (!arg) return []
  return arg
    .slice('--symbols='.length)
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
}

// Ergänzt bzw. ersetzt einzelne Ticker in der bestehenden JSON. Der FMP-Screener
// führt frische IPOs oft noch nicht, deshalb kommen die Basisdaten aus dem Profil.
// meta.updatedAt bleibt unverändert, weil der Rest der Datei nicht neu geladen wird.
async function upsertSymbols(symbols: string[]) {
  const existing = JSON.parse(fs.readFileSync(CONFIG.outputPath, 'utf-8'))
  const stocks: ScreenerStock[] = existing.stocks || []

  for (const symbol of symbols) {
    const profile = (await fetchWithRetry(API.profile(symbol)))?.[0]
    if (!profile) {
      console.error(`❌ Kein FMP-Profil für ${symbol}, übersprungen`)
      continue
    }

    const enriched = await enrichStockData({
      symbol,
      companyName: profile.companyName,
      sector: profile.sector,
      industry: profile.industry,
      exchangeShortName: profile.exchangeShortName,
      country: profile.country,
      price: profile.price,
      marketCap: profile.mktCap,
      lastAnnualDividend: profile.lastDiv,
    })

    const idx = stocks.findIndex(s => s.symbol === symbol)
    if (idx >= 0) stocks[idx] = enriched
    else stocks.push(enriched)
    console.log(`✓ ${symbol} ${idx >= 0 ? 'aktualisiert' : 'ergänzt'} (${enriched.name})`)
  }

  stocks.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
  existing.meta = { ...existing.meta, totalStocks: stocks.length }
  existing.stocks = stocks
  fs.writeFileSync(CONFIG.outputPath, JSON.stringify(existing, null, 2), 'utf-8')
}

async function main() {
  const onlySymbols = parseSymbolsArg()
  if (onlySymbols.length > 0) {
    await upsertSymbols(onlySymbols)
    return
  }

  console.log('🚀 Stock Screener Update gestartet')
  console.log(`📅 ${new Date().toISOString()}`)
  console.log('─'.repeat(50))

  const startTime = Date.now()

  // Checkpoint laden
  let { processedSymbols, stocks } = loadCheckpoint()

  // Stock-Liste laden
  const allStocks = await fetchAllStocks()

  // Stocks filtern die noch nicht verarbeitet wurden
  const remainingStocks = allStocks.filter((s: any) => !processedSymbols.has(s.symbol))
  console.log(`📋 ${remainingStocks.length} Stocks noch zu verarbeiten`)
  console.log('─'.repeat(50))

  // In Batches verarbeiten
  const batches = []
  for (let i = 0; i < remainingStocks.length; i += CONFIG.batchSize) {
    batches.push(remainingStocks.slice(i, i + CONFIG.batchSize))
  }

  let processed = stocks.length
  const total = allStocks.length

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]

    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} Stocks)`)

    for (const baseStock of batch) {
      try {
        const enrichedStock = await enrichStockData(baseStock)
        stocks.push(enrichedStock)
        processedSymbols.add(baseStock.symbol)
        processed++

        // Progress alle 10 Stocks
        if (processed % 10 === 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const rate = processed / elapsed
          const remaining = (total - processed) / rate
          console.log(`  ✓ ${processed}/${total} (${((processed / total) * 100).toFixed(1)}%) - ETA: ${Math.round(remaining / 60)} min`)
        }

      } catch (error) {
        console.error(`❌ Fehler bei ${baseStock.symbol}:`, error)
      }
    }

    // Checkpoint nach jedem Batch speichern
    saveCheckpoint(processedSymbols, stocks)

    // Pause zwischen Batches
    if (batchIndex < batches.length - 1) {
      await sleep(CONFIG.batchDelay)
    }
  }

  // Finale Sortierung nach Market Cap
  stocks.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))

  // JSON speichern
  const outputDir = path.dirname(CONFIG.outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const output = {
    meta: {
      updatedAt: new Date().toISOString(),
      totalStocks: stocks.length,
      version: '1.0'
    },
    stocks
  }

  fs.writeFileSync(CONFIG.outputPath, JSON.stringify(output, null, 2), 'utf-8')

  // Checkpoint löschen
  deleteCheckpoint()

  // Stats
  const elapsed = (Date.now() - startTime) / 1000
  const fileSizeKB = Math.round(fs.statSync(CONFIG.outputPath).size / 1024)

  console.log('\n' + '═'.repeat(50))
  console.log('✅ FERTIG!')
  console.log('─'.repeat(50))
  console.log(`📊 Stocks verarbeitet: ${stocks.length}`)
  console.log(`📁 Datei: ${CONFIG.outputPath}`)
  console.log(`📦 Größe: ${fileSizeKB} KB`)
  console.log(`⏱️ Dauer: ${Math.round(elapsed / 60)} Minuten`)
  console.log('═'.repeat(50))
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
