// scripts/ingestAllRAG.ts - Alle RAG-Ticker auf einmal einpflegen
// Nutzt die zentrale Liste aus src/lib/ragTickers.ts
import { FinancialRAGSystem, DataIngestionService } from '../src/lib/ragSystem'
import { RAG_TICKERS } from '../src/lib/ragTickers'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    let loaded = 0
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eq = trimmed.indexOf('=')
        const key = trimmed.substring(0, eq).trim()
        const value = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, '')
        if (key && value) { process.env[key] = value; loaded++ }
      }
    }
    console.log(`✅ ${loaded} Env-Variablen geladen`)
  } catch { console.log('⚠️ Keine .env.local gefunden') }
}

loadEnvFile()

async function ingestAll() {
  if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('❌ PINECONE_API_KEY und OPENAI_API_KEY müssen in .env.local stehen')
    process.exit(1)
  }
  if (!process.env.FMP_API_KEY && !process.env.NEXT_PUBLIC_FMP_API_KEY) {
    console.error('❌ FMP_API_KEY muss in .env.local stehen')
    process.exit(1)
  }

  const tickers = [...RAG_TICKERS]
  console.log(`\n🚀 Starte RAG-Ingest für ${tickers.length} Aktien`)
  console.log(`   Geschätzte Dauer: ${Math.ceil(tickers.length * 0.5)} Minuten\n`)

  const ragSystem = new FinancialRAGSystem()
  await ragSystem.initialize('finclue-financial-docs')
  const ingestionService = new DataIngestionService(ragSystem)

  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

  let success = 0
  let failed = 0

  for (let t = 0; t < tickers.length; t++) {
    const ticker = tickers[t]
    console.log(`[${t + 1}/${tickers.length}] 📈 ${ticker}...`)

    try {
      // Earnings Calls: letzte 8 Quartale
      for (let i = 0; i < 8; i++) {
        let year = currentYear
        let quarter = currentQuarter - i
        if (quarter <= 0) { quarter += 4; year -= 1 }
        if (year >= 2022) {
          await ingestionService.ingestEarningsCall(ticker, year, quarter)
          await new Promise(r => setTimeout(r, 800))
        }
      }

      // News: letzte 20 Artikel
      await ingestionService.ingestNews(ticker, 20)

      success++
      console.log(`   ✅ ${ticker} fertig`)

      // Pause zwischen Tickern
      await new Promise(r => setTimeout(r, 1500))
    } catch (error: any) {
      failed++
      console.error(`   ❌ ${ticker} fehlgeschlagen: ${error?.message || error}`)
    }
  }

  console.log(`\n🎉 Fertig! ${success} erfolgreich, ${failed} fehlgeschlagen`)
  console.log(`\nAb jetzt holt der Cron automatisch neue Earnings Transcripts.`)
  console.log(`News manuell auffrischen: npm run rag:update`)
}

ingestAll()
