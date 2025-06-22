// scripts/ingestRAG.ts - Spezifische Ticker hinzufügen
import { FinancialRAGSystem, DataIngestionService } from '../src/lib/ragSystem'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manual .env.local loading (working version)
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    
    console.log('📁 Loading .env.local manually...')
    
    let loaded = 0
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const equalIndex = trimmed.indexOf('=')
        const key = trimmed.substring(0, equalIndex).trim()
        const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '')
        
        if (key && value) {
          process.env[key] = value
          loaded++
        }
      }
    }
    
    console.log(`✅ Loaded ${loaded} environment variables`)
    return true
  } catch (error: any) {
    console.log('❌ Could not load .env.local:', error?.message || error)
    return false
  }
}

// Load environment variables
loadEnvFile()

async function ingestSpecificTickers() {
  try {
    // Command line arguments
    const args = process.argv.slice(2)
    const tickers = args.filter(arg => !arg.startsWith('--'))
    const flags = args.filter(arg => arg.startsWith('--'))
    
    if (tickers.length === 0) {
      console.log('📝 Usage: npm run rag:ingest AAPL MSFT GOOGL')
      console.log('📝 Flags:')
      console.log('   --earnings-only  Nur Earnings Calls')
      console.log('   --news-only      Nur News')
      console.log('   --full           Alle Daten (default)')
      process.exit(1)
    }
    
    // Check required environment variables
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY fehlt - erstelle Pinecone Account zuerst')
      console.log('🔧 Lösung:')
      console.log('1. Gehe zu https://app.pinecone.io')
      console.log('2. Erstelle Account und Index')
      console.log('3. Füge PINECONE_API_KEY zu .env.local hinzu')
      process.exit(1)
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY fehlt')
      process.exit(1)
    }
    
    const hasFmpKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
    if (!hasFmpKey) {
      console.error('❌ FMP_API_KEY fehlt')
      process.exit(1)
    }
    
    console.log(`🎯 Füge Daten hinzu für: ${tickers.join(', ')}`)
    
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    
    const ingestionService = new DataIngestionService(ragSystem)
    
    const earningsOnly = flags.includes('--earnings-only')
    const newsOnly = flags.includes('--news-only')
    
    for (const ticker of tickers) {
      console.log(`\n📈 Verarbeite ${ticker}...`)
      
      try {
        if (!newsOnly) {
          // Earnings Calls für letzte 8 Quartale
          console.log(`   📞 Sammle Earnings Calls...`)
          const currentYear = new Date().getFullYear()
          const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
          
          for (let i = 0; i < 8; i++) {
            let year = currentYear
            let quarter = currentQuarter - i
            
            if (quarter <= 0) {
              quarter += 4
              year -= 1
            }
            
            if (year >= 2022) { // Nur ab 2022
              await ingestionService.ingestEarningsCall(ticker, year, quarter)
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }
        
        if (!earningsOnly) {
          // News Artikel
          console.log(`   📰 Sammle News Artikel...`)
          await ingestionService.ingestNews(ticker, 30)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        // Test nach Ingestion
        const testResults = await ragSystem.search({
          query: `${ticker} financial data`,
          ticker: ticker,
          limit: 5
        })
        
        console.log(`   ✅ ${ticker} - ${testResults.length} Dokumente verfügbar`)
        
      } catch (error: any) {
        console.error(`   ❌ ${ticker} - Fehler:`, error?.message || error)
      }
    }
    
    console.log('\n🎉 Ingestion komplett!')
    
    // Finale Statistik
    for (const ticker of tickers) {
      const results = await ragSystem.search({
        query: "quarterly earnings revenue",
        ticker: ticker,
        limit: 10
      })
      console.log(`📊 ${ticker}: ${results.length} Dokumente verfügbar`)
    }
    
  } catch (error: any) {
    console.error('❌ Ingestion Error:', error?.message || error)
    process.exit(1)
  }
}

ingestSpecificTickers()