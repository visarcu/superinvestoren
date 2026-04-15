// Vercel Cron Job: Auto-Ingest Earnings Call Transcripts
// Prüft welche Earnings gestern/heute stattfanden und holt die Transcripts von FMP → Pinecone
import { NextRequest, NextResponse } from 'next/server'
import { FinancialRAGSystem, DataIngestionService } from '@/lib/ragSystem'
import { RAG_TICKERS } from '@/lib/ragTickers'

const FMP_API_KEY = process.env.FMP_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

export const maxDuration = 60 // Vercel: max 60s für Cron

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 500 })
    }

    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'PINECONE_API_KEY or OPENAI_API_KEY not configured' }, { status: 500 })
    }

    console.log('🎙️ Earnings Transcript Ingest gestartet:', new Date().toISOString())

    // Hole Earnings der letzten 3 Tage (um Wochenenden/Verzögerungen abzufangen)
    const today = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(today.getDate() - 3)

    const from = threeDaysAgo.toISOString().split('T')[0]
    const to = today.toISOString().split('T')[0]

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const allEarnings = await response.json()

    if (!Array.isArray(allEarnings)) {
      return NextResponse.json({ success: true, message: 'No earnings data', ingested: 0 })
    }

    // Nur Ticker die in unserer RAG-Liste sind UND die schon Actuals haben (= Call ist vorbei)
    const ragTickerSet = new Set(RAG_TICKERS)
    const relevantEarnings = allEarnings.filter((e: any) =>
      e.symbol &&
      ragTickerSet.has(e.symbol) &&
      (e.epsActual !== null || e.revenueActual !== null) // Hat Actuals → Earnings sind raus
    )

    console.log(`📊 ${allEarnings.length} Earnings total, ${relevantEarnings.length} relevant für RAG-Ingest`)

    if (relevantEarnings.length === 0) {
      return NextResponse.json({ success: true, message: 'No relevant earnings to ingest', ingested: 0 })
    }

    // RAG System initialisieren
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    const ingestionService = new DataIngestionService(ragSystem)

    let ingested = 0
    let failed = 0

    for (const earning of relevantEarnings) {
      try {
        const earningDate = new Date(earning.date)
        const quarter = Math.ceil((earningDate.getMonth() + 1) / 3)
        const year = earningDate.getFullYear()

        console.log(`🎙️ Ingesting transcript: ${earning.symbol} Q${quarter} ${year}`)

        await ingestionService.ingestEarningsCall(earning.symbol, year, quarter)
        ingested++

        // Rate Limiting: 1.5s zwischen Calls
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error(`❌ Failed to ingest ${earning.symbol}:`, error)
        failed++
      }
    }

    // Auch News für diese Ticker auffrischen
    let newsUpdated = 0
    for (const earning of relevantEarnings) {
      try {
        await ingestionService.ingestNews(earning.symbol, 10)
        newsUpdated++
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch {
        // News-Fehler nicht kritisch
      }
    }

    console.log(`✅ Transcript-Ingest abgeschlossen: ${ingested} ingested, ${failed} failed, ${newsUpdated} news updated`)

    return NextResponse.json({
      success: true,
      ingested,
      failed,
      newsUpdated,
      tickers: relevantEarnings.map((e: any) => e.symbol),
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('❌ Earnings Transcript Ingest Fehler:', error)
    return NextResponse.json(
      { error: 'Ingest failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
