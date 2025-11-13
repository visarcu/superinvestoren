// scripts/fetchSeries.js - Für ETF Series IDs und Fund Holdings
import fetch from 'node-fetch'
import { parseStringPromise, processors } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'
import { investorCiks } from '../src/lib/cikMapping.js'

// Filtere nur Series IDs (die mit S anfangen) aus der cikMapping
const seriesMapping = Object.fromEntries(
  Object.entries(investorCiks).filter(([slug, cik]) => cik.startsWith('S'))
)

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Your Name <your.email@example.com>' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`)
  return res.text()
}

function getCurrentQuarter() {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  return `${year}-Q${quarter}`
}

async function findLatestFilingForSeries(seriesId) {
  try {
    // Suche nach N-PORT oder N-Q filings für die Series ID
    const searchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${seriesId}&type=N-PORT&count=10&output=atom`
    
    console.log(`🔍 Searching filings for Series ${seriesId}...`)
    
    const searchXml = await fetchUrl(searchUrl)
    const parsed = await parseStringPromise(searchXml, { explicitArray: false })
    
    const entries = parsed.feed?.entry
    if (!entries) {
      console.log(`❌ No filings found for Series ${seriesId}`)
      return null
    }
    
    // Nimm das neueste Filing
    const latestEntry = Array.isArray(entries) ? entries[0] : entries
    const filingUrl = latestEntry.link?.$.href
    
    if (!filingUrl) {
      console.log(`❌ No valid filing URL found for Series ${seriesId}`)
      return null
    }
    
    console.log(`✅ Found filing: ${filingUrl}`)
    return filingUrl
    
  } catch (error) {
    console.error(`❌ Error searching for Series ${seriesId}:`, error.message)
    
    // Fallback: Versuche direkte URL Konstruktion
    const directUrl = `https://www.sec.gov/Archives/edgar/data/${seriesId.replace('S', '')}/000000000000000000/N-PORT.xml`
    console.log(`🔄 Trying direct URL: ${directUrl}`)
    
    try {
      await fetchUrl(directUrl)
      return directUrl
    } catch {
      return null
    }
  }
}

async function parseSeriesFiling(filingUrl) {
  try {
    console.log(`📄 Parsing filing: ${filingUrl}`)
    
    const xmlData = await fetchUrl(filingUrl)
    const parsed = await parseStringPromise(xmlData, { 
      explicitArray: false,
      processors: [processors.stripPrefix]
    })
    
    // N-PORT Structure (vereinfacht)
    const formData = parsed.edgarSubmission?.formData
    const investments = formData?.invstOrSecs?.invstOrSec
    
    if (!investments) {
      console.log(`⚠️ No investment data found in filing`)
      return []
    }
    
    const holdings = []
    const investmentArray = Array.isArray(investments) ? investments : [investments]
    
    for (const investment of investmentArray) {
      if (investment.identifiers?.identifier) {
        const identifier = Array.isArray(investment.identifiers.identifier) 
          ? investment.identifiers.identifier.find(id => id.$.idType === 'TICKER')
          : investment.identifiers.identifier
        
        if (identifier && identifier._) {
          holdings.push({
            ticker: identifier._.toUpperCase(),
            companyName: investment.name || identifier._,
            shares: parseFloat(investment.balance?.balAmt || 0),
            marketValue: parseFloat(investment.valuation?.value || 0),
            percentOfPortfolio: parseFloat(investment.pctVal || 0),
            lastUpdated: new Date().toISOString().split('T')[0]
          })
        }
      }
    }
    
    return holdings.filter(h => h.ticker && h.marketValue > 0)
    
  } catch (error) {
    console.error(`❌ Error parsing filing:`, error.message)
    return []
  }
}

async function fetchSeriesHoldings(slug, seriesId) {
  try {
    console.log(`\n🏦 Processing ${slug} (Series: ${seriesId})...`)
    
    const filingUrl = await findLatestFilingForSeries(seriesId)
    if (!filingUrl) {
      console.log(`❌ No filings found for ${slug}`)
      return null
    }
    
    const holdings = await parseSeriesFiling(filingUrl)
    
    if (holdings.length === 0) {
      console.log(`⚠️ No valid holdings found for ${slug}`)
      return null
    }
    
    // Transform zu 13F-kompatiblem Format
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0)
    
    const result = {
      investorName: slug.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      investorSlug: slug,
      period: getCurrentQuarter(),
      filingDate: new Date().toISOString().split('T')[0],
      totalValue: totalValue,
      holdings: holdings
        .sort((a, b) => b.marketValue - a.marketValue)
        .map(holding => ({
          ticker: holding.ticker,
          companyName: holding.companyName,
          shares: holding.shares,
          marketValue: holding.marketValue,
          percentOfPortfolio: holding.percentOfPortfolio
        }))
    }
    
    console.log(`✅ Found ${holdings.length} holdings for ${slug} (Total: $${(totalValue/1000000).toFixed(1)}M)`)
    
    return result
    
  } catch (error) {
    console.error(`❌ Error processing ${slug}:`, error.message)
    return null
  }
}

async function main() {
  console.log('🚀 Starting Series ID holdings fetch...\n')
  
  // Create output directory
  const outputDir = path.join(process.cwd(), 'src/data/holdings')
  await fs.mkdir(outputDir, { recursive: true })
  
  for (const [slug, seriesId] of Object.entries(seriesMapping)) {
    const data = await fetchSeriesHoldings(slug, seriesId)
    
    if (data) {
      const filename = path.join(outputDir, `${slug}.json`)
      await fs.writeFile(filename, JSON.stringify(data, null, 2))
      console.log(`✅ Saved ${slug} to ${filename}`)
      
      // Show top 5 holdings
      console.log(`📊 Top 5 holdings for ${slug}:`)
      data.holdings.slice(0, 5).forEach((holding, i) => {
        console.log(`  ${i + 1}. ${holding.ticker} - $${(holding.marketValue/1000000).toFixed(1)}M (${holding.percentOfPortfolio.toFixed(1)}%)`)
      })
    }
    
    console.log('')
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('✨ Series holdings fetch completed!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { fetchSeriesHoldings, seriesMapping }