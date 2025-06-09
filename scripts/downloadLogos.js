// scripts/downloadLogos.js
import { promises as fs } from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ✅ Top Aktien für Logo-Download
const TOP_TICKERS = [
  // Tech Giants
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'ORCL', 'CRM',
  'ADBE', 'NFLX', 'INTC', 'AMD', 'QCOM', 'AVGO', 'TXN', 'INTU', 'IBM', 'CSCO',
  
  // Finance
  'BRK.B', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK', 'SPGI',
  
  // Healthcare & Pharma  
  'UNH', 'JNJ', 'PFE', 'ABBV', 'LLY', 'TMO', 'ABT', 'MRK', 'DHR', 'BMY',
  
  // Consumer
  'WMT', 'HD', 'PG', 'KO', 'PEP', 'COST', 'NKE', 'MCD', 'DIS', 'SBUX',
  
  // Energy & Industrial
  'XOM', 'CVX', 'CAT', 'BA', 'MMM', 'UPS', 'RTX', 'LMT', 'NEE', 'SO',
  
  // Payment & Financial Services
  'V', 'MA', 'PYPL', 'SQ', 'COIN',
  
  // Communication
  'VZ', 'T', 'CMCSA', 'TMUS'
]

// ✅ Logo-Quellen (in Prioritätsreihenfolge)
const LOGO_SOURCES = [
  {
    name: 'Financial Modeling Prep',
    getUrl: (ticker) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
    format: 'png'
  },
  {
    name: 'Clearbit',
    getUrl: (ticker) => {
      const domainMap = {
        'AAPL': 'apple.com',
        'MSFT': 'microsoft.com', 
        'GOOGL': 'google.com',
        'GOOG': 'google.com',
        'AMZN': 'amazon.com',
        'META': 'meta.com',
        'TSLA': 'tesla.com',
        'NVDA': 'nvidia.com',
        'NFLX': 'netflix.com',
        'ORCL': 'oracle.com',
        'CRM': 'salesforce.com',
        'ADBE': 'adobe.com',
        'PYPL': 'paypal.com',
        'INTC': 'intel.com',
        'AMD': 'amd.com',
        'IBM': 'ibm.com',
        'CSCO': 'cisco.com',
        'WMT': 'walmart.com',
        'HD': 'homedepot.com',
        'KO': 'coca-cola.com',
        'PEP': 'pepsi.com',
        'MCD': 'mcdonalds.com',
        'DIS': 'disney.com',
        'NKE': 'nike.com',
        'SBUX': 'starbucks.com',
        'UPS': 'ups.com',
        'COST': 'costco.com',
        'V': 'visa.com',
        'MA': 'mastercard.com',
        'VZ': 'verizon.com',
        'T': 'att.com'
      }
      const domain = domainMap[ticker] || `${ticker.toLowerCase()}.com`
      return `https://logo.clearbit.com/${domain}?size=256`
    },
    format: 'png'
  },
  {
    name: 'Logo API',
    getUrl: (ticker) => `https://api.logo.dev/search?q=${ticker}&token=pk_live_your_token_here`,
    format: 'svg'
  }
]

// ✅ Helper: Download File
async function downloadFile(url, filepath) {
  const { createWriteStream } = await import('fs')
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject)
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
        return
      }
      
      const fileStream = createWriteStream(filepath)
      response.pipe(fileStream)
      
      fileStream.on('finish', () => {
        fileStream.close()
        resolve(filepath)
      })
      
      fileStream.on('error', reject)
    })
    
    request.on('error', reject)
    request.setTimeout(10000, () => {
      request.destroy()
      reject(new Error(`Download timeout for ${url}`))
    })
  })
}

// ✅ Helper: File Size Check
async function getFileSize(filepath) {
  try {
    const stats = await fs.stat(filepath)
    return stats.size
  } catch {
    return 0
  }
}

// ✅ Helper: Create Default Logo SVG
async function createDefaultLogo(filepath) {
  const defaultSvg = `
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="12" fill="#374151"/>
  <path d="M32 16C38.6274 16 44 21.3726 44 28C44 34.6274 38.6274 40 32 40C25.3726 40 20 34.6274 20 28C20 21.3726 25.3726 16 32 16Z" fill="#9CA3AF"/>
  <path d="M28 48H36V52H28V48Z" fill="#9CA3AF"/>
  <path d="M30 52H34V56H30V52Z" fill="#9CA3AF"/>
</svg>`
  
  await fs.writeFile(filepath, defaultSvg.trim())
}

// ✅ Main Download Function
async function downloadLogo(ticker) {
  console.log(`📥 Downloading logo for ${ticker}...`)
  
  const logoDir = path.join(process.cwd(), 'public', 'logos')
  
  // Erstelle Logo-Ordner falls nicht vorhanden
  try {
    await fs.mkdir(logoDir, { recursive: true })
  } catch (error) {
    // Ordner existiert bereits
  }
  
  // Versuche verschiedene Quellen
  for (let i = 0; i < LOGO_SOURCES.length; i++) {
    const source = LOGO_SOURCES[i]
    const url = source.getUrl(ticker)
    const filepath = path.join(logoDir, `${ticker.toLowerCase()}.${source.format}`)
    
    try {
      console.log(`  Trying ${source.name}...`)
      await downloadFile(url, filepath)
      
      // Check if file is valid (not too small)
      const fileSize = await getFileSize(filepath)
      if (fileSize < 500) { // Weniger als 500 bytes = wahrscheinlich Fehler
        console.log(`  ❌ File too small (${fileSize} bytes), trying next source...`)
        await fs.unlink(filepath).catch(() => {})
        continue
      }
      
      console.log(`  ✅ Success! Downloaded from ${source.name} (${fileSize} bytes)`)
      return filepath
      
    } catch (error) {
      console.log(`  ❌ Failed from ${source.name}: ${error.message}`)
      // Lösche fehlerhafte Datei
      await fs.unlink(filepath).catch(() => {})
    }
  }
  
  // Fallback: Create default SVG
  console.log(`  🔄 Creating default logo for ${ticker}`)
  const defaultPath = path.join(logoDir, `${ticker.toLowerCase()}.svg`)
  await createDefaultLogo(defaultPath)
  return defaultPath
}

// ✅ Main Execution
async function main() {
  console.log('🚀 Starting automatic logo download...')
  console.log(`📊 Downloading logos for ${TOP_TICKERS.length} top tickers`)
  console.log('=' .repeat(60))
  
  const results = {
    success: 0,
    failed: 0,
    total: TOP_TICKERS.length
  }
  
  // Download logos in batches to avoid overwhelming servers
  const BATCH_SIZE = 5
  for (let i = 0; i < TOP_TICKERS.length; i += BATCH_SIZE) {
    const batch = TOP_TICKERS.slice(i, i + BATCH_SIZE)
    
    const promises = batch.map(async (ticker) => {
      try {
        await downloadLogo(ticker)
        results.success++
        return { ticker, status: 'success' }
      } catch (error) {
        console.log(`❌ Failed to download logo for ${ticker}: ${error.message}`)
        results.failed++
        return { ticker, status: 'failed', error: error.message }
      }
    })
    
    await Promise.all(promises)
    
    // Brief pause between batches
    if (i + BATCH_SIZE < TOP_TICKERS.length) {
      console.log(`⏳ Processed ${Math.min(i + BATCH_SIZE, TOP_TICKERS.length)}/${TOP_TICKERS.length} tickers...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log('=' .repeat(60))
  console.log('📈 Download Summary:')
  console.log(`  ✅ Successful: ${results.success}`)
  console.log(`  ❌ Failed: ${results.failed}`)
  console.log(`  📊 Total: ${results.total}`)
  console.log(`  🎯 Success Rate: ${((results.success / results.total) * 100).toFixed(1)}%`)
  console.log('')
  console.log('🎉 Logo download completed!')
  console.log('📁 Logos saved to: public/logos/')
  console.log('')
  console.log('🔧 Next steps:')
  console.log('  1. Update your Logo component to use local logos first')
  console.log('  2. Deploy your app with the new logos')
  console.log('  3. Enjoy faster loading times! 🚀')
}

// Run the script directly (ES Module style)
main().catch(console.error)

// Export for potential reuse
export { downloadLogo, TOP_TICKERS }