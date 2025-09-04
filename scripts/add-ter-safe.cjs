// Safe script to add TER data to a few more popular ETFs
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
const FMP_API_KEY = process.env.FMP_API_KEY

// Just add TER to the most popular ETFs manually for now
const popularETFs = [
  { symbol: '10AI.DE', ter: 0.12 }, // Amundi MSCI Europe
  { symbol: '2B7B.DE', ter: 0.15 }, // iShares S&P 500
  { symbol: 'VGWE.DE', ter: 0.29 }, // Vanguard All-World High Dividend
  { symbol: 'EUNL.DE', ter: 0.33 }, // iShares MSCI EMU 
  { symbol: 'IUSN.DE', ter: 0.07 }, // iShares MSCI World Small Cap
]

async function addTERToPopularETFs() {
  console.log('🚀 Adding TER data to popular ETFs...')
  
  const dataPath = path.join(__dirname, '../src/data/xetraETFsComplete.ts')
  let fileContent = fs.readFileSync(dataPath, 'utf-8')
  
  let updated = 0
  
  for (const etf of popularETFs) {
    console.log(`Processing ${etf.symbol}...`)
    
    // Simple find and replace for each ETF
    const pattern = `symbol: '${etf.symbol}',`
    if (fileContent.includes(pattern) && !fileContent.includes(`symbol: '${etf.symbol}',[\\s\\S]*?ter:`)) {
      // Find the closing brace of this ETF object and add TER before it
      const regex = new RegExp(`(\\s*{[\\s\\S]*?symbol: '${etf.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?category: '[^']*')(\\s*})`, 'g')
      
      fileContent = fileContent.replace(regex, (match, content, closing) => {
        console.log(`✅ ${etf.symbol}: Added TER ${etf.ter}%`)
        updated++
        return content + `,\n    ter: ${etf.ter}` + closing
      })
    } else {
      console.log(`⏭️  ${etf.symbol}: Already has TER or not found`)
    }
  }
  
  // Write back to file
  fs.writeFileSync(dataPath, fileContent)
  
  console.log(`\n✅ Safe update complete!`)
  console.log(`📈 Updated: ${updated} popular ETFs`)
  console.log(`📁 File updated: ${dataPath}`)
}

addTERToPopularETFs().catch(console.error)