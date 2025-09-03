// scripts/update-ter-data.js
// Updates TER data for all XETRA ETFs from FMP API

const fs = require('fs')
const path = require('path')

const FMP_API_KEY = process.env.FMP_API_KEY

if (!FMP_API_KEY) {
  console.error('FMP_API_KEY environment variable is required')
  process.exit(1)
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
      return {
        ter: etfData.expenseRatio,
        aum: etfData.aum,
        isin: etfData.isin,
        inceptionDate: etfData.inceptionDate
      }
    } else {
      console.log(`⚠️  ${symbol}: No TER data`)
      return null
    }
  } catch (error) {
    console.log(`❌ ${symbol}: ${error.message}`)
    return null
  }
}

async function updateTERData() {
  console.log('🚀 Starting TER data update...')
  
  // Read current ETF data
  const dataPath = path.join(__dirname, '../src/data/xetraETFsComplete.ts')
  const fileContent = fs.readFileSync(dataPath, 'utf-8')
  
  // Extract ETFs from the file
  const etfMatch = fileContent.match(/export const xetraETFs: ETF\[\] = (\[[\s\S]*\])/);
  if (!etfMatch) {
    console.error('Could not parse ETF data from file')
    process.exit(1)
  }
  
  // Parse symbols from file content
  const symbolMatches = [...fileContent.matchAll(/symbol: '([^']+)'/g)]
  const etfSymbols = symbolMatches.map(match => match[1])
  
  console.log(`📊 Found ${etfSymbols.length} ETF symbols to update`)
  
  console.log(`📊 Found ${etfs.length} ETFs to update`)
  
  let updated = 0
  let failed = 0
  
  // Update ETFs with TER data
  for (let i = 0; i < etfs.length; i++) {
    const etf = etfs[i]
    console.log(`[${i + 1}/${etfs.length}] Processing ${etf.symbol}...`)
    
    const terData = await fetchETFInfo(etf.symbol)
    
    if (terData) {
      etf.ter = terData.ter
      if (terData.isin && !etf.isin) etf.isin = terData.isin
      updated++
    } else {
      failed++
    }
    
    // Rate limiting: 5 requests per second
    if (i < etfs.length - 1) {
      await delay(200)
    }
  }
  
  // Generate updated file content
  const updatedContent = fileContent.replace(
    /export const xetraETFs: ETF\[\] = \[[\s\S]*\]/,
    `export const xetraETFs: ETF[] = ${JSON.stringify(etfs, null, 2)}`
  )
  
  // Write back to file
  fs.writeFileSync(dataPath, updatedContent)
  
  console.log(`\n✅ Update complete!`)
  console.log(`📈 Updated: ${updated} ETFs`)
  console.log(`❌ Failed: ${failed} ETFs`)
  console.log(`📁 File updated: ${dataPath}`)
}

updateTERData().catch(console.error)