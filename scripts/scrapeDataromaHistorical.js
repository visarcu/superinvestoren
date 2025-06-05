// scripts/scrapeDataromaHistorical.js - Vollständige historische Daten
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import path from 'path'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
}

// ERWEITERTE INVESTOREN-KONFIGURATION
const DATAROMA_INVESTORS = {
  torray: {
    slug: 'torray',
    name: 'Torray LLC',
    param: 'T',
    folder: 'torray'
  },
  
  pabrai: {
    slug: 'pabrai', 
    name: 'Mohnish Pabrai - Dalal Street',
    param: 'PI',
    folder: 'pabrai'
  },
  
  lilu: {
    slug: 'lilu',
    name: 'Li Lu - Himalaya Capital Management',
    param: 'HC',  // ✅ Bestätigt aus deinen URLs
    folder: 'lilu'
  },
  
  // Weitere Parameter zu testen:
  akre: {
    slug: 'akre',
    name: 'Chuck Akre - Akre Capital Management', 
    param: 'akre', // Zu testen
    folder: 'akre'
  },
  
  spier: {
    slug: 'spier',
    name: 'Guy Spier - Aquamarine Capital',
    param: 'spier', // Zu testen
    folder: 'spier'
  }
}

// Hilfsfunktionen
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

// Quarter-String zu Datum konvertieren
function quarterToDate(quarterStr) {
  // "2024 Q4" -> "2024-12-31"
  // "2023 Q1" -> "2023-03-31"
  const match = quarterStr.match(/(\d{4})\s*Q(\d)/)
  if (!match) return null
  
  const year = parseInt(match[1])
  const quarter = parseInt(match[2])
  
  const endMonths = { 1: '03', 2: '06', 3: '09', 4: '12' }
  const endDays = { 1: '31', 2: '30', 3: '30', 4: '31' }
  
  return `${year}-${endMonths[quarter]}-${endDays[quarter]}`
}

// 1. HISTORY-SCRAPER: Portfolio Values + Top Holdings pro Quartal
async function scrapeDataromaHistory(investorConfig) {
  console.log(`→ Scraping History für ${investorConfig.name}...`)
  
  try {
    const url = `https://www.dataroma.com/m/hist/p_hist.php?f=${investorConfig.param}`
    console.log(`  • Lade ${url}`)
    
    const response = await fetch(url, { headers: HEADERS })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    console.log(`  • HTML geladen (${html.length} Zeichen)`)
    
    const quarterlyData = []
    
    // Parse die History-Tabelle
    $('table tr').each((i, row) => {
      const $row = $(row)
      const cells = $row.find('td')
      
      if (cells.length >= 3) {
        const periodText = $(cells[0]).text().trim()
        const portfolioValueText = $(cells[1]).text().trim()
        const topHoldingsText = $(cells[2]).text().trim()
        
        // Parse Quarter (z.B. "2024 Q4")
        const quarterMatch = periodText.match(/(\d{4})\s*Q(\d)/)
        if (quarterMatch) {
          const year = parseInt(quarterMatch[1])
          const quarter = parseInt(quarterMatch[2])
          const quarterKey = `${year}-Q${quarter}`
          const date = quarterToDate(periodText)
          
          // Parse Portfolio Value (z.B. "$2.71 B")
          const portfolioValue = parseValueWithMultiplier(portfolioValueText)
          
          // Parse Top Holdings - KORRIGIERT um Ticker zu extrahieren
          // Input: "RPRX - Royalty Pharma plc 4.60% of portfolio GOOGL - Alphabet Inc. 3.20%"
          const topTickers = []
          
          // Split nach bekannten Mustern und extrahiere nur Ticker
          const tickerMatches = topHoldingsText.match(/\b[A-Z\.]{2,6}\b(?=\s*-|\s*$)/g)
          if (tickerMatches) {
            topTickers.push(...tickerMatches.slice(0, 10)) // Max 10 Top Holdings
          } else {
            // Fallback: Splitte und filtere nach Ticker-Pattern
            const words = topHoldingsText.split(/\s+/)
            for (const word of words) {
              if (/^[A-Z\.]{2,6}$/.test(word) && !['THE', 'AND', 'FOR', 'ALL', 'NEW', 'ADD', 'INC'].includes(word)) {
                topTickers.push(word)
                if (topTickers.length >= 10) break
              }
            }
          }
          
          if (date && portfolioValue > 0) {
            quarterlyData.push({
              quarter: quarterKey,
              date: date,
              portfolioValue: portfolioValue,
              topHoldings: topTickers
            })
          }
        }
      }
    })
    
    console.log(`  ✓ ${quarterlyData.length} Quartale gefunden`)
    quarterlyData.forEach(q => {
      console.log(`    • ${q.quarter}: $${(q.portfolioValue / 1000000000).toFixed(2)}B, Top: ${q.topHoldings.slice(0, 3).join(', ')}`)
    })
    
    return quarterlyData
    
  } catch (error) {
    console.error(`❌ Fehler beim History-Scraping: ${error.message}`)
    return []
  }
}

// 2. ACTIVITY-SCRAPER: Buy/Sell-Aktivitäten pro Quartal
async function scrapeDataromaActivity(investorConfig) {
  console.log(`→ Scraping Activity für ${investorConfig.name}...`)
  
  try {
    const url = `https://www.dataroma.com/m/m_activity.php?m=${investorConfig.param}&typ=a`
    console.log(`  • Lade ${url}`)
    
    const response = await fetch(url, { headers: HEADERS })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    console.log(`  • HTML geladen (${html.length} Zeichen)`)
    
    const activityData = []
    let currentQuarter = null
    
    // Parse die Activity-Tabelle
    $('table tr').each((i, row) => {
      const $row = $(row)
      const cells = $row.find('td')
      
      // Quarter-Header erkennen (z.B. "Q1 2025")
      if (cells.length === 1) {
        const quarterText = $(cells[0]).text().trim()
        const quarterMatch = quarterText.match(/Q(\d)\s+(\d{4})/)
        if (quarterMatch) {
          const quarter = parseInt(quarterMatch[1])
          const year = parseInt(quarterMatch[2])
          currentQuarter = `${year}-Q${quarter}`
          console.log(`    • Quarter: ${currentQuarter}`)
        }
      }
      
      // Activity-Zeilen parsen
      if (cells.length >= 4 && currentQuarter) {
        const stockText = $(cells[1]).text().trim()
        const activityText = $(cells[2]).text().trim()
        const shareChangeText = $(cells[3]).text().trim()
        const portfolioImpactText = $(cells[4]).text().trim()
        
        // Extract Ticker und Company Name
        // Format: "GOOG - Alphabet Inc. CL C"
        const stockMatch = stockText.match(/^([A-Z\.]+)\s*-\s*(.+)$/)
        if (stockMatch) {
          const ticker = stockMatch[1]
          const companyName = stockMatch[2].trim()
          
          // Parse Activity Type und Percentage
          // Formats: "Reduce 19.47%", "Buy", "Add 23.95%", "Sell 100.00%"
          let activityType = 'Unknown'
          let percentage = 0
          
          if (activityText.includes('Reduce')) {
            activityType = 'Reduce'
            const pctMatch = activityText.match(/(\d+\.?\d*)%/)
            if (pctMatch) percentage = -parseFloat(pctMatch[1])
          } else if (activityText.includes('Add')) {
            activityType = 'Add'
            const pctMatch = activityText.match(/(\d+\.?\d*)%/)
            if (pctMatch) percentage = parseFloat(pctMatch[1])
          } else if (activityText.includes('Buy')) {
            activityType = 'Buy'
            percentage = 100
          } else if (activityText.includes('Sell')) {
            activityType = 'Sell'
            percentage = -100
          }
          
          // Parse Share Change
          const shareChange = parseUSNumber(shareChangeText)
          
          // Parse Portfolio Impact
          const portfolioImpact = parseUSNumber(portfolioImpactText)
          
          activityData.push({
            quarter: currentQuarter,
            ticker: ticker,
            companyName: companyName,
            activityType: activityType,
            percentage: percentage,
            shareChange: shareChange,
            portfolioImpact: portfolioImpact
          })
          
          console.log(`      • ${ticker}: ${activityType} ${percentage}%, Shares: ${shareChange.toLocaleString()}`)
        }
      }
    })
    
    console.log(`  ✓ ${activityData.length} Aktivitäten gefunden`)
    
    return activityData
    
  } catch (error) {
    console.error(`❌ Fehler beim Activity-Scraping: ${error.message}`)
    return []
  }
}

// 3. PORTFOLIO-REKONSTRUKTION: Verwende hauptsächlich Activity-Daten
function reconstructPortfolios(historyData, activityData, investorConfig) {
  console.log(`→ Rekonstruiere Portfolios für ${investorConfig.name}...`)
  
  const portfoliosByQuarter = new Map()
  
  // Group activities by quarter
  const activitiesByQuarter = new Map()
  activityData.forEach(activity => {
    if (!activitiesByQuarter.has(activity.quarter)) {
      activitiesByQuarter.set(activity.quarter, [])
    }
    activitiesByQuarter.get(activity.quarter).push(activity)
  })
  
  // Für jedes Quarter, erstelle Portfolio hauptsächlich aus Activity-Daten
  historyData.forEach(historyEntry => {
    const quarterActivities = activitiesByQuarter.get(historyEntry.quarter) || []
    
    // PRIMÄR: Verwende Activity-Daten (genauer)
    const activityHoldings = quarterActivities
      .filter(activity => activity.shareChange > 1000) // Nur bedeutende Positionen
      .map(activity => {
        // Schätze Wert basierend auf Portfolio-Impact
        const estimatedValue = (historyEntry.portfolioValue * activity.portfolioImpact) / 100
        
        return {
          cusip: `${activity.ticker}00000`.slice(0, 9),
          name: activity.companyName,
          shares: Math.abs(activity.shareChange),
          value: Math.round(Math.max(estimatedValue, activity.shareChange * 50)), // Min $50/share
          ticker: activity.ticker
        }
      })
      .sort((a, b) => b.value - a.value) // Sortiere nach Wert
    
    // FALLBACK: Falls keine Activity-Daten, verwende Top Holdings (nur für ältere Quartale)
    let holdings = activityHoldings
    if (holdings.length === 0 && historyEntry.topHoldings.length > 0) {
      holdings = historyEntry.topHoldings.slice(0, 5).map((ticker, index) => {
        const estimatedPercent = Math.max(5, 25 - index * 3)
        const estimatedValue = (historyEntry.portfolioValue * estimatedPercent) / 100
        const estimatedShares = Math.round(estimatedValue / 100) // $100/share estimate
        
        return {
          cusip: `${ticker}00000`.slice(0, 9),
          name: ticker, // Name unbekannt bei History-only
          shares: estimatedShares,
          value: Math.round(estimatedValue),
          ticker: ticker
        }
      })
    }
    
    const portfolioData = {
      date: historyEntry.date,
      positions: holdings
    }
    
    portfoliosByQuarter.set(historyEntry.quarter, portfolioData)
    
    console.log(`    • ${historyEntry.quarter}: ${holdings.length} Positionen, ${(historyEntry.portfolioValue / 1000000).toFixed(1)}M`)
  })
  
  return portfoliosByQuarter
}

// 4. HAUPTFUNKTION: Vollständige historische Datenerfassung
async function scrapeInvestorCompletely(investorSlug) {
  const config = DATAROMA_INVESTORS[investorSlug]
  if (!config) {
    console.error(`❌ Unbekannter Investor: ${investorSlug}`)
    return
  }
  
  console.log(`🚀 Vollständige Datenerfassung für ${config.name}...`)
  
  // 1. History scrapen
  const historyData = await scrapeDataromaHistory(config)
  if (historyData.length === 0) {
    console.error(`❌ Keine History-Daten gefunden`)
    return
  }
  
  // 2. Activity scrapen
  const activityData = await scrapeDataromaActivity(config)
  
  // 3. Portfolios rekonstruieren
  const portfolios = reconstructPortfolios(historyData, activityData, config)
  
  // 4. JSON-Files erstellen
  const baseDir = path.resolve('src/data/holdings')
  const investorDir = path.join(baseDir, config.folder)
  await fs.mkdir(investorDir, { recursive: true })
  
  let savedCount = 0
  for (const [quarter, portfolioData] of portfolios.entries()) {
    const filename = `${quarter}.json`
    const filepath = path.join(investorDir, filename)
    
    await fs.writeFile(filepath, JSON.stringify(portfolioData, null, 2), 'utf-8')
    console.log(`✅ Gespeichert: ${config.folder}/${filename}`)
    savedCount++
  }
  
  console.log(`🎉 ${config.name} vollständig gescraped: ${savedCount} Quartale`)
  
  return {
    investor: config.slug,
    quarters: savedCount,
    historyData,
    activityData,
    portfolios: Array.from(portfolios.entries())
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]
  
  if (command === 'all') {
    // Alle Investoren nacheinander scrapen
    for (const [slug, config] of Object.entries(DATAROMA_INVESTORS)) {
      await scrapeInvestorCompletely(slug)
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3s Pause
    }
  } else if (command && DATAROMA_INVESTORS[command]) {
    await scrapeInvestorCompletely(command)
  } else {
    console.log('🏗️  Dataroma Historical Scraper')
    console.log('\nVerwendung:')
    console.log('  node scripts/scrapeDataromaHistorical.js all      # Alle Investoren')
    console.log('  node scripts/scrapeDataromaHistorical.js lilu     # Nur Li Lu')
    console.log('  node scripts/scrapeDataromaHistorical.js torray   # Nur Torray')
    console.log('\nVerfügbare Investoren:')
    Object.entries(DATAROMA_INVESTORS).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(12)} → ${config.name}`)
    })
  }
}

export { scrapeInvestorCompletely, DATAROMA_INVESTORS }