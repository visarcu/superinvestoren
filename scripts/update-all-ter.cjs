// Complete script to update TER data for ALL XETRA ETFs
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
const FMP_API_KEY = process.env.FMP_API_KEY

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY not found in .env.local')
  process.exit(1)
}

async function fetchETFInfo(symbol) {
  try {
    const url = `https://financialmodelingprep.com/api/v4/etf-info?symbol=${symbol}&apikey=${FMP_API_KEY}`
    const response = await fetch(url)
    
    if (!response.ok) {
      console.log(`❌ ${symbol}: API error ${response.status}`)
      return null
    }
    
    const data = await response.json()
    const etfData = Array.isArray(data) && data.length > 0 ? data[0] : data
    
    if (etfData && etfData.expenseRatio !== undefined) {
      console.log(`✅ ${symbol}: TER ${etfData.expenseRatio}%`)
      return etfData.expenseRatio
    } else {
      console.log(`⚠️  ${symbol}: No TER data`)
      return null
    }
  } catch (error) {
    console.log(`❌ ${symbol}: ${error.message}`)
    return null
  }
}

async function updateAllTERData() {
  console.log('🚀 Starting COMPLETE TER data update for all XETRA ETFs...')
  
  const dataPath = path.join(__dirname, '../src/data/xetraETFsComplete.ts')
  let fileContent = fs.readFileSync(dataPath, 'utf-8')
  
  // Extract all symbols from file
  const symbolMatches = [...fileContent.matchAll(/symbol: '([^']+)'/g)]
  const allSymbols = symbolMatches.map(match => match[1])
  
  console.log(`📊 Found ${allSymbols.length} ETF symbols to process`)
  
  let updated = 0
  let failed = 0
  let skipped = 0
  
  for (let i = 0; i < allSymbols.length; i++) {
    const symbol = allSymbols[i]
    console.log(`[${i + 1}/${allSymbols.length}] Processing ${symbol}...`)
    
    // Skip if TER already exists
    const alreadyHasTER = fileContent.includes(`symbol: '${symbol}'`) && 
                         fileContent.match(new RegExp(`symbol: '${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?ter:`))
    
    if (alreadyHasTER) {
      console.log(`⏭️  ${symbol}: Already has TER, skipping`)
      skipped++
      continue
    }
    
    const ter = await fetchETFInfo(symbol)
    
    if (ter !== null) {
      // Find the ETF object and add TER
      const symbolPattern = new RegExp(`(\\s*{[\\s\\S]*?symbol: '${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?)(\\s*})`, 'g')
      
      fileContent = fileContent.replace(symbolPattern, (match, etfContent, closing) => {
        if (etfContent.includes('ter:')) {
          // Update existing TER
          return etfContent.replace(/ter: [^,\}]*/, `ter: ${ter}`) + closing
        } else {
          // Add TER before closing
          return etfContent + `,\n    ter: ${ter}` + closing
        }
      })
      
      updated++
    } else {
      failed++
    }
    
    // Rate limiting: 5 requests per second
    if (i < allSymbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // Save progress every 100 ETFs
    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(dataPath, fileContent)
      console.log(`💾 Progress saved: ${i + 1}/${allSymbols.length} processed`)
    }
  }
  
  // Final save
  fs.writeFileSync(dataPath, fileContent)
  
  console.log(`\n🎉 COMPLETE UPDATE FINISHED!`)
  console.log(`📈 Updated: ${updated} ETFs`)
  console.log(`❌ Failed: ${failed} ETFs`) 
  console.log(`⏭️  Skipped: ${skipped} ETFs`)
  console.log(`📁 File updated: ${dataPath}`)
  console.log(`\n⏱️  Total time: ${Math.floor((Date.now() - startTime) / 1000)} seconds`)
}

const startTime = Date.now()
updateAllTERData().catch(console.error)