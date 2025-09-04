// ROBUST script to add TER data to ALL ETFs
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
const FMP_API_KEY = process.env.FMP_API_KEY

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY not found!')
  process.exit(1)
}

async function fetchETFInfo(symbol) {
  try {
    const url = `https://financialmodelingprep.com/api/v4/etf-info?symbol=${symbol}&apikey=${FMP_API_KEY}`
    const response = await fetch(url)
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    const etfData = Array.isArray(data) && data.length > 0 ? data[0] : data
    
    if (etfData && etfData.expenseRatio !== undefined && etfData.expenseRatio !== null) {
      return etfData.expenseRatio
    }
    return null
  } catch (error) {
    return null
  }
}

async function bulkUpdateAllTER() {
  console.log('🚀 BULK TER UPDATE - Processing ALL 1,852 ETFs...')
  
  const dataPath = path.join(__dirname, '../src/data/xetraETFsComplete.ts')
  const originalContent = fs.readFileSync(dataPath, 'utf-8')
  
  // Parse ETF symbols from file
  const symbolMatches = [...originalContent.matchAll(/symbol: '([^']+)'/g)]
  const allSymbols = symbolMatches.map(match => match[1])
  
  console.log(`📊 Found ${allSymbols.length} ETF symbols`)
  
  // Fetch TER for ALL symbols in batches
  const terData = {}
  let processed = 0
  let successful = 0
  
  for (const symbol of allSymbols) {
    processed++
    console.log(`[${processed}/${allSymbols.length}] Fetching ${symbol}...`)
    
    const ter = await fetchETFInfo(symbol)
    if (ter !== null) {
      terData[symbol] = ter
      successful++
      console.log(`✅ ${symbol}: ${ter}%`)
    } else {
      console.log(`❌ ${symbol}: No TER`)
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Progress update every 100
    if (processed % 100 === 0) {
      console.log(`📊 Progress: ${processed}/${allSymbols.length} (${successful} successful)`)
    }
  }
  
  console.log(`\n📊 TER Fetching Complete:`)
  console.log(`✅ Success: ${successful}/${allSymbols.length}`)
  console.log(`\n🔨 Now updating file structure...`)
  
  // Now update the file with a SAFE approach
  let updatedContent = originalContent
  let fileUpdates = 0
  
  for (const [symbol, ter] of Object.entries(terData)) {
    console.log(`📝 Adding TER to ${symbol}: ${ter}%`)
    
    // Find each ETF object and add TER field
    const etfObjectRegex = new RegExp(
      `(\\s*{[^}]*symbol: '${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]*?category: '[^']*')([^}]*}),`, 
      'g'
    )
    
    updatedContent = updatedContent.replace(etfObjectRegex, (match, beforeCategory, afterCategory) => {
      if (beforeCategory.includes('ter:')) {
        // Update existing TER
        return match.replace(/ter: [^,}]*/, `ter: ${ter}`)
      } else {
        // Add new TER field
        fileUpdates++
        return beforeCategory + afterCategory.replace('}', `,\n    ter: ${ter}\n  }`) + ','
      }
    })
  }
  
  // Write the updated content
  fs.writeFileSync(dataPath, updatedContent)
  
  console.log(`\n🎉 BULK UPDATE COMPLETE!`)
  console.log(`📈 API Calls: ${successful}/${allSymbols.length} successful`)
  console.log(`📝 File Updates: ${fileUpdates} ETFs updated`)
  console.log(`📁 File: ${dataPath}`)
  
  // Verify the update
  const finalContent = fs.readFileSync(dataPath, 'utf-8')
  const finalTERCount = (finalContent.match(/ter:/g) || []).length
  console.log(`✅ Verification: ${finalTERCount} ETFs now have TER data`)
}

const startTime = Date.now()
bulkUpdateAllTER().then(() => {
  console.log(`⏱️  Total time: ${Math.floor((Date.now() - startTime) / 1000)} seconds`)
}).catch(console.error)