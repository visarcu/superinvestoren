// scripts/statusRAG.ts - RAG System Status Check
import { FinancialRAGSystem } from '../src/lib/ragSystem'
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

async function checkRAGStatus() {
  try {
    console.log('\n🔍 Überprüfe RAG-System Status...\n')
    
    // 1. Environment Check - ANGEPASST an deine Key-Namen
    const envVars = [
      'PINECONE_API_KEY',
      'OPENAI_API_KEY', 
      'FMP_API_KEY',  // Dein echter Key-Name
      'NEXT_PUBLIC_FMP_API_KEY'  // Backup
    ]
    console.log('📋 Environment Variables:')
    envVars.forEach(env => {
      const status = process.env[env] ? '✅' : '❌'
      const value = process.env[env] ? 'Set' : 'Missing'
      console.log(`   ${status} ${env}: ${value}`)
    })
    
    // Check if we have FMP key in either location
    const hasFmpKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
    if (hasFmpKey) {
      console.log('   ✅ FMP API verfügbar (über FMP_API_KEY oder NEXT_PUBLIC_FMP_API_KEY)')
    }
    console.log()
    
    // 2. RAG System Connection
    console.log('🔗 RAG System Verbindung:')
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    console.log('   ✅ Pinecone Verbindung erfolgreich')
    console.log('   ✅ OpenAI Embeddings verfügbar')
    console.log()
    
    // 3. Data Availability Tests
    console.log('📊 Daten-Verfügbarkeit Tests:')
    
    const testQueries = [
      { query: "iPhone revenue", ticker: "AAPL", name: "Apple iPhone Data" },
      { query: "cloud revenue", ticker: "MSFT", name: "Microsoft Cloud Data" },
      { query: "earnings call", ticker: "GOOGL", name: "Google Earnings Data" },
      { query: "quarterly results", name: "General Financial Data" }
    ]
    
    for (const test of testQueries) {
      try {
        const results = await ragSystem.search({
          query: test.query,
          ticker: test.ticker,
          limit: 3
        })
        
        const status = results.length > 0 ? '✅' : '⚠️'
        const count = results.length
        const avgScore = results.length > 0 
          ? (results.reduce((sum: number, r: any) => sum + r.relevance_score, 0) / results.length * 100).toFixed(1)
          : '0'
        
        console.log(`   ${status} ${test.name}: ${count} docs (${avgScore}% avg relevance)`)
        
        if (results.length > 0 && results[0].relevance_score > 0.8) {
          console.log(`      🎯 Top Result: "${results[0].source}"`)
        }
      } catch (error: any) {
        console.log(`   ❌ ${test.name}: Error - ${error?.message || error}`)
      }
    }
    console.log()
    
    // 4. System Recommendations
    console.log('💡 Empfehlungen:')
    
    const allResults = await ragSystem.search({ query: "financial data", limit: 50 })
    const totalDocs = allResults.length
    
    if (totalDocs < 10) {
      console.log('   ⚠️ Wenige Dokumente verfügbar - führe `npm run rag:setup` aus')
    } else if (totalDocs < 100) {
      console.log('   📈 Grunddaten verfügbar - erwäge mehr Aktien hinzuzufügen')
    } else {
      console.log('   ✅ Gute Datenbasis verfügbar')
    }
    
    // Check for recent data (without date filter for now)
    const recentResults = await ragSystem.search({
      query: "news recent latest",
      limit: 10
    })
    
    if (recentResults.length < 5) {
      console.log('   📅 Wenige aktuelle Daten - führe `npm run rag:update` aus')
    } else {
      console.log('   ✅ Aktuelle Daten verfügbar')
    }
    
    if (recentResults.length < 5) {
      console.log('   📅 Wenige aktuelle Daten - führe `npm run rag:update` aus')
    } else {
      console.log('   ✅ Aktuelle Daten verfügbar')
    }
    
    console.log(`\n📈 Gesamt: ${totalDocs} Dokumente im RAG-System verfügbar`)
    console.log('🚀 RAG-System ist bereit für AI-Enhanced Analysen!')
    
  } catch (error: any) {
    console.error('❌ Status Check Error:', error?.message || error)
    
    if (error instanceof Error && error.message.includes('PINECONE_API_KEY')) {
      console.log('\n🔧 Lösung:')
      console.log('1. Erstelle Pinecone Account: https://app.pinecone.io')
      console.log('2. Füge PINECONE_API_KEY zu .env.local hinzu')
      console.log('3. Führe `npm run rag:setup` aus')
    }
    
    process.exit(1)
  }
}

checkRAGStatus()