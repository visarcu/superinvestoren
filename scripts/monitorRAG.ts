// scripts/monitorRAG.ts - RAG System Performance Monitoring
import { FinancialRAGSystem } from '../src/lib/ragSystem'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manual .env.local loading
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
    
    console.log(`✅ Loaded ${loaded} environment variables`)
    return true
  } catch (error: any) {
    console.log('❌ Could not load .env.local:', error?.message || error)
    return false
  }
}

loadEnvFile()

interface PerformanceMetrics {
  totalDocuments: number
  avgRelevanceScore: number
  documentTypes: Record<string, number>
  tickerCoverage: Record<string, number>
  recentQueries: Array<{
    query: string
    resultsCount: number
    avgScore: number
    timestamp: Date
  }>
}

async function monitorRAGPerformance(): Promise<void> {
  try {
    console.log('📊 RAG System Performance Monitor\n')
    
    // Initialize RAG System
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    
    // Test queries for different scenarios
    const testQueries = [
      { query: "earnings revenue quarterly", name: "General Earnings" },
      { query: "iPhone sales Apple", name: "Product-specific" },
      { query: "cloud computing Microsoft Azure", name: "Business Segment" },
      { query: "dividend payout ratio", name: "Financial Metrics" },
      { query: "risk factors competition", name: "Risk Analysis" },
      { query: "guidance outlook future", name: "Forward-looking" }
    ]
    
    const metrics: PerformanceMetrics = {
      totalDocuments: 0,
      avgRelevanceScore: 0,
      documentTypes: {},
      tickerCoverage: {},
      recentQueries: []
    }
    
    // Run test queries and collect metrics
    console.log('🔍 Testing Query Performance:\n')
    
    let totalQueries = 0
    let totalRelevanceSum = 0
    
    for (const testQuery of testQueries) {
      try {
        const results = await ragSystem.search({
          query: testQuery.query,
          limit: 10
        })
        
        const avgScore = results.length > 0 
          ? results.reduce((sum, r) => sum + r.relevance_score, 0) / results.length
          : 0
        
        metrics.recentQueries.push({
          query: testQuery.query,
          resultsCount: results.length,
          avgScore,
          timestamp: new Date()
        })
        
        totalQueries++
        totalRelevanceSum += avgScore
        
        console.log(`📈 ${testQuery.name}:`)
        console.log(`   Query: "${testQuery.query}"`)
        console.log(`   Results: ${results.length} documents`)
        console.log(`   Avg Relevance: ${(avgScore * 100).toFixed(1)}%`)
        
        if (results.length > 0) {
          console.log(`   Top Result: ${results[0].source} (${(results[0].relevance_score * 100).toFixed(1)}%)`)
          
          // Count document types and tickers
          results.forEach(result => {
            const type = result.metadata.type || 'unknown'
            const ticker = result.metadata.ticker || 'unknown'
            
            metrics.documentTypes[type] = (metrics.documentTypes[type] || 0) + 1
            metrics.tickerCoverage[ticker] = (metrics.tickerCoverage[ticker] || 0) + 1
          })
        }
        console.log('')
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error: any) {
        console.log(`   ❌ Error: ${error?.message || error}`)
      }
    }
    
    // Calculate overall metrics
    metrics.totalDocuments = Object.values(metrics.documentTypes).reduce((sum, count) => sum + count, 0)
    metrics.avgRelevanceScore = totalQueries > 0 ? totalRelevanceSum / totalQueries : 0
    
    // Display comprehensive statistics
    console.log('📊 GESAMTSTATISTIKEN:\n')
    
    console.log(`📁 Dokumente gesamt: ${metrics.totalDocuments}`)
    console.log(`🎯 Durchschnittliche Relevanz: ${(metrics.avgRelevanceScore * 100).toFixed(1)}%`)
    console.log('')
    
    // Document type breakdown
    console.log('📄 Dokumenttypen:')
    Object.entries(metrics.documentTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / metrics.totalDocuments) * 100).toFixed(1)
        console.log(`   ${type}: ${count} (${percentage}%)`)
      })
    console.log('')
    
    // Ticker coverage
    console.log('📈 Ticker-Abdeckung (Top 10):')
    Object.entries(metrics.tickerCoverage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([ticker, count]) => {
        console.log(`   ${ticker}: ${count} Dokumente`)
      })
    console.log('')
    
    // Performance recommendations
    console.log('💡 EMPFEHLUNGEN:\n')
    
    if (metrics.avgRelevanceScore < 0.7) {
      console.log('⚠️ Niedrige Relevanz-Scores - Überprüfe:')
      console.log('   • Chunk-Größe und Overlap-Parameter')
      console.log('   • Embedding-Model Performance')
      console.log('   • Dokumenten-Qualität und -Relevanz')
      console.log('')
    }
    
    if (metrics.totalDocuments < 50) {
      console.log('📊 Wenige Dokumente - Verbessere mit:')
      console.log('   • npm run rag:ingest für mehr Aktien')
      console.log('   • npm run rag:update für aktuelle News')
      console.log('   • Automatische tägliche Updates einrichten')
      console.log('')
    }
    
    const majorTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META']
    const missingMajorTickers = majorTickers.filter(ticker => !metrics.tickerCoverage[ticker])
    
    if (missingMajorTickers.length > 0) {
      console.log('🏢 Fehlende Major Stocks:')
      console.log(`   npm run rag:ingest ${missingMajorTickers.join(' ')}`)
      console.log('')
    }
    
    // Health score calculation
    const healthFactors = {
      documentCount: Math.min(metrics.totalDocuments / 100, 1), // Max score at 100+ docs
      avgRelevance: metrics.avgRelevanceScore,
      tickerDiversity: Math.min(Object.keys(metrics.tickerCoverage).length / 20, 1), // Max score at 20+ tickers
      typesDiversity: Math.min(Object.keys(metrics.documentTypes).length / 4, 1) // Max score at 4+ types
    }
    
    const healthScore = Object.values(healthFactors).reduce((sum, score) => sum + score, 0) / Object.keys(healthFactors).length
    
    console.log('🏥 RAG SYSTEM HEALTH SCORE:')
    console.log(`   Overall: ${(healthScore * 100).toFixed(1)}% ${getHealthEmoji(healthScore)}`)
    console.log(`   • Dokumente: ${(healthFactors.documentCount * 100).toFixed(1)}%`)
    console.log(`   • Relevanz: ${(healthFactors.avgRelevance * 100).toFixed(1)}%`)
    console.log(`   • Ticker-Vielfalt: ${(healthFactors.tickerDiversity * 100).toFixed(1)}%`)
    console.log(`   • Dokument-Typen: ${(healthFactors.typesDiversity * 100).toFixed(1)}%`)
    console.log('')
    
    // Next steps
    console.log('🚀 NÄCHSTE SCHRITTE:')
    if (healthScore < 0.7) {
      console.log('   1. Mehr Daten: npm run rag:ingest TICKER1 TICKER2')
      console.log('   2. Updates: npm run rag:update')
      console.log('   3. Status prüfen: npm run rag:status')
    } else {
      console.log('   ✅ RAG System läuft optimal!')
      console.log('   • Automatische Updates einrichten')
      console.log('   • Performance regelmäßig monitoren')
      console.log('   • Bei Bedarf neue Aktien hinzufügen')
    }
    
  } catch (error: any) {
    console.error('❌ Monitoring Error:', error?.message || error)
    process.exit(1)
  }
}

function getHealthEmoji(score: number): string {
  if (score >= 0.9) return '🟢'
  if (score >= 0.7) return '🟡'
  if (score >= 0.5) return '🟠'
  return '🔴'
}

// Export für andere Scripts
export { monitorRAGPerformance }

// Run if called directly
if (require.main === module) {
  monitorRAGPerformance()
}