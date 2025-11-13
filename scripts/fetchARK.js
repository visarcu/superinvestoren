// scripts/fetchARK.js - ARK ETF Holdings via their daily CSV files
import fetch from 'node-fetch'
import fs from 'fs/promises'
import path from 'path'

// ARK ETFs mit ihren CSV URLs
const arkETFs = {
  'ark_innovation_etf': {
    name: 'ARK Innovation ETF',
    ticker: 'ARKK',
    csvUrl: 'https://ark-funds.com/wp-content/uploads/funds-etf-csv/ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv'
  },
  'ark_genomics_etf': {
    name: 'ARK Genomic Revolution ETF', 
    ticker: 'ARKG',
    csvUrl: 'https://ark-funds.com/wp-content/uploads/funds-etf-csv/ARK_GENOMIC_REVOLUTION_MULTISECTOR_ETF_ARKG_HOLDINGS.csv'
  },
  'ark_fintech_etf': {
    name: 'ARK Fintech Innovation ETF',
    ticker: 'ARKF', 
    csvUrl: 'https://ark-funds.com/wp-content/uploads/funds-etf-csv/ARK_FINTECH_INNOVATION_ETF_ARKF_HOLDINGS.csv'
  },
  'ark_autonomous_etf': {
    name: 'ARK Autonomous Technology & Robotics ETF',
    ticker: 'ARKQ',
    csvUrl: 'https://ark-funds.com/wp-content/uploads/funds-etf-csv/ARK_AUTONOMOUS_TECHNOLOGY_&_ROBOTICS_ETF_ARKQ_HOLDINGS.csv'
  },
  'ark_space_etf': {
    name: 'ARK Space Exploration & Innovation ETF',
    ticker: 'ARKX',
    csvUrl: 'https://ark-funds.com/wp-content/uploads/funds-etf-csv/ARK_SPACE_EXPLORATION_&_INNOVATION_ETF_ARKX_HOLDINGS.csv'
  }
}

async function fetchCSV(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  
  return response.text()
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  const holdings = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    
    if (values.length >= headers.length && values[0]) {
      const holding = {}
      headers.forEach((header, index) => {
        holding[header] = values[index] || ''
      })
      
      // Convert percentage and market value to numbers
      if (holding['weight(%)']) {
        holding.weightPercent = parseFloat(holding['weight(%)'].replace('%', ''))
      }
      
      if (holding['market value($)']) {
        holding.marketValue = parseFloat(holding['market value($)'].replace(/[,$]/g, ''))
      }
      
      holdings.push(holding)
    }
  }
  
  return holdings
}

async function fetchARKHoldings(etfSlug, etfData) {
  try {
    console.log(`🔍 Fetching ${etfData.name} (${etfData.ticker}) holdings...`)
    
    const csvData = await fetchCSV(etfData.csvUrl)
    const holdings = parseCSV(csvData)
    
    console.log(`✅ Found ${holdings.length} holdings for ${etfData.ticker}`)
    
    // Transform to our standard format
    const transformedHoldings = holdings
      .filter(h => h.ticker && h.ticker !== 'CASH' && h.weightPercent > 0)
      .map(holding => ({
        ticker: holding.ticker || holding.symbol,
        companyName: holding.company || holding['fund name'] || holding.ticker,
        shares: parseFloat(holding.shares?.replace(/,/g, '') || 0),
        marketValue: holding.marketValue || 0,
        weightPercent: holding.weightPercent || 0,
        lastUpdated: new Date().toISOString().split('T')[0]
      }))
      .sort((a, b) => b.weightPercent - a.weightPercent) // Sort by weight
    
    const summary = {
      fundName: etfData.name,
      ticker: etfData.ticker,
      totalHoldings: transformedHoldings.length,
      lastUpdated: new Date().toISOString().split('T')[0],
      topHoldings: transformedHoldings.slice(0, 10),
      allHoldings: transformedHoldings
    }
    
    return summary
    
  } catch (error) {
    console.error(`❌ Error fetching ${etfData.ticker}:`, error.message)
    return null
  }
}

async function main() {
  console.log('🚀 Starting ARK ETF holdings fetch...\\n')
  
  // Create output directory
  const outputDir = path.join(process.cwd(), 'src/data/holdings')
  await fs.mkdir(outputDir, { recursive: true })
  
  for (const [slug, etfData] of Object.entries(arkETFs)) {
    const holdings = await fetchARKHoldings(slug, etfData)
    
    if (holdings) {
      const filename = path.join(outputDir, `${slug}.json`)
      await fs.writeFile(filename, JSON.stringify(holdings, null, 2))
      console.log(`✅ Saved ${etfData.ticker} holdings to ${filename}`)
      
      // Show top 5 holdings
      console.log(`📊 Top 5 holdings for ${etfData.ticker}:`)
      holdings.topHoldings.slice(0, 5).forEach((holding, i) => {
        console.log(`  ${i + 1}. ${holding.ticker} - ${holding.companyName} (${holding.weightPercent.toFixed(2)}%)`)
      })
    }
    
    console.log('')
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('✨ ARK ETF holdings fetch completed!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { fetchARKHoldings, arkETFs }