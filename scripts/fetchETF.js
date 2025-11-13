// scripts/fetchETF.js - ETF Holdings via N-PORT/N-Q Filings
import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'

// ETF Series IDs (nicht CIKs!)
const etfSeriesIds = {
  'ark_innovation_etf': 'S000042977',  // ARKK
  'ark_genomics_etf': 'S000053991',    // ARKG  
  'ark_fintech_etf': 'S000057131',     // ARKF
  // Weitere ETFs hier...
}

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Your Name <your.email@example.com>' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`)
  return res.text()
}

async function fetchETFHoldings(slug, seriesId) {
  try {
    console.log(`🔍 Fetching ETF holdings for ${slug} (${seriesId})...`)
    
    // Option 1: Versuche N-PORT filing
    const nportUrl = `https://www.sec.gov/Archives/edgar/data/${seriesId.replace('S', '')}/000000000000000000/N-PORT.xml`
    
    try {
      const nportData = await fetchUrl(nportUrl)
      const parsedData = await parseStringPromise(nportData)
      console.log(`✅ N-PORT data found for ${slug}`)
      return parsedData
    } catch (error) {
      console.log(`ℹ️  No N-PORT data for ${slug}, trying alternative...`)
    }
    
    // Option 2: Versuche über EDGAR Company Search
    const searchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${seriesId}&type=N-PORT&count=1&output=atom`
    
    try {
      const searchData = await fetchUrl(searchUrl)
      console.log(`✅ Found filing data for ${slug}`)
      return { message: 'ETF filing found but parsing not yet implemented' }
    } catch (error) {
      console.log(`❌ No filings found for ${slug}`)
      return null
    }
    
  } catch (error) {
    console.error(`❌ Error fetching ${slug}:`, error.message)
    return null
  }
}

async function main() {
  console.log('🚀 Starting ETF holdings fetch...\n')
  
  for (const [slug, seriesId] of Object.entries(etfSeriesIds)) {
    console.log(`📊 Processing ${slug}...`)
    
    const holdings = await fetchETFHoldings(slug, seriesId)
    
    if (holdings) {
      // Speichere ETF Holdings in separatem Ordner
      const outputDir = path.join(process.cwd(), 'src/data/etf-holdings')
      await fs.mkdir(outputDir, { recursive: true })
      
      const filename = path.join(outputDir, `${slug}.json`)
      await fs.writeFile(filename, JSON.stringify(holdings, null, 2))
      console.log(`✅ Saved ${slug} holdings to ${filename}`)
    }
    
    console.log('')
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('✨ ETF holdings fetch completed!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { fetchETFHoldings, etfSeriesIds }