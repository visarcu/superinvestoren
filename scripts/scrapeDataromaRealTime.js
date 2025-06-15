// scripts/scrapeDataromaRealTime.js - FIXED VERSION for correct URL and headers
import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DataromaRealTimeScraper {
  
  constructor() {
    this.outputPath = path.join(__dirname, '../public/data/realtime-activity.json')
    this.baseUrl = 'https://www.dataroma.com'
  }
  
  async run() {
    console.log('🔄 Scraping Dataroma Real-Time Activity...')
    
    try {
      // Scrape the Real-Time Activity page (correct URL!)
      const activities = await this.scrapeRealTimeTable()
      
      // Save activities
      await this.saveActivities({
        lastUpdated: new Date().toISOString(),
        source: 'dataroma-realtime',
        totalActivities: activities.length,
        activities: activities
      })
      
      console.log(`✅ Scraped ${activities.length} real-time activities from Dataroma`)
      this.logStats(activities)
      
    } catch (error) {
      console.error('❌ Error scraping Dataroma Real-Time:', error.message)
      
      // Fallback: return existing data if scraping fails
      try {
        const existing = await this.loadExistingData()
        console.log('⚠️ Using existing data as fallback')
        return existing
      } catch (fallbackError) {
        console.error('❌ No fallback data available')
        throw error
      }
    }
  }
  
  async scrapeRealTimeTable() {
    console.log('🔍 Fetching Dataroma Real-Time page...')
    
    // FIXED: Use correct URL for Real-Time Activity
    const response = await axios.get(`${this.baseUrl}/m/rt.php`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    })
    
    const $ = cheerio.load(response.data)
    const activities = []
    
    console.log('🔍 Looking for Real-Time Activity table...')
    
    // Look for the table with the specific structure we saw in terminal
    let foundTable = false
    
    $('table').each((tableIndex, table) => {
      const $table = $(table)
      
      // Check if this table contains Real-Time Activity data
      const tableText = $table.text()
      
      // FIXED: Look for the correct headers from terminal output
      if (tableText.includes('Date Filed') || 
          tableText.includes('Transaction Date') ||
          (tableText.includes('Stock') && tableText.includes('Total Value'))) {
        
        console.log(`📋 Found Real-Time Activity table ${tableIndex + 1}`)
        foundTable = true
        
        // Get headers to understand table structure
        const headers = []
        const headerRow = $table.find('tr').first()
        headerRow.find('td, th').each((i, cell) => {
          const headerText = $(cell).text().trim()
          headers.push(headerText)
          console.log(`   Header ${i}: "${headerText}"`)
        })
        
        // Process data rows - skip header row
        let rowCount = 0
        console.log(`📋 Processing ${$table.find('tr').length - 1} data rows...`)
        
        $table.find('tr').slice(1).each((rowIndex, row) => {
          const $row = $(row)
          const cells = $row.find('td')
          
          console.log(`   Checking row ${rowIndex + 1}: ${cells.length} cells`)
          
          if (cells.length >= 7) { // Need at least 7 columns for full data
            const cellData = []
            cells.each((i, cell) => {
              const cellText = $(cell).text().trim()
              cellData.push(cellText)
            })
            
            // Log first few rows for debugging
            if (rowIndex < 3) {
              console.log(`   Row ${rowIndex + 1} data:`, cellData)
            }
            
            // Parse based on correct headers we found:
            // [Transaction Date, Filing, Reporting Name, Activity, Security, Shares, Price, Total]
            const [transactionDate, filing, reportingName, activity, security, shares, price, total] = cellData
            
            console.log(`   Parsing: Date="${transactionDate}", Investor="${reportingName}", Security="${security}"`)
            
            // Parse stock symbol from security field
            const stockMatch = security?.match(/([A-Z]{1,5})\s*-?\s*(.*)/) || security?.match(/^([A-Z]+)/)
            const ticker = stockMatch ? stockMatch[1] : security?.split(' ')[0]?.replace(/[^A-Z]/g, '') || 'UNKNOWN'
            const companyName = stockMatch && stockMatch[2] ? stockMatch[2].trim() : security || 'Unknown Company'
            
            console.log(`   Extracted ticker: "${ticker}", company: "${companyName}"`)
            console.log(`   Date check: "${transactionDate}" -> valid: ${this.isValidDate(transactionDate)}`)
            
            if (transactionDate && reportingName && security && this.isValidDate(transactionDate)) {
              const activityData = {
                id: `dataroma-rt-${transactionDate}-${ticker}-${total}`.replace(/[^a-zA-Z0-9-]/g, '-'),
                date: this.parseDate(transactionDate),
                filing: filing || 'Unknown',
                investor: this.cleanInvestorName(reportingName),
                activity: this.normalizeActivity(activity),
                security: companyName,
                ticker: ticker,
                shares: this.parseNumber(shares),
                price: this.parseNumber(price),
                total: this.parseNumber(total),
                source: 'dataroma-realtime',
                quarter: this.dateToQuarter(this.parseDate(transactionDate))
              }
              
              console.log(`   Created activity:`, {
                ticker: activityData.ticker,
                investor: activityData.investor,
                total: activityData.total,
                date: activityData.date
              })
              
              // Only add if we have meaningful data
              if (activityData.ticker && activityData.ticker !== 'UNKNOWN' && activityData.total > 0) {
                activities.push(activityData)
                rowCount++
                console.log(`   ✅ Added activity ${rowCount}: ${activityData.ticker} - ${activityData.investor} - ${activityData.total}`)
              } else {
                console.log(`   ❌ Skipped activity: ticker="${activityData.ticker}", total=${activityData.total}`)
              }
            } else {
              console.log(`   ❌ Skipped row: missing required data or invalid date`)
              console.log(`      Date: "${transactionDate}", Investor: "${reportingName}", Security: "${security}"`)
            }
          } else {
            console.log(`   ❌ Skipped row: only ${cells.length} cells (need 7+)`)
          }
        })
        
        console.log(`📊 Extracted ${rowCount} activities from table ${tableIndex + 1}`)
        
        // If we found data in this table, we can stop looking
        if (rowCount > 0) {
          return false // Break out of each loop
        }
      }
    })
    
    if (!foundTable) {
      console.warn('⚠️ No Real-Time Activity table found - page structure may have changed')
      
      // Debug: log page structure
      console.log('🔍 Page structure analysis:')
      $('table').each((i, table) => {
        const tableText = $(table).text().substring(0, 200)
        console.log(`   Table ${i + 1}: ${tableText}...`)
      })
    }
    
    // Remove duplicates and sort by date
    const uniqueActivities = this.removeDuplicates(activities)
    return uniqueActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  
  isValidDate(dateStr) {
    // Check if string looks like a date
    // Handle "13 Jun" format from Dataroma
    return /^\d{1,2}\s+[A-Za-z]{3}$/.test(dateStr) || 
           /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(dateStr) ||
           /\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr) || 
           /\d{4}-\d{2}-\d{2}/.test(dateStr)
  }
  
  parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0]
    
    // Handle "13 Jun" format (assume current year)
    if (/^\d{1,2}\s+[A-Za-z]{3}$/.test(dateStr)) {
      const currentYear = new Date().getFullYear()
      const [day, monthStr] = dateStr.split(' ')
      
      const monthMap = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      }
      
      const month = monthMap[monthStr] || '01'
      return `${currentYear}-${month}-${day.padStart(2, '0')}`
    }
    
    // Handle "31 Dec 2024" format (day month year)
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(dateStr)) {
      const [day, monthStr, year] = dateStr.split(' ')
      
      const monthMap = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      }
      
      const month = monthMap[monthStr] || '01'
      return `${year}-${month}-${day.padStart(2, '0')}`
    }
    
    // Handle MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    // Handle other formats
    if (dateStr.includes('-')) {
      return dateStr // Assume already in YYYY-MM-DD format
    }
    
    return new Date().toISOString().split('T')[0] // Fallback to today
  }
  
  cleanInvestorName(name) {
    if (!name || name === 'Unknown') return 'Unknown Investor'
    
    return name
      .replace(/\s+/g, ' ')
      .replace(/,?\s*(INC|LLC|LP|LTD|CORP|CORPORATION|MANAGEMENT|CAPITAL|FUND|TRUST)\.?\s*$/i, '')
      .replace(/,?\s*(JR|SR|III|II)\.?$/i, '')
      .trim()
  }
  
  normalizeActivity(activity) {
    if (!activity || activity === 'Unknown') return 'Buy' // Default assumption
    
    const activityLower = activity.toLowerCase()
    
    if (activityLower.includes('buy') || activityLower.includes('purchase')) return 'Buy'
    if (activityLower.includes('sell') || activityLower.includes('sale')) return 'Sell'
    if (activityLower.includes('new')) return 'New Position'
    if (activityLower.includes('sold out')) return 'Sold Out'
    if (activityLower.includes('increased')) return 'Increased'
    if (activityLower.includes('decreased')) return 'Decreased'
    
    return 'Buy' // Default
  }
  
  estimateShares(totalValue, price) {
    const total = this.parseNumber(totalValue)
    const priceNum = this.parseNumber(price)
    
    if (total > 0 && priceNum > 0) {
      return Math.round(total / priceNum)
    }
    
    return 0
  }
  
  parseNumber(str) {
    if (!str) return 0
    
    // Remove everything except digits, decimal points, and minus signs
    const cleaned = str.replace(/[^0-9.-]/g, '')
    const num = parseFloat(cleaned)
    
    return isNaN(num) ? 0 : num
  }
  
  dateToQuarter(dateStr) {
    try {
      const [year, month] = dateStr.split('-').map(Number)
      if (isNaN(year) || isNaN(month)) return 'Q2 2025'
      const quarter = Math.ceil(month / 3)
      return `Q${quarter} ${year}`
    } catch (error) {
      return 'Q2 2025'
    }
  }
  
  removeDuplicates(activities) {
    const seen = new Set()
    return activities.filter(activity => {
      const key = `${activity.date}-${activity.ticker}-${activity.total}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  
  async saveActivities(data) {
    // Ensure directory exists
    const dir = path.dirname(this.outputPath)
    await fs.mkdir(dir, { recursive: true })
    
    await fs.writeFile(this.outputPath, JSON.stringify(data, null, 2))
    console.log(`💾 Saved to ${this.outputPath}`)
  }
  
  async loadExistingData() {
    try {
      const data = await fs.readFile(this.outputPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      return { activities: [] }
    }
  }
  
  logStats(activities) {
    const stats = {
      total: activities.length,
      investors: new Set(activities.map(a => a.investor)).size,
      buys: activities.filter(a => ['Buy', 'New Position', 'Increased'].includes(a.activity)).length,
      sells: activities.filter(a => ['Sell', 'Decreased', 'Sold Out'].includes(a.activity)).length,
      recent: activities.filter(a => {
        const daysDiff = (new Date().getTime() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24)
        return daysDiff <= 30
      }).length
    }
    
    console.log('\n📊 Activity Statistics:')
    console.log(`Total Activities: ${stats.total}`)
    console.log(`Unique Investors: ${stats.investors}`)
    console.log(`Buy Activities: ${stats.buys}`)
    console.log(`Sell Activities: ${stats.sells}`)
    console.log(`Recent (30 days): ${stats.recent}`)
    
    if (activities.length > 0) {
      console.log(`Date Range: ${activities[activities.length - 1].date} to ${activities[0].date}`)
      console.log('\nTop Tickers:')
      const tickerCount = {}
      activities.forEach(a => {
        tickerCount[a.ticker] = (tickerCount[a.ticker] || 0) + 1
      })
      Object.entries(tickerCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([ticker, count]) => {
          console.log(`  ${ticker}: ${count} activities`)
        })
    }
  }
}

// Main execution
const scraper = new DataromaRealTimeScraper()
scraper.run().catch(console.error)