// scripts/scrapeDataromaRealTime.js - ES Module Version
import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DataromaRealTimeScraper {
  
  constructor() {
    this.outputPath = path.join(__dirname, '../src/data/realtime-activity.json')
    this.baseUrl = 'https://www.dataroma.com'
  }
  
  async run() {
    console.log('🔄 Scraping Dataroma Real-Time Activity...')
    
    try {
      // Scrape the main Real-Time Activity table
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
    console.log('🔍 Fetching Dataroma homepage...')
    
    const response = await axios.get(`${this.baseUrl}/m/home.php`, {
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
    
    // Look for the Real-Time Activity table
    let foundTable = false
    
    $('table').each((tableIndex, table) => {
      const $table = $(table)
      
      // Check if this table contains the Real-Time Activity data
      const tableText = $table.text()
      if (tableText.includes('Transaction Date') || 
          tableText.includes('Filing') || 
          tableText.includes('Reporting Name') ||
          tableText.includes('Activity')) {
        
        console.log(`📋 Found potential activity table ${tableIndex + 1}`)
        foundTable = true
        
        // Get headers to understand table structure
        const headers = []
        $table.find('tr').first().find('td, th').each((i, cell) => {
          const headerText = $(cell).text().trim()
          headers.push(headerText)
          console.log(`   Header ${i}: "${headerText}"`)
        })
        
        // Process data rows
        let rowCount = 0
        $table.find('tr').slice(1).each((rowIndex, row) => {
          const $row = $(row)
          const cells = $row.find('td')
          
          if (cells.length >= 7) { // Ensure we have enough columns
            const cellData = []
            cells.each((i, cell) => {
              cellData.push($(cell).text().trim())
            })
            
            // Map to expected structure based on Dataroma format:
            // [Transaction Date, Filing, Reporting Name, Activity, Security, Shares, Price, Total]
            const [date, filing, reportingName, activity, security, shares, price, total] = cellData
            
            if (date && reportingName && security && this.isValidDate(date)) {
              const activityData = {
                id: `dataroma-${date}-${reportingName}-${security}`.replace(/[^a-zA-Z0-9-]/g, '-'),
                date: this.parseDate(date),
                filing: filing || 'Unknown',
                investor: this.cleanInvestorName(reportingName),
                activity: this.normalizeActivity(activity),
                security: security,
                ticker: this.extractTicker(security),
                shares: this.parseNumber(shares),
                price: this.parseNumber(price),
                total: this.parseNumber(total) || (this.parseNumber(shares) * this.parseNumber(price)),
                source: 'dataroma-realtime',
                quarter: this.dateToQuarter(this.parseDate(date))
              }
              
              // Only add if we have meaningful data
              if (activityData.investor && activityData.security && activityData.date) {
                activities.push(activityData)
                rowCount++
                
                if (rowCount <= 3) { // Log first few for debugging
                  console.log(`   Row ${rowCount}: ${activityData.investor} - ${activityData.activity} - ${activityData.ticker}`)
                }
              }
            }
          }
        })
        
        console.log(`📊 Extracted ${rowCount} activities from table ${tableIndex + 1}`)
      }
    })
    
    if (!foundTable) {
      console.warn('⚠️ No activity table found - page structure may have changed')
      
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
    // Check if string looks like a date (MM/DD/YYYY or similar)
    return /\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr) || /\d{4}-\d{2}-\d{2}/.test(dateStr)
  }
  
  parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0]
    
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
    if (!name) return 'Unknown'
    
    return name
      .replace(/\s+/g, ' ')
      .replace(/,?\s*(INC|LLC|LP|LTD|CORP|CORPORATION|MANAGEMENT|CAPITAL|FUND|TRUST)\.?\s*$/i, '')
      .replace(/,?\s*(JR|SR|III|II)\.?$/i, '')
      .trim()
  }
  
  normalizeActivity(activity) {
    if (!activity) return 'Unknown'
    
    const activityLower = activity.toLowerCase()
    
    if (activityLower.includes('buy') || activityLower.includes('purchase')) return 'Buy'
    if (activityLower.includes('sell') || activityLower.includes('sale')) return 'Sell'
    if (activityLower.includes('new')) return 'New Position'
    if (activityLower.includes('sold out')) return 'Sold Out'
    if (activityLower.includes('increased')) return 'Increased'
    if (activityLower.includes('decreased')) return 'Decreased'
    
    return activity // Return original if no match
  }
  
  extractTicker(security) {
    if (!security) return 'Unknown'
    
    // Try to extract ticker from "COMPANY NAME (TICKER)" format
    const match = security.match(/\(([A-Z]{1,5})\)/)
    if (match) return match[1]
    
    // Try to get ticker from beginning if all caps
    const words = security.split(' ')
    const firstWord = words[0]
    if (firstWord && /^[A-Z]{1,5}$/.test(firstWord)) {
      return firstWord
    }
    
    // Fallback to first word
    return firstWord || security.substring(0, 5).toUpperCase()
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
      if (isNaN(year) || isNaN(month)) return 'Q1 2024'
      const quarter = Math.ceil(month / 3)
      return `Q${quarter} ${year}`
    } catch (error) {
      return 'Q1 2024'
    }
  }
  
  removeDuplicates(activities) {
    const seen = new Set()
    return activities.filter(activity => {
      const key = `${activity.date}-${activity.investor}-${activity.security}-${activity.activity}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  
  async saveActivities(data) {
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
      buys: activities.filter(a => a.activity === 'Buy').length,
      sells: activities.filter(a => a.activity === 'Sell').length,
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
      console.log('\nTop Investors:')
      const investorCount = {}
      activities.forEach(a => {
        investorCount[a.investor] = (investorCount[a.investor] || 0) + 1
      })
      Object.entries(investorCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([investor, count]) => {
          console.log(`  ${investor}: ${count} activities`)
        })
    }
  }
}

// Main execution
const scraper = new DataromaRealTimeScraper()
scraper.run().catch(console.error)