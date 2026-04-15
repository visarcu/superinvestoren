// scripts/updateRAG.ts - Tägliche Daten-Updates
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

async function updateRAGData() {
  try {
    console.log('🔄 Aktualisiere RAG-System...\n')
    
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
    
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    
    const ingestionService = new DataIngestionService(ragSystem)
    
    // Zentrale RAG-Ticker-Liste (in src/lib/ragTickers.ts pflegen)
    const { RAG_TICKERS } = await import('../src/lib/ragTickers')
    const watchedStocks = [...RAG_TICKERS]
    
    console.log(`📰 Aktualisiere News für ${watchedStocks.length} Aktien...`)
    
    for (const ticker of watchedStocks) {
      try {
        // Nur neue News der letzten 24h (limit=10)
        await ingestionService.ingestNews(ticker, 10)
        console.log(`✅ ${ticker} - News aktualisiert`)
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error: any) {
        console.warn(`⚠️ ${ticker} - Update fehlgeschlagen:`, error?.message || error)
      }
    }
    
    console.log('\n✅ RAG-Update komplett!')
    
    // Statistiken anzeigen
    const testResult = await ragSystem.search({
      query: "latest earnings",
      limit: 5
    })
    
    console.log(`📊 Aktuell ${testResult.length} relevante Dokumente verfügbar`)
    
  } catch (error: any) {
    console.error('❌ Update Error:', error?.message || error)
    process.exit(1)
  }
}

updateRAGData()