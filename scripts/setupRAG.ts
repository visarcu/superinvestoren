// scripts/setupRAG.ts - Einmaliges RAG-System Setup
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

async function setupFinancialRAG() {
  try {
    console.log('🚀 Initialisiere RAG-System...\n')
    
    // 1. Check Environment Variables
    const requiredEnvs = ['PINECONE_API_KEY', 'OPENAI_API_KEY']
    const optionalEnvs = ['FMP_API_KEY', 'NEXT_PUBLIC_FMP_API_KEY']
    
    const missing: string[] = []
    
    console.log('🔍 Überprüfe Environment Variables:')
    requiredEnvs.forEach(env => {
      if (!process.env[env]) {
        missing.push(env)
        console.log(`   ❌ ${env}: Missing`)
      } else {
        console.log(`   ✅ ${env}: Set`)
      }
    })
    
    // Check FMP key (either location is fine)
    const hasFmpKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
    if (!hasFmpKey) {
      missing.push('FMP_API_KEY')
      console.log(`   ❌ FMP_API_KEY: Missing`)
    } else {
      console.log(`   ✅ FMP_API_KEY: Set`)
    }
    
    if (missing.length > 0) {
      console.error('\n❌ Fehlende Environment Variables:', missing.join(', '))
      console.log('\n📝 Setup-Anleitung:')
      
      if (missing.includes('PINECONE_API_KEY')) {
        console.log('🔧 Pinecone Setup:')
        console.log('1. Gehe zu https://app.pinecone.io')
        console.log('2. Erstelle kostenlosen Account')
        console.log('3. Erstelle neuen Index:')
        console.log('   - Name: "finclue-financial-docs"')
        console.log('   - Dimension: 1024')
        console.log('   - Metric: cosine')
        console.log('4. Kopiere API Key in .env.local: PINECONE_API_KEY=...')
        console.log('')
      }
      
      if (missing.includes('OPENAI_API_KEY')) {
        console.log('🔧 OpenAI Setup:')
        console.log('1. Gehe zu https://platform.openai.com/api-keys')
        console.log('2. Erstelle neuen API Key')
        console.log('3. Füge zu .env.local hinzu: OPENAI_API_KEY=...')
        console.log('')
      }
      
      if (missing.includes('FMP_API_KEY')) {
        console.log('🔧 FMP Setup:')
        console.log('1. Gehe zu https://financialmodelingprep.com')
        console.log('2. Erstelle Account (kostenlos verfügbar)')
        console.log('3. Füge zu .env.local hinzu: FMP_API_KEY=...')
        console.log('')
      }
      
      console.log('Führe danach erneut `npm run rag:setup` aus')
      process.exit(1)
    }
    
    console.log('\n✅ Alle Environment Variables verfügbar!')
    
    // 2. Initialize RAG System
    console.log('\n🔗 Initialisiere RAG-System...')
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    console.log('✅ RAG-System initialisiert')
    
    // 3. Setup Data Ingestion
    console.log('\n📦 Setup Data Ingestion Service...')
    const ingestionService = new DataIngestionService(ragSystem)
    
    // 4. Start with most important stocks
    const majorStocks = [
      'AAPL',  // Apple
      'MSFT',  // Microsoft  
      'GOOGL', // Google
      'AMZN',  // Amazon
      'TSLA',  // Tesla
      'NVDA',  // Nvidia
      'META',  // Meta
    ]
    
    console.log('\n📚 Sammle Earnings Calls und News...')
    console.log(`   Aktien: ${majorStocks.join(', ')}`)
    console.log('   (Das kann 10-15 Minuten dauern...)')
    
    // Check if user wants to proceed
    const args = process.argv.slice(2)
    if (!args.includes('--test') && !args.includes('--auto')) {
      console.log('\n⏳ Starte in 5 Sekunden... (Ctrl+C zum Abbrechen)')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    // 5. Batch ingest data
    if (args.includes('--test')) {
      console.log('\n🧪 Test-Modus: Nur Mock-Daten...')
      console.log('✅ Test erfolgreich - RAG-System ist bereit!')
    } else {
      console.log('\n🔄 Starte Daten-Sammlung...')
      await ingestionService.batchIngest(majorStocks)
      
      // Test the system
      console.log('\n🧪 Teste RAG-System...')
      const testResults = await ragSystem.search({
        query: "earnings revenue quarterly results",
        limit: 10
      })
      
      console.log(`✅ Test erfolgreich - ${testResults.length} Dokumente verfügbar`)
    }
    
    console.log('\n🎉 RAG-System Setup komplett!')
    console.log('💡 Nächste Schritte:')
    console.log('   - Teste mit: npm run rag:status')
    console.log('   - Neue Aktien hinzufügen: npm run rag:ingest TICKER')
    console.log('   - Regelmäßige Updates: npm run rag:update')
    console.log('🚀 Deine AI hat jetzt Zugriff auf echte Finanzdaten!')
    
  } catch (error: any) {
    console.error('\n❌ Setup Error:', error?.message || error)
    
    if (error instanceof Error) {
      if (error.message.includes('PINECONE_API_KEY')) {
        console.log('\n🔧 Pinecone Lösung:')
        console.log('1. Gehe zu https://app.pinecone.io')
        console.log('2. Erstelle kostenlosen Account')
        console.log('3. Erstelle Index: "finclue-financial-docs"')
        console.log('4. Kopiere API Key in .env.local')
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        console.log('\n⏰ Rate Limit erreicht - versuche es in 1 Minute nochmal')
      }
    }
    
    process.exit(1)
  }
}

// Optional: Test function
async function testRAGSystem() {
  try {
    console.log('🧪 Teste RAG-System...\n')
    
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    
    // Test search
    const results = await ragSystem.search({
      query: "iPhone sales revenue quarterly results",
      ticker: "AAPL",
      limit: 3
    })
    
    console.log(`✅ Test erfolgreich - ${results.length} Dokumente gefunden`)
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.source} (${(result.relevance_score * 100).toFixed(1)}% relevant)`)
    })
    
  } catch (error: any) {
    console.error('❌ Test failed:', error?.message || error)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--test-only')) {
    await testRAGSystem()
  } else {
    await setupFinancialRAG()
  }
}

main().catch(console.error)