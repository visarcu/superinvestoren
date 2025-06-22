// scripts/cleanRAG.ts - RAG System Cleanup
import { Pinecone } from '@pinecone-database/pinecone'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manual .env.local loading (working version)
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    
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
    
    return true
  } catch (error: any) {
    console.log('❌ Could not load .env.local:', error?.message || error)
    return false
  }
}

// Load environment variables
loadEnvFile()

async function cleanRAGSystem() {
  try {
    const args = process.argv.slice(2)
    const flags = args.filter(arg => arg.startsWith('--'))
    
    console.log('🧹 RAG System Cleanup...\n')
    
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY fehlt')
      console.log('🔧 Lösung:')
      console.log('1. Gehe zu https://app.pinecone.io')
      console.log('2. Erstelle Account und Index')
      console.log('3. Füge PINECONE_API_KEY zu .env.local hinzu')
      process.exit(1)
    }
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    })
    
    const indexName = 'finclue-financial-docs'
    const index = pinecone.Index(indexName)
    
    if (flags.includes('--confirm-delete-all')) {
      console.log('⚠️ LÖSCHE ALLE DATEN...')
      
      // Delete all vectors in namespace
      await index.namespace('financial-documents').deleteAll()
      
      console.log('✅ Alle Daten gelöscht')
      
    } else if (flags.includes('--old-data')) {
      console.log('🗓️ Lösche alte Daten (älter als 6 Monate)...')
      
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const cutoffDate = sixMonthsAgo.toISOString().split('T')[0]
      
      // Note: Pinecone doesn't support filtering deletes directly
      // This would require querying first, then deleting by IDs
      console.log(`📅 Cutoff Date: ${cutoffDate}`)
      console.log('⚠️ Manual cleanup erforderlich - nutze Pinecone Console')
      
    } else if (flags.includes('--ticker')) {
      const ticker = args.find(arg => !arg.startsWith('--'))
      if (!ticker) {
        console.error('❌ Ticker fehlt. Usage: --ticker AAPL')
        process.exit(1)
      }
      
      console.log(`🎯 Lösche Daten für ${ticker}...`)
      
      // Delete by metadata filter
      await index.namespace('financial-documents').deleteMany({
        ticker: { $eq: ticker }
      })
      
      console.log(`✅ Daten für ${ticker} gelöscht`)
      
    } else {
      console.log('🔧 Cleanup Optionen:')
      console.log('')
      console.log('📊 Status anzeigen:')
      console.log('   npm run rag:clean')
      console.log('')
      console.log('🗑️ Spezifische Aktie löschen:')
      console.log('   npm run rag:clean -- --ticker AAPL')
      console.log('')
      console.log('📅 Alte Daten löschen (6+ Monate):')
      console.log('   npm run rag:clean -- --old-data')
      console.log('')
      console.log('⚠️ ALLES löschen (Vorsicht!):')
      console.log('   npm run rag:clean -- --confirm-delete-all')
      console.log('')
      
      // Show current stats
      try {
        const stats = await index.describeIndexStats()
        console.log('📈 Aktuelle Statistiken:')
        console.log(`   Records: ${stats.totalRecordCount || 0}`)
        console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length}`)
        
        if (stats.namespaces && stats.namespaces['financial-documents']) {
          const finDocs = stats.namespaces['financial-documents']
          console.log(`   Financial Documents: ${finDocs.recordCount || 0} records`)
        }
      } catch (error: any) {
        console.warn('⚠️ Statistiken nicht verfügbar:', error?.message || error)
      }
    }
    
  } catch (error: any) {
    console.error('❌ Cleanup Error:', error?.message || error)
    process.exit(1)
  }
}

cleanRAGSystem()