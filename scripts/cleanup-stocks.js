// scripts/cleanup-stocks.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Lade .env
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

async function cleanupAndOptimizeStocks() {
  const stocksPath = path.join(__dirname, '../src/data/stocks.ts')
  const stocksContent = fs.readFileSync(stocksPath, 'utf-8')
  const stocksMatch = stocksContent.match(/export const stocks[^=]*=\s*(\[[\s\S]*?\]);?(?=\s*$|\s*export|\s*\/\/)/m)
  
  if (!stocksMatch) {
    throw new Error('Konnte stocks Array nicht finden')
  }
  
  let stocks = eval(stocksMatch[1])
  
  console.log(`📊 Bereinige ${stocks.length} Aktien...`)
  
  // 1. DUPLICATE ENTFERNEN (gleicher Ticker)
  const seenTickers = new Set()
  const duplicates = []
  stocks = stocks.filter(stock => {
    if (seenTickers.has(stock.ticker)) {
      duplicates.push(stock.ticker)
      return false
    }
    seenTickers.add(stock.ticker)
    return true
  })
  
  console.log(`🔄 ${duplicates.length} Duplikate entfernt`)
  
  // 2. PROBLEMATISCHE TICKER ENTFERNEN
  const problematicPatterns = [
    /^[A-Z]{1,2}X{3,}$/,     // XXXX, XXXXX Pattern
    /^\d+$/,                  // Nur Zahlen
    /^.{1,2}$/,              // Zu kurz (1-2 Zeichen)
    /^.{10,}$/,              // Zu lang (10+ Zeichen)
    /[^A-Z0-9.-]/,           // Sonderzeichen außer . und -
  ]
  
  const originalLength = stocks.length
  stocks = stocks.filter(stock => {
    return !problematicPatterns.some(pattern => pattern.test(stock.ticker))
  })
  
  console.log(`🧹 ${originalLength - stocks.length} problematische Ticker entfernt`)
  
  // 3. NACH RELEVANZ SORTIEREN
  const relevanceScore = (stock) => {
    let score = 0
    
    // Sektor vorhanden = +100
    if (stock.sector && stock.sector.trim() !== '') score += 100
    
    // Standard US Ticker (3-4 Buchstaben) = +50
    if (/^[A-Z]{3,4}$/.test(stock.ticker)) score += 50
    
    // Bekannte große Aktien = +200
    const megaCaps = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'BAC', 'WFC', 'JNJ', 'UNH', 'PG', 'KO']
    if (megaCaps.includes(stock.ticker)) score += 200
    
    // Internationale Ticker = -20
    if (/\.(TO|V|L|SW|NE)$/.test(stock.ticker)) score -= 20
    
    // ETF/Fonds Pattern = -10
    if (/X$/.test(stock.ticker) || stock.ticker.length > 5) score -= 10
    
    return score
  }
  
  stocks.sort((a, b) => relevanceScore(b) - relevanceScore(a))
  
  // 4. LIMIT AUF TOP AKTIEN (für bessere Performance)
  const topStocks = stocks.slice(0, 3000) // Top 3000 statt 9000+
  const removedCount = stocks.length - topStocks.length
  
  console.log(`🎯 Fokus auf Top ${topStocks.length} relevanteste Aktien (${removedCount} entfernt)`)
  
  // 5. KATEGORISIERUNG
  const withSector = topStocks.filter(s => s.sector && s.sector.trim() !== '')
  const withoutSector = topStocks.filter(s => !s.sector || s.sector.trim() === '')
  const usTickers = topStocks.filter(s => /^[A-Z]{1,5}$/.test(s.ticker))
  const internationalTickers = topStocks.filter(s => /\.(TO|V|L|SW|NE)$/.test(s.ticker))
  
  console.log(`\n📈 Finale Statistiken:`)
  console.log(`✅ Mit Sektor: ${withSector.length} (${((withSector.length / topStocks.length) * 100).toFixed(1)}%)`)
  console.log(`❌ Ohne Sektor: ${withoutSector.length}`)
  console.log(`🇺🇸 US Ticker: ${usTickers.length}`)
  console.log(`🌍 International: ${internationalTickers.length}`)
  
  // 6. SEKTOR-VERTEILUNG
  const sectorCounts = new Map()
  withSector.forEach(stock => {
    const sector = stock.sector
    sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1)
  })
  
  console.log(`\n📊 Top 10 Sektoren:`)
  Array.from(sectorCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([sector, count]) => {
      console.log(`  ${sector}: ${count} Aktien`)
    })
  
  // 7. DATEI SCHREIBEN
  const newStocksContent = `export interface Stock {
  ticker: string
  cusip: string
  name: string
  sector: string
  metrics: any[]
}

export const stocks: Stock[] = ${JSON.stringify(topStocks, null, 2)}
`
  
  // Backup erstellen
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = stocksPath + '.pre-cleanup.' + timestamp
  fs.copyFileSync(stocksPath, backupPath)
  console.log(`\n💾 Backup erstellt: ${backupPath}`)
  
  fs.writeFileSync(stocksPath, newStocksContent)
  
  console.log(`\n🎉 Bereinigung abgeschlossen!`)
  console.log(`📉 Von ${stocks.length + removedCount + duplicates.length} auf ${topStocks.length} Aktien reduziert`)
  console.log(`⚡ Performance-Verbesserung: ~${Math.round(((stocks.length + removedCount + duplicates.length - topStocks.length) / (stocks.length + removedCount + duplicates.length)) * 100)}% weniger Daten`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupAndOptimizeStocks().catch(console.error)
}