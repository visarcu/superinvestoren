// scripts/update-sectors.js (ES Module Version)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Lade .env.local explizit
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('✅ .env.local geladen')
} else {
  console.log('⚠️  .env.local nicht gefunden, versuche andere .env Dateien...')
  // Fallback zu standard .env
  dotenv.config({ path: path.join(__dirname, '../.env') })
}

const FMP_API_KEY = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY

async function fetchSectorData(ticker) {
  try {
    // Bereinige Ticker für FMP API (entferne .NE etc.)
    const cleanTicker = ticker.replace(/\.(NE|SW|L|TO|V)$/, '')
    
    if (!FMP_API_KEY) {
      console.log('❌ FMP_API_KEY nicht gefunden in Environment Variables')
      return null
    }
    
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${cleanTicker}?apikey=${FMP_API_KEY}`
    )
    
    if (!response.ok) {
      console.log(`❌ Fehler für ${ticker}: HTTP ${response.status}`)
      return null
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      console.log(`⚠️  Keine Daten für ${ticker}`)
      return null
    }
    
    const profile = data[0]
    return {
      sector: profile.sector || '',
      industry: profile.industry || ''
    }
  } catch (error) {
    console.log(`❌ API Fehler für ${ticker}:`, error.message)
    return null
  }
}

async function updateSectorsInBatches() {
  // Lade aktuelle stocks.ts
  const stocksPath = path.join(__dirname, '../src/data/stocks.ts')
  
  if (!fs.existsSync(stocksPath)) {
    throw new Error(`stocks.ts nicht gefunden: ${stocksPath}`)
  }
  
  const stocksContent = fs.readFileSync(stocksPath, 'utf-8')
  
  // Einfacher Regex-basierter Parser für das stocks Array
  const stocksMatch = stocksContent.match(/export const stocks[^=]*=\s*(\[[\s\S]*?\]);?(?=\s*$|\s*export|\s*\/\/)/m)
  
  if (!stocksMatch) {
    throw new Error('Konnte stocks Array nicht finden. Stelle sicher, dass es als "export const stocks: Stock[] = [...]" definiert ist.')
  }
  
  let stocks
  try {
    // Verwende eval nur für das Array (vorsichtig!)
    stocks = eval(stocksMatch[1])
  } catch (error) {
    throw new Error('Konnte stocks Array nicht parsen: ' + error.message)
  }
  
  console.log(`📊 Aktualisiere Sektoren für ${stocks.length} Aktien...`)
  console.log(`🔑 API Key: ${FMP_API_KEY ? 'Gefunden' : 'NICHT GEFUNDEN'}`)
  
  // Batch-Verarbeitung (3 parallel um Rate Limits zu vermeiden)
  const batchSize = 3
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  
  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize)
    
    console.log(`\n🔄 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stocks.length / batchSize)} (Aktien ${i + 1}-${Math.min(i + batchSize, stocks.length)})`)
    
    const promises = batch.map(async (stock, batchIndex) => {
      const globalIndex = i + batchIndex
      
      // Skip wenn Sektor bereits vorhanden
      if (stock.sector && stock.sector.trim() !== '') {
        console.log(`✅ ${stock.ticker} - Sektor bereits vorhanden: ${stock.sector}`)
        skipCount++
        return
      }
      
      const sectorData = await fetchSectorData(stock.ticker)
      
      if (sectorData && sectorData.sector) {
        stocks[globalIndex].sector = sectorData.sector
        console.log(`✅ ${stock.ticker} - Sektor hinzugefügt: ${sectorData.sector}`)
        successCount++
      } else {
        console.log(`❌ ${stock.ticker} - Kein Sektor gefunden`)
        errorCount++
      }
    })
    
    await Promise.all(promises)
    
    // Pause zwischen Batches
    if (i + batchSize < stocks.length) {
      console.log('⏱️  Warte 3 Sekunden...')
      await delay(3000)
    }
  }
  
  // Erstelle neue stocks.ts Datei
  const newStocksContent = `export interface Stock {
  ticker: string
  cusip: string
  name: string
  sector: string
  metrics: any[]
}

export const stocks: Stock[] = ${JSON.stringify(stocks, null, 2)}
`
  
  // Backup erstellen
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = stocksPath + '.backup.' + timestamp
  fs.copyFileSync(stocksPath, backupPath)
  console.log(`\n💾 Backup erstellt: ${backupPath}`)
  
  // Neue Datei schreiben
  fs.writeFileSync(stocksPath, newStocksContent)
  
  // Statistiken
  const totalWithSector = stocks.filter(s => s.sector && s.sector.trim() !== '').length
  const totalWithoutSector = stocks.filter(s => !s.sector || s.sector.trim() === '').length
  
  console.log(`\n📈 Fertig!`)
  console.log(`✅ Erfolgreich aktualisiert: ${successCount}`)
  console.log(`⏭️  Übersprungen (bereits vorhanden): ${skipCount}`)
  console.log(`❌ Fehler/Nicht gefunden: ${errorCount}`)
  console.log(`📊 Gesamt mit Sektor: ${totalWithSector}/${stocks.length} (${((totalWithSector / stocks.length) * 100).toFixed(1)}%)`)
  
  // Zeige Sektor-Verteilung
  const sectorCounts = new Map()
  stocks.forEach(stock => {
    if (stock.sector && stock.sector.trim() !== '') {
      const sector = stock.sector
      sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1)
    }
  })
  
  if (sectorCounts.size > 0) {
    console.log(`\n📊 Top 10 Sektoren:`)
    Array.from(sectorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([sector, count]) => {
        console.log(`  ${sector}: ${count} Aktien`)
      })
  }
}

// Prüfe ob als direktes Script ausgeführt
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting sector update...\n')
  updateSectorsInBatches()
    .then(() => {
      console.log('\n🎉 Script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message)
      process.exit(1)
    })
}