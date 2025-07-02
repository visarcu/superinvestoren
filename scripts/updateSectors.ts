// scripts/updateSectors.ts - ES Module Version für Next.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

// ✅ ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ✅ Load .env file
config({ path: path.join(__dirname, '..', '.env.local') })

// Deine FMP API Konfiguration
const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE_URL = 'https://financialmodelingprep.com/api'

interface Stock {
  ticker: string
  cusip: string
  name: string
  sector: string
  metrics: any[]
}

interface FMPProfile {
  symbol: string
  companyName: string
  sector: string
  industry: string
  country: string
  // ... andere FMP Felder
}

// Hilfsfunktion für API Calls mit Rate Limiting
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`📡 Fetching: ${url}`)
      
      const response = await fetch(url)
      
      if (response.status === 429) {
        // Rate limit - warte länger
        const waitTime = Math.pow(2, i) * 1000 // Exponential backoff
        console.log(`⏳ Rate limit hit, waiting ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Kurze Pause zwischen Requests (FMP allows 250 calls/minute)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.log(`❌ Attempt ${i + 1} failed:`, errorMessage)
      if (i === retries - 1) throw error
      
      // Warte vor nächstem Versuch
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}

// Sektor für einen Ticker von FMP holen
async function getSectorForTicker(ticker: string): Promise<string> {
  try {
    // Bereinige Ticker (entferne .NE, etc.)
    const cleanTicker = ticker.replace(/\.(NE|SW|L|PA|AS|MI|BR|HK|SS|SZ)$/, '')
    
    const url = `${FMP_BASE_URL}/v3/profile/${cleanTicker}?apikey=${FMP_API_KEY}`
    const profiles: FMPProfile[] = await fetchWithRetry(url)
    
    if (profiles && profiles.length > 0) {
      const profile = profiles[0]
      const sector = profile.sector || profile.industry || ''
      
      console.log(`✅ ${ticker}: ${sector || 'N/A'}`)
      return sector
    }
    
    console.log(`⚠️  ${ticker}: No profile found`)
    return ''
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`❌ ${ticker}: Error -`, errorMessage)
    return ''
  }
}

// Haupt-Funktion zum Aktualisieren aller Sektoren
async function updateAllSectors() {
  console.log('🚀 Starting sector update...')
  
  // ✅ API Key Validierung
  if (!FMP_API_KEY) {
    console.error('❌ FMP_API_KEY not found!')
    console.error('💡 Make sure you have FMP_API_KEY in your .env.local file')
    console.error('💡 Format: FMP_API_KEY=your_actual_key_here')
    return
  }
  
  console.log('✅ FMP API Key found')
  
  // Lade aktuelle stocks.ts
  const stocksPath = path.join(__dirname, '..', 'src', 'data', 'stocks.ts')
  
  if (!fs.existsSync(stocksPath)) {
    console.error('❌ stocks.ts file not found at:', stocksPath)
    return
  }
  
  // Backup erstellen
  const backupPath = stocksPath.replace('.ts', '.backup.ts')
  fs.copyFileSync(stocksPath, backupPath)
  console.log(`💾 Backup created: ${backupPath}`)
  
  // Stocks laden (vereinfacht - du musst das an deine Struktur anpassen)
  const stocksContent = fs.readFileSync(stocksPath, 'utf8')
  
  // Extrahiere alle Ticker mit Regex (angepasst an deine Struktur)
  const tickerMatches = stocksContent.match(/ticker:\s*['"`]([^'"`]+)['"`]/g)
  
  if (!tickerMatches) {
    console.error('❌ No tickers found in stocks.ts')
    return
  }
  
  const tickers = tickerMatches.map(match => {
    const tickerMatch = match.match(/['"`]([^'"`]+)['"`]/)
    return tickerMatch ? tickerMatch[1] : ''
  }).filter(Boolean)
  
  console.log(`📊 Found ${tickers.length} tickers to process`)
  
  // Verarbeite alle Tickers (in Batches um API Limits zu respektieren)
  const batchSize = 10
  const sectorMap = new Map<string, string>()
  
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize)
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tickers.length/batchSize)}`)
    
    const promises = batch.map(ticker => 
      getSectorForTicker(ticker).then(sector => ({ ticker, sector }))
    )
    
    const results = await Promise.allSettled(promises)
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sectorMap.set(result.value.ticker, result.value.sector)
      } else {
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason)
        console.log(`❌ Failed to get sector for ${batch[index]}:`, errorMessage)
      }
    })
    
    // Pause zwischen Batches
    if (i + batchSize < tickers.length) {
      console.log('⏳ Waiting 5 seconds before next batch...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
  
  // Aktualisiere stocks.ts Content
  let updatedContent = stocksContent
  
  sectorMap.forEach((sector, ticker) => {
    if (sector) {
      // Regex um sector: '' zu ersetzen mit sector: 'Actual Sector'
      const regex = new RegExp(
        `(ticker:\\s*['"\`]${ticker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`][^}]*sector:\\s*)['"\`]['"\`]`,
        'g'
      )
      
      updatedContent = updatedContent.replace(regex, `$1'${sector}'`)
    }
  })
  
  // Schreibe aktualisierte Datei
  fs.writeFileSync(stocksPath, updatedContent)
  
  // Statistiken
  const updatedSectors = Array.from(sectorMap.values()).filter(Boolean).length
  console.log(`\n🎉 Update complete!`)
  console.log(`📊 Processed: ${tickers.length} tickers`)
  console.log(`✅ Updated: ${updatedSectors} sectors`)
  console.log(`💾 Backup: ${backupPath}`)
  
  // Zeige Sample der Updates
  console.log('\n📋 Sample updates:')
  let count = 0
  sectorMap.forEach((sector, ticker) => {
    if (sector && count < 10) {
      console.log(`  ${ticker}: ${sector}`)
      count++
    }
  })
  
  if (updatedSectors > 10) {
    console.log(`  ... and ${updatedSectors - 10} more`)
  }
}

// Script ausführen - ES Module Version
if (import.meta.url === `file://${process.argv[1]}`) {
  updateAllSectors().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Script failed:', errorMessage)
    process.exit(1)
  })
}

export { updateAllSectors, getSectorForTicker }