// Simple script to test a few ETFs and add TER data
const fs = require('fs')
const path = require('path')

const FMP_API_KEY = process.env.FMP_API_KEY

// Test with just a few popular ETFs first
const testSymbols = [
  'VGWL.DE',  // Vanguard FTSE All-World  
  'VGWE.DE',  // Vanguard FTSE All-World
  'VWCE.DE',  // Vanguard FTSE All-World Acc
  '2B7K.DE',  // iShares MSCI World SRI
  '10AI.DE',  // Amundi MSCI Europe
  '2B7B.DE',  // iShares S&P 500
]

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

async function updateTERData() {
  console.log('🚀 Testing TER data update for popular ETFs...')
  
  const dataPath = path.join(__dirname, '../src/data/xetraETFsComplete.ts')
  let fileContent = fs.readFileSync(dataPath, 'utf-8')
  
  let updated = 0
  
  for (const symbol of testSymbols) {
    console.log(`Processing ${symbol}...`)
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
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Write back to file
  fs.writeFileSync(dataPath, fileContent)
  
  console.log(`\n✅ Test update complete!`)
  console.log(`📈 Updated: ${updated} ETFs`)
  console.log(`📁 File updated: ${dataPath}`)
}

updateTERData().catch(console.error)