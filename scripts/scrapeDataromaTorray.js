// scripts/scrapeDataromaTorray.js - Verbesserte Version
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import path from 'path'

// Torray's Dataroma URL
const TORRAY_URL = 'https://www.dataroma.com/m/holdings.php?m=T'

// Headers um wie ein normaler Browser auszusehen
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
}

// Hilfsfunktion: US-Zahlenformat parsen (Komma = Tausender, Punkt = Dezimal)
function parseUSNumber(str) {
  if (!str || typeof str !== 'string') return 0
  
  // Entferne alle nicht-numerischen Zeichen außer Kommas, Punkte und Minus
  const cleaned = str.replace(/[^\d.,\-]/g, '')
  if (!cleaned) return 0
  
  // US Format: 1,234.56 (Komma = Tausender, Punkt = Dezimal)
  // Entferne Tausender-Kommas und parse als Float
  const usFormat = cleaned.replace(/,/g, '')
  return parseFloat(usFormat) || 0
}

// Alias für Backward-Kompatibilität
const parseNumber = parseUSNumber

// Hilfsfunktion: Wert mit Multiplier parsen ($123M, $45K, etc.)
function parseValueWithMultiplier(str) {
  if (!str) return 0
  
  const num = parseUSNumber(str)
  if (num === 0) return 0
  
  const upper = str.toUpperCase()
  
  if (upper.includes('B')) return num * 1000000000
  if (upper.includes('M')) return num * 1000000
  if (upper.includes('K')) return num * 1000
  
  // KEIN automatischer Multiplier! $31.13 sollte 31.13 bleiben, nicht 31130000
  return num
}

// Hilfsfunktion: Datum extrahieren für Quarter-Bestimmung
function extractQuarterFromPage($) {
  // Verschiedene Muster für Portfolio-Datum
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
      console.log(`  • Datum-String gefunden: "${dateStr}"`)
      
      // Parse Datum
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

// Verbesserte Hauptfunktion: Spezifisch für Dataroma
async function scrapeTorrayHoldings() {
  console.log('→ Scraping Torray Holdings von Dataroma (Verbesserte Version)...')
  
  try {
    // 1) Dataroma Seite holen
    console.log(`  • Lade ${TORRAY_URL}`)
    const response = await fetch(TORRAY_URL, { headers: HEADERS })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    console.log(`  • HTML geladen (${html.length} Zeichen)`)
    
    // 2) Debug: Speichere HTML für Analyse (optional)
    // await fs.writeFile('debug_dataroma.html', html, 'utf-8')
    
    // 3) Quarter bestimmen
    const quarterKey = extractQuarterFromPage($)
    console.log(`  • Quarter bestimmt: ${quarterKey}`)
    
    // 4) Portfolio Wert extrahieren (verschiedene Muster)
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
    
    // 5) Holdings Table - Dataroma-spezifische Struktur
    const holdings = []
    
    // Finde die Holdings-Tabelle durch charakteristische Merkmale
    $('table').each((tableIndex, table) => {
      const $table = $(table)
      
      // Check ob es die Holdings-Tabelle ist
      const tableText = $table.text().toLowerCase()
      const hasStockData = tableText.includes('stock') || 
                          tableText.includes('ticker') || 
                          tableText.includes('symbol') ||
                          tableText.includes('shares') ||
                          tableText.includes('value')
      
      if (!hasStockData) return
      
      console.log(`  • Analysiere Holdings-Tabelle ${tableIndex + 1}`)
      
      // Parse alle Zeilen dieser Tabelle
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
        
        // Debug: Zeige ein paar Beispiel-Zeilen
        if (rowIndex < 5 || (rowIndex < 20 && cellData.some(cell => /^[A-Z]{2,5}$/.test(cell)))) {
          console.log(`    • Zeile ${rowIndex + 1}:`, cellData.slice(0, 6))
        }
        
        // Dataroma-spezifische Parsing-Logik
        let stockName = ''
        let ticker = ''
        let shares = 0
        let value = 0
        let reportedPrice = 0
        let percentOfPortfolio = 0
        
        // Dataroma Struktur: [History, Stock, % of Portfolio, Recent Activity, Shares, Reported Price, Value, Current Price, etc.]
        if (cellData.length >= 6) {
          // Spalte 1 (Index 1): Stock = "RPRX - Royalty Pharma plc"
          const stockCell = cellData[1]
          if (stockCell && stockCell.includes(' - ')) {
            const parts = stockCell.split(' - ')
            ticker = parts[0].trim()
            stockName = parts[1].trim()
            
            // Validiere Ticker (2-5 Buchstaben)
            if (/^[A-Z\.]{2,6}$/.test(ticker)) {
              // Spalte 2 (Index 2): % of Portfolio = "4.00"
              percentOfPortfolio = parseNumber(cellData[2])
              
              // Spalte 4 (Index 4): Shares = "862,018"
              shares = parseNumber(cellData[4])
              
              // Spalte 5 (Index 5): Reported Price = "$31.13"
              reportedPrice = parseValueWithMultiplier(cellData[5])
              
              // Berechne Value aus Shares * Price
              if (shares > 0 && reportedPrice > 0) {
                value = shares * reportedPrice
              }
              
              // Alternativ: Spalte 6 könnte direkt der Value sein
              if (cellData[6] && value === 0) {
                value = parseValueWithMultiplier(cellData[6])
              }
              
              console.log(`    • Parsing: ${ticker} = ${shares.toLocaleString()} × ${reportedPrice} = ${(value/1000000).toFixed(1)}M`)
            }
          }
        }
        
        // Fallback: Suche nach einzelnem Ticker-Symbol
        if (!ticker) {
          for (let i = 0; i < cellData.length; i++) {
            const cell = cellData[i]
            if (/^[A-Z\.]{2,6}$/.test(cell) && !['THE', 'AND', 'FOR', 'ALL', 'NEW', 'ADD'].includes(cell)) {
              ticker = cell
              
              // Stock-Name ist meist in der vorherigen oder nächsten Zelle
              if (i > 0 && cellData[i-1] && cellData[i-1].length > ticker.length) {
                stockName = cellData[i-1]
              } else if (i < cellData.length - 1 && cellData[i+1] && cellData[i+1].length > ticker.length) {
                stockName = cellData[i+1]
              }
              
              // Suche nach numerischen Werten in dieser Zeile
              const numbers = []
              for (let j = 0; j < cellData.length; j++) {
                const val = parseUSNumber(cellData[j])
                const valWithMultiplier = parseValueWithMultiplier(cellData[j])
                
                if (val > 0) numbers.push({ index: j, value: val, withMultiplier: valWithMultiplier, raw: cellData[j] })
              }
              
              // Heuristik für Shares vs Value vs Price
              if (numbers.length >= 2) {
                const sorted = [...numbers].sort((a, b) => b.withMultiplier - a.withMultiplier)
                
                // Größter Wert ist meist der Dollar-Wert
                value = sorted[0].withMultiplier
                
                // Zweitgrößter könnte Shares oder Price sein
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
        
        // Validierung und hinzufügen
        if (ticker && stockName && value > 50000) { // Mindestens $50k Position
          const cusip = `${ticker}00000`.slice(0, 9)
          
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
        return false // Break aus .each()
      }
    })
    
    // 6) Fallback: Wenn immer noch keine Holdings, versuche Link-basierte Extraktion
    if (holdings.length === 0) {
      console.log('  • Fallback: Versuche Link-basierte Extraktion...')
      
      // Suche nach Aktien-Links (Dataroma hat oft Links zu Yahoo Finance, etc.)
      $('a[href*="yahoo"], a[href*="symbol"], a[href*="quote"]').each((i, link) => {
        const $link = $(link)
        const text = $link.text().trim()
        const href = $link.attr('href')
        
        // Extract ticker from link or text
        const tickerMatch = text.match(/^([A-Z]{2,5})$/) || href.match(/symbol=([A-Z]{2,5})/i)
        if (tickerMatch) {
          const ticker = tickerMatch[1]
          console.log(`    • Link-Ticker gefunden: ${ticker}`)
          
          // Try to find associated value in nearby cells
          const parent = $link.closest('tr, td')
          const nearbyText = parent.text()
          const valueMatch = nearbyText.match(/\$([0-9,\.]+[MBK]?)/i)
          
          if (valueMatch) {
            const value = parseValueWithMultiplier(valueMatch[0])
            if (value > 50000) {
              holdings.push({
                name: text || ticker,
                cusip: `${ticker}00000`.slice(0, 9),
                shares: 0,
                value: Math.round(value),
                ticker
              })
            }
          }
        }
      })
      
      console.log(`  • Fallback-Extraktion: ${holdings.length} Holdings gefunden`)
    }
    
    // 7) Gesamtwert berechnen falls nicht gefunden
    if (totalValue === 0 && holdings.length > 0) {
      totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0)
      console.log(`  • Gesamtwert aus Holdings berechnet: $${(totalValue / 1000000).toFixed(1)}M`)
    }
    
    // 8) Sortiere Holdings nach Wert
    holdings.sort((a, b) => b.value - a.value)
    
    // 9) Ergebnis zusammenstellen
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
    
    console.log(`  ✓ Torray Holdings erfolgreich gescraped:`)
    console.log(`    • ${holdings.length} Positionen`)
    console.log(`    • Gesamtwert: $${(totalValue / 1000000).toFixed(1)}M`)
    console.log(`    • Top 3 Holdings:`)
    holdings.slice(0, 3).forEach((h, i) => {
      console.log(`      ${i+1}. ${h.name} (${h.ticker}): $${(h.value/1000000).toFixed(1)}M`)
    })
    
    return result
    
  } catch (error) {
    console.error(`❌ Fehler beim Scraping: ${error.message}`)
    throw error
  }
}

// Hauptfunktion: JSON-File schreiben
async function saveTorrayData() {
  try {
    const baseDir = path.resolve('src/data/holdings')
    const torrayDir = path.join(baseDir, 'torray')
    
    await fs.mkdir(torrayDir, { recursive: true })
    
    const torrayData = await scrapeTorrayHoldings()
    
    const outputFile = path.join(torrayDir, `${torrayData.quarterKey}.json`)
    await fs.writeFile(outputFile, JSON.stringify(torrayData, null, 2), 'utf-8')
    
    console.log(`✓ Torray-Daten gespeichert: torray/${torrayData.quarterKey}.json`)
    
    return torrayData
    
  } catch (error) {
    console.error('Fehler beim Speichern:', error.message)
    process.exit(1)
  }
}

// Direkt ausführen falls Skript direkt gestartet wird
if (import.meta.url === `file://${process.argv[1]}`) {
  saveTorrayData()
}

export { scrapeTorrayHoldings, saveTorrayData }