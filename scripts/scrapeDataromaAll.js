// scripts/scrapeDataromaAll.js - Multi-Investor Version
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import path from 'path'

// Headers um wie ein normaler Browser auszusehen
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
}

// DATAROMA INVESTOREN KONFIGURATION
const DATAROMA_INVESTORS = {
  // Bestehende
  torray: {
    slug: 'torray',
    name: 'Torray LLC',
    param: 'T', // URL-Parameter für holdings.php?m=T
    folder: 'torray'
  },
  
  // Weitere bekannte Dataroma-Investoren
  akre: {
    slug: 'akre',
    name: 'Chuck Akre - Akre Capital Management',
    param: 'akre',
    folder: 'akre'
  },
  
  pabrai: {
    slug: 'pabrai', 
    name: 'Mohnish Pabrai - Dalal Street',
    param: 'PI',
    folder: 'pabrai'
  },
  
  spier: {
    slug: 'spier',
    name: 'Guy Spier - Aquamarine Capital',
    param: 'aq', 
    folder: 'spier'
  },
  
  chou: {
    slug: 'chou',
    name: 'Francis Chou - Chou Associates Management',
    param: 'chou',
    folder: 'chou'
  },
  
  tarasoff: {
    slug: 'tarasoff',
    name: 'Josh Tarasoff - Greenlea Lane Capital Management', 
    param: 'greenlea',
    folder: 'tarasoff'
  },

  vinall: {
    slug: 'vinall',
    name: 'Robert Vinall - RV Capital GmbH',
    param: 'rvcapital',
    folder: 'vinall'
  },

  welling: {
    slug: 'welling',
    name: 'Glenn Welling - Engaged Capital',
    param: 'engaged',
    folder: 'welling'
  },

  burry: {
    slug: 'burry',
    name: 'Michael Burry - Scion Asset Management',
    param: 'SAM',
    folder: 'burry'
  },

klarman: {
    slug: 'klarman',
    name: 'Seth Klarman - Baupost Group',
    param: 'BAUPOST',
    folder: 'klarman'
  },

  dodgecox: {
    slug: 'dodgecox',
    name: 'Dodge & Cox ',
    param: 'DODGX',
    folder: 'dodgecox'
  },

  olstein: {
    slug: 'olstein',
    name: 'Robert Olstein - Olstein Capital Management',
    param: 'OFALX',
    folder: 'olstein'
  },

  nygren: {
    slug: 'nygren',
    name: 'Bill Nygren - Oakmark Select Fund',
    param: 'oaklx',
    folder: 'nygren'
  },

  katz: {
    slug: 'katz',
    name: 'David Katz - Matrix Asset Advisors',
    param: 'MAVFX',
    folder: 'katz'
  },

  davis: {
    slug: 'davis',
    name: 'Christopher Davis - Davis Advisors',
    param: 'DAV',
    folder: 'davis'
  },

  mairspower: {
    slug: 'mairspower',
    name: 'Mairs & Power Growth Fund ',
    param: 'MPGFX',
    folder: 'mairspower'
  },

  tangen: {
    slug: 'tangen',
    name: 'Nicolai Tangen - AKO Capital',
    param: 'AKO',
    folder: 'tangen'
  },

  bobrinskoy: {
    slug: 'bobrinskoy',
    name: 'Charles Bobrinskoy - Ariel Focus Fund',
    param: 'ARFFX',
    folder: 'bobrinskoy'
  },

  loeb: {
    slug: 'loeb',
    name: 'Daniel Loeb - Third Point',
    param: 'tp',
    folder: 'loeb'
  },


  hawkins: {
    slug: 'hawkins',
    name: 'Mason Hawkins - Longleaf Partners',
    param: 'LLPFX',
    folder: 'hawkins'
  },

  rogers: {
    slug: 'rogers',
    name: 'John Rogers - Ariel Appreciation Fund',
    param: 'CAAPX',
    folder: 'rogers'
  },

  cunniff: {
    slug: 'cunniff',
    name: 'Ruane Cunniff - Sequoia Fund',
    param: 'SEQUX',
    folder: 'cunniff'
  },

  dodgecox: {
    slug: 'dodgecox',
    name: 'Dodge & Cox Stock Fund',
    param: 'DODGX',
    folder: 'dodgecox'
  },


  


  // Weitere hinzufügen nach Bedarf...
  // Die Parameter findest du auf dataroma.com -> Portfolio -> URL checken
}

// Hilfsfunktionen (gleich wie vorher)
function parseUSNumber(str) {
  if (!str || typeof str !== 'string') return 0
  const cleaned = str.replace(/[^\d.,\-]/g, '')
  if (!cleaned) return 0
  const usFormat = cleaned.replace(/,/g, '')
  return parseFloat(usFormat) || 0
}

function parseValueWithMultiplier(str) {
  if (!str) return 0
  const num = parseUSNumber(str)
  if (num === 0) return 0
  const upper = str.toUpperCase()
  if (upper.includes('B')) return num * 1000000000
  if (upper.includes('M')) return num * 1000000
  if (upper.includes('K')) return num * 1000
  return num
}

function extractQuarterFromPage($) {
  const patterns = [
    /Portfolio date:\s*([^<\n]+)/i,
    /Period:\s*([^<\n]+)/i,
    /As of:\s*([^<\n]+)/i,
    /(\w+\s+\d{1,2},?\s+\d{4})/g
  ]
  
  const pageText = $('body').text()
  
  for (const pattern of patterns) {
    const match = pageText.match(pattern)
    if (match) {
      const dateStr = match[1].trim()
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const quarter = Math.ceil((date.getMonth() + 1) / 3)
        return `${year}-Q${quarter}`
      }
    }
  }
  
  // Fallback: aktuelles Quartal
  const now = new Date()
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${currentQuarter}`
}

// GENERISCHE SCRAPER-FUNKTION
async function scrapeDataromaInvestor(investorConfig) {
  console.log(`→ Scraping ${investorConfig.name} von Dataroma...`)
  
  try {
    // 1) URL für diesen Investor
    const url = `https://www.dataroma.com/m/holdings.php?m=${investorConfig.param}`
    console.log(`  • Lade ${url}`)
    
    const response = await fetch(url, { headers: HEADERS })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    console.log(`  • HTML geladen (${html.length} Zeichen)`)
    
    // 2) Quarter bestimmen
    const quarterKey = extractQuarterFromPage($)
    console.log(`  • Quarter bestimmt: ${quarterKey}`)
    
    // 3) Portfolio Wert extrahieren
    let totalValue = 0
    const valuePatterns = [
      /Portfolio value:\s*\$([0-9,\.]+)/i,
      /Total.*value.*\$([0-9,\.]+)/i,
      /Assets.*\$([0-9,\.]+)/i
    ]
    
    const bodyText = $('body').text()
    for (const pattern of valuePatterns) {
      const match = bodyText.match(pattern)
      if (match) {
        totalValue = parseValueWithMultiplier(`${match[1]}`)
        console.log(`  • Portfolio Wert gefunden: ${(totalValue / 1000000).toFixed(1)}M`)
        break
      }
    }
    
    // 4) Holdings scrapen (gleiche Logik wie bei Torray)
    const holdings = []
    
    $('table').each((tableIndex, table) => {
      const $table = $(table)
      
      const tableText = $table.text().toLowerCase()
      const hasStockData = tableText.includes('stock') || 
                          tableText.includes('ticker') || 
                          tableText.includes('symbol') ||
                          tableText.includes('shares') ||
                          tableText.includes('value')
      
      if (!hasStockData) return
      
      console.log(`  • Analysiere Holdings-Tabelle ${tableIndex + 1}`)
      
      const rows = $table.find('tr')
      console.log(`    • ${rows.length} Zeilen gefunden`)
      
      rows.each((rowIndex, row) => {
        const $row = $(row)
        const cells = $row.find('td, th')
        
        if (cells.length < 2) return
        
        const cellData = []
        cells.each((cellIndex, cell) => {
          const text = $(cell).text().trim()
          cellData.push(text)
        })
        
        // Debug für erste Zeilen
        if (rowIndex < 5 || (rowIndex < 20 && cellData.some(cell => /^[A-Z]{2,5}$/.test(cell)))) {
          console.log(`    • Zeile ${rowIndex + 1}:`, cellData.slice(0, 6))
        }
        
        let stockName = ''
        let ticker = ''
        let shares = 0
        let value = 0
        let reportedPrice = 0
        
        // Dataroma Parsing-Logik (flexibel für verschiedene Layouts)
        if (cellData.length >= 6) {
          // Standard Dataroma Format
          const stockCell = cellData[1]
          if (stockCell && stockCell.includes(' - ')) {
            const parts = stockCell.split(' - ')
            ticker = parts[0].trim()
            stockName = parts[1].trim()
            
            if (/^[A-Z\.]{2,6}$/.test(ticker)) {
              shares = parseUSNumber(cellData[4])
              reportedPrice = parseValueWithMultiplier(cellData[5])
              
              if (shares > 0 && reportedPrice > 0) {
                value = shares * reportedPrice
              }
              
              if (cellData[6] && value === 0) {
                value = parseValueWithMultiplier(cellData[6])
              }
            }
          }
        }
        
        // Fallback: Suche nach Ticker in beliebiger Zelle
        if (!ticker) {
          for (let i = 0; i < cellData.length; i++) {
            const cell = cellData[i]
            if (/^[A-Z\.]{2,6}$/.test(cell) && !['THE', 'AND', 'FOR', 'ALL', 'NEW', 'ADD'].includes(cell)) {
              ticker = cell
              
              // Stock-Name aus benachbarten Zellen
              if (i > 0 && cellData[i-1] && cellData[i-1].length > ticker.length) {
                stockName = cellData[i-1]
              } else if (i < cellData.length - 1 && cellData[i+1] && cellData[i+1].length > ticker.length) {
                stockName = cellData[i+1]
              }
              
              // Numerische Werte sammeln
              const numbers = []
              for (let j = 0; j < cellData.length; j++) {
                const val = parseUSNumber(cellData[j])
                const valWithMultiplier = parseValueWithMultiplier(cellData[j])
                
                if (val > 0) numbers.push({ index: j, value: val, withMultiplier: valWithMultiplier, raw: cellData[j] })
              }
              
              // Heuristik für Value/Shares
              if (numbers.length >= 2) {
                const sorted = [...numbers].sort((a, b) => b.withMultiplier - a.withMultiplier)
                value = sorted[0].withMultiplier
                
                if (sorted.length >= 2) {
                  const secondLargest = sorted[1].withMultiplier
                  
                  if (secondLargest > 1000000) {
                    shares = sorted[2] ? sorted[2].value : 0
                  } else if (secondLargest > 100) {
                    reportedPrice = secondLargest
                    shares = sorted[2] ? sorted[2].value : value / reportedPrice
                  } else {
                    shares = secondLargest
                    if (shares < 1000) shares *= 1000
                  }
                }
              }
              
              break
            }
          }
        }
        
        // Position hinzufügen wenn valide
        if (ticker && stockName && value > 50000) {
          const cusip = `${ticker}00000`.slice(0, 9) // Fallback CUSIP
          
          const holding = {
            name: stockName.replace(/[^\w\s&.-]/g, '').trim(),
            cusip,
            shares: Math.round(shares || 0),
            value: Math.round(value),
            ticker
          }
          
          holdings.push(holding)
          
          console.log(`    ✓ ${holding.name} (${ticker}): ${holding.shares.toLocaleString()} shares, $${(holding.value/1000000).toFixed(1)}M`)
        }
      })
      
      // Wenn wir Holdings gefunden haben, verwende diese Tabelle
      if (holdings.length > 5) {
        console.log(`  ✓ ${holdings.length} Holdings erfolgreich geparst`)
        return false // Break
      }
    })
    
    // 5) Gesamtwert berechnen falls nicht gefunden
    if (totalValue === 0 && holdings.length > 0) {
      totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0)
      console.log(`  • Gesamtwert aus Holdings berechnet: $${(totalValue / 1000000).toFixed(1)}M`)
    }
    
    // 6) Sortiere Holdings nach Wert
    holdings.sort((a, b) => b.value - a.value)
    
    // 7) Ergebnis im gewünschten Format
    const result = {
      form: 'DATAROMA',                              // ← HINZUFÜGEN
      date: new Date().toISOString().split('T')[0],
      period: new Date().toISOString().split('T')[0], // ← HINZUFÜGEN  
      accession: null,                               // ← HINZUFÜGEN
      quarterKey: quarterKey,                        // ← HINZUFÜGEN (quarterKey hast du schon!)
      positions: holdings.sort((a, b) => b.value - a.value),
      totalValue: holdings.reduce((sum, h) => sum + h.value, 0), // ← HINZUFÜGEN
      positionsCount: holdings.length,               // ← HINZUFÜGEN
      source: 'dataroma'                             // ← HINZUFÜGEN
    }
    console.log(`  ✓ ${investorConfig.name} erfolgreich gescraped:`)
    console.log(`    • ${holdings.length} Positionen`)
    console.log(`    • Gesamtwert: $${(totalValue / 1000000).toFixed(1)}M`)
    console.log(`    • Top 3 Holdings:`)
    holdings.slice(0, 3).forEach((h, i) => {
      console.log(`      ${i+1}. ${h.name} (${h.ticker}): $${(h.value/1000000).toFixed(1)}M`)
    })
    
    return { result, quarterKey, investorConfig }
    
  } catch (error) {
    console.error(`❌ Fehler beim Scraping von ${investorConfig.name}: ${error.message}`)
    throw error
  }
}

// BATCH-SCRAPER: Alle Investoren auf einmal
async function scrapeAllDataromaInvestors() {
  console.log('🚀 Starte Dataroma Multi-Investor Scraping...')
  
  const baseDir = path.resolve('src/data/holdings')
  const results = []
  
  for (const [key, config] of Object.entries(DATAROMA_INVESTORS)) {
    try {
      console.log(`\n📊 Scraping ${config.name}...`)
      
      // Scrape den Investor
      const { result, quarterKey, investorConfig } = await scrapeDataromaInvestor(config)
      
      // Erstelle Ordner
      const investorDir = path.join(baseDir, config.folder)
      await fs.mkdir(investorDir, { recursive: true })
      
      // Speichere JSON
      const outputFile = path.join(investorDir, `${quarterKey}.json`)
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf-8')
      
      console.log(`✅ Gespeichert: ${config.folder}/${quarterKey}.json`)
      
      results.push({
        investor: config.slug,
        quarterKey,
        positions: result.positions.length,
        file: `${config.folder}/${quarterKey}.json`
      })
      
      // Pause zwischen Requests (höflich zu Dataroma)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.error(`❌ Fehler bei ${config.name}:`, error.message)
      results.push({
        investor: config.slug,
        error: error.message
      })
    }
  }
  
  // Zusammenfassung
  console.log('\n📋 SCRAPING ZUSAMMENFASSUNG:')
  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.investor}: ${r.error}`)
    } else {
      console.log(`✅ ${r.investor}: ${r.positions} Positionen → ${r.file}`)
    }
  })
  
  return results
}

// EINZELNER INVESTOR
async function scrapeSingleInvestor(investorSlug) {
  const config = DATAROMA_INVESTORS[investorSlug]
  if (!config) {
    console.error(`❌ Unbekannter Investor: ${investorSlug}`)
    console.log('Verfügbare Investoren:', Object.keys(DATAROMA_INVESTORS))
    process.exit(1)
  }
  
  const baseDir = path.resolve('src/data/holdings')
  const { result, quarterKey } = await scrapeDataromaInvestor(config)
  
  const investorDir = path.join(baseDir, config.folder)
  await fs.mkdir(investorDir, { recursive: true })
  
  const outputFile = path.join(investorDir, `${quarterKey}.json`)
  await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf-8')
  
  console.log(`✅ ${config.name} gespeichert: ${config.folder}/${quarterKey}.json`)
  
  return result
}

// CLI-Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]
  
  if (command === 'all') {
    scrapeAllDataromaInvestors()
  } else if (command && DATAROMA_INVESTORS[command]) {
    scrapeSingleInvestor(command)
  } else {
    console.log('📚 Dataroma Multi-Investor Scraper')
    console.log('\nVerwendung:')
    console.log('  npm run scrape-dataroma all           # Alle Investoren')
    console.log('  npm run scrape-dataroma torray        # Nur Torray')
    console.log('  npm run scrape-dataroma pabrai        # Nur Pabrai')
    console.log('  npm run scrape-dataroma burry        # Nur Burry')
    console.log('\nVerfügbare Investoren:')
    Object.entries(DATAROMA_INVESTORS).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(12)} → ${config.name}`)
    })
  }
}

export { scrapeAllDataromaInvestors, scrapeSingleInvestor, DATAROMA_INVESTORS }